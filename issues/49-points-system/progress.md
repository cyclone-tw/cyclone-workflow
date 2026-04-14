# Issue #49 — 進度日誌

## 2026-04-14

### 已完成

- 建立 `points_ledger` 資料表並更新 `functions/api/db/init.ts`
- 建立 `functions/api/points/me.ts`（支援 `?limit=`）
- 建立 `functions/api/points/leaderboard.ts`（公開排行榜，支援 `?limit=`）
- 修改 `functions/api/checkin/index.ts`，打卡成功後自動插入 `action='checkin', points=10`
- 修改 `src/components/dashboard/DashboardPanel.tsx`，新增「最近積分」區塊（顯示最近 5 筆）
- 更新 `src/lib/changelog.ts`

### 交棒筆記

- 當前 branch: `feat-49-points-system`（worktree 路徑已切換至此）
- 待驗證: `bun run build` 與 `bun run test:e2e`
- 待完成: 建立 PR draft 並附 E2E 錄影/截圖
