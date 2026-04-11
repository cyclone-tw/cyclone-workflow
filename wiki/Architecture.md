# 架構概覽

> 本頁說明 Cyclone 網站的整體架構：前端用 Astro SSG + React Islands，後端用 Cloudflare Pages Functions，資料庫用 Turso (LibSQL)，認證用 Google OAuth 2.0，AI 管家用 Letta API。

## 系統架構圖

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#6C63FF', 'primaryTextColor': '#fff', 'primaryBorderColor': '#6C63FF', 'lineColor': '#00D9FF', 'secondaryColor': '#16213e', 'tertiaryColor': '#1a1a2e' }}}%%
graph TB
    subgraph Browser["🌐 使用者瀏覽器"]
        Astro["Astro SSG<br/>靜態 HTML"]
        React["React Islands<br/>client:load"]
    end

    subgraph CF["☁️ Cloudflare Pages"]
        subgraph API["Pages Functions"]
            Auth["/api/auth<br/>Google OAuth"]
            Checkin["/api/checkin<br/>打卡系統"]
            Knowledge["/api/knowledge<br/>知識庫 CRUD"]
            Wishes["/api/wishes<br/>許願樹"]
            Agent["/api/agent/chat<br/>管家對話"]
            Admin["/api/admin<br/>管理後台"]
            GitHub["/api/github/issues<br/>GitHub 代理"]
            Messages["/api/messages<br/>討論區"]
        end
    end

    subgraph External["🌍 外部服務"]
        Google["Google OAuth 2.0"]
        Turso["Turso DB<br/>(LibSQL)"]
        Letta["Letta API<br/>長期記憶 Agent"]
        GHAPI["GitHub REST API"]
    end

    Astro --> React
    React -->|"fetch()"| API

    Auth --> Google
    Auth --> Turso
    Checkin --> Turso
    Knowledge --> Turso
    Wishes --> Turso
    Agent --> Letta
    Agent --> Turso
    Admin --> Turso
    GitHub --> GHAPI
    Messages --> Turso

    style Browser fill:#1a1a2e,stroke:#6C63FF,color:#fff
    style CF fill:#0d1117,stroke:#00D9FF,color:#fff
    style External fill:#1a1a2e,stroke:#00F5A0,color:#fff
    style API fill:#16213e,stroke:#E94560,color:#fff
```

## 技術棧

| 層級 | 技術 | 用途 |
|------|------|------|
| Frontend | Astro 6 + React | SSG 頁面 + React islands |
| Styling | Tailwind CSS v4 | 深色 cyberpunk 主題 + 淺色模式 |
| Backend | Cloudflare Pages Functions | API 端點（`functions/api/`） |
| Database | Turso (LibSQL) | 雲端 SQLite，edge-friendly |
| Auth | Google OAuth 2.0 | 登入/回調/Session |
| AI Agent | Letta API | Cyclone 管家長期記憶 |
| Hosting | Cloudflare Pages | 自動部署（push to main） |

## 目錄結構

```
cyclone-26/
├── functions/api/          # Cloudflare Pages Functions (API)
│   ├── agent/chat.ts       # 管家聊天（Letta 代理）
│   ├── auth/               # OAuth（login/callback/logout/me）
│   ├── checkin/            # 打卡（POST/GET stats/leaderboard）
│   ├── db/init.ts          # Schema 初始化 + migration
│   ├── github/issues.ts    # GitHub Issues 代理
│   ├── admin/              # 管理後台（stats/roles）
│   ├── knowledge/          # 知識庫 CRUD
│   ├── wishes/             # 許願樹 CRUD
│   └── messages/           # 討論區 + 按讚
├── src/
│   ├── components/         # React islands（*.tsx）
│   │   ├── auth/           # useAuth hook + LoginButton
│   │   ├── dashboard/      # 儀表板
│   │   ├── knowledge/      # 知識庫
│   │   ├── wishlist/       # 許願樹
│   │   ├── leaderboard/    # 積分榜
│   │   ├── admin/          # 管理後台
│   │   ├── issues/         # Issue 追蹤
│   │   └── discuss/        # 討論區
│   ├── layouts/            # Astro Layout
│   ├── lib/                # 常數、auth 工具、版本
│   └── pages/              # Astro 頁面（SSG）
├── wiki/                   # GitHub Wiki 文件
└── public/                 # 靜態資源
```

## OAuth 登入流程

```mermaid
sequenceDiagram
    actor User as 使用者
    participant Browser as 瀏覽器
    participant CF as Cloudflare Pages
    participant Google as Google OAuth
    participant Turso as Turso DB

    User->>Browser: 點擊「登入」
    Browser->>CF: GET /api/auth/login
    CF-->>Browser: Set-Cookie: oauth_state + 302 → Google
    Browser->>Google: OAuth 授權頁面
    User->>Google: 選擇帳號並同意
    Google-->>Browser: 302 → /api/auth/callback?code=...&state=...
    Browser->>CF: GET /api/auth/callback
    CF->>CF: 驗證 state cookie
    CF->>Google: 交換 code → access_token
    CF->>Google: 取得使用者資料
    CF->>Turso: 查詢/建立使用者
    CF-->>Browser: Set-Cookie: session + 302 → /
    Browser->>User: 登入完成 ✓
```

## OAuth 已知問題：重複帳號（Issue #22）

Seed 用戶 email 預設為空字串，OAuth callback 以 email 查詢時找不到配對，會建立新的 UUID 帳號。

```mermaid
flowchart TD
    A["Google OAuth 回調"] --> B{"查 email<br/>users WHERE email = ?"}
    B -->|"找到"| C["更新 name/avatar ✓<br/>保留原角色"]
    B -->|"找不到（seed email=''）"| D{"Fallback：<br/>查 name + email='' ?"}
    D -->|"name 完全匹配"| E["認領 seed 帳號 ✓"]
    D -->|"name 不匹配<br/>（如 Cyclone ≠ Cyclone Kang）"| F["建立新帳號 ✗<br/>companion 角色"]
    F --> G["重複帳號 + UNIQUE 衝突"]

    style C fill:#00F5A0,color:#1a1a2e
    style E fill:#00F5A0,color:#1a1a2e
    style G fill:#E94560,color:#fff
```

**Hotfix 已處理**：隊長帳號已合併，email 已更新為 `cyclonetw@gmail.com`。
**長期方案**：見 [Issue #22](https://github.com/cyclone-tw/cyclone-workflow/issues/22)。

## 打卡資料流

```mermaid
flowchart TD
    A["使用者點擊「今日打卡」"] --> B{今天已打卡？}
    B -->|是| C["顯示「今日已打卡 ✓」"]
    B -->|否| D["POST /api/checkin"]
    D --> E{需登入？}
    E -->|未登入| F["跳轉登入"]
    E -->|已登入| G["Turso: INSERT checkins"]
    G --> H{UNIQUE 衝突？}
    H -->|是| I["回傳「今天已打過卡」"]
    H -->|否| J["回傳 points: 10"]
    J --> K["前端樂觀更新<br/>+積分 +天數 +Streak"]

    style A fill:#6C63FF,color:#fff
    style J fill:#00F5A0,color:#1a1a2e
    style C fill:#1a1a2e,stroke:#00F5A0,color:#00F5A0
```

## 部署流程

```mermaid
flowchart LR
    Dev["👨‍💻 開發者"] -->|"git push origin main"| GH["GitHub Repo"]
    GH -->|"webhook"| CF["Cloudflare Pages"]
    CF -->|"bun install<br/>&& bun build"| Build["Build"]
    Build -->|"部署"| CDN["☁️ cyclone.tw"]
    CDN --> Users["🌍 使用者"]

    style Dev fill:#6C63FF,color:#fff
    style GH fill:#1a1a2e,stroke:#E94560,color:#fff
    style CF fill:#1a1a2e,stroke:#00D9FF,color:#fff
    style CDN fill:#00F5A0,color:#1a1a2e
```

## React Islands 模式

Astro 頁面載入靜態骨架，互動區塊用 React islands 渲染：

```astro
---
// src/pages/dashboard/index.astro
import DashboardPanel from '@/components/dashboard/DashboardPanel';
---
<DashboardPanel client:load />
```

每個 island 獨立管理自己的 state、fetch、UI 更新。

```mermaid
graph LR
    subgraph Astro["Astro SSG 頁面"]
        HTML["靜態 HTML 骨架"]
    end

    subgraph Islands["React Islands (client:load)"]
        D["DashboardPanel"]
        K["KnowledgeBoard"]
        W["WishBoard"]
        L["LeaderboardBoard"]
        A["AdminPanel"]
        I["IssueBoard"]
        M["MessageBoard"]
    end

    HTML --- D
    HTML --- K
    HTML --- W
    HTML --- L
    HTML --- A
    HTML --- I
    HTML --- M

    D -->|"fetch"| API["/api/checkin/*"]
    K -->|"fetch"| API2["/api/knowledge/*"]
    W -->|"fetch"| API3["/api/wishes/*"]

    style Astro fill:#1a1a2e,stroke:#6C63FF,color:#fff
    style Islands fill:#16213e,stroke:#00D9FF,color:#fff
```
