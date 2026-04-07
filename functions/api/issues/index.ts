import { createClient } from '@libsql/client/web';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

const INIT_SQL = `CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  author_tag TEXT DEFAULT '',
  status TEXT DEFAULT 'open' CHECK(status IN ('open','in-progress','resolved','closed')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
  category TEXT DEFAULT 'bug' CHECK(category IN ('bug','feature','improvement','question')),
  related_version TEXT DEFAULT '',
  resolved_version TEXT DEFAULT '',
  comments_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

const COMMENTS_SQL = `CREATE TABLE IF NOT EXISTS issue_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  author_tag TEXT DEFAULT '',
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id)
)`;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);
    await db.batch([{ sql: INIT_SQL, args: [] }, { sql: COMMENTS_SQL, args: [] }]);

    const url = new URL(context.request.url);
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');

    let sql = 'SELECT * FROM issues';
    const conditions: string[] = [];
    const args: string[] = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      args.push(status);
    }
    if (category && category !== 'all') {
      conditions.push('category = ?');
      args.push(category);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT 100';

    const result = await db.execute({ sql, args });
    return new Response(JSON.stringify({ ok: true, issues: result.rows }), {
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
    const { title, description, author, author_tag, priority, category } = await context.request.json() as Record<string, string>;

    if (!title?.trim() || !description?.trim() || !author?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫標題、描述和暱稱' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);
    await db.batch([{ sql: INIT_SQL, args: [] }, { sql: COMMENTS_SQL, args: [] }]);

    const result = await db.execute({
      sql: `INSERT INTO issues (title, description, author, author_tag, priority, category)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [
        title.trim(),
        description.trim(),
        author.trim(),
        author_tag?.trim() || '',
        priority || 'medium',
        category || 'bug',
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
