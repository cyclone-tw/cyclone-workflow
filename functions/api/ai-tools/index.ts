import { createClient } from '@libsql/client/web';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

const INIT_SQL = `CREATE TABLE IF NOT EXISTS ai_tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK(category IN ('agent','llm','productivity','dev','other')),
  author TEXT NOT NULL,
  author_tag TEXT DEFAULT '',
  upvotes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });

    const url = new URL(context.request.url);
    const category = url.searchParams.get('category');

    let sql = 'SELECT * FROM ai_tools';
    const conditions: string[] = [];
    const args: string[] = [];

    if (category && category !== 'all') {
      conditions.push('category = ?');
      args.push(category);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT 200';

    const result = await db.execute({ sql, args });
    return new Response(JSON.stringify({ ok: true, tools: result.rows }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { name, description, url, category, author, author_tag } = await context.request.json() as Record<string, string>;

    if (!name?.trim() || !description?.trim() || !url?.trim() || !author?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫工具名稱、簡介、連結和你的名稱' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });

    const result = await db.execute({
      sql: `INSERT INTO ai_tools (name, description, url, category, author, author_tag)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [
        name.trim(),
        description.trim(),
        url.trim(),
        category || 'other',
        author.trim(),
        author_tag?.trim() || '',
      ],
    });

    return new Response(JSON.stringify({ ok: true, id: result.rows[0]?.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
