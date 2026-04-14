# Issue #49 — 積分系統核心（Phase 1）

## 背景

目前打卡、知識投稿、AI 工具投稿、許願樹等行為都已上線，但缺少統一的積分追蹤機制。Phase 1 要建立核心資料表與 API，並在打卡時自動發放積分。

## 目標

1. 建立 `points_ledger` 資料表，作為統一積分流水帳。
2. 提供 `GET /api/points/me`（個人積分與明細）與 `GET /api/points/leaderboard`（積分排行榜）。
3. 打卡成功時自動寫入 `+10` 分到 `points_ledger`。
4. 在 Dashboard 顯示最近積分記錄。
5. 維護 `src/lib/changelog.ts`。

## 積分規則（Phase 1）

| 行為 | 積分 |
|------|------|
| 每日打卡 | +10 |
| 知識投稿 | +20 |
| AI 工具投稿 | +20 |
| 許願 | +5 |
| 認領 | +10 |
| 完成 | +30 |

> 本 PR 僅實作打卡自動發放，其餘行為在後續 Phase 接入。

## Checklist

- [x] 建立 `points_ledger` 資料表（schema 已定義）
- [x] 在 `/api/db/init.ts` 加入 `CREATE TABLE`
- [x] 建立 `/api/points/me` API
- [x] 建立 `/api/points/leaderboard` API
- [x] 在 `/api/checkin` POST 中打卡成功後寫入 `+10` 分
- [x] `DashboardPanel.tsx` 加入「最近積分」顯示區塊
- [x] 更新 `src/lib/changelog.ts`
- [x] `bun run build` 通過
- [x] `bun run test:e2e` — 3 failed / 1 flaky 均為既有問題（homepage title 不含 Cyclone、messages-auth 登入按鈕 strict violation、issue-27 GitHub API flaky），非本次修改造成
- [ ] PR draft 建立並附 E2E 錄影/截圖
