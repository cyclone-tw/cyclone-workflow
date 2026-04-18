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

    const result = await db.execute({
      sql: `SELECT u.id, u.name, u.discord_id, u.avatar_url, u.color,
              u.display_name, u.emoji, u.bio,
              GROUP_CONCAT(ur.role) AS roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            WHERE u.id = ? AND u.status = 'active'
            GROUP BY u.id`,
      args: [id],
    });

    if (!result.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到該成員' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const row = result.rows[0];
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
