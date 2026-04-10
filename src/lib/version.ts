export const VERSION = 'v20260410.1614';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
      'feat: 討論區按讚 — MessageBoard 心形按讚 toggle（樂觀更新 + rollback）',
      'feat: API 新增 wishes/:id PATCH/DELETE、knowledge/:id PATCH/DELETE、admin/stats、admin/roles、messages/likes',
    ],
  },
  {
    version: 'v20260410.2',
    date: '2026-04-10 19:10',
    changes: [
      'feat: Issue #17 Phase 1 — Google OAuth 登入系統（login/callback/logout/me）',
      'feat: 角色權限 Middleware（RBAC：captain > tech > admin > member > companion）',
      'feat: 前端 Auth UI — useAuth hook + LoginButton（Google 登入按鈕 + 用戶下拉選單）',
      'feat: 每日打卡系統 — POST/GET /api/checkin + Streak 連續天數計算',
      'feat: 打卡統計 API（/api/checkin/stats）+ 公開排行榜（/api/checkin/leaderboard）',
      'feat: DB 新增 checkins 表（UNIQUE 約束防止重複打卡）',
    ],
  },
  {
    version: 'v20260410.1',
    date: '2026-04-10 10:00',
    changes: [
      'feat: Issue #17 Phase 0 — 導覽列重新排序（說明提前、移除 QA/兌換區）',
      'feat: 首頁改版 — 新標語「把 AI 真的用起來」+ 公告區 + 三週時程',
      'feat: 團隊頁改版 — 29 位成員依角色分組（隊長/技術/行政/隊員/陪跑）',
      'feat: 移除交換機制與成果展示區塊，團隊頁回歸純成員列表',
      'feat: 導覽列新增 AI 工具箱提前、管家圖示改為 🎩',
    ],
  },
  {
    version: 'v20260409.2',
    date: '2026-04-09 18:20',
    changes: [
      'feat: 首頁支援深色 / 淺色主題切換（#16）— Navbar 右上角 ☀️/🌙 按鈕',
      'feat: 首次造訪跟隨系統 prefers-color-scheme，之後記憶 localStorage',
      'feat: 重構 global.css 加入 [data-theme="light"] 變數組 + helper vars',
      'feat: Layout 加入 FOUC 防護 inline script，切換時無閃爍',
    ],
  },
  {
    version: 'v20260409.1',
    date: '2026-04-09 22:00',
    changes: [
      'feat: 新增 /ai-tools AI 工具箱頁面 — Turso DB CRUD 卡片系統',
      'feat: 工具卡片含名稱、簡介、連結、分類篩選',
      'feat: Modal 彈窗式新增/編輯 + 刪除確認',
    ],
  },
  {
    version: 'v20260408.1',
    date: '2026-04-08 23:30',
    changes: [
      'feat: 新增 /exchange 兌換區頁面 — Cyclone Coin 貨幣系統',
      'feat: 三大道具卡片（靈魂交換槍、憤怒早安音檔、大神兵）',
      'feat: 四種神秘寶箱（銅/銀/金/傳說）含獎勵預覽',
      'feat: Coin 獲取方式說明（簽到/任務/願望/Bug回報）',
    ],
  },
  {
    version: 'v20260407.10',
    date: '2026-04-07 23:48',
    changes: [
      'feat: 管家對話歷史紀錄 — 每次對話自動存入 Turso DB',
      'feat: 歷史分頁瀏覽（每頁 10 筆）+ 搜尋功能',
      'feat: ChatBox 新增「對話/歷史」切換 tab',
    ],
  },
  {
    version: 'v20260407.9',
    date: '2026-04-07 23:20',
    changes: [
      'fix: 修正 Issue 頁面無法顯示列表 (API response parsing)',
      'feat: 新增 /sitemap 網站架構圖 (Mermaid flowchart)',
    ],
  },
  {
    version: 'v20260407.8',
    date: '2026-04-07 23:15',
    changes: [
      'feat: 新增 /issue 頁面 — GitHub Issues 風格的問題追蹤系統',
      'feat: Issue 支援分類（bug/feature/improvement/question）、優先級、狀態流轉',
      'feat: Issue 留言功能，可追蹤討論',
      'feat: Issue 可對應 changelog 版本號，追蹤修復進度',
      'feat: Turso DB 新增 issues + issue_comments 表',
    ],
  },
  {
    version: 'v20260407.7',
    date: '2026-04-07 23:00',
    changes: [
      'fix: 修正管家聊天 IME 中文輸入法 Enter 鍵送出問題',
      'feat: 新增版本號系統 + /changelog 頁面',
    ],
  },
  {
    version: 'v20260407.6',
    date: '2026-04-07 22:58',
    changes: [
      'fix: 修正 Letta API 訊息格式 (messages 陣列)',
      'fix: 修正回應解析 (message_type + content)',
      'feat: Cyclone 管家正式上線 (cyclone/MiniMax-M2.7)',
    ],
  },
  {
    version: 'v20260407.5',
    date: '2026-04-07 22:21',
    changes: [
      'feat: 新增 Google Tag Manager (GTM-TW4TS9CX)',
    ],
  },
  {
    version: 'v20260407.4',
    date: '2026-04-07 22:16',
    changes: [
      'feat: 新增 /discuss 討論區 (Turso DB + Pages Functions)',
      'feat: 首頁整合 Gemini AI 生成的 hero 背景 + 4 張特色卡片圖',
      'feat: 更新 site URL 為 cyclone.tw',
    ],
  },
  {
    version: 'v20260407.3',
    date: '2026-04-07 21:39',
    changes: [
      'feat: 新增 /readme 使用說明頁面 (23+ 學習資源連結)',
      'feat: 新增 /bug 回報表單頁面 (剪貼簿複製)',
    ],
  },
  {
    version: 'v20260407.2',
    date: '2026-04-07 21:14',
    changes: [
      'feat: 新增 /qa QA 知識集 (AES-GCM 加密密碼保護)',
      'feat: 新增 /agent Cyclone 管家頁面 + 聊天 UI',
      'feat: 整合 Letta API 長期記憶 Agent',
      'feat: 整合 Turso LibSQL 資料庫 (5 張表 + 6 位成員)',
      'feat: Cloudflare Pages Functions API 路由',
    ],
  },
  {
    version: 'v20260407.1',
    date: '2026-04-07 21:00',
    changes: [
      'feat: 初始版本 — Bun + Astro + Tailwind CSS v4',
      'feat: 首頁 / 儀表板 / 團隊 / 知識庫 / 許願樹 (5 頁)',
      'feat: 部署到 Cloudflare Pages (ifangdar@gmail.com)',
      'feat: 深色 cyberpunk 主題設計',
    ],
  },
];
