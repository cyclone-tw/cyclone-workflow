export const VERSION = 'v20260409.1012';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
