---
issue: 98
title: 體質優化三部曲 — apiFetch + logger / LEFT JOIN 稽核 / 拆 AdminPanel
status: in-progress
phase: implementation
priority: P2
owner: dar
created: 2026-04-17
updated: 2026-04-17
github_issue: https://github.com/cyclone-tw/cyclone-workflow/issues/98
branch: refactor/98_api-client-logger  # Phase 1 branch
pr: null
related_files:
  - src/components/admin/AdminPanel.tsx
  - src/lib/
  - functions/api/
---

# 體質優化三部曲

## 背景

掃描結果:

- 38 處 `fetch('/api...` + 79 處 `.json()` + 15 處 `if (!data.ok)` + 30 處 `data.error || '...'` —— 高度重複的樣板
- 沒有共用的 client 錯誤 log 機制
- `AdminPanel.tsx` 1866 行 / 68 個 hook —— god component
- 其他肥元件:IssueBoard 1305 / WishBoard 1173 / KnowledgeBoard 1079 / MessageBoard 953

## 目標

分三階段交付,每階段一個獨立 PR:

1. **基礎建設** — `apiFetch<T>()` + `logger`,遷移 2-3 個 call site 當 POC
2. **SQL 稽核** — 掃 LEFT JOIN + WHERE 的黃金規則 5 違反,修正發現
3. **拆元件** — AdminPanel → orchestrator + 6 個分頁子元件

## 驗收條件

### 共通
- [ ] `bun run build` 綠
- [ ] `bun run test:e2e` 綠
- [ ] 每個 PR 都 bump 版本 + 寫 `src/lib/changelog.ts` entry
- [ ] PR draft 附 E2E 錄影或關鍵畫面截圖

### 檔案大小準則(新的軟性規則)
- [ ] 新寫的 component < 500 行
- [ ] 新寫的 lib < 200 行
- [ ] 超過門檻必須在 PR 描述裡給出理由

## 階段 checklist

### 階段 1:PR #A — refactor/98_api-client-logger

- [x] 開 GitHub issue #98
- [x] 切 branch
- [x] 建 `issues/98-codebase-health/` 資料夾
- [ ] 寫 `src/lib/logger.ts`(debug/info/warn/error + context + 可選 POST)
- [ ] 寫 `src/lib/api.ts`(apiFetch<T> signature + 錯誤處理 **由 Dar 決定策略**)
- [ ] 寫 `functions/api/logs/client.ts`(接收 client log,暫存 server console)
- [ ] Migrate 2-3 個 call site 驗證可用
- [ ] `bun run build` 綠
- [ ] `bun run test:e2e` 綠
- [ ] 更新 `src/lib/changelog.ts`
- [ ] 開 PR draft,貼 E2E 截圖

### 階段 2:PR #B — fix/98_left-join-audit(另開 branch)

- [ ] 寫 `scripts/audit-left-join.ts` 掃 `functions/api/**/*.ts`
- [ ] 輸出 report 到 `issues/98-codebase-health/findings.md`
- [ ] 修正發現的違規 query(若有)
- [ ] DB 改動前先 `turso db shell ... ".dump" > ./backups/{YYYYMMDD-HHMM}/pre-phase2.sql`
- [ ] 開 PR draft

### 階段 3:PR #C — refactor/98_admin-panel-split(另開 branch)

- [ ] 規劃 6 個 tab 元件拆分邊界
- [ ] 新檔:`admin/tabs/AdminStats.tsx`、`AdminUsers.tsx`、`AdminAnalytics.tsx`、`AdminAnnouncements.tsx`、`AdminMessages.tsx`、`AdminReports.tsx`
- [ ] `AdminPanel.tsx` 退為 orchestrator(~200 行)
- [ ] 每個新檔 < 500 行
- [ ] 用 Phase 1 的 `apiFetch` 重寫資料層
- [ ] 開 PR draft

## 風險與回退

| 風險 | 回退 |
|------|------|
| `apiFetch` 語意跟既有 fetch 有細微差異造成 regression | Phase 1 只遷移 2-3 處,發現問題就 revert 單檔 |
| LEFT JOIN 修正後查詢結果變少(暴露原本被假 null row 塞進去的資料) | backup.sql + 先在 dry-run branch 測 |
| AdminPanel 拆分破壞 admin 頁面 | E2E 要補 admin 關鍵流程的 spec |

## 決策記錄

見 `findings.md`。
