export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '',
    date: '2026-04-18',
    changes: [
      'fix(#106): 討論區發文/回覆/編輯輸入框改為自動隨內容高度擴展，移除固定 rows 限制',
      'fix(#106): 討論區留言顯示保留使用者換行，加入 remark-breaks 讓單一 \\n 渲染為 <br>',
      'feat(#97): 討論區留言回覆串 — messages 表新增 parent_id 欄位、回覆 API（單層巢狀）、前端回覆按鈕 + inline form + 縮排顯示',
      'feat(#97): 回覆留言支援按讚/編輯/刪除/檢舉，不支援置頂',
      'refactor(#97): MessageCard / ReplyForm 抽出獨立元件，MessageBoard 954→290 行',
    ],
  },
  {
    version: '',
    date: '2026-04-17',
    changes: [
      'refactor(#98): 新增 src/lib/api.ts 統一 apiFetch<T>() client — discriminated union 回傳、整合 logger、消除 fetch → json → data.ok → throw 四步樣板',
      'refactor(#98): 新增 src/lib/logger.ts 分層 log(debug/info/warn/error)+ context 物件,client error 自動 POST 到 /api/logs/client',
      'refactor(#98): 新增 functions/api/logs/client.ts 接收端,4KB body 上限 + 白名單 shape 驗證,倒進 Cloudflare Pages log stream',
      'refactor(#98): Migrate AnnouncementBanner / BugForm 兩處 call site 當 POC,驗證 apiFetch 與現有 endpoint convention 相容',
    ],
  },
  {
    version: '',
    date: '2026-04-17',
    changes: [
      'chore(#98): LEFT JOIN 黃金規則 5 稽核 — 新增 scripts/audit-left-join.ts,掃 49 個 API endpoint 的 11 處 LEFT JOIN,0 處違規',
      'docs(#98): issues/98-codebase-health/phase2-audit-report.md — 逐 query 標註 alias 狀態 + 工具限制說明',
    ],
  },
  {
    version: '',
    date: '2026-04-16',
    changes: [
      'feat(#89): 知識庫 / AI 工具箱 Markdown 渲染支援 — 支援 GFM 語法（表格、刪除線等），所有內容經 XSS 防護過濾',
      'feat(#90): 知識庫/AI工具箱留言回饋機制 — resource_comments 表、API、前端留言區',
      'feat(#90): 收到 resource 留言時投稿者自動獲得 +2 積分',
      'fix(#90): 修復 Dashboard 累計積分未正確顯示 points_ledger 總分問題',
      'fix(#88): AI 工具箱成員篩選下拉選單無內容 — 補上 fetchMembers useEffect',
      'feat(#51-E6): 討論區留言檢舉機制 — message_reports 表 + POST /api/messages/:id/report + GET/DELETE /api/admin/reports + 前端檢舉按鈕與對話框 + Admin Panel 檢舉管理 + 被檢舉 3 次自動隱藏',
    ],
  },
  {
    version: '',
    date: '2026-04-15 17:45',
    changes: [
      'security(#51-E4): 討論區 Markdown XSS 防護 — URL 白名單、標籤/屬性白名單、img src 限制 https',
      'feat(#51): 討論區排序選項 — 支援最新 / 最舊 / 最多回饋，置頂留言始終在最上方',
      'feat(#51): 討論區留言軟刪除 — 新增 deleted_at/deleted_by 欄位，軟刪除而非實體刪除',
      'feat(#51): 討論區留言編輯功能 — 作者/管理員可編輯、顯示已編輯標記、PATCH /api/messages/:id',
      'feat(#51): 討論區留言分類重設計 — 閒聊/成果分享/問題/建議',
      'feat(#51): 討論區置頂留言 — 管理員可置頂/取消置頂，置頂留言顯示於最上方',
    ],
  },
  {
    version: '',
    date: '2026-04-15 16:25',
    changes: [
      'feat(#50): 知識庫成員篩選改 API — /api/members 動態取得未封存成員',
      'feat(#50): AI 工具箱成員篩選改 API — 共用 /api/members',
      'feat(#50): 知識庫投稿新增「相關連結」欄位（選填）',
      'feat(#50): AI 工具箱投稿新增「GitHub Repo URL」欄位（選填）',
    ],
  },
  {
    version: '',
    date: '2026-04-15 00:15',
    changes: [
      'fix(#69): 公告系統前台修正 — 移除 X 按鈕、顯示 3 則公告、支援換行、字體放大',
    ],
  },
  {
    version: '',
    date: '2026-04-15 00:20',
    changes: [
      'fix(#70): Issue 頁面留言權限控制 — 未登入隱藏輸入框、後端 requireAuth 驗證',
    ],
  },
  {
    version: 'v20260414.1451',
    date: '2026-04-14 23:55',
    changes: [
      'feat(#60): WishBoard 前端重設計 — 多人認領頭像列表、認領者 claimed/completed badge、完成確認按鈕',
      'feat(#60): 許願卡片新增留言區塊（展開/收納 + 輸入框 + 即時提交）',
      'feat(#60): 認領者區塊新增「投稿到工具箱」連結按鈕',
    ],
  },
  {
    version: 'v20260414.1145',
    date: '2026-04-14 23:45',
    changes: [
      'feat(#60): 許願樹認領重設計 — wish_claimers 表（多人認領）+ wish_comments 表（留言）+ 完整 CRUD API',
      'feat(#60): PATCH /api/wishes/:id 新增 "claim"（多人認領）+ "complete"（完成確認 + 獎勵 +100 積分）',
      'feat(#60): GET /api/wishes 及 GET /api/wishes/:id 回傳 claimers[] + comments_count',
      'feat(#60): 遷移 legacy wishes.claimer_id → wish_claimers（INSERT OR IGNORE 防重複）',
    ],
  },
  {
    version: 'v20260414.1135',
    date: '2026-04-14 22:45',
    changes: [
      'feat(#49): Phase 1 — 積分系統核心（points_ledger 資料表 + /api/points/me + /api/points/leaderboard）',
      'feat(#49): 打卡成功自動寫入 +10 積分到 points_ledger',
      'feat(#49): DashboardPanel 新增「最近積分」區塊，顯示最近 5 筆積分記錄',
    ],
  },
  {
    version: '',
    date: '2026-04-14 23:00',
    changes: [
      'feat(#50): 標籤系統 Phase 1 MVP — 新增 resource_tags 表 sort_order 欄位、/api/tags CRUD API（GET/POST/PATCH/DELETE）、知識庫與 AI 工具箱標籤篩選改為 API 動態載入',
    ],
  },
  {
    version: '',
    date: '2026-04-14 22:20',
    changes: [
      'fix(#52): Bug 回報表單串接後端 — 提交到 /api/issues + 成功後顯示追蹤連結',
    ],
  },
  {
    version: '',
    date: '2026-04-14 22:15',
    changes: [
      'feat(#53): 許願樹分類重設計 — 個人需求/功能建議/教學許願 + 前端 filter + site→feature 遷移',
    ],
  },
  {
    version: '',
    date: '2026-04-14 20:40',
    changes: [
      'feat(#51): 討論區管理增強 — 留言刪除功能（作者/管理員）、Markdown 渲染、author_id schema 遷移',
    ],
  },
  {
    version: '',
    date: '2026-04-14 21:30',
    changes: [
      'fix(#59): 知識庫 + AI 工具箱卡片內容溢出修正 — overflowWrap/break-word + 展開/收納功能',
    ],
  },
  {
    version: '',
    date: '2026-04-14 01:05',
    changes: [
      'fix(#22): OAuth callback 隊長帳號仍排除於 name matching（安全），但 email exact match 可正確配對',
    ],
  },
  {
    version: '',
    date: '2026-04-13 23:30',
    changes: [
      'docs(#55): 新增 wiki/meeting-20260413.md — 2026-04-13 共學團啟動會議記錄',
    ],
  },
  {
    version: '',
    date: '2026-04-13 23:10',
    changes: [
      'feat(#47): 討論區留言改為僅登入用戶可發表 — 未登入顯示登入提示，隱藏輸入框',
    ],
  },
  {
    version: 'v20260413.1',
    date: '2026-04-13 22:20',
    changes: [
      'feat(#41): 最新公告系統 — 資料表 + CRUD API + 管理後台 + 首頁橫幅元件',
      'test(#41): Vitest unit/integration 15 tests + Playwright E2E 9 tests（含功能未部署自動 skip）',
    ],
  },
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
