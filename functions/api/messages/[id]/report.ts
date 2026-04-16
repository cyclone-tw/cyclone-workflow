import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// HEAD /api/messages/:id/report — 檢查当前用户是否已檢舉過
export const onRequestHead: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const messageId = parseInt(context.params.id ?? '', 10);
    if (!messageId || isNaN(messageId)) {
      return new Response(null, { status: 400 });
    }
    const db = getDb(context.env);
    const result = await db.execute({
      sql: 'SELECT id FROM message_reports WHERE message_id = ? AND reporter_id = ?',
      args: [messageId, user.id],
    });
    if (result.rows.length > 0) {
      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 404 });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    return new Response(null, { status: 500 });
  }
};

// GET /api/messages/:id/report — 回傳單一留言的檢舉統計（供 MessageBoard GET 使用）
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const messageId = parseInt(context.params.id ?? '', 10);
    if (!messageId || isNaN(messageId)) {
      return new Response(JSON.stringify({ ok: false, error: '無效的留言 ID' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    const db = getDb(context.env);
    const result = await db.execute({
      sql: `SELECT mr.*,
                    u.name AS reporter_name
             FROM message_reports mr
             LEFT JOIN users u ON u.id = mr.reporter_id
             WHERE mr.message_id = ?
             ORDER BY mr.created_at DESC`,
      args: [messageId],
    });
    const reportedByMe = await db.execute({
      sql: 'SELECT id FROM message_reports WHERE message_id = ? AND reporter_id = ?',
      args: [messageId, user.id],
    });
    return new Response(JSON.stringify({
      ok: true,
      reports: result.rows,
      reported_by_me: reportedByMe.rows.length > 0,
    }), {
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

// POST /api/messages/:id/report — 檢舉留言（需登入）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const messageId = parseInt(context.params.id ?? '', 10);

    if (!messageId || isNaN(messageId)) {
      return new Response(JSON.stringify({ ok: false, error: '無效的留言 ID' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { reason } = await context.request.json() as { reason?: string };

    if (!reason?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫檢舉原因' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);

    // 檢查留言是否存在
    const msgRow = await db.execute({
      sql: 'SELECT id FROM messages WHERE id = ?',
      args: [messageId],
    });
    if (msgRow.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '留言不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 檢查是否已檢舉過
    const existing = await db.execute({
      sql: 'SELECT id FROM message_reports WHERE message_id = ? AND reporter_id = ?',
      args: [messageId, user.id],
    });
    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ ok: false, error: '您已經檢舉過這則留言' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({
      sql: 'INSERT INTO message_reports (message_id, reporter_id, reason) VALUES (?, ?, ?)',
      args: [messageId, user.id, reason.trim()],
    });

    return new Response(JSON.stringify({ ok: true }), {
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
