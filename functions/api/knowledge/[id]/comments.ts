import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// GET /api/knowledge/:id/comments
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    const db = getDb(context.env);

    const result = await db.execute({
      sql: `
        SELECT
          rc.id, rc.content, rc.created_at, rc.updated_at,
          u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar
        FROM resource_comments rc
        JOIN users u ON u.id = rc.user_id AND u.archived_at IS NULL AND u.status = 'active'
        WHERE rc.resource_type = 'knowledge' AND rc.resource_id = ?
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

// POST /api/knowledge/:id/comments
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const { content } = (await context.request.json()) as { content?: string };

    if (!content?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫留言內容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);

    const entryResult = await db.execute({
      sql: 'SELECT contributor_id FROM knowledge_entries WHERE id = ?',
      args: [id],
    });
    if (entryResult.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '找不到這筆知識' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const commentId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO resource_comments (id, resource_type, resource_id, user_id, content) VALUES (?, 'knowledge', ?, ?, ?)`,
      args: [commentId, id, user.id, content.trim()],
    });

    // Award +2 points to contributor (skip if commenting on own post)
    const contributorId = entryResult.rows[0].contributor_id as string;
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
