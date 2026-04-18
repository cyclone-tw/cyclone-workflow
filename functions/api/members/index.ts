import { createClient } from '@libsql/client/web';
import { ROLE_LEVEL, getEffectiveRole } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);

    // Fetch users + their roles via LEFT JOIN
    const result = await db.execute({
      sql: `SELECT u.id, u.name, u.discord_id, u.avatar_url, u.color,
              u.display_name, u.emoji, u.bio,
              GROUP_CONCAT(ur.role) AS roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            WHERE u.status = 'active' AND u.archived_at IS NULL
            GROUP BY u.id`,
      args: [],
    });

    const members = result.rows.map((row) => {
      const roles = (String(row.roles ?? '').split(',').filter(Boolean));
      const effectiveRole = roles.length > 0 ? getEffectiveRole(roles) : 'companion';
      return {
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
    });

    // Sort by role hierarchy (highest first), then name
    members.sort((a, b) => {
      const levelDiff = (ROLE_LEVEL[b.groupRole] ?? 0) - (ROLE_LEVEL[a.groupRole] ?? 0);
      return levelDiff !== 0 ? levelDiff : a.name.localeCompare(b.name);
    });

    return new Response(JSON.stringify({ ok: true, members }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
