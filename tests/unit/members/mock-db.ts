import { vi } from 'vitest';

interface DbRow {
  id: string;
  [key: string]: unknown;
}

export const tables: Record<string, DbRow[]> = {
  users: [],
  user_roles: [],
};

export function resetDb() {
  tables.users = [];
  tables.user_roles = [];
}

export function seedMembers() {
  tables.users = [
    {
      id: 'active-1',
      name: 'Active User',
      status: 'active',
      archived_at: null,
      discord_id: 'active#1234',
      avatar_url: null,
      color: '#6C63FF',
      display_name: 'Active',
      emoji: '👤',
      bio: 'I am active',
    },
    {
      id: 'archived-1',
      name: 'Archived User',
      status: 'active',
      archived_at: '2026-04-15T00:00:00Z',
      discord_id: 'archived#5678',
      avatar_url: null,
      color: '#9090B0',
      display_name: 'Archived',
      emoji: '👤',
      bio: 'I am archived',
    },
    {
      id: 'active-legacy',
      name: 'Active Legacy',
      status: 'active',
      archived_at: null,
      discord_id: null,
      avatar_url: null,
      color: '#00D9FF',
      display_name: '',
      emoji: '',
      bio: '',
    },
  ];
  tables.user_roles = [
    { id: 'role-1', user_id: 'active-1', role: 'member' },
    { id: 'role-2', user_id: 'archived-1', role: 'member' },
    { id: 'role-3', user_id: 'active-legacy', role: 'companion' },
  ];
}

function filterUsers(sql: string): DbRow[] {
  let candidates = [...tables.users];
  if (sql.includes("status = 'active'")) {
    candidates = candidates.filter((u) => u.status === 'active');
  }
  if (sql.includes('archived_at IS NULL')) {
    candidates = candidates.filter((u) => u.archived_at === null);
  }
  return candidates;
}

function withRoles(user: DbRow) {
  const roles = tables.user_roles
    .filter((r) => r.user_id === user.id)
    .map((r) => r.role)
    .join(',');
  return { ...user, roles };
}

vi.mock('@libsql/client/web', () => ({
  createClient: () => ({
    execute: vi.fn(async ({ sql, args }: { sql: string; args: unknown[] }) => {
      // ── Single member Try 1: direct ID lookup (must check BEFORE list) ──
      const isSingleById = sql.includes('WHERE u.id = ?') && !sql.includes('JOIN users u2');
      if (isSingleById) {
        const id = args[0] as string;
        let candidates = tables.users.filter((u) => u.id === id);
        if (sql.includes("status = 'active'")) {
          candidates = candidates.filter((u) => u.status === 'active');
        }
        if (sql.includes('archived_at IS NULL')) {
          candidates = candidates.filter((u) => u.archived_at === null);
        }
        if (!candidates.length) return { rows: [], columns: [] };
        return { rows: [withRoles(candidates[0])], columns: [] };
      }

      // ── Single member Try 2: legacy → OAuth by name ──
      if (sql.includes('JOIN users u2') && sql.includes('FROM users u1')) {
        const legacyId = args[0] as string;
        const legacy = tables.users.find((u) => u.id === legacyId);
        if (!legacy) return { rows: [], columns: [] };

        let oauth = tables.users.find(
          (u) => u.id !== legacy.id && String(u.name).toLowerCase() === String(legacy.name).toLowerCase(),
        );

        if (sql.includes("u2.status = 'active'") && oauth) {
          oauth = oauth.status === 'active' ? oauth : undefined;
        }
        if (sql.includes('u2.archived_at IS NULL') && oauth) {
          oauth = oauth.archived_at === null ? oauth : undefined;
        }

        if (!oauth) return { rows: [], columns: [] };
        return { rows: [withRoles(oauth)], columns: [] };
      }

      // ── Members list ──
      if (sql.includes('GROUP_CONCAT(ur.role)') && sql.includes('FROM users u')) {
        const candidates = filterUsers(sql);
        return { rows: candidates.map(withRoles), columns: [] };
      }

      return { rows: [], columns: [] };
    }),
    batch: vi.fn(async () => []),
  }),
}));
