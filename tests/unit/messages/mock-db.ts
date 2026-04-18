import { vi } from 'vitest';

interface DbRow {
  id: string | number;
  [key: string]: unknown;
}

export const tables: Record<string, DbRow[]> = {
  sessions: [],
  users: [],
  user_roles: [],
  messages: [],
};

let _nextId = 1;

export function resetDb() {
  tables.sessions = [];
  tables.users = [];
  tables.user_roles = [];
  tables.messages = [];
  _nextId = 1;
}

export function seedUsers() {
  tables.users = [
    {
      id: 'member-1',
      name: 'Test Member',
      status: 'active',
      archived_at: null,
      discord_id: null,
    },
    {
      id: 'admin-1',
      name: 'Test Admin',
      status: 'active',
      archived_at: null,
      discord_id: null,
    },
  ];
  tables.user_roles = [
    { id: 'role-1', user_id: 'member-1', role: 'member' },
    { id: 'role-2', user_id: 'admin-1', role: 'admin' },
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
      user_id: 'admin-1',
      token: 'valid-admin-token',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

vi.mock('@libsql/client/web', () => ({
  createClient: () => ({
    execute: vi.fn(async ({ sql, args }: { sql: string; args: unknown[] }) => {
      // Session + user lookup (requireAuth / getSessionUser)
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

      // Role lookup
      if (sql.includes('SELECT role FROM user_roles')) {
        const userId = args[0];
        const roles = tables.user_roles
          .filter((r) => r.user_id === userId)
          .map((r) => ({ role: r.role }));
        return { rows: roles, columns: [] };
      }

      // CREATE TABLE — no-op
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [], columns: [] };
      }

      // Soft delete messages — UPDATE SET deleted_at (not DELETE FROM)
      if (sql.includes('UPDATE messages SET deleted_at')) {
        const deletedBy = args[0];
        const id = args[1];
        const msg = tables.messages.find((m) => String(m.id) === String(id));
        if (msg) {
          msg.deleted_at = new Date().toISOString();
          msg.deleted_by = deletedBy;
        }
        return { rows: [], columns: [] };
      }

      // Legacy hard delete (if any remaining codepath)
      if (sql.includes('DELETE FROM messages WHERE id')) {
        const id = args[0];
        const idx = tables.messages.findIndex((m) => String(m.id) === String(id));
        if (idx !== -1) tables.messages.splice(idx, 1);
        return { rows: [], columns: [] };
      }

      // DELETE discussion_likes — by message_id
      if (sql.includes('DELETE FROM discussion_likes')) {
        return { rows: [], columns: [] };
      }

      // SELECT single message by id (with deleted_at filter)
      if (sql.includes('SELECT') && sql.includes('FROM messages WHERE id')) {
        const id = args[0];
        let row = tables.messages.find((m) => String(m.id) === String(id));
        if (row && sql.includes('deleted_at IS NULL') && row.deleted_at) row = undefined;
        return { rows: row ? [row] : [], columns: [] };
      }

      // SELECT messages (list) — filter deleted when SQL says so
      if (sql.includes('FROM messages')) {
        let rows = [...tables.messages];
        if (sql.includes('deleted_at IS NULL')) {
          rows = rows.filter((m) => !m.deleted_at);
        }
        if (sql.includes('parent_id IS NULL')) {
          rows = rows.filter((m) => m.parent_id === null || m.parent_id === undefined);
        }
        return { rows: rows.reverse(), columns: [] };
      }

      // INSERT messages
      if (sql.includes('INSERT INTO messages')) {
        const msg: DbRow = {
          id: _nextId++,
          author: args[0] as string,
          author_id: args[1] as string,
          content: args[2] as string,
          tag: args[3] as string,
          category: args[4] as string,
          parent_id: (args[5] as string | number | null) ?? null,
          created_at: new Date().toISOString(),
          like_count: 0,
          deleted_at: null,
          deleted_by: null,
        };
        tables.messages.push(msg);
        return { rows: [], columns: [] };
      }

      return { rows: [], columns: [] };
    }),
    batch: vi.fn(async () => []),
  }),
}));
