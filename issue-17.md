# Issue #17 規劃文件：Cyclone 需求清單分析與建議

> 建立日期：2026-04-10
> 來源：[GitHub Issue #17](https://github.com/cyclone-tw/cyclone-workflow/issues/17)
> 狀態：規劃中

---

## 一、需求總覽

Cyclone 提出了一份完整的需求文件，涵蓋 **12 個頁面/功能模組** 的改版，核心要點：

1. **角色與權限系統** — 5 種角色、可重疊、後台動態切換
2. **登入機制** — Google > GitHub > Discord
3. **首頁改版** — 公告區 + 共學時程 + 既有卡片
4. **儀表板個人化** — 打卡 streak、積分、每週檢核
5. **知識庫 + AI 工具箱** — CRUD + 共用標籤系統
6. **許願樹改版** — 個人需求 / 網站功能雙分類 + 認領機制
7. **積分榜**（新頁面）— 鼓勵參與的積分系統
8. **團隊頁改版** — 角色分組、19 人、移除交換機制
9. **導覽列重排** — 反映使用頻率
10. **Issues × GitHub 整合**
11. **管家後續規劃**
12. **Dark/Light mode**（排後面）

---

## 二、可行性分析

### 2.1 時程風險評估 ⚠️

**原始排程：4/10 ~ 4/12 三天內完成 9 項 P0 功能**

| 項目 | 預估工時 | 4/12 前可行？ | 備註 |
|------|----------|:-------------:|------|
| 角色權限系統 | 5-7 天 | ❌ | 需 DB schema、auth 整合、middleware、後台 UI |
| 登入機制 (Google) | 3-4 天 | ❌ | OAuth 設定、session 管理、帳號綁定 |
| 導覽列重排 | 0.5 天 | ✅ | 純 UI 調整 |
| 首頁改版 | 1-2 天 | ⚠️ | 需等文案定稿 |
| 團隊頁改版 | 1 天 | ✅ | 已有基礎，改分組邏輯 |
| 儀表板個人化 | 2-3 天 | ❌ | 依賴權限系統 + 打卡功能 |
| 知識庫 CRUD | 2-3 天 | ⚠️ | 有基礎但需加投稿、標籤 |
| AI 工具箱 CRUD | 2-3 天 | ⚠️ | 頁面已存在，需加完整 CRUD |
| 許願樹改版 | 1-2 天 | ⚠️ | 需重新設計分類 |

**結論：三天內全部完成不可行。** 需要重新排列優先級和分階段交付。

### 2.2 關鍵依賴鏈

```
登入機制 (OAuth)
    └── 角色權限系統 (DB schema + middleware)
            ├── 儀表板個人化
            ├── 知識庫投稿 (需知道是誰投稿)
            ├── 積分系統 (需知道是誰得積分)
            ├── 打卡功能
            └── 後台管理介面
```

**角色權限是所有功能的基礎，但本身就需要最多工時。**

---

## 三、建議方案：分階段交付

### 階段 0：立即交付（4/10）— 無需後端改動

| 項目 | 工作內容 |
|------|----------|
| 導覽列重排 | 調整 tab 順序 |
| 首頁改版 | 公告區（靜態）+ 共學時程卡片 |
| 團隊頁改版 | 角色分組 + 擴充到 19 人（靜態資料）|
| 說明頁更新 | 配合新功能更新說明 |

> 這些項目 **不依賴權限系統**，可以立即動工，讓 4/13 有東西可以看。

### 階段 1：核心基礎（4/10 ~ 4/16）— W1 期間

| 項目 | 工作內容 |
|------|----------|
| Google OAuth 登入 | Cloudflare Workers + session token |
| DB Schema 設計 | users, roles, permissions 表 |
| 角色權限 middleware | 路由保護 + 權限檢查 |
| 打卡功能 | 每日打卡 + streak 計算 |

### 階段 2：內容功能（4/14 ~ 4/19）— W1 後半

| 項目 | 工作內容 |
|------|----------|
| 知識庫 CRUD + 投稿 | 新增/編輯/刪除 + 標籤篩選 |
| AI 工具箱 CRUD | 完整 CRUD + 標籤系統 |
| 許願樹改版 | 雙分類 + 認領機制 |
| 儀表板個人化 | 顯示個人貢獻 + 週檢核 |

### 階段 3：增強功能（4/20 ~ 4/26）— W2

| 項目 | 工作內容 |
|------|----------|
| 積分榜 | 頁面 + 積分計算邏輯 + 排行榜 |
| 討論區增強 | 按讚 + 留言互動 |
| Dark/Light mode | 全站主題切換 |
| 後台管理介面 | 角色指派、成員管理、內容審核 |

### 階段 4：收尾（4/27 ~ 5/4）— W3

| 項目 | 工作內容 |
|------|----------|
| Issues × GitHub | API 整合 |
| 管家功能收斂 | 人設定義 + 角色差異化 |
| Demo Day 準備 | 功能驗收 + 成果整理 |

---

## 四、技術方案建議

### 4.1 角色權限系統

```
DB Schema (Turso/LibSQL):

users
├── id (TEXT, PK)
├── email (TEXT, UNIQUE)
├── name (TEXT)
├── avatar_url (TEXT)
├── created_at (TEXT)
└── updated_at (TEXT)

user_roles
├── user_id (TEXT, FK → users)
├── role (TEXT: 'captain' | 'tech' | 'admin' | 'member' | 'companion')
└── assigned_at (TEXT)

sessions (for auth)
├── id (TEXT, PK)
├── user_id (TEXT, FK → users)
├── token (TEXT)
├── expires_at (TEXT)
└── created_at (TEXT)
```

**實作方式：**
- Google OAuth 透過 Cloudflare Workers API route 處理
- Session token 存 httpOnly cookie
- 前端用 React context 提供使用者狀態
- Middleware 在每個 API route 檢查權限

**權限檢查邏輯：**
```typescript
// 權限層級：captain > tech > admin > member / companion
const ROLE_LEVEL = {
  captain: 100,
  tech: 80,
  admin: 60,
  member: 20,
  companion: 10,
};

// 角色可重疊：一個 user 可有多個 role，取最高權限
function getEffectiveRole(roles: string[]): string {
  return roles.reduce((highest, role) =>
    ROLE_LEVEL[role] > ROLE_LEVEL[highest] ? role : highest
  , 'companion');
}
```

### 4.2 登入機制

建議用 **Cloudflare Workers + Google OAuth 2.0**：

```
流程：
1. 使用者點「Google 登入」
2. 跳轉到 Google OAuth consent page
3. Google 回調到 /api/auth/callback
4. Worker 驗證 token、查/建 user、寫 session
5. 設定 httpOnly cookie，導回首頁
```

不需要額外套件，Cloudflare Workers 原生支援 fetch 和 crypto。

### 4.3 標籤系統

知識庫與 AI 工具箱共用：

```
tags
├── id (TEXT, PK)
├── name (TEXT)
├── category (TEXT: 'knowledge' | 'ai-tools' | 'both')
└── color (TEXT)  -- UI 顯示用

resource_tags  -- 多對多
├── resource_id (TEXT)
├── resource_type (TEXT: 'knowledge' | 'ai-tool')
├── tag_id (TEXT, FK → tags)
```

### 4.4 積分系統

```
points
├── id (TEXT, PK)
├── user_id (TEXT, FK → users)
├── action (TEXT: 'checkin' | 'upload' | 'contribute' | 'answer' | 'interact' | 'wish_complete')
├── points (INTEGER)
├── reference_id (TEXT, nullable)  -- 關聯的資源 ID
├── created_at (TEXT)
```

---

## 五、回覆 Cyclone 的五個問題

### Q1: 4/10~4/12 衝刺排程，工作量是否可行？

**不行，需要調整。** 建議改為分階段交付：

- **4/13 前**：只做不依賴後端的項目（導覽列、首頁靜態內容、團隊頁擴充）
- **4/13 ~ 4/19 (W1)**：登入 + 權限系統 + 基礎 CRUD
- **4/20 ~ 4/26 (W2)**：積分、互動功能、主題切換
- **4/27 ~ 5/4 (W3)**：收尾、整合、展示

W1 開始時網站有基本外觀和內容可看，但個人化功能需要 W1 期間逐步上線。

### Q2: 角色權限系統的技術方案？

如上方第四節所述：
- **DB**：Turso (LibSQL) 新增 `users`、`user_roles`、`sessions` 表
- **Auth**：Google OAuth 2.0 via Cloudflare Workers
- **授權**：RBAC middleware，角色可重疊，取最高權限
- **後台**：簡單的管理介面，隊長/技術維護可指派角色

### Q3: 團隊頁依角色分組？

兩種做法：

- **A. 短期（靜態）**：直接用分組 JSON 資料渲染，Cyclone 提供名單即可
- **B. 長期（動態）**：從 DB 讀取 user_roles，按角色分組渲染

**建議先走 A**，4/13 前就能上線。等權限系統完成後再切換到 B。

### Q4: 管家（/agent）後續規劃？

建議方向：

1. **人設定義**：管家 = 共學助手，回答學習問題、推薦工具、追蹤進度
2. **角色差異化**：暫不做。先讓所有成員有相同體驗，降低複雜度
3. **長期記憶**：可記住「每個人的學習主題、卡點、進度」，用於主動關懷
4. **MVP**：維持現有 ChatBox + Letta，先確保基本對話穩定

### Q5: Issues 與 GitHub 整合？

可行方案：

- **A. 嵌入式**：用 GitHub API (`gh api`) 在頁面顯示 repo issues
- **B. 雙向同步**：網站建立 issue → 自動在 GitHub 開 issue（需 GitHub App）
- **C. 單向顯示**：只從 GitHub 拉 issues 顯示，不建立

**建議先做 C**，最簡單。用 GitHub REST API 拉 issues 顯示在頁面上，加個「在 GitHub 上建立」的連結即可。

---

## 六、風險與注意事項

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 時程過度壓縮 | 品質下降、bug 增加 | 分階段交付，降低 W1 預期 |
| 權限系統複雜度 | 開發時間超預期 | 先做最小可行版本，逐步加功能 |
| 成員資料未齊 | 團隊頁、權限系統卡關 | 靜態資料先行，動態切換後補 |
| OAuth 設定問題 | 登入功能延遲 | 提前準備 Google Cloud Console 設定 |
| 資料庫 schema 變動 | 需要遷移 | 設計時預留擴展空間 |

---

## 七、需要 Cyclone 確認的事項

- [ ] 分階段交付方案是否可接受？（4/13 只有靜態頁面改版）
- [ ] Google OAuth 登入是否為唯一優先？還是先用簡單的邀請碼機制？
- [ ] 團隊頁靜態版本可否先用？（Cyclone 提供 19 人名單與角色對照）
- [ ] 積分具體分數是否可以在 W1 啟動會議確認？
- [ ] 管家 MVP 先維持現狀，W2 再強化，可以嗎？
- [ ] Issues 頁面先做「顯示 GitHub issues」，可以嗎？

---

## 八、現有 Issue 關聯與建議處理

| Issue | 標題 | 與 #17 關係 | 建議 |
|-------|------|-------------|------|
| #3 | 全面更新用詞與內容 | → #17 三-1 首頁改版 | 合併處理，關閉 #3 |
| #4 | 缺少資料清單 | → #17 三-5 團隊頁 19 人 | 等 Cyclone 提供，維持 open |
| #5 | 隱私與資料同意 | → 權限系統前置作業 | 需在登入上線前解決 |
| #6 | Notion 整合 | → #17 明確說不考慮 | 關閉，加註「現階段不執行」|
| #14 | AI 工具知識卡片 | → #17 三-6/3-7 知識庫+工具箱 | 合併處理，關閉 #14 |
| #15 | Dark/Light mode 全站 | → #17 階段 3 | 降為 P2，維持 open |
| #16 | Dark/Light 首頁 demo | → #15 的子集 | 可先做，不影響後續 |

---

*此文件為初步規劃，待與 Cyclone 討論確認後調整。*
