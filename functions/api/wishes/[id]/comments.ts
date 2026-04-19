import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// GET /api/wishes/:id/comments
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const wishId = context.params.id as string;
    const db = getDb(context.env);

    const result = await db.execute({
      sql: `
        SELECT wc.id, wc.content, wc.created_at,
               u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar
        FROM wish_comments wc
        JOIN users u ON u.id = wc.author_id AND u.archived_at IS NULL AND u.status = 'active'
        WHERE wc.wish_id = ?
        ORDER BY wc.created_at ASC
      `,
      args: [wishId],
    });

    const comments = result.rows.map((r) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
      author_id: r.author_id,
      author_name: r.author_name,
      author_avatar: r.author_avatar,
    }));

    return new Response(JSON.stringify({ ok: true, comments }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/wishes/:id/comments
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const wishId = context.params.id as string;
    const db = getDb(context.env);

    // Verify wish exists
    const wishResult = await db.execute({
      sql: 'SELECT id FROM wishes WHERE id = ?',
      args: [wishId],
    });
    if (!wishResult.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此願望' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await context.request.json()) as { content?: string };
    const content = (body.content || '').trim();
    if (!content) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫留言內容' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO wish_comments (id, wish_id, author_id, content) VALUES (?, ?, ?, ?)`,
      args: [id, wishId, user.id, content],
    });

    return new Response(JSON.stringify({ ok: true, id }), {
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
