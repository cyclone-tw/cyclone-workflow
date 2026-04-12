export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v20260412.2',
    date: '2026-04-12 18:00',
    changes: [
      'fix(#30): API O(n*m) 查找改為 Map — ai-tools tags 和 wishes history 效能優化',
      'fix(#30): 收藏切換競態修正 — 改用 INSERT ON CONFLICT 原子操作避免並發衝突',
      'fix(#30): 打卡 streak 樂觀更新修正 — 優先使用 API 回傳的 stats 資料',
      'fix(#30): 收藏按鈕無障礙 — 補上 aria-label 供螢幕閱讀器使用',
      'fix(#30): 週檢核點 disabled checkbox 改為視覺圓點 — 避免誤導為可互動',
    ],
  },
  {
    version: 'v20260412.1',
    date: '2026-04-12 16:00',
    changes: [
      'fix(#30): AI 工具箱權限修正 — 編輯/刪除需投稿者本人或隊長以上（HIGH）',
      'feat(#30): 儀表板知識貢獻統計卡片 — 顯示知識庫投稿數量（MEDIUM）',
      'feat(#30): 儀表板週檢核點 — 顯示當週進度、目標與時間範圍（MEDIUM）',
      'feat(#30): 積分榜顯示全部成員 — 移除 20 人限制（MEDIUM）',
      'feat(#30): 知識庫成員篩選 — 支援按貢獻者過濾（MEDIUM）',
      'feat(#30): AI 工具箱標籤共用 — 支援 resource_tags 顯示標籤（MEDIUM）',
      'feat(#30): AI 工具箱投稿者顯示 + 成員篩選 — 顯示投稿者頭像與名稱（MEDIUM）',
      'feat(#30): 許願樹狀態歷程追蹤 — 新增 wish_history 表，卡片顯示狀態變化時間軸（MEDIUM）',
      'feat(#30): 知識庫 + AI 工具箱收藏功能 — 新增 resource_favorites 表，卡片愛心按鈕切換收藏（LOW）',
      'feat(#30): API 回傳 is_favorited — knowledge 和 ai-tools GET 端點自動附加登入者收藏狀態（LOW）',
    ],
  },
  {
    version: 'v20260411.5',
    date: '2026-04-12 00:00',
    changes: [
      'fix: 許願樹/知識庫/工具箱/Issues 相對時間顯示修正 — SQLite UTC naive 字串現在會被視為 UTC 而非本地時間（Issue #27）',
      'fix: 討論區長文顯示異常 — 加上 break-words/overflow-wrap 讓 2000 字長字串正常換行（Issue #27）',
      'fix: 討論區按讚 — 修正 emoji 逸出、likeLoading 改為 per-message、成功時同步伺服器 count（Issue #27）',
      'fix: Issues 頁面 GitHub 代理 API — 加上 User-Agent header、5 分鐘邊緣快取，錯誤狀態加上 fallback 連結（Issue #27）',
      'chore: 新增共用 src/lib/time.ts helper（parseServerDate + timeAgo）',
    ],
  },
  {
    version: 'v20260411.4',
    date: '2026-04-11 15:00',
    changes: [
      'feat: Issue #28 — 管理後台成員 CRUD（新增 / 編輯暱稱與 email / 軟刪除封存）',
      'feat: Issue #28 — 未授權 Google 登入者進入待審核狀態，導向 /pending 等待頁',
      'feat: Issue #28 — 管理後台新增「待審核使用者」區塊，一鍵核可 / 拒絕',
      'feat: Issue #28 — 角色指派 / 移除加入二次確認 dialog，防止誤操作',
      'feat: users 表新增 status / archived_at 欄位 + 專用索引',
      'fix: 公開查詢（leaderboard / wishes / knowledge）自動過濾 archived 與 pending 使用者',
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
