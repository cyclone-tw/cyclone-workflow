import { createClient } from '@libsql/client/web';
import { requireAuth, getSessionUser } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

// GET: Return like count for a message (and whether current user liked it)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const messageId = url.searchParams.get('message_id');

    if (!messageId) {
      return new Response(JSON.stringify({ ok: false, error: '缺少 message_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM discussion_likes WHERE message_id = ?`,
      args: [Number(messageId)],
    });
    const count = Number(countResult.rows[0]?.cnt ?? 0);

    // Check if current user liked it
    let liked = false;
    const user = await getSessionUser(context.request, context.env);
    if (user) {
      const likeResult = await db.execute({
        sql: `SELECT id FROM discussion_likes WHERE message_id = ? AND user_id = ?`,
        args: [Number(messageId), user.id],
      });
      liked = likeResult.rows.length > 0;
    }

    return new Response(JSON.stringify({ ok: true, count, liked }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Toggle like on a message (requires auth)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const { message_id } = (await context.request.json()) as { message_id?: number };

    if (!message_id) {
      return new Response(JSON.stringify({ ok: false, error: '缺少 message_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);
    const mid = Number(message_id);

    // Ensure table exists
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS discussion_likes (
        id TEXT PRIMARY KEY,
        message_id INTEGER NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(message_id, user_id)
      )`,
      args: [],
    });

    // Check if already liked
    const existing = await db.execute({
      sql: `SELECT id FROM discussion_likes WHERE message_id = ? AND user_id = ?`,
      args: [mid, user.id],
    });

    let liked: boolean;
    if (existing.rows.length > 0) {
      // Unlike
      await db.execute({
        sql: `DELETE FROM discussion_likes WHERE message_id = ? AND user_id = ?`,
        args: [mid, user.id],
      });
      liked = false;
    } else {
      // Like
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO discussion_likes (id, message_id, user_id) VALUES (?, ?, ?)`,
        args: [id, mid, user.id],
      });
      liked = true;
    }

    // Get updated count
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM discussion_likes WHERE message_id = ?`,
      args: [mid],
    });
    const count = Number(countResult.rows[0]?.cnt ?? 0);

    return new Response(JSON.stringify({ ok: true, liked, count }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    // requireAuth throws a Response for 401
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
