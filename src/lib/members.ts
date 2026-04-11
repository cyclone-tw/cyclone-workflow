import { createClient } from '@libsql/client/web';
import type { Env } from './auth.ts';

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  discord_id: string | null;
  status: 'active' | 'pending';
  archived_at: string | null;
  updated_at: string | null;
  roles: string[];
}

export interface ListOptions {
  includeArchived?: boolean;
  status?: 'active' | 'pending' | 'all';
}

function getDb(env: Env) {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

export async function listUsersWithRoles(env: Env, opts: ListOptions = {}): Promise<MemberRow[]> {
  const { includeArchived = false, status = 'active' } = opts;

  const whereClauses: string[] = [];
  if (!includeArchived) whereClauses.push('u.archived_at IS NULL');
  if (status !== 'all') whereClauses.push(`u.status = '${status === 'pending' ? 'pending' : 'active'}'`);

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const db = getDb(env);
  const result = await db.execute({
    sql: `
      SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.discord_id,
        u.status,
        u.archived_at,
        u.updated_at,
        GROUP_CONCAT(ur.role) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      ${whereSql}
      GROUP BY u.id
      ORDER BY u.name
    `,
    args: [],
  });

  return result.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    email: (r.email as string) ?? '',
    avatar_url: (r.avatar_url as string) ?? null,
    discord_id: (r.discord_id as string) ?? null,
    status: ((r.status as string) || 'active') as 'active' | 'pending',
    archived_at: (r.archived_at as string) ?? null,
    updated_at: (r.updated_at as string) ?? null,
    roles: r.roles ? (r.roles as string).split(',') : [],
  }));
}

export async function findUserById(env: Env, id: string): Promise<MemberRow | null> {
  const db = getDb(env);
  const result = await db.execute({
    sql: `
      SELECT u.id, u.name, u.email, u.avatar_url, u.discord_id, u.status, u.archived_at, u.updated_at,
             GROUP_CONCAT(ur.role) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `,
    args: [id],
  });

  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id as string,
    name: r.name as string,
    email: (r.email as string) ?? '',
    avatar_url: (r.avatar_url as string) ?? null,
    discord_id: (r.discord_id as string) ?? null,
    status: ((r.status as string) || 'active') as 'active' | 'pending',
    archived_at: (r.archived_at as string) ?? null,
    updated_at: (r.updated_at as string) ?? null,
    roles: r.roles ? (r.roles as string).split(',') : [],
  };
}

export interface RelatedCounts {
  checkins: number;
  wishes: number;
  knowledge: number;
  likes: number;
  sessions: number;
}

export async function getUserRelatedCounts(env: Env, userId: string): Promise<RelatedCounts> {
  const db = getDb(env);
  const result = await db.execute({
    sql: `
      SELECT
        (SELECT COUNT(*) FROM checkins WHERE user_id = ?) AS checkins,
        (SELECT COUNT(*) FROM wishes WHERE wisher_id = ? OR claimer_id = ?) AS wishes,
        (SELECT COUNT(*) FROM knowledge_entries WHERE contributor_id = ?) AS knowledge,
        (SELECT COUNT(*) FROM discussion_likes WHERE user_id = ?) AS likes,
        (SELECT COUNT(*) FROM sessions WHERE user_id = ?) AS sessions
    `,
    args: [userId, userId, userId, userId, userId, userId],
  });
  const r = result.rows[0] ?? {};
  return {
    checkins: Number(r.checkins ?? 0),
    wishes: Number(r.wishes ?? 0),
    knowledge: Number(r.knowledge ?? 0),
    likes: Number(r.likes ?? 0),
    sessions: Number(r.sessions ?? 0),
  };
}

export async function countActiveCaptains(env: Env): Promise<number> {
  const db = getDb(env);
  const result = await db.execute({
    sql: `
      SELECT COUNT(DISTINCT ur.user_id) AS c
      FROM user_roles ur
      JOIN users u ON u.id = ur.user_id
      WHERE ur.role = 'captain' AND u.archived_at IS NULL AND u.status = 'active'
    `,
    args: [],
  });
  return Number(result.rows[0]?.c ?? 0);
}

export async function softDeleteUser(env: Env, id: string): Promise<void> {
  const db = getDb(env);
  await db.batch([
    {
      sql: `UPDATE users SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      args: [id],
    },
    {
      sql: `DELETE FROM sessions WHERE user_id = ?`,
      args: [id],
    },
  ]);
}

export async function approveUser(env: Env, id: string): Promise<void> {
  const db = getDb(env);
  const roleId = crypto.randomUUID();
  await db.batch([
    {
      sql: `UPDATE users SET status = 'active', updated_at = datetime('now') WHERE id = ?`,
      args: [id],
    },
    {
      sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'member')`,
      args: [roleId, id],
    },
  ]);
}
