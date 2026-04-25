import { createClient } from '@libsql/client/web';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// ---------------------------------------------------------------------------
// GET /api/announcements — public list of latest announcements
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);

    const result = await db.execute({
      sql: `
        SELECT a.id, a.title, a.content, a.pinned, a.created_at,
               COALESCE(u.display_name, u.name) AS author_name
        FROM announcements a
        LEFT JOIN users u ON u.id = a.author_id AND u.archived_at IS NULL AND u.status = 'active'
        ORDER BY a.pinned DESC, a.created_at DESC
        LIMIT 10
      `,
      args: [],
    });

    const announcements = result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      pinned: r.pinned === 1,
      author_name: r.author_name,
      created_at: r.created_at,
    }));

    return new Response(JSON.stringify({ ok: true, announcements }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
