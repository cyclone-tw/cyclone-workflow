export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v20260411.4',
    date: '2026-04-11 12:20',
    changes: [
      'fix: 許願樹時間顯示異常 — timeAgo 補 UTC 時區標記，解決台灣時區 +8 小時誤差',
      'fix: 討論區長文顯示異常 — 訊息內容加入 overflow-wrap: break-word 防止溢出',
      'fix: 討論區按讚圖示損壞 — 修正 \\U0001F90D 非法 Unicode 跳脫序列（改為 🤍）',
      'fix: Issues 時間顯示異常 — IssueBoard timeAgo 同步 UTC 修正（相容 SQLite 與 GitHub ISO 8601）',
      'fix: GitHub Issues 載入失敗時顯示跳轉連結，方便直接前往 GitHub 查看',
      'fix: GitHub Issues API 加入 User-Agent header，避免 GitHub API 403 拒絕',
    ],
  },
  {
    version: 'v20260411.3',
    date: '2026-04-11 12:00',
    changes: [
      'fix: OAuth name matching 安全強化 — prefix-only + 最少 4 字元防誤匹配',
    ],
  },
  {
    version: 'v20260411.2',
    date: '2026-04-11 09:00',
    changes: [
      'fix: OAuth callback 加入 substring name matching 防止重複帳號（Issue #22）',
      'fix: 隊長 email 更新為 cyclonetw@gmail.com',
    ],
  },
  {
    version: 'v20260411.1',
    date: '2026-04-11 01:00',
    changes: [
      'feat: Issue #17 Phase 4 — GitHub Issues 整合（雙分頁：本地 + GitHub）',
      'feat: GitHub Issues 代理 API（/api/github/issues，可選 GITHUB_TOKEN 提高限額）',
      'feat: IssueBoard 雙分頁 UI — 本地 Issues / GitHub Issues 切換',
      'feat: Cyclone 管家 Persona 大幅強化（代號帽、核心使命、6 項能力、網站功能指引）',
      'feat: 管家 Persona 同步機制 — context.waitUntil() 背景更新 Letta agent',
      'feat: 管家頁面副標更新為「幫你把 AI 真的用起來」',
    ],
  },
  {
    version: 'v20260410.3',
    date: '2026-04-10 21:20',
    changes: [
      'feat: Issue #17 Phase 2-3 — 知識庫 CRUD（API + KnowledgeBoard React island）',
      'feat: 許願樹改版 — WishBoard React island（許願/認領/實作/完成狀態流）',
      'feat: 儀表板個人化 — DashboardPanel（登入提示/統計/快速打卡）',
      'feat: 積分榜頁面 — LeaderboardBoard（前三名頒獎台 + 排行表）',
      'feat: 管理後台 — AdminPanel（站點統計/角色管理/搜尋篩選）',
      'feat: 討論區按讚 — MessageBoard 整合愛心按讚功能',
    ],
  },
  {
    version: 'v20260410.2',
    date: '2026-04-10 18:00',
    changes: [
      'feat: Issue #17 Phase 1 — Google OAuth 登入 + RBAC 權限系統',
      'feat: 每日打卡系統 — POST /api/checkin + UNIQUE 防重複打卡',
      'feat: 打卡統計 API — GET /api/checkin/stats + leaderboard',
      'feat: Session cookie — 30 天有效 + Secure + HttpOnly + SameSite=Lax',
    ],
  },
  {
    version: 'v20260410.1',
    date: '2026-04-10 14:00',
    changes: [
      'feat: Issue #17 Phase 0 — 導覽列改版 + 首頁改版 + 團隊頁改版',
      'feat: 全站深色 cyberpunk 主題 + 淺色模式切換',
      'feat: Tailwind CSS v4 整合 + 雙主題 CSS 變數',
    ],
  },
  {
    version: 'v20260409.1',
    date: '2026-04-09 20:00',
    changes: [
      'feat: 深色/淺色雙主題切換功能（首頁 demo）',
      'feat: AI 工具箱知識卡片 CRUD（/knowledge）',
    ],
  },
  {
    version: 'v20260408.1',
    date: '2026-04-08 22:00',
    changes: [
      'feat: 初始版本上線',
      'feat: Turso DB schema + Cloudflare Pages Functions API',
      'feat: 討論區 + 管家對話 + Issue 追蹤系統',
      'feat: 版本號 + Changelog 自動生成',
    ],
  },
];
