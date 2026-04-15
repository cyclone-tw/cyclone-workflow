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

    const result = await db.execute({
      sql: `SELECT m.*, COALESCE(lc.like_count, 0) as like_count
            FROM messages m
            LEFT JOIN (
              SELECT message_id, COUNT(*) as like_count
              FROM discussion_likes
              GROUP BY message_id
            ) lc ON lc.message_id = m.id
            WHERE m.deleted_at IS NULL
            ORDER BY m.pinned DESC, m.created_at DESC LIMIT 100`,
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
      sql: `INSERT INTO messages (author, author_id, content, tag, category) VALUES (?, ?, ?, ?, ?)`,
      args: [author.trim(), user.id, content.trim(), tag?.trim() || '', category || '閒聊'],
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
