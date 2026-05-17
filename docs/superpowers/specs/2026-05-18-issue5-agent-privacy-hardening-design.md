# Issue #5 — 管家對話隱私強化(Tier 1)設計

- **狀態:** 已核准(2026-05-18,user 於 brainstorming 拍板)
- **Issue:** #5 🔒 隱私與成員資料公開:同意機制與資料安全盤點
- **範圍:** Tier 1 止血。Tier 2(每位成員專屬 Letta agent)另開 issue。

## 背景

#5 稽核發現管家(`/agent`)對話有 P1 等級資料外洩:

1. **`/api/agent/history` 公開外洩** — 無登入驗證、無 user 過濾,`SELECT * FROM chat_history`
   回傳全部成員的對話。`/agent` 是公開靜態頁,任何人點「📜 歷史」分頁即可分頁 + 搜尋
   全員與管家的私人對話。(`history.ts:29`、`ChatBox.tsx:44`)
2. **`userId` 可偽造** — `chat.ts` 的 `userId` 來自 request body、預設 `'anonymous'`;
   `ChatBox.tsx:20` 的 `USER_ID` 是前端 `Math.random()` 亂數。`chat_history.user_id`
   整欄無意義,無法對應真實成員。
3. **共用單一 agent** — 19 位成員共用同一個 Letta agent + memory block
   (`chat.ts:73` 寫死 `agent-0f132a48…`)。

附帶確認:Task 3(非名單 Google 帳號自動取得陪跑員)在 `callback.ts:157` 已修復
(真・新使用者建為 `status='pending'`,`auth.ts:216` `requireAuth` 回 403)。本次僅驗證,不改碼。

## 目標

- 堵掉 `/api/agent/history` 外洩孔(P1)。
- 杜絕 `userId` 偽造 — 一律由伺服器端 session 推導。
- 管家對話**維持公開**(匿名訪客可聊),但匿名對話不寫入可辨識歷史。
- Footer 加隱私聲明。
- `/agent` 頁面措辭軟化,避免過度承諾跨成員「長期記憶」。

## 不做(YAGNI / 另開 issue)

- 每位成員專屬 Letta agent(Tier 2 — 真記憶隔離)。
- 清理舊 `chat_history` 亂數資料(self-scoped 查詢後已 API 不可達;若要清,另備份處理)。
- 共用 agent memory block 混用問題。

## 變更項目

### A. Footer 隱私聲明
- 檔案:`src/layouts/Layout.astro`(footer `:221-231`)。
- 新增一行隱私說明,沿用既有 `text-sm text-[var(--color-text-muted)]` 樣式。
- 文案:**「本站前台僅顯示成員自願提供的公開資訊(暱稱、代表色、角色、自介),不對外公開其他個資。」**
  - 採精準版。owner 範本原文為「不收集敏感個資」,但 owner 在 #5 亦說明「詳細個資僅後台管理可見」
    — 代表敏感資料有收集只是不公開,故改為「不對外公開」以免與事實矛盾。

### B1. `functions/api/agent/history.ts` — 堵 P1 外洩
- import `getSessionUser` from `../../../src/lib/auth.ts`。
- 未登入 → 回 401 `{ ok: false, error: '請先登入' }`。
- `countSql` 與 `dataSql` 一律加上 `WHERE user_id = ?`(與既有 search 條件以 AND 串接)。
- 綁定 `sessionUser.id`。效果:登入者只看得到自己的對話;舊的亂數 `user_id` 資料對不到
  任何真實 user → API 不可達。

### B2. `functions/api/agent/chat.ts` — 杜絕 userId 偽造
- 移除「從 request body 取 `userId`」整段。
- 改用 `getSessionUser`(**非** `requireAuth` — 維持公開可聊)。
- 登入者 → `saveChat` 以 `sessionUser.id` 寫入。
- 未登入者 → **不呼叫 `saveChat`**(匿名對話不留可辨識歷史)。
- chat 端點對所有人開放不變;Letta 呼叫邏輯不變。

### B3. `src/components/agent/ChatBox.tsx`
- 移除 `USER_ID = Math.random()` 常數;`sendMessage` 的 request body 不再帶 `userId`。
- `HistoryPanel.fetchHistory`:處理 401 回應 → 設 `needLogin` 狀態 →
  歷史分頁顯示「登入後即可查看你的對話紀錄」(非錯誤、非空白)。

### C. `/agent` 頁面措辭軟化
- 檔案:`src/pages/agent/index.astro`。
- 現有「長期記憶 / 越用越懂你 / 記住你的偏好」等措辭會讓使用者誤以為已有跨成員隔離的私人記憶。
- 原則:措辭調整為**不承諾跨成員私人記憶**(共用 agent 下不屬實);保留「對話紀錄存於 Turso」
  等屬實描述。實作時定稿具體字句(UI 文案)。

### D. Task 3 驗證(無程式碼)
- 程式碼追蹤確認 `callback.ts` pending 流程 + `requireAuth` 403。
- E2E 確認 pending 狀態 user 被導向 `/pending`。
- 完成後於 issue #5 留言回報 owner:Task 3 早已修復;並揭露本次新發現的 history 外洩與修補。

## 資料流(修補後)

```
匿名訪客  → 聊天 ✓  → Letta 回覆 ✓  → 不存 DB
登入成員  → 聊天 ✓  → Letta 回覆 ✓  → saveChat(user_id = session.id)
登入成員  → 歷史分頁 → WHERE user_id = session.id → 只有自己的對話
未登入    → 歷史分頁 → 401 → 「登入後即可查看你的對話紀錄」
```

## 錯誤處理

- `/api/agent/history` 401:`ChatBox` 友善提示,不顯示錯誤紅框。
- `/api/agent/chat` 對未登入者:正常回覆,`saveChat` 跳過。
- `saveChat` 既有 best-effort `try/catch` 維持不變。

## 測試

- E2E(`e2e/`)三條:
  1. 未登入點「歷史」→ 看到登入提示。
  2. 登入後「歷史」→ 只有自己的對話(self-scoped)。
  3. 匿名聊天 → 可正常運作。
- `bun run build` + 既有 test 綠燈。

## 部署

- 走 PR:branch `fix-5-agent-privacy-hardening`。
- **無 DB schema 變更**,不需 migration / `/api/db/init`。
- 完成後 local deploy。
