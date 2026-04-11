# 功能一覽

> 網站：https://cyclone.tw

## 頁面導覽

| 頁面 | 路徑 | 說明 |
|------|------|------|
| 首頁 | `/` | 標語「把 AI 真的用起來」+ 公告 + 三週時程 |
| 說明 | `/readme` | 使用說明 + 23+ 學習資源連結 |
| 儀表板 | `/dashboard` | 個人打卡統計、連續天數、快速打卡 |
| 積分榜 | `/leaderboard` | 公開排行、前三名頒獎台、連續天數 |
| 團隊 | `/team` | 29 位成員依角色分組 |
| 知識庫 | `/knowledge` | AI 工作流知識 CRUD（分類、搜尋） |
| AI 工具箱 | `/ai-tools` | AI 工具卡片系統（分類篩選） |
| 管家 | `/agent` | Cyclone 管家對話（Letta 長期記憶 Agent） |
| 許願樹 | `/wishlist` | 許願 / 認領 / 實作 / 完成狀態流 |
| 討論區 | `/discuss` | 留言討論 + 按讚 |
| Issues | `/issue` | 本地 Issue + GitHub Issues 雙分頁 |
| Bug | `/bug` | Bug 回報表單（剪貼簿複製） |
| 管理後台 | `/admin` | 站點統計 + 角色管理（需 admin） |
| 架構圖 | `/sitemap` | Mermaid 網站架構圖 |
| 版本紀錄 | `/changelog` | 所有版本 changelog |

## 核心功能

### 登入系統
- Google OAuth 2.0 登入
- 自動比對種子用戶（依名稱對應 email）
- 新用戶自動建立 companion 角色
- Session cookie 管理（7 天有效）

### 每日打卡
- 一日一次打卡（UNIQUE 約束）
- 連續天數（Streak）計算，容忍「昨天起算」
- 累計積分系統（每次 +10 分）

### 知識庫
- CRUD 完整操作（需登入）
- 四種分類：template / best-practice / qa / other
- 搜尋 + 分類篩選
- 只有作者可編輯/刪除

### 許願樹
- 四階段狀態流：pending → claimed → in-progress → completed
- 任何人可許願，任何人可認領
- 只有許願者可刪除

### Cyclone 管家
- Letta 長期記憶 Agent（記住每位成員的背景和進度）
- Persona 包含：核心使命、6 項能力、網站功能指引
- 每次對話自動同步最新 Persona
- 對話歷史存入 Turso DB

### 管理後台
- 站點統計（用戶數、打卡數、知識數、願望數、留言數）
- 角色管理（新增/移除角色、搜尋篩選）
- 防鎖定：不能移除自己的管理權限

### GitHub Issues 整合
- 雙分頁 UI：本地 Issues / GitHub Issues
- 代理 API 避免 CORS + 可設 GITHUB_TOKEN 提高限額
- 顯示標籤顏色、留言數、头像

## 主題系統
- 深色 cyberpunk 主題（預設）
- 淺色主題切換（Navbar 右上角按鈕）
- 跟隨系統 `prefers-color-scheme`
- localStorage 記憶選擇
