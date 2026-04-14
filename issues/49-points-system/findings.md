# Issue #49 — 研究發現與決策記錄

## 決策記錄

1. **points_ledger 作為單一積分來源**
   - 既有 `checkins.points` 欄位保留不動，未來 leaderboard 可逐步遷移到 `points_ledger`，但 Phase 1 不強制遷移，避免影響現有排行榜邏輯。

2. **ref_type / ref_id 設計**
   - `ref_type` 用來標記積分來源類型（如 `checkin`、`knowledge`、`wish`），`ref_id` 則指向該來源的具體記錄 ID，方便除錯與未來撤銷積分。

3. **DashboardPanel 積分顯示策略**
   - 不改動既有 stats grid，而是在下方新增「最近積分」獨立區塊，減少對原有 UI 的衝擊，也讓用戶能看到積分明細。

## 問題 / 假設

- 暫無。
