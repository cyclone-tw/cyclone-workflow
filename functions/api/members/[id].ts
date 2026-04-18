import { createClient } from '@libsql/client/web';
import { ROLE_LEVEL, getEffectiveRole } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// GET /api/members/:id — single member
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    const db = getDb(context.env);

    // Try 1: direct ID match (OAuth accounts, non-archived)
    let result = await db.execute({
      sql: `SELECT u.id, u.name, u.discord_id, u.avatar_url, u.color,
              u.display_name, u.emoji, u.bio,
              GROUP_CONCAT(ur.role) AS roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            WHERE u.id = ? AND u.status = 'active'
            GROUP BY u.id`,
      args: [id],
    });

    // Try 2: the ID may be a legacy archived account (e.g. 'dar', 'benben').
    // Look up the active OAuth account with the same name.
    if (!result.rows.length) {
      result = await db.execute({
        sql: `SELECT u2.id, u2.name, u2.discord_id, u2.avatar_url, u2.color,
                u2.display_name, u2.emoji, u2.bio,
                GROUP_CONCAT(ur.role) AS roles
              FROM users u1
              JOIN users u2 ON LOWER(u2.name) = LOWER(u1.name)
                           AND u2.status = 'active'
                           AND u2.archived_at IS NULL
              LEFT JOIN user_roles ur ON ur.user_id = u2.id
              WHERE u1.id = ? AND u1.status = 'active'
              GROUP BY u2.id`,
        args: [id],
      });
    }

    if (!result.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到該成員' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const row = rows[0];
    const roles = String(row.roles ?? '').split(',').filter(Boolean);
    const effectiveRole = roles.length > 0 ? getEffectiveRole(roles) : 'companion';

    const member = {
      id: String(row.id),
      name: String(row.name),
      tag: String(row.discord_id ?? ''),
      role: effectiveRole,
      avatar: String(row.emoji ?? row.avatar_url ?? '👤'),
      color: String(row.color ?? '#9090B0'),
      groupRole: effectiveRole,
      display_name: String(row.display_name ?? ''),
      bio: String(row.bio ?? ''),
    };

    return new Response(JSON.stringify({ ok: true, member }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
