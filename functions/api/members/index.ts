import { createClient } from '@libsql/client/web';

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

    const result = await db.execute({
      sql: `SELECT id, name, tag, role, avatar_url, color, effective_role
            FROM users
            WHERE status = 'active' AND archived_at IS NULL
            ORDER BY effective_role DESC, name ASC`,
    });

    const members = result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      tag: String(row.tag ?? ''),
      role: String(row.role ?? ''),
      avatar: String(row.avatar_url ?? '👤'),
      color: String(row.color ?? '#9090B0'),
      groupRole: String(row.effective_role ?? 'member'),
    }));

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
