import { createClient } from '@libsql/client/web';
import { requireRole } from '../../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// GET /api/admin/reports — 管理員查看所有檢舉列表
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');
    const db = getDb(context.env);

    const offset = parseInt(context.request.headers.get('x-offset') || '0', 10);
    const limit = 50;

    const result = await db.execute({
      sql: `
        SELECT
          mr.id,
          mr.message_id,
          mr.reporter_id,
          mr.reason,
          mr.status,
          mr.created_at,
          m.content AS message_content,
          m.author AS message_author,
          u.name AS reporter_name
        FROM message_reports mr
        LEFT JOIN messages m ON m.id = mr.message_id
        LEFT JOIN users u ON u.id = mr.reporter_id
        ORDER BY mr.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });

    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) AS total FROM message_reports',
      args: [],
    });
    const total = Number(countResult.rows[0]?.total ?? 0);

    return new Response(JSON.stringify({ ok: true, reports: result.rows, total }), {
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
