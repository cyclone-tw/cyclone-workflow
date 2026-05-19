# 管家對話隱私強化(Tier 1)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 堵掉 `/api/agent/history` 公開資料外洩(P1),杜絕 `userId` 偽造,並補上 footer 隱私聲明與 `/agent` 誠實措辭。

**Architecture:** 管家對話維持公開可聊;歷史查詢改為需登入且 self-scoped(`WHERE user_id = ?` 綁 session)。`userId` 一律由伺服器端 `getSessionUser` 推導,前端不再傳。共用單一 Letta agent 不動(Tier 2 另開 issue)。

**Tech Stack:** Astro 6(static)、Cloudflare Pages Functions、React 19、Turso(libSQL)、vitest(`tests/`)、Playwright(`e2e/`)。

**測試現況說明:** 專案 `functions/` 無單元測試框架(僅 `e2e/` Playwright + `tests/` vitest 元件測試)。本計畫 API 行為以 E2E 驗證(對 `https://cyclone.tw`,部署前紅、部署後綠)+ 嚴格 code review;ChatBox 401 處理另加 vitest 元件測試(可即時紅綠)。

---

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/layouts/Layout.astro` | 修改 footer | 加隱私聲明一行 |
| `functions/api/agent/history.ts` | 修改 | 加登入驗證 + `WHERE user_id` self-scope |
| `functions/api/agent/chat.ts` | 修改 | 移除 body `userId`,改用 session;匿名不存歷史 |
| `src/components/agent/ChatBox.tsx` | 修改 | 移除假 `USER_ID`;歷史分頁處理 401 |
| `src/pages/agent/index.astro` | 修改 | 措辭軟化,不過度承諾私人記憶 |
| `tests/components/ChatBox.test.tsx` | 新增 | 驗證 401 → 登入提示 |
| `e2e/agent-privacy.spec.ts` | 新增 | 匿名點歷史見登入提示 / 匿名可聊 / footer 文字 |
| `src/lib/changelog.ts` | 修改 | 加 changelog 條目 |

---

## Task 1: Footer 隱私聲明

**Files:**
- Modify: `src/layouts/Layout.astro:220-231`

- [ ] **Step 1: 在 footer 容器內、flex 列之後加一行隱私說明**

把現有 footer 區塊改為:

```astro
    <!-- Footer -->
    <footer class="border-t border-[var(--color-border)] mt-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
          <p>2026 Q2 — Cyclone 隊長 × 生活黑客共學團</p>
          <p>
            <a href="/changelog" class="hover:text-[var(--color-primary)] transition-colors">{VERSION}</a>
            · Built with Astro + Cloudflare Pages
          </p>
        </div>
        <p class="mt-4 text-center text-xs text-[var(--color-text-muted)] leading-relaxed">
          本站前台僅顯示成員自願提供的公開資訊(暱稱、代表色、角色、自介),不對外公開其他個資。
        </p>
      </div>
    </footer>
```

- [ ] **Step 2: 驗證 build**

Run: `bun run build`
Expected: build 成功,無新錯誤。

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat(issue-5): footer 加隱私聲明"
```

---

## Task 2: history.ts 加登入驗證 + self-scope(B1 — P1 修補)

**Files:**
- Modify: `functions/api/agent/history.ts`

- [ ] **Step 1: import `getSessionUser`**

在檔案最上方 import 後加:

```ts
import { getSessionUser } from '../../../src/lib/auth.ts';
```

- [ ] **Step 2: `onRequestGet` 開頭加登入檢查**

在 `try {` 之後、`createClient` 之前插入:

```ts
    const sessionUser = await getSessionUser(context.request, context.env);
    if (!sessionUser) {
      return new Response(JSON.stringify({ ok: false, error: '請先登入' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }
```

- [ ] **Step 3: 查詢一律 self-scope 到 `sessionUser.id`**

把原本的 query 建構區塊(`let countSql = ...` 到 `args.push(limit, offset);`)整段換成:

```ts
    let countSql = 'SELECT COUNT(*) as total FROM chat_history WHERE user_id = ?';
    let dataSql = 'SELECT * FROM chat_history WHERE user_id = ?';
    const args: (string | number)[] = [sessionUser.id];
    const countArgs: (string | number)[] = [sessionUser.id];

    if (search) {
      const searchParam = `%${search}%`;
      const and = ' AND (user_message LIKE ? OR agent_reply LIKE ?)';
      countSql += and;
      countArgs.push(searchParam, searchParam);
      dataSql += and;
      args.push(searchParam, searchParam);
    }

    dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
```

> 注意:search 條件用 `AND (… OR …)` 加括號,避免 `WHERE user_id = ? AND a OR b` 的運算子優先序漏洞。

- [ ] **Step 4: 驗證**

Run: `bunx tsc --noEmit -p .` (或 `bun run build`)
Expected: 無型別錯誤。行為驗證見 Task 7 的 E2E。

- [ ] **Step 5: Commit**

```bash
git add functions/api/agent/history.ts
git commit -m "fix(issue-5): /api/agent/history 加登入驗證 + self-scope 修補 P1 外洩"
```

---

## Task 3: chat.ts 杜絕 userId 偽造(B2)

**Files:**
- Modify: `functions/api/agent/chat.ts`

- [ ] **Step 1: import `getSessionUser`**

在頂部 import `createClient` 後加:

```ts
import { getSessionUser } from '../../../src/lib/auth.ts';
```

- [ ] **Step 2: 移除 body 取 `userId`**

把 `onRequestPost` 內:

```ts
    const { message, userId = 'anonymous' } = await context.request.json() as { message?: string; userId?: string };
```

改為:

```ts
    const { message } = await context.request.json() as { message?: string };
```

- [ ] **Step 3: 用 session 決定是否寫入歷史(核心隱私決策)**

把結尾的 `context.waitUntil(saveChat(context.env, userId, message, finalReply));` 換成:

```ts
    // 隱私決策:只有登入成員的對話寫入可辨識歷史;匿名訪客可聊但不留紀錄。
    const sessionUser = await getSessionUser(context.request, context.env);
    if (sessionUser) {
      context.waitUntil(saveChat(context.env, sessionUser.id, message, finalReply));
    }
```

- [ ] **Step 4: 驗證**

Run: `bun run build`
Expected: 無型別錯誤(`userId` 已無未用變數警告)。

- [ ] **Step 5: Commit**

```bash
git add functions/api/agent/chat.ts
git commit -m "fix(issue-5): /api/agent/chat 改用 session 身份,匿名對話不留歷史"
```

---

## Task 4: ChatBox.tsx 移除假 userId + 處理 401(B3)

**Files:**
- Modify: `src/components/agent/ChatBox.tsx`
- Create: `tests/components/ChatBox.test.tsx`

- [ ] **Step 1: 寫失敗測試 — 401 顯示登入提示**

建立 `tests/components/ChatBox.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatBox from '@/components/agent/ChatBox';

describe('ChatBox 歷史分頁', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: false, error: '請先登入' }), { status: 401 }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('history 回 401 時顯示登入提示', async () => {
    render(<ChatBox />);
    fireEvent.click(screen.getByText(/📜 歷史/));
    // getByText 找不到會 throw,waitFor 內即為斷言
    await waitFor(() => screen.getByText(/登入後即可查看/));
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `bun run test -- tests/components/ChatBox.test.tsx`
Expected: FAIL — 目前 `HistoryPanel` 不處理 401,不會出現「登入後即可查看」。

- [ ] **Step 3: 移除假 `USER_ID`**

刪除第 20 行:

```tsx
const USER_ID = 'user-' + Math.random().toString(36).slice(2, 9);
```

並把 `sendMessage` 內的 fetch body:

```tsx
        body: JSON.stringify({ message: text, userId: USER_ID }),
```

改為:

```tsx
        body: JSON.stringify({ message: text }),
```

- [ ] **Step 4: `HistoryPanel` 加 `needLogin` 狀態**

在 `HistoryPanel` 的 state 宣告區加:

```tsx
  const [needLogin, setNeedLogin] = useState(false);
```

把 `fetchHistory` 改為:

```tsx
  const fetchHistory = async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set('search', q);
      const res = await fetch(`/api/agent/history?${params}`);
      if (res.status === 401) {
        setNeedLogin(true);
        setHistory([]);
        return;
      }
      setNeedLogin(false);
      const data = await res.json();
      if (data.ok) {
        setHistory(data.history);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };
```

- [ ] **Step 5: `HistoryPanel` render 加 needLogin 分支**

在 `HistoryPanel` 的 `return (` 之後、最外層 `<div>` 內,把 search bar 那段之前插入早返判斷 —— 即把整個 return 改為:當 `needLogin` 為真,只渲染登入提示:

```tsx
  if (needLogin) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: '380px' }}>
        <div className="text-3xl mb-3">🔒</div>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>登入後即可查看你的對話紀錄</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>對話紀錄僅本人可見</p>
      </div>
    );
  }

  return (
```

(其餘原本的 return 內容不變。)

- [ ] **Step 6: 跑測試確認通過**

Run: `bun run test -- tests/components/ChatBox.test.tsx`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/components/agent/ChatBox.tsx tests/components/ChatBox.test.tsx
git commit -m "fix(issue-5): ChatBox 移除偽造 userId,歷史分頁處理未登入 401"
```

---

## Task 5: /agent 頁面措辭軟化(C)

**Files:**
- Modify: `src/pages/agent/index.astro`

原則:移除「跨對話記住你的偏好 / 越用越懂你」這類在共用 agent 下不屬實、且暗示私人記憶的措辭。保留屬實描述。改後 card 3 反而能誠實寫出「僅本人可見」這個修補成果。

- [ ] **Step 1: 改 meta description(`:6`)**

```astro
<Layout title="Cyclone 管家" description="共學團專屬 AI 管家 — 隨時為你解答 AI 工作流問題、推薦工具">
```

- [ ] **Step 2: 改 header 介紹段(`:19-21`)**

```astro
        共學團的專屬 AI 管家,幫你把 AI 真的用起來。推薦工具、解答疑問、陪你規劃學習方向。<br />
        隨時提問、尋求建議,或讓她幫你整理共學資料。
```

- [ ] **Step 3: 改三張資訊卡(`:30-52`)**

卡 1:

```astro
      <div class="glass rounded-xl p-5 card-hover">
        <div class="text-2xl mb-3">🧠</div>
        <h3 class="font-semibold text-sm mb-2" style="color: var(--color-primary-light)">Letta 驅動</h3>
        <p class="text-xs leading-relaxed" style="color: var(--color-text-secondary)">
          管家由 <span style="color: var(--color-primary-light)">Letta 平台</span>驅動,協助你設計與優化 AI 工作流。
        </p>
      </div>
```

卡 2:

```astro
      <div class="glass rounded-xl p-5 card-hover">
        <div class="text-2xl mb-3">💬</div>
        <h3 class="font-semibold text-sm mb-2" style="color: var(--color-neon-blue)">即時問答</h3>
        <p class="text-xs leading-relaxed" style="color: var(--color-text-secondary)">
          工具推薦、流程串接,還是學習方向 —— 隨時都能問管家,給你具體可行的建議。
        </p>
      </div>
```

卡 3:

```astro
      <div class="glass rounded-xl p-5 card-hover">
        <div class="text-2xl mb-3">🔒</div>
        <h3 class="font-semibold text-sm mb-2" style="color: var(--color-neon-green)">對話僅本人可見</h3>
        <p class="text-xs leading-relaxed" style="color: var(--color-text-secondary)">
          登入後,你的對話紀錄安全存於 <span style="color: var(--color-neon-green)">Turso 資料庫</span>,且僅你本人查得到。
        </p>
      </div>
```

- [ ] **Step 4: 改底部說明(`:57-58`)**

```astro
    <p class="text-center text-xs mt-6" style="color: var(--color-text-muted)">
      Cyclone 管家由 Letta 驅動 · 登入後對話紀錄存於 Turso 且僅本人可見 · 專為共學團打造
    </p>
```

- [ ] **Step 5: 驗證 build + Commit**

```bash
bun run build
git add src/pages/agent/index.astro
git commit -m "feat(issue-5): /agent 措辭軟化,不過度承諾私人記憶"
```

---

## Task 6: E2E 測試 — 管家隱私

**Files:**
- Create: `e2e/agent-privacy.spec.ts`

- [ ] **Step 1: 寫 E2E spec**

```ts
import { test, expect } from './lambdatest-setup';

test.describe('管家隱私(issue #5)', () => {
  test('未登入訪客點「歷史」分頁 → 看到登入提示,看不到對話資料', async ({ page }) => {
    await page.goto('/agent');
    // 切到歷史分頁
    await page.getByRole('button', { name: /歷史/ }).click();
    // 應出現登入提示,而非任何人的對話紀錄
    await expect(page.getByText(/登入後即可查看/)).toBeVisible({ timeout: 10_000 });
  });

  test('匿名訪客可使用聊天輸入框(管家維持公開)', async ({ page }) => {
    await page.goto('/agent');
    const input = page.getByplaceholder(/跟管家說點什麼/);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });

  test('footer 顯示隱私聲明', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toContainText('不對外公開其他個資');
  });
});
```

- [ ] **Step 2: 跑 E2E(部署前 — 預期紅)**

Run: `bun run test:e2e -- e2e/agent-privacy.spec.ts`
Expected: FAIL(對 `https://cyclone.tw` 跑,目前線上是舊版:歷史會顯示資料、footer 無隱私聲明)。記錄此為「部署前紅」基準。

- [ ] **Step 3: Commit**

```bash
git add e2e/agent-privacy.spec.ts
git commit -m "test(e2e): issue-5 管家隱私 — 歷史登入閘 / 匿名可聊 / footer 聲明"
```

> 部署後綠化驗證見 Task 7。

---

## Task 7: changelog + Task 3 驗證 + 交付

**Files:**
- Modify: `src/lib/changelog.ts`

- [ ] **Step 1: 加 changelog 條目**

讀 `src/lib/changelog.ts`,比照現有 `ChangelogEntry` 格式,在 `CHANGELOG` 陣列**最前面**加一筆(`version` 用今日 `v20260518.xxxx` 格式,`date` 用 UTC+8 `2026-05-18`),內容涵蓋:管家對話歷史隱私修補、footer 隱私聲明、/agent 措辭調整。

```bash
git add src/lib/changelog.ts
git commit -m "docs(issue-5): 更新 changelog"
```

- [ ] **Step 2: Task 3 驗證(無程式碼)**

Code trace 確認:`functions/api/auth/callback.ts:156-164` 真・新使用者建為 `status='pending'` → `src/lib/auth.ts:216-221` `requireAuth` 對 pending 回 403。結論:非名單 Google 帳號登入無法取得陪跑員存取權。記錄於 issue 回報(Step 6)。

- [ ] **Step 3: 完整驗證**

Run: `bun run build && bun run test`
Expected: build 成功;vitest 全綠(含新的 ChatBox 測試)。

- [ ] **Step 4: 開 PR(draft)**

推分支 `fix-5-agent-privacy-hardening`,以 `gh pr create --draft` 開 PR,標題 `fix(issue-5): 管家對話隱私強化 Tier 1`,body 連結 issue #5、列出變更與稽核發現。

- [ ] **Step 5: local deploy**

依 `project_deploy-workflow.md` 執行 local deploy(`local_deploy.sh` 或專案現行流程)。無 DB schema 變更,不需 `/api/db/init`。

- [ ] **Step 6: 部署後綠化 + issue 回報**

- 對 `https://cyclone.tw` 重跑 `bun run test:e2e -- e2e/agent-privacy.spec.ts`,確認三條全綠(錄 video 供 PR)。
- 於 issue #5 留言 @tboydar:回報 Task 3 早已修復、本次新發現的 history 外洩與 Tier 1 修補、Tier 2(每人專屬 agent)建議另開 issue。

---

## Self-Review 註記

- **Spec 覆蓋:** A→Task1、B1→Task2、B2→Task3、B3→Task4、C→Task5、D→Task7 Step2、測試→Task4+6、部署→Task7。全覆蓋。
- **共用 agent 殘留風險:** 已知,Tier 1 範圍外,Task7 Step6 會建議另開 Tier 2 issue。
- **舊 `chat_history` 亂數資料:** Task2 self-scope 後 API 已不可達,不另清理(YAGNI)。
