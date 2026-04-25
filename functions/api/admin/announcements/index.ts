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
// GET /api/admin/announcements — list all announcements
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');
    const db = getDb(context.env);

    const result = await db.execute({
      sql: `
        SELECT a.*, COALESCE(u.display_name, u.name) AS author_name
        FROM announcements a
        LEFT JOIN users u ON u.id = a.author_id AND u.archived_at IS NULL AND u.status = 'active'
        ORDER BY a.pinned DESC, a.created_at DESC
      `,
      args: [],
    });

    const announcements = result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      pinned: r.pinned === 1,
      author_id: r.author_id,
      author_name: r.author_name,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return new Response(JSON.stringify({ ok: true, announcements }), {
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

// ---------------------------------------------------------------------------
// POST /api/admin/announcements — create announcement
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireRole(context.request, context.env, 'admin');
    const db = getDb(context.env);

    const body = await context.request.json() as { title?: string; content?: string; pinned?: boolean };
    const { title, content, pinned = false } = body;

    if (!title?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫標題' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫內容' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO announcements (id, title, content, pinned, author_id) VALUES (?, ?, ?, ?, ?)`,
      args: [id, title.trim(), content.trim(), pinned ? 1 : 0, user.id],
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
