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
// GET /api/admin/announcements/:id — single announcement
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');
    const db = getDb(context.env);
    const id = context.params?.id;

    const result = await db.execute({
      sql: `
        SELECT a.*, u.name AS author_name
        FROM announcements a
        LEFT JOIN users u ON u.id = a.author_id AND u.archived_at IS NULL AND u.status = 'active'
        WHERE a.id = ?
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: '公告不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const r = result.rows[0];
    return new Response(JSON.stringify({
      ok: true,
      announcement: {
        id: r.id,
        title: r.title,
        content: r.content,
        pinned: r.pinned === 1,
        author_id: r.author_id,
        author_name: r.author_name,
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/admin/announcements/:id — update announcement
// ---------------------------------------------------------------------------

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');
    const db = getDb(context.env);
    const id = context.params?.id;

    const body = await context.request.json() as { title?: string; content?: string; pinned?: boolean };

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      args.push(body.title.trim());
    }
    if (body.content !== undefined) {
      updates.push('content = ?');
      args.push(body.content.trim());
    }
    if (body.pinned !== undefined) {
      updates.push('pinned = ?');
      args.push(body.pinned ? 1 : 0);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: '沒有要更新的欄位' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    updates.push("updated_at = datetime('now')");
    args.push(id);

    await db.execute({
      sql: `UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/announcements/:id
// ---------------------------------------------------------------------------

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');
    const db = getDb(context.env);
    const id = context.params?.id;

    await db.execute({ sql: `DELETE FROM announcements WHERE id = ?`, args: [id] });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
