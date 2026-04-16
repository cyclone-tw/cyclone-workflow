import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// GET /api/ai-tools/:id/comments
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = String(context.params.id);
    const db = getDb(context.env);

    const result = await db.execute({
      sql: `
        SELECT
          rc.id, rc.content, rc.created_at, rc.updated_at,
          u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar
        FROM resource_comments rc
        JOIN users u ON u.id = rc.user_id AND u.archived_at IS NULL AND u.status = 'active'
        WHERE rc.resource_type = 'ai-tool' AND rc.resource_id = ?
        ORDER BY rc.created_at DESC
      `,
      args: [id],
    });

    return new Response(JSON.stringify({ ok: true, comments: result.rows }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/ai-tools/:id/comments
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = String(context.params.id);
    const { content } = (await context.request.json()) as { content?: string };

    if (!content?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫留言內容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (content.trim().length > 1000) {
      return new Response(JSON.stringify({ ok: false, error: '留言內容不得超過 1000 字' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);

    // Rate limit: max 10 comments per minute per user
    const recent = await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM resource_comments WHERE user_id = ? AND created_at > datetime('now', '-1 minute')`,
      args: [user.id],
    });
    if (Number(recent.rows[0]?.cnt) >= 10) {
      return new Response(JSON.stringify({ ok: false, error: '留言太頻繁，請稍後再試' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const toolResult = await db.execute({
      sql: 'SELECT contributor_id FROM ai_tools WHERE id = ?',
      args: [id],
    });
    if (toolResult.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '找不到這個工具' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const commentId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO resource_comments (id, resource_type, resource_id, user_id, content) VALUES (?, 'ai-tool', ?, ?, ?)`,
      args: [commentId, id, user.id, content.trim()],
    });

    // Award +2 points to contributor (skip if commenting on own post)
    const contributorId = toolResult.rows[0].contributor_id as string;
    if (contributorId && contributorId !== user.id) {
      const ledgerId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO points_ledger (id, user_id, action, points, ref_type, ref_id) VALUES (?, ?, ?, ?, 'resource_comment', ?)`,
        args: [ledgerId, contributorId, 'resource_comment', 2, commentId],
      });
    }

    return new Response(JSON.stringify({ ok: true, id: commentId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
