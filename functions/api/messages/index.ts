import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../src/lib/auth.ts';

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

// GET: Fetch all messages
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);

    // Ensure table exists
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        tag TEXT DEFAULT '',
        category TEXT DEFAULT '一般討論',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    });

    // Ensure discussion_likes table exists for the JOIN
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

    const result = await db.execute({
      sql: `SELECT m.*, COALESCE(lc.like_count, 0) as like_count
            FROM messages m
            LEFT JOIN (
              SELECT message_id, COUNT(*) as like_count
              FROM discussion_likes
              GROUP BY message_id
            ) lc ON lc.message_id = m.id
            ORDER BY m.created_at DESC LIMIT 100`,
      args: [],
    });

    return new Response(JSON.stringify({ ok: true, messages: result.rows }), {
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

// POST: Create a new message (requires login)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);

    const { content, tag, category } = await context.request.json() as {
      content?: string;
      tag?: string;
      category?: string;
    };

    const author = user.name;

    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫留言內容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (content.length > 2000) {
      return new Response(JSON.stringify({ error: '留言不得超過 2000 字' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);

    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        tag TEXT DEFAULT '',
        category TEXT DEFAULT '一般討論',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    });

    await db.execute({
      sql: `INSERT INTO messages (author, content, tag, category) VALUES (?, ?, ?, ?)`,
      args: [author.trim(), content.trim(), tag?.trim() || '', category || '一般討論'],
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
