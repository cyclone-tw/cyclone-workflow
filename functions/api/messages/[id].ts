import { createClient } from '@libsql/client/web';
import { requireAuth, ROLE_LEVEL } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

function isAdminOrAbove(user: { effectiveRole: string }): boolean {
  return (ROLE_LEVEL[user.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0);
}

// ---------------------------------------------------------------------------
// PATCH /api/messages/:id — only author or admin+
// ---------------------------------------------------------------------------

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const db = getDb(context.env);

    const existing = await db.execute({
      sql: 'SELECT author_id FROM messages WHERE id = ?',
      args: [id],
    });

    if (!existing.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此留言' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const canEdit = existing.rows[0].author_id === user.id || isAdminOrAbove(user);
    if (!canEdit) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { content } = (await context.request.json()) as { content?: string };
    if (!content?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫留言內容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (content.length > 2000) {
      return new Response(JSON.stringify({ ok: false, error: '留言不得超過 2000 字' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({
      sql: `UPDATE messages SET content = ?, edited_at = datetime('now') WHERE id = ?`,
      args: [content.trim(), id],
    });

    return new Response(JSON.stringify({ ok: true }), {
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

// ---------------------------------------------------------------------------
// DELETE /api/messages/:id — only author or admin+
// ---------------------------------------------------------------------------

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const db = getDb(context.env);

    const existing = await db.execute({
      sql: 'SELECT author_id FROM messages WHERE id = ?',
      args: [id],
    });

    if (!existing.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此留言' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const canDelete = existing.rows[0].author_id === user.id || isAdminOrAbove(user);
    if (!canDelete) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete related likes first, then the message
    await db.execute({ sql: 'DELETE FROM discussion_likes WHERE message_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM messages WHERE id = ?', args: [id] });

    return new Response(JSON.stringify({ ok: true }), {
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
