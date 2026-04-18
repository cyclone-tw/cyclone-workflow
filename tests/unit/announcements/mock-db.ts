// Vitest mock setup — import this BEFORE any API module
import { vi } from 'vitest';

// Monotonic clock — always >= Date.now() + 1, never goes backwards
let _clockMs = 0;
function tickISO(): string {
  _clockMs = Math.max(_clockMs + 1, Date.now() + 1);
  return new Date(_clockMs).toISOString();
}

// ---------------------------------------------------------------------------
// In-memory DB state
// ---------------------------------------------------------------------------

interface DbRow {
  id: string;
  [key: string]: unknown;
}

export const tables: Record<string, DbRow[]> = {
  sessions: [],
  users: [],
  user_roles: [],
  announcements: [],
};

export function resetDb() {
  tables.announcements = [];
}

export function seedAdminUser() {
  const adminId = 'admin-user-1';
  tables.users = [
    {
      id: adminId,
      name: 'Admin User',
      status: 'active',
      archived_at: null,
      email: 'admin@test.com',
      avatar_url: '',
      discord_id: null,
      preferences: '{}',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'member-user-1',
      name: 'Normal Member',
      status: 'active',
      archived_at: null,
      email: 'member@test.com',
      avatar_url: '',
      discord_id: null,
      preferences: '{}',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  tables.user_roles = [
    { id: `${adminId}_admin`, user_id: adminId, role: 'admin' },
  ];
  tables.sessions = [
    {
      id: 'admin-session-1',
      user_id: adminId,
      token: 'valid-admin-session-token',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'member-session-1',
      user_id: 'member-user-1',
      token: 'valid-member-session-token',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Mock execute — tracks calls for assertions
// ---------------------------------------------------------------------------

export let executeCalls: Array<{ sql: string; args: unknown[] }> = [];

export function resetExecuteCalls() {
  executeCalls = [];
}

export function resetMock() {
  resetDb();
  resetExecuteCalls();
}

vi.mock('@libsql/client/web', () => {
  return {
    createClient: () => ({
      execute: vi.fn(async ({ sql, args }: { sql: string; args: unknown[] }) => {
        executeCalls.push({ sql, args });

        if (sql.includes('SELECT') && sql.includes('sessions s')) {
          const token = args[0];
          const row = tables.sessions.find((r) => r.token === token);
          if (row) {
            const user = tables.users.find((u) => u.id === (row as Record<string, unknown>).user_id);
            if (user) {
              return {
                rows: [
                  {
                    user_id: user.id,
                    user_name: user.name,
                    user_discord_id: user.discord_id,
                    user_status: user.status,
                    user_archived_at: user.archived_at,
                    expires_at: (row as Record<string, unknown>).expires_at,
                  },
                ],
                columns: [],
              };
            }
          }
          return { rows: [], columns: [] };
        }

        if (sql.includes('SELECT role FROM user_roles')) {
          const userId = args[0];
          const roles = tables.user_roles
            .filter((r) => (r as Record<string, unknown>).user_id === userId)
            .map((r) => (r as Record<string, unknown>).role);
          return { rows: roles.map((r) => ({ role: r })), columns: [] };
        }

        if (sql.includes('SELECT') && sql.includes('FROM announcements')) {
          if (sql.includes('WHERE a.id = ?')) {
            const id = args[0];
            const found = tables.announcements.find((r) => r.id === id);
            return { rows: found ? [found] : [], columns: [] };
          }
          // Apply ORDER BY pinned DESC, created_at DESC when present
          const sorted = [...tables.announcements].sort((a, b) => {
            const pa = Number(a.pinned ?? 0);
            const pb = Number(b.pinned ?? 0);
            if (pb !== pa) return pb - pa;
            return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''));
          });
          return { rows: sorted, columns: [] };
        }

        if (sql.includes('INSERT INTO announcements')) {
          const ann: DbRow = {
            id: args[0] as string,
            title: args[1] as string,
            content: args[2] as string,
            pinned: args[3] as number,
            author_id: args[4] as string,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          tables.announcements.push(ann);
          return { rows: [], columns: [] };
        }

        if (sql.includes('UPDATE announcements SET')) {
          const id = args[args.length - 1];
          const idx = tables.announcements.findIndex((r) => r.id === id);
          if (idx >= 0) {
            // Extract only the SET clause (before WHERE) to avoid matching WHERE bindings
            const setSection = sql.match(/SET\s+(.*?)\s+WHERE/s)?.[1] ?? '';
            const setClauses = setSection.match(/(\w+)\s*=\s*\?/g) ?? [];
            setClauses.forEach((clause, i) => {
              const key = clause.replace(/\s*=\s*\?/, '').trim();
              (tables.announcements[idx] as Record<string, unknown>)[key] = args[i];
            });
            // Always update updated_at since the SET includes it
            tables.announcements[idx].updated_at = tickISO();
          }
          return { rows: [], columns: [] };
        }

        if (sql.includes('DELETE FROM announcements')) {
          const id = args[0];
          tables.announcements = tables.announcements.filter((r) => r.id !== id);
          return { rows: [], columns: [] };
        }

        return { rows: [], columns: [] };
      }),
      batch: vi.fn(async () => []),
    }),
  };
});
