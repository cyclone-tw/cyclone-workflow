import { createClient } from '@libsql/client/web';
import { requireAuth, getSessionUser, ROLE_LEVEL } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// ---------------------------------------------------------------------------
// GET /api/wishes — list wishes with optional filters
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);
    const url = new URL(context.request.url);
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');

    const conditions: string[] = [];
    const args: string[] = [];

    if (category && ['personal', 'site'].includes(category)) {
      conditions.push('w.category = ?');
      args.push(category);
    }
    if (status && ['pending', 'claimed', 'in-progress', 'completed'].includes(status)) {
      conditions.push('w.status = ?');
      args.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.execute({
      sql: `
        SELECT
          w.id, w.title, w.description, w.category, w.status, w.icon, w.points,
          w.created_at, w.updated_at,
          w.wisher_id,
          wisher.name AS wisher_name,
          wisher.avatar_url AS wisher_avatar,
          w.claimer_id,
          claimer.name AS claimer_name,
          claimer.avatar_url AS claimer_avatar
        FROM wishes w
        JOIN users wisher ON wisher.id = w.wisher_id
        LEFT JOIN users claimer ON claimer.id = w.claimer_id
        ${where}
        ORDER BY w.created_at DESC
      `,
      args,
    });

    const wishes = result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status,
      icon: r.icon,
      points: r.points,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      wisher: {
        id: r.wisher_id,
        name: r.wisher_name,
        avatarUrl: r.wisher_avatar,
      },
      claimer: r.claimer_id
        ? { id: r.claimer_id, name: r.claimer_name, avatarUrl: r.claimer_avatar }
        : null,
    }));

    return new Response(JSON.stringify({ ok: true, wishes }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/wishes — create a wish
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const db = getDb(context.env);

    const body = await context.request.json() as {
      title?: string;
      description?: string;
      category?: string;
      icon?: string;
    };

    const title = (body.title || '').trim();
    const description = (body.description || '').trim();
    const category = body.category === 'site' ? 'site' : 'personal';
    const icon = (body.icon || '✨').trim();

    if (!title) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫願望標題' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO wishes (id, title, description, category, status, wisher_id, icon, points)
            VALUES (?, ?, ?, ?, 'pending', ?, ?, 10)`,
      args: [id, title, description, category, user.id, icon],
    });

    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
