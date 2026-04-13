---
issue: 47
---

# Progress — Issue #47

## 日誌

### 2026-04-13 Session 1（Claude Code）

**完成項目：**
- 後端 `functions/api/messages/index.ts`：加上 `requireAuth`，移除 bodyAuthor fallback，修正 catch 攔截 Response
- 前端 `src/components/discuss/MessageBoard.tsx`：未登入 → 登入提示卡片；已登入 → form 移除暱稱欄
- Unit tests 7/7 通過（`tests/unit/messages/api.test.ts`）
- E2E tests 3/7 通過、4 skip（未部署功能）（`e2e/messages-auth.spec.ts`）
- `src/lib/changelog.ts` 新增 entry（version: ''）
- Commit + push 到 `feat/47-messages-auth`

**待做：**
- [x] `bun run build` 綠燈（18 pages，無錯誤）
- [x] Draft PR 開立（PR #48）

## 交棒筆記

**接手時請注意：**
1. 所有 code 已 push 到 `feat/47-messages-auth`
2. Unit tests 全過（`bunx vitest run tests/unit/messages/`）
3. E2E 4 個 skip 是因為 prod 尚未部署，merge 後會自動啟用
4. 還需要：`bun run build` 確認無 TS 錯誤，開 draft PR

**已知 TS warnings（non-blocking）：**
- `PagesFunction` not found：Cloudflare Workers type，build 時正常解析
- `FormEvent` deprecated：React 類型，不影響功能
