# 資料庫 Schema

> Turso (LibSQL) — 雲端 SQLite，edge-friendly 的分佈式資料庫。資料庫名稱：`cyclone-26`，Region：aws-ap-northeast-1。部署時自動初始化（`POST /api/db/init`），支援 migration 補欄機制。

## ER 圖

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#6C63FF', 'primaryTextColor': '#fff', 'primaryBorderColor': '#6C63FF', 'lineColor': '#00D9FF', 'secondaryColor': '#16213e', 'tertiaryColor': '#1a1a2e' }}}%%
erDiagram
    users ||--o{ user_roles : "has roles"
    users ||--o{ sessions : "has sessions"
    users ||--o{ checkins : "checks in"
    users ||--o{ knowledge_entries : "contributes"
    users ||--o{ wishes : "wishes"
    users ||--o{ discussion_likes : "likes"

    users {
        TEXT id PK
        TEXT email UK
        TEXT name
        TEXT avatar_url
        TEXT discord_id
        TEXT preferences
        TEXT created_at
        TEXT updated_at
    }

    user_roles {
        TEXT id PK
        TEXT user_id FK
        TEXT role
        TEXT assigned_at
    }

    sessions {
        TEXT id PK
        TEXT user_id FK
        TEXT token UK
        TEXT expires_at
    }

    checkins {
        TEXT id PK
        TEXT user_id FK
        TEXT checkin_date
        TEXT note
        INTEGER points
    }

    knowledge_entries {
        TEXT id PK
        TEXT title
        TEXT content
        TEXT category
        TEXT icon
        TEXT contributor_id FK
        INTEGER upvotes
    }

    wishes {
        TEXT id PK
        TEXT title
        TEXT description
        TEXT category
        TEXT status
        TEXT wisher_id FK
        TEXT claimer_id FK
        TEXT icon
        INTEGER points
    }

    discussion_likes {
        TEXT id PK
        INTEGER message_id
        TEXT user_id FK
    }
```

## 表結構

### `users` — 使用者

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | TEXT PK | 使用者 ID（種子用戶為簡稱，新用戶為 UUID） |
| email | TEXT | Google 帳號 email（UNIQUE） |
| name | TEXT | 顯示名稱 |
| avatar_url | TEXT | Google 頭像 URL |
| discord_id | TEXT | Discord ID（保留） |
| preferences | TEXT | JSON 偏好設定 |
| created_at | TEXT | 建立時間 |
| updated_at | TEXT | 更新時間 |

### `user_roles` — 角色對應

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK → users | 使用者 |
| role | TEXT | captain / tech / admin / member / companion |
| assigned_at | TEXT | 指派時間 |

UNIQUE(user_id, role)

### `sessions` — 登入 Session

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK → users | 使用者 |
| token | TEXT UNIQUE | Session token |
| expires_at | TEXT | 過期時間 |
| created_at | TEXT | 建立時間 |

### `checkins` — 每日打卡

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK → users | 使用者 |
| checkin_date | TEXT | 日期 `YYYY-MM-DD`（本地時間） |
| note | TEXT | 打卡備註 |
| points | INTEGER | 獲得積分（預設 10） |
| created_at | TEXT | 建立時間 |

UNIQUE(user_id, checkin_date)

### `knowledge_entries` — 知識庫

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | TEXT PK | UUID |
| title | TEXT | 標題 |
| content | TEXT | 內容 |
| category | TEXT | template / best-practice / qa / other |
| icon | TEXT | 圖示 emoji |
| contributor_id | TEXT FK → users | 貢獻者 |
| upvotes | INTEGER | 讚數 |
| created_at | TEXT | 建立時間 |
| updated_at | TEXT | 更新時間 |

### `wishes` — 許願樹

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | TEXT PK | UUID |
| title | TEXT | 願望標題 |
| description | TEXT | 描述 |
| category | TEXT | personal / site |
| status | TEXT | pending → claimed → in-progress → completed |
| wisher_id | TEXT FK → users | 許願者 |
| claimer_id | TEXT FK → users | 認領者 |
| icon | TEXT | 圖示 emoji |
| points | INTEGER | 積分 |
| created_at | TEXT | 建立時間 |
| updated_at | TEXT | 更新時間 |

### `discussion_likes` — 討論區按讚

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | TEXT PK | UUID |
| message_id | INTEGER | 訊息 ID |
| user_id | TEXT FK → users | 按讚者 |
| created_at | TEXT | 按讚時間 |

UNIQUE(message_id, user_id)

### 其他表

- `memories` — Agent 記憶（type: fact/preference/goal/skill/interaction）
- `conversations` — Agent 對話紀錄
- `weekly_progress` — 每週進度
- `shared_knowledge` — 共享知識（舊版，已由 knowledge_entries 取代）
- `tags` / `resource_tags` — 標籤系統

## 許願樹狀態流

```mermaid
stateDiagram-v2
    [*] --> pending : 許願
    pending --> claimed : 有人認領
    pending --> [*] : 許願者刪除
    claimed --> in_progress : 開始實作
    claimed --> pending : 取消認領
    in_progress --> completed : 完成實作
    in_progress --> claimed : 暫停實作
    completed --> [*]

    state pending {
        note right of pending: 任何人可認領
    }
    state completed {
        note right of completed: 認領者獲得積分
    }
```

## Migration 流程

```mermaid
flowchart TD
    A["POST /api/db/init"] --> B["CREATE TABLE IF NOT EXISTS<br/>（跳過已存在的表）"]
    B --> C["ALTER TABLE ADD COLUMN<br/>（try-catch 補齊缺欄位）"]
    C --> D["CREATE UNIQUE INDEX IF NOT EXISTS"]
    D --> E["Seed 29 位成員<br/>INSERT OR IGNORE"]
    E --> F["Seed 角色對應"]
    F --> G["更新隊長 email"]

    style A fill:#6C63FF,color:#fff
    style C fill:#E94560,color:#fff
    style E fill:#00F5A0,color:#1a1a2e
```

## 查詢

用 Turso CLI 查詢：
```bash
turso db shell cyclone-26 ".schema users"
turso db shell cyclone-26 "SELECT * FROM users LIMIT 5"
```
