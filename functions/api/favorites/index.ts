import { createClient } from '@libsql/client/web';
import { requireAuth, getSessionUser } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

const INIT_SQL = `CREATE TABLE IF NOT EXISTS resource_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('knowledge', 'ai-tool')),
  resource_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, resource_type, resource_id)
)`;

// ─── GET /api/favorites — 列出登入使用者的收藏 ─────────────────────────────

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const user = await getSessionUser(context.request, context.env);
    if (!user) {
      return new Response(JSON.stringify({ ok: true, favorites: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });

    const url = new URL(context.request.url);
    const resourceType = url.searchParams.get('resource_type');

    let sql = 'SELECT id, resource_type, resource_id, created_at FROM resource_favorites WHERE user_id = ?';
    const args: string[] = [user.id];

    if (resourceType) {
      sql += ' AND resource_type = ?';
      args.push(resourceType);
    }

    sql += ' ORDER BY created_at DESC LIMIT 200';

    const result = await db.execute({ sql, args });

    return new Response(JSON.stringify({
      ok: true,
      favorites: result.rows.map((r) => ({
        id: r.id,
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        createdAt: r.created_at,
      })),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ─── POST /api/favorites — 切換收藏狀態 ──────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const { resource_type, resource_id } = await context.request.json() as {
      resource_type: string;
      resource_id: string;
    };

    if (!resource_type || !resource_id) {
      return new Response(JSON.stringify({ ok: false, error: '缺少 resource_type 或 resource_id' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['knowledge', 'ai-tool'].includes(resource_type)) {
      return new Response(JSON.stringify({ ok: false, error: '無效的 resource_type' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });

    // Truly atomic toggle using a batch transaction:
    // 1. DELETE existing row
    // 2. INSERT only if DELETE affected 0 rows (row didn't exist → was unfavorited)
    //    SQLite's changes() returns rows affected by the preceding DELETE.
    // Both statements run in a single transaction via db.batch(), so no
    // intermediate state is visible to concurrent requests.
    const id = crypto.randomUUID();
    const results = await db.batch([
      {
        sql: 'DELETE FROM resource_favorites WHERE user_id = ? AND resource_type = ? AND resource_id = ?',
        args: [user.id, resource_type, String(resource_id)],
      },
      {
        sql: `INSERT INTO resource_favorites (id, user_id, resource_type, resource_id)
              SELECT ?, ?, ?, ?
              WHERE changes() = 0`,
        args: [id, user.id, resource_type, String(resource_id)],
      },
    ]);

    // INSERT's rowsAffected: >0 = inserted (now favorited), 0 = deleted (now unfavorited)
    const favorited = (results[1].rowsAffected ?? 0) > 0;
    return new Response(JSON.stringify({ ok: true, favorited }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
