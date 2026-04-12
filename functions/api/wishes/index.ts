import { createClient } from '@libsql/client/web';
import { requireAuth, getSessionUser, ROLE_LEVEL } from '../../../src/lib/auth.ts';

async function ensureWishHistoryMigration(db: ReturnType<typeof createClient>) {
  try {
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS wish_history (
        id TEXT PRIMARY KEY,
        wish_id TEXT NOT NULL REFERENCES wishes(id),
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    });
  } catch { /* table already exists */ }
}

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
          wisher.id AS wisher_id,
          wisher.name AS wisher_name,
          wisher.avatar_url AS wisher_avatar,
          claimer.id AS claimer_id,
          claimer.name AS claimer_name,
          claimer.avatar_url AS claimer_avatar
        FROM wishes w
        JOIN users wisher ON wisher.id = w.wisher_id AND wisher.archived_at IS NULL AND wisher.status = 'active'
        LEFT JOIN users claimer ON claimer.id = w.claimer_id AND claimer.archived_at IS NULL AND claimer.status = 'active'
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
      history: [] as { from_status: string; to_status: string; changed_by: string; created_at: string }[],
    }));

    // Fetch history for all wishes
    await ensureWishHistoryMigration(db);
    if (wishes.length > 0) {
      const wishIds = wishes.map((w) => w.id as string);
      const placeholders = wishIds.map(() => '?').join(',');
      const histResult = await db.execute({
        sql: `SELECT wish_id, from_status, to_status, changed_by, created_at
              FROM wish_history WHERE wish_id IN (${placeholders}) ORDER BY created_at ASC`,
        args: wishIds,
      });
      const wishMap = new Map(wishes.map((w) => [w.id as string, w]));
      for (const h of histResult.rows) {
        const wish = wishMap.get(h.wish_id as string);
        if (wish) {
          wish.history.push({
            from_status: h.from_status as string,
            to_status: h.to_status as string,
            changed_by: h.changed_by as string,
            created_at: h.created_at as string,
          });
        }
      }
    }

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
