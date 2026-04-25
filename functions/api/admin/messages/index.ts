import { createClient } from '@libsql/client/web';
import { requireRole } from '../../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// ---------------------------------------------------------------------------
// GET /api/admin/messages — list ALL messages including soft-deleted
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');
    const db = getDb(context.env);

    const offset = parseInt(context.request.headers.get('x-offset') || '0', 10);
    const limit = 50;

    const result = await db.execute({
      sql: `
        SELECT m.*,
               COALESCE(lc.like_count, 0) AS like_count,
               COALESCE(u.display_name, u.name) AS author_name
        FROM messages m
        LEFT JOIN (
          SELECT message_id, COUNT(*) AS like_count
          FROM discussion_likes
          GROUP BY message_id
        ) lc ON lc.message_id = m.id
        LEFT JOIN users u ON u.id = m.author_id AND u.archived_at IS NULL AND u.status = 'active'
        ORDER BY m.pinned DESC, m.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });

    const countResult = await db.execute({ sql: 'SELECT COUNT(*) AS total FROM messages', args: [] });
    const total = Number(countResult.rows[0]?.total ?? 0);

    return new Response(JSON.stringify({ ok: true, messages: result.rows, total }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
