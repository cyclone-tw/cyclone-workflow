# API 文件

> Base URL: `https://cyclone.tw/api`

## 認證 (`/api/auth`)

### `GET /api/auth/login`
觸發 Google OAuth 登入流程。設定 `oauth_state` cookie 後 redirect 到 Google。

### `GET /api/auth/callback`
Google OAuth 回調。驗證 state → 交換 token → 建立 session → redirect 到 `/`。

### `GET /api/auth/logout`
清除 session cookie，redirect 到 `/`。

### `GET /api/auth/me`
回傳當前登入用戶資料（需 session cookie）。

**Response:**
```json
{ "ok": true, "user": { "id", "name", "email", "avatarUrl", "roles", "effectiveRole" } }
```

---

## 打卡 (`/api/checkin`)

### `POST /api/checkin`
每日打卡（需登入）。同一日不可重複。

**Response:**
```json
{ "ok": true, "checkin": { "points": 10 } }
```

### `GET /api/checkin/stats`
查詢個人打卡統計（需登入）。

**Response:**
```json
{ "ok": true, "stats": { "totalPoints", "totalCheckins", "currentStreak", "longestStreak", "lastCheckinDate" } }
```

### `GET /api/checkin/leaderboard`
公開排行榜（不需登入）。前 20 名，含連續天數。

---

## 知識庫 (`/api/knowledge`)

### `GET /api/knowledge`
列出所有知識條目。

### `POST /api/knowledge`
新增知識條目（需登入）。

### `PATCH /api/knowledge/:id`
更新知識條目（需登入，限作者）。

### `DELETE /api/knowledge/:id`
刪除知識條目（需登入，限作者）。

---

## 許願樹 (`/api/wishes`)

### `GET /api/wishes`
列出所有願望。

### `POST /api/wishes`
許下新願望（需登入）。

### `PATCH /api/wishes/:id`
更新願望狀態（pending → claimed → in-progress → completed）。

### `DELETE /api/wishes/:id`
刪除願望（需登入，限許願者）。

---

## 討論區 (`/api/messages`)

### `GET /api/messages`
列出討論訊息。

### `POST /api/messages`
發布訊息（需登入）。

### `POST /api/messages/likes`
按讚 / 收讚 toggle（需登入）。

---

## 管家 (`/api/agent`)

### `POST /api/agent/chat`
與 Cyclone 管家對話（Letta API）。

**Request:**
```json
{ "message": "你好", "userId": "optional-user-id" }
```

**Response:**
```json
{ "reply": "...", "thoughts": ["..."], "agentId": "..." }
```

---

## 管理後台 (`/api/admin`)

### `GET /api/admin/stats`
站點統計（需 admin 以上）。回傳總用戶數、打卡數、知識數、願望數、留言數。

### `GET /api/admin/roles`
列出所有用戶及其角色（需 admin 以上）。

### `PUT /api/admin/roles`
新增/移除用戶角色（需 admin 以上）。

**Request:**
```json
{ "user_id": "...", "role": "member", "action": "add" }
```

---

## GitHub (`/api/github`)

### `GET /api/github/issues`
代理 GitHub Issues API，從 `cyclone-tw/cyclone-workflow` 抓取 open issues。

---

## 資料庫 (`/api/db`)

### `POST /api/db/init`
初始化 schema + 跑 migration + seed 成員資料。
