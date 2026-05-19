import { vi } from 'vitest';

interface DbRow {
  id: string | number;
  [key: string]: unknown;
}

export const tables: Record<string, DbRow[]> = {
  sessions: [],
  users: [],
  user_roles: [],
  chat_history: [],
};

let _nextId = 100;

export function resetDb() {
  tables.sessions = [];
  tables.users = [];
  tables.user_roles = [];
  tables.chat_history = [];
  _nextId = 100;
}

export function seedUsers() {
  tables.users = [
    { id: 'member-1', name: 'Test Member', status: 'active', archived_at: null, discord_id: null },
    { id: 'member-2', name: 'Other Member', status: 'active', archived_at: null, discord_id: null },
  ];
  tables.user_roles = [
    { id: 'role-1', user_id: 'member-1', role: 'member' },
    { id: 'role-2', user_id: 'member-2', role: 'member' },
  ];
  tables.sessions = [
    {
      id: 'sess-1',
      user_id: 'member-1',
      token: 'valid-member-token',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sess-2',
      user_id: 'member-2',
      token: 'valid-other-token',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * 種 chat_history:member-1 兩筆、member-2 一筆,外加一筆舊的亂數 user_id 資料
 * (模擬修補前 ChatBox 用 Math.random() 寫入的歷史)。
 */
export function seedChatHistory() {
  tables.chat_history = [
    { id: 1, user_id: 'member-1', user_message: 'm1-a', agent_reply: 'r1', created_at: '2026-05-01T00:00:00Z' },
    { id: 2, user_id: 'member-1', user_message: 'm1-b', agent_reply: 'r2', created_at: '2026-05-03T00:00:00Z' },
    { id: 3, user_id: 'member-2', user_message: 'm2-a', agent_reply: 'r3', created_at: '2026-05-02T00:00:00Z' },
    { id: 4, user_id: 'user-legacyxx', user_message: '舊亂數', agent_reply: 'r4', created_at: '2026-04-01T00:00:00Z' },
  ];
}

/** chat_history 查詢都以 args[0] 為 user_id 過濾(對應 WHERE user_id = ?)。 */
function filterChatHistory(args: unknown[]): DbRow[] {
  const userId = args[0];
  return tables.chat_history.filter((r) => r.user_id === userId);
}

vi.mock('@libsql/client/web', () => ({
  createClient: () => ({
    execute: vi.fn(async ({ sql, args = [] }: { sql: string; args?: unknown[] }) => {
      // getSessionUser:session + user lookup
      if (sql.includes('FROM sessions s') && sql.includes('JOIN users')) {
        const token = args[0];
        const session = tables.sessions.find((s) => s.token === token);
        if (!session) return { rows: [], columns: [] };
        const user = tables.users.find((u) => u.id === session.user_id);
        if (!user) return { rows: [], columns: [] };
        return {
          rows: [{
            user_id: user.id,
            user_name: user.name,
            user_discord_id: user.discord_id,
            user_status: user.status,
            user_archived_at: user.archived_at,
            expires_at: session.expires_at,
          }],
          columns: [],
        };
      }

      // 角色查詢
      if (sql.includes('SELECT role FROM user_roles')) {
        const userId = args[0];
        return {
          rows: tables.user_roles.filter((r) => r.user_id === userId).map((r) => ({ role: r.role })),
          columns: [],
        };
      }

      // CREATE TABLE — no-op
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [], columns: [] };
      }

      // COUNT chat_history(self-scoped)
      if (sql.includes('SELECT COUNT(*)') && sql.includes('FROM chat_history')) {
        return { rows: [{ total: filterChatHistory(args).length }], columns: [] };
      }

      // SELECT chat_history(self-scoped)
      if (sql.includes('FROM chat_history')) {
        return { rows: filterChatHistory(args), columns: [] };
      }

      // INSERT chat_history
      if (sql.includes('INSERT INTO chat_history')) {
        tables.chat_history.push({
          id: _nextId++,
          user_id: args[0] as string,
          user_message: args[1] as string,
          agent_reply: args[2] as string,
          created_at: new Date().toISOString(),
        });
        return { rows: [], columns: [] };
      }

      return { rows: [], columns: [] };
    }),
    batch: vi.fn(async () => []),
  }),
}));
