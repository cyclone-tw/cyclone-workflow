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
    const id = context.params.id;
    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });

    const result = await db.execute({ sql: 'SELECT * FROM ai_tools WHERE id = ?', args: [id] });
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '找不到這個工具' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, tool: result.rows[0] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id;
    const body = await context.request.json() as Record<string, string>;
    const { name, description, url, category } = body;

    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });

    const sets: string[] = [];
    const args: (string | number)[] = [];

    if (name !== undefined) { sets.push('name = ?'); args.push(name.trim()); }
    if (description !== undefined) { sets.push('description = ?'); args.push(description.trim()); }
    if (url !== undefined) { sets.push('url = ?'); args.push(url.trim()); }
    if (category !== undefined) { sets.push('category = ?'); args.push(category); }

    if (sets.length === 0) {
      return new Response(JSON.stringify({ error: '沒有提供更新欄位' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    args.push(id as string);

    await db.execute({
      sql: `UPDATE ai_tools SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id;
    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });

    await db.execute({ sql: 'DELETE FROM ai_tools WHERE id = ?', args: [id] });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
