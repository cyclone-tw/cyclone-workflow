# 角色與權限

> Cyclone 使用 RBAC（角色型存取控制），共 5 個等級：captain > tech > admin > member > companion。高等級自動繼承低等級所有權限，例如 captain 可做任何事，陪跑員可打卡、知識庫 CRUD、許願樹、討論區按讚。

## RBAC 階級

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#6C63FF', 'primaryTextColor': '#fff', 'primaryBorderColor': '#6C63FF', 'lineColor': '#00D9FF', 'secondaryColor': '#16213e', 'tertiaryColor': '#1a1a2e' }}}%%
graph TD
    Captain["👑 captain<br/>隊長 · 等級 100"]
    Tech["🔧 tech<br/>技術維護 · 等級 80"]
    Admin["📝 admin<br/>行政協作 · 等級 60"]
    Member["🎯 member<br/>正式隊員 · 等級 20"]
    Companion["🏃 companion<br/>陪跑員 · 等級 10"]

    Captain --> Tech --> Admin --> Member --> Companion

    style Captain fill:#6C63FF,stroke:#fff,color:#fff
    style Tech fill:#00D9FF,stroke:#fff,color:#1a1a2e
    style Admin fill:#00F5A0,stroke:#fff,color:#1a1a2e
    style Member fill:#E94560,stroke:#fff,color:#fff
    style Companion fill:#A78BFA,stroke:#fff,color:#fff
```

**規則**：高等級自動擁有低等級的所有權限。

## 權限對照

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#6C63FF', 'primaryTextColor': '#fff', 'primaryBorderColor': '#6C63FF', 'lineColor': '#00D9FF', 'secondaryColor': '#16213e', 'tertiaryColor': '#1a1a2e' }}}%%
graph LR
    subgraph Permissions["功能權限"]
        P1["🔐 登入 / 打卡"]
        P2["📚 知識庫 CRUD"]
        P3["🌳 許願樹"]
        P4["❤️ 討論區按讚"]
        P5["🛡️ 管理後台"]
        P6["👥 角色管理"]
        P7["💾 DB 初始化"]
    end

    P1 --> Companion2["companion ✓"]
    P2 --> Companion2
    P3 --> Companion2
    P4 --> Companion2

    P5 --> Admin2["admin+ ✓"]
    P6 --> Admin2
    P7 --> Tech2["tech+ ✓"]

    style Companion2 fill:#A78BFA,color:#fff
    style Admin2 fill:#00F5A0,color:#1a1a2e
    style Tech2 fill:#00D9FF,color:#1a1a2e
```

| 功能 | companion | member | admin | tech | captain |
|------|:---------:|:------:|:-----:|:----:|:-------:|
| 登入 / 打卡 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 知識庫 CRUD | ✓ | ✓ | ✓ | ✓ | ✓ |
| 許願樹 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 討論區按讚 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 管理後台 | ✗ | ✗ | ✓ | ✓ | ✓ |
| 角色管理 | ✗ | ✗ | ✓ | ✓ | ✓ |
| DB 初始化 | ✗ | ✗ | ✗ | ✓ | ✓ |

## 成員分布

```mermaid
pie title 29 位成員角色分布
    "隊長 (captain)" : 1
    "技術維護 (tech)" : 2
    "行政協作 (admin)" : 2
    "正式隊員 (member)" : 5
    "陪跑員 (companion)" : 19
```

## 實作

- 權限檢查：`src/lib/auth.ts` — `requireAuth()` + `requireRole()`
- 前端判斷：`src/components/auth/useAuth.ts` — `isRole()`
- 管理後台：`src/components/admin/AdminPanel.tsx`
- 角色管理 API：`functions/api/admin/roles.ts`（PUT）

## 角色管理流程

```mermaid
sequenceDiagram
    actor Admin as 管理員
    participant UI as AdminPanel
    participant API as /api/admin/roles
    participant DB as Turso DB

    Admin->>UI: 搜尋成員
    UI->>API: GET /api/admin/roles
    API->>DB: SELECT users + user_roles
    DB-->>API: 成員列表
    API-->>UI: 顯示成員和角色

    Admin->>UI: 選擇角色 → 新增
    UI->>UI: 樂觀更新 UI
    UI->>API: PUT { user_id, role, action: "add" }
    API->>DB: INSERT user_roles
    DB-->>API: 成功
    API-->>UI: 確認

    Note over UI: 如果 API 失敗，自動 rollback UI
```

## 角色管理

透過管理後台 `/admin` 頁面操作：
1. 登入後，admin 以上角色可存取
2. 搜尋成員 → 下拉選擇角色 → 新增/移除
3. 不能移除自己的管理權限（防鎖定）
