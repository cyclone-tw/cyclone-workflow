# Issue #184 — 管家記憶隔離 Tier 2:每位成員專屬 Letta agent

> **For agentic workers:** 本計畫以 cc-orchestra 多 CLI 派工執行 —— Opus 設計、cc-zai/kimi-cc 實作 diff、mini-cc(+gemini)QA、Opus 驗證 build/test 後開 PR。

**Goal:** 讓每位登入成員擁有專屬 Letta agent,徹底隔離管家的長期記憶,根治「A 成員的事在 B 成員對話中被提及」。

**Architecture:** 新增 `user_agents` 對應表(`user_id → letta_agent_id`)。新 helper 模組 `functions/api/agent/_userAgent.ts` 負責「查表 → 命中即用 / 未命中則建 Letta agent 並寫表」。`chat.ts` 改為先取 session 身份、再依身份解析專屬 agent。匿名訪客共用一個 `__guest__` agent(全新、無成員記憶)。既有混用記憶的舊 agent 不遷移(遷移等於複製外洩)。

**Tech Stack:** Cloudflare Pages Functions、Turso(`@libsql/client/web`)、Letta REST API、Vitest。

---

## 背景與現況

- `functions/api/agent/chat.ts` 目前用單一硬編碼 agent `agent-0f132a48-c65e-4e26-b974-969f6dd5bb91`,19 人共用 `human` / `persona` memory block。
- Tier 1(PR #183)已修「讀取他人 Turso 對話**紀錄**」;本 Tier 2 修「管家**記憶本身**跨成員」。
- `chat.ts` 與 `src/lib/letta.ts` 各有一份 `CYCLONE_BUTLER_SYSTEM`(內容不同);本計畫在 Functions 端收斂為單一來源(`src/lib/letta.ts` 的前台副本不在範圍內)。

## 設計決策

| 決策 | 選擇 | 理由 |
|---|---|---|
| 對應儲存 | 新表 `user_agents` | 不動 `users` schema,inline `CREATE TABLE IF NOT EXISTS`(同 `chat_history`),免 migration 協調 |
| 匿名訪客 | 偽 user key `__guest__`,共用一個全新 guest agent | 邏輯統一;guest agent 無成員記憶,匿名間共享可接受(本就不存歷史) |
| 舊 agent 記憶 | 不遷移 | 舊 agent 記憶已混用 = 外洩源,遷移等於複製外洩;新 agent 從零開始 |
| 競態 | `INSERT` 後重新 `SELECT` | 19 人低流量;同人並發首訊息最多多建一個 agent,重讀取最終一致 |

## 檔案結構

| 檔案 | 動作 | 責任 |
|---|---|---|
| `functions/api/agent/_userAgent.ts` | 新增 | `user_agents` DDL + `getOrCreateUserAgent()` + `CYCLONE_BUTLER_SYSTEM` 單一來源(底線前綴 = CF Pages 不視為 route) |
| `functions/api/agent/chat.ts` | 修改 | 先取 session → 解析專屬 agent;移除本地 `cachedAgentId` / `getOrCreateAgent` / 重複的 system 常數 |
| `tests/unit/agent/mock-db.ts` | 修改 | mock 加 `user_agents` 表與其 SELECT/INSERT 分支 |
| `tests/unit/agent/userAgent.test.ts` | 新增 | `getOrCreateUserAgent` 單元測試(命中 / 未命中 / 匿名 / 隔離) |
| `src/lib/changelog.ts` | 修改 | 新增 `feat(#184)` changelog 條目(Opus 親作 — CLAUDE.md 紅線) |

---

## Task 1 — `_userAgent.ts` helper 模組(派工:cc-zai)

**Files:** Create `functions/api/agent/_userAgent.ts`

**規格:**

匯出 `CYCLONE_BUTLER_SYSTEM`(字串常數,內容沿用 `chat.ts` 現有版本,逐字搬過來)。

匯出函式:
```ts
export async function getOrCreateUserAgent(
  env: { LETTA_API_KEY: string; TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string },
  userKey: string,          // 成員為 SessionUser.id;匿名固定傳 '__guest__'
  userName?: string,        // 用於種 human memory block
): Promise<string>          // 回傳 letta_agent_id
```

**行為(依序):**
1. `createClient` 連 Turso。`CREATE TABLE IF NOT EXISTS user_agents (user_id TEXT PRIMARY KEY, letta_agent_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`。
2. `SELECT letta_agent_id FROM user_agents WHERE user_id = ?`([userKey])。有列 → 直接回傳該 id。
3. 無列 → 呼叫 Letta `POST {LETTA_BASE_URL}/v1/agents` 建 agent:
   - `LETTA_BASE_URL = 'https://app.letta.com'`
   - body:`name: 'cyclone-butler-' + userKey`、`description: 'Cyclone 管家 — 專屬 agent'`、`system: CYCLONE_BUTLER_SYSTEM`、`llm: 'dar-mini-code/MiniMax-M2.7'`、`embedding: 'openai/text-embedding-ada-002'`、`memory_blocks: [{ label:'human', value: userName ? ('成員:'+userName) : '共學團成員', limit:5000 }, { label:'persona', value: CYCLONE_BUTLER_SYSTEM, limit:5000 }]`
   - header:`Authorization: Bearer {LETTA_API_KEY}`、`Content-Type: application/json`
   - 回應非 2xx → `throw new Error('Letta API ' + status + ': ' + text)`
4. `INSERT OR IGNORE INTO user_agents (user_id, letta_agent_id) VALUES (?, ?)`。
5. 競態安全:再 `SELECT letta_agent_id FROM user_agents WHERE user_id = ?` 回傳該值(若他人先寫入,以表內為準)。

**AC:**
- 命中既有對應時**不可**呼叫 Letta create。
- 不同 `userKey` 必得不同 agent(隔離核心)。
- 模組不可被 CF 當成 route(底線前綴已保證)。
- TypeScript 嚴格模式無 error。

## Task 2 — `chat.ts` 改用專屬 agent(派工:cc-zai;高風險,雙 reviewer)

**Files:** Modify `functions/api/agent/chat.ts`

**規格:**
1. `import { getOrCreateUserAgent, CYCLONE_BUTLER_SYSTEM } from './_userAgent.ts';`
2. 移除 chat.ts 內本地的 `CYCLONE_BUTLER_SYSTEM` 常數、`cachedAgentId` 變數、`getOrCreateAgent()` 函式。
3. `onRequestPost` 內:**在解析 agent 之前**先呼叫 `getSessionUser(context.request, context.env)`(目前它在 Letta 回應之後才呼叫 — 上移)。
4. agent 解析改為:
   ```ts
   const userKey = sessionUser?.id ?? '__guest__';
   const agentId = await getOrCreateUserAgent(context.env, userKey, sessionUser?.name);
   ```
5. `syncPersona` 保留,改用上面解析出的 `agentId`(對該成員自己的 agent 同步,無妨)。
6. 後續送訊息 `POST /v1/agents/{agentId}/messages`、`saveChat` 邏輯不變(saveChat 仍只對登入者寫入)。
7. `lettaRequest` / `LETTA_BASE_URL` 在 chat.ts 仍被送訊息用到 → 保留。

**AC:**
- 登入成員 → 用自己的 agent;匿名 → `__guest__` agent。
- 不再有任何硬編碼 agent id。
- `getSessionUser` 只呼叫一次。
- build 通過。

## Task 3 — 單元測試(派工:kimi-cc;跨檔)

**Files:** Modify `tests/unit/agent/mock-db.ts`;Create `tests/unit/agent/userAgent.test.ts`

**`mock-db.ts` 規格:**
- `tables` 加 `user_agents: []`;`resetDb()` 一併重設。
- `execute` mock 內新增分支:
  - `sql.includes('FROM user_agents')` 且 `SELECT` → 回 `tables.user_agents.filter(r => r.user_id === args[0])`。
  - `sql.includes('INSERT') && sql.includes('user_agents')` → 若該 `user_id`(args[0])不存在才 push `{ user_id: args[0], letta_agent_id: args[1] }`(模擬 INSERT OR IGNORE)。
- 既有 `CREATE TABLE IF NOT EXISTS` no-op 分支已涵蓋新表。

**`userAgent.test.ts` 規格:** 用 `vi.stubGlobal('fetch', ...)` mock Letta API(`POST /v1/agents` 回 `{ id: 'agent-new-N' }`,每次遞增);`beforeEach` 重設 db、fetch mock、計數器。測試案例:
1. **未命中即建**:空表 → `getOrCreateUserAgent(env,'member-1','Alice')` → 回傳新 id、`user_agents` 多一列、fetch 被呼叫 1 次。
2. **命中不重建**:表內已有 `member-1 → agent-x` → 回傳 `agent-x`、fetch **0 次**。
3. **隔離**:`member-1` 與 `member-2` 各得不同 agent id。
4. **匿名**:`userKey='__guest__'` 首次建 guest agent、第二次命中不重建。

**AC:** `bun run test` 全綠;新測試確實覆蓋上述 4 案例。

## Task 4 — changelog + 驗證 + PR(Opus 親作)

1. `src/lib/changelog.ts` 加條目(版號用自動 bump,文案如:`feat(#184): 管家記憶隔離 Tier 2 — 每位成員專屬 Letta agent,杜絕長期記憶跨成員`)。
2. `bun run test`(全綠)+ `bun run build`(80+ pages)。
3. commit(每個 worker co-author 標註)、push 分支 `184-letta-per-user-agent`、開 PR(`Closes #184`)。

---

## 派工矩陣

| Task | Executor | QA Reviewer |
|---|---|---|
| 1 `_userAgent.ts` | cc-zai | mini-cc |
| 2 `chat.ts` | cc-zai | mini-cc + gemini(雙 reviewer,高風險) |
| 3 tests | kimi-cc | mini-cc |
| 4 changelog/PR | Opus | — |

失敗升級:cc-zai 2 retry → opencode/kimi-cc → Opus 接手。

## Self-Review

- 規格涵蓋 issue #184 三項範圍(DB 對應、agent 佈建、chat 路由)— ✅ Task 1+2。
- 既有 history 已 self-scope,Tier 2 不需動 `history.ts` — 確認無遺漏。
- 型別一致:`getOrCreateUserAgent` 簽章在 Task 1 定義、Task 2/3 沿用同名同參數 — ✅。
- 匿名語意:`__guest__` 在 Task 1(helper)、Task 2(chat 傳入)、Task 3(測試)三處一致 — ✅。
