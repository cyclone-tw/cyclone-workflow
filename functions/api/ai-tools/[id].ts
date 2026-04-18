import { createClient } from '@libsql/client/web';
import { requireAuth, ROLE_LEVEL } from '../../../src/lib/auth.ts';

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
  try {
    await db.execute({ sql: `ALTER TABLE ai_tools ADD COLUMN github_url TEXT DEFAULT ''`, args: [] });
  } catch { /* column already exists */ }
}

function isAdminOrAbove(user: { effectiveRole: string }): boolean {
  return (ROLE_LEVEL[user.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id;
    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });
    await ensureMigration(db);

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
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id;
    const body = await context.request.json() as Record<string, string>;
    const { name, description, url, category, github_url } = body;

    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });
    await ensureMigration(db);

    // Permission check: owner or admin+ can edit
    const existing = await db.execute({ sql: 'SELECT contributor_id FROM ai_tools WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '找不到這個工具' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const isOwner = existing.rows[0].contributor_id === user.id;
    if (!isOwner && !isAdminOrAbove(user)) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足：只有投稿者本人或行政以上可以編輯' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }

    const sets: string[] = [];
    const args: (string | number)[] = [];

    if (name !== undefined) { sets.push('name = ?'); args.push(name.trim()); }
    if (description !== undefined) { sets.push('description = ?'); args.push(description.trim()); }
    if (url !== undefined) {
      const trimmedUrl = url.trim();
      if (trimmedUrl && !trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        return new Response(JSON.stringify({ error: '連結必須以 http:// 或 https:// 開頭' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      sets.push('url = ?'); args.push(trimmedUrl);
    }
    if (category !== undefined) { sets.push('category = ?'); args.push(category); }
    if (github_url !== undefined) {
      const trimmedGithubUrl = github_url.trim();
      if (trimmedGithubUrl && !trimmedGithubUrl.startsWith('http://') && !trimmedGithubUrl.startsWith('https://')) {
        return new Response(JSON.stringify({ error: 'GitHub 連結必須以 http:// 或 https:// 開頭' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      sets.push('github_url = ?'); args.push(trimmedGithubUrl);
    }

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
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id;
    const db = getDb(context.env);
    await db.execute({ sql: INIT_SQL, args: [] });
    await ensureMigration(db);

    // Permission check: owner or admin+ (companion/member cannot delete others' posts)
    const existing = await db.execute({ sql: 'SELECT contributor_id FROM ai_tools WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '找不到這個工具' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const isOwner = existing.rows[0].contributor_id === user.id;
    if (!isOwner && !isAdminOrAbove(user)) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足：只有投稿者本人或行政以上可以刪除' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({ sql: 'DELETE FROM ai_tools WHERE id = ?', args: [id] });

    return new Response(JSON.stringify({ ok: true }), {
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
