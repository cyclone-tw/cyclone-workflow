import { createClient } from '@libsql/client/web';
import { requireAuth, getSessionUser } from '../../../src/lib/auth.ts';

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
  contributor_id TEXT DEFAULT '',
  upvotes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

async function ensureMigration(db: ReturnType<typeof createClient>) {
  try {
    await db.execute({ sql: `ALTER TABLE ai_tools ADD COLUMN contributor_id TEXT DEFAULT ''`, args: [] });
  } catch { /* column already exists */ }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const user = await getSessionUser(context.request, context.env);
    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });
    await ensureMigration(db);

    const url = new URL(context.request.url);
    const category = url.searchParams.get('category');
    const contributor_id = url.searchParams.get('contributor_id');

    let sql = `
      SELECT at.*, u.name AS contributor_name, u.avatar_url AS contributor_avatar
      FROM ai_tools at
      LEFT JOIN users u ON u.id = at.contributor_id AND u.archived_at IS NULL AND u.status = 'active'
    `;
    const conditions: string[] = [];
    const args: string[] = [];

    if (category && category !== 'all') {
      conditions.push('at.category = ?');
      args.push(category);
    }
    if (contributor_id) {
      conditions.push('at.contributor_id = ?');
      args.push(contributor_id);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY at.created_at DESC LIMIT 200';

    const result = await db.execute({ sql, args });

    const tools = result.rows.map((row) => ({
      ...row,
      contributor_name: row.contributor_name || row.author,
      contributor_avatar: row.contributor_avatar,
      tags: [] as { id: string; name: string; color: string }[],
    }));

    // Fetch tags for all returned tools
    if (tools.length > 0) {
      const ids = tools.map((t) => String(t.id));
      const placeholders = ids.map(() => '?').join(',');
      const tagResult = await db.execute({
        sql: `
          SELECT rt.resource_id, t.id AS tag_id, t.name, t.color
          FROM resource_tags rt
          JOIN tags t ON t.id = rt.tag_id
          WHERE rt.resource_type = 'ai-tool' AND rt.resource_id IN (${placeholders})
        `,
        args: ids,
      });
      for (const tr of tagResult.rows) {
        const tool = tools.find((t) => String(t.id) === String(tr.resource_id));
        if (tool) {
          tool.tags.push({ id: tr.tag_id as string, name: tr.name as string, color: tr.color as string });
        }
      }
    }

    // Attach is_favorited for logged-in users
    if (user && tools.length > 0) {
      const toolIds = tools.map((t) => String(t.id));
      const placeholders = toolIds.map(() => '?').join(',');
      const favResult = await db.execute({
        sql: `SELECT resource_id FROM resource_favorites WHERE user_id = ? AND resource_type = 'ai-tool' AND resource_id IN (${placeholders})`,
        args: [user.id, ...toolIds],
      });
      const favSet = new Set(favResult.rows.map((r) => String(r.resource_id)));
      for (const tool of tools) {
        (tool as Record<string, unknown>).is_favorited = favSet.has(String(tool.id));
      }
    }

    return new Response(JSON.stringify({ ok: true, tools }), {
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
    const user = await requireAuth(context.request, context.env);
    const { name, description, url, category, author, author_tag } = await context.request.json() as Record<string, string>;

    if (!name?.trim() || !description?.trim() || !url?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫工具名稱、簡介和連結' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });
    await ensureMigration(db);

    const result = await db.execute({
      sql: `INSERT INTO ai_tools (name, description, url, category, author, author_tag, contributor_id)
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [
        name.trim(),
        description.trim(),
        url.trim(),
        category || 'other',
        (author || user.name).trim(),
        author_tag?.trim() || '',
        user.id,
      ],
    });

    return new Response(JSON.stringify({ ok: true, id: result.rows[0]?.id }), {
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
