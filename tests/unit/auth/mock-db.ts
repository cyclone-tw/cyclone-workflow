// In-memory mock for auth callback tests
// Mimics @libsql/client/web for testing OAuth user matching logic

import { vi } from 'vitest';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  status: string;
  archived_at: string | null;
}

export interface MockDbState {
  users: MockUser[];
  user_roles: { user_id: string; role: string }[];
  sessions: { id: string; user_id: string; token: string }[];
  statements: string[];
}

function hasPrivilegedRole(state: MockDbState, userId: string): boolean {
  return state.user_roles.some(
    r => r.user_id === userId && ['admin', 'tech', 'captain'].includes(r.role)
  );
}

export function createMockDb(initialUsers?: MockUser[], initialRoles?: { user_id: string; role: string }[]) {
  const state: MockDbState = {
    users: initialUsers ?? [],
    user_roles: initialRoles ?? [],
    sessions: [],
    statements: [],
  };

  const execute = vi.fn(async (opts: { sql: string; args?: unknown[] }) => {
    const { sql, args = [] } = opts;
    state.statements.push(sql);

    // SELECT users with NOT EXISTS role check
    if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('NOT EXISTS')) {
      const nameArg = args[0] as string;

      // Filter users matching name, email='', active, not archived
      const candidates = state.users.filter(u => {
        if (u.archived_at) return false;
        if (u.status !== 'active') return false;
        if (u.email !== '' && u.email !== null) return false;
        // Exact name match (WHERE name = ?) → filter by name
        const isExactMatch = sql.includes('name = ?') && !sql.includes('LIKE');
        if (isExactMatch && u.name !== nameArg) return false;
        // LIKE prefix match (? LIKE seedName || '%') → googleName starts with seedName
        const isLikeMatch = sql.includes('LIKE');
        if (isLikeMatch) {
          if (!u.name || u.name.length < 4) return false;
          if (!nameArg.startsWith(u.name)) return false;
        }
        // Skip admin/tech/captain from name matching (security)
        const excludedRoles = ['admin', 'tech', 'captain'];
        const userRoles = state.user_roles.filter(r => r.user_id === u.id).map(r => r.role);
        if (excludedRoles.some(r => userRoles.includes(r))) return false;
        return true;
      });

      // For LIKE prefix query, sort by name length descending (longest match first)
      if (sql.includes('LIKE')) {
        candidates.sort((a, b) => b.name.length - a.name.length);
      }

      return { rows: candidates.slice(0, 1).map(u => ({ id: u.id })), success: true };
    }

    // SELECT users (simple email lookup)
    if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('email = ?')) {
      const email = args[0] as string;
      const rows = state.users.filter(u => u.email === email && !u.archived_at);
      return { rows: rows.map(u => ({ id: u.id, status: u.status })), success: true };
    }

    // UPDATE users
    if (sql.includes('UPDATE users SET')) {
      const setPart = sql.match(/SET\s+(.*?)\s+WHERE/s)?.[1] ?? '';
      const userId = args[args.length - 1] as string;
      const user = state.users.find(u => u.id === userId);
      if (user) {
        const updates = setPart.match(/(\w+)\s*=\s*\?/g) ?? [];
        updates.forEach((clause, i) => {
          const key = clause.replace(/\s*=\s*\?/, '').trim();
          if (key === 'email') user.email = args[i] as string;
          if (key === 'avatar_url') user.avatar_url = args[i] as string;
          if (key === 'name') user.name = args[i] as string;
        });
      }
      return { success: true, rows: [] };
    }

    // INSERT user
    if (sql.includes('INSERT INTO users')) {
      const [id, email, name, avatar_url] = args as [string, string, string, string];
      state.users.push({ id, email, name, avatar_url, status: 'pending', archived_at: null });
      return { success: true, rows: [] };
    }

    // INSERT user_roles
    if (sql.includes('INSERT INTO user_roles')) {
      state.user_roles.push({ user_id: args[1] as string, role: args[2] as string });
      return { success: true, rows: [] };
    }

    return { rows: [], success: true };
  });

  const batch = vi.fn(async (stmts: { sql: string; args?: unknown[] }[]) => {
    for (const stmt of stmts) {
      await execute(stmt);
    }
    return { success: true };
  });

  return { execute, batch, _state: state };
}
