import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// ─── GET /api/knowledge ────────────────────────────────────────────────────────

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);
    const url = new URL(context.request.url);
    const category = url.searchParams.get('category');
    const tag = url.searchParams.get('tag');
    const contributor_id = url.searchParams.get('contributor_id');

    let sql = `
      SELECT
        ke.id, ke.title, ke.content, ke.category, ke.icon,
        ke.contributor_id, ke.upvotes,
        ke.created_at, ke.updated_at,
        u.name AS contributor_name,
        u.avatar_url AS contributor_avatar
      FROM knowledge_entries ke
      JOIN users u ON u.id = ke.contributor_id AND u.archived_at IS NULL AND u.status = 'active'
    `;
    const conditions: string[] = [];
    const args: string[] = [];

    if (category && category !== 'all') {
      conditions.push('ke.category = ?');
      args.push(category);
    }
    if (contributor_id) {
      conditions.push('ke.contributor_id = ?');
      args.push(contributor_id);
    }
    if (tag) {
      sql += ` JOIN resource_tags rt ON rt.resource_id = ke.id AND rt.resource_type = 'knowledge'
               JOIN tags t ON t.id = rt.tag_id `;
      conditions.push('t.name = ?');
      args.push(tag);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY ke.created_at DESC LIMIT 200';

    const result = await db.execute({ sql, args });

    // Fetch tags for all returned entries
    const entries = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      icon: row.icon,
      contributor_id: row.contributor_id,
      contributor_name: row.contributor_name,
      contributor_avatar: row.contributor_avatar,
      upvotes: row.upvotes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: [] as { id: string; name: string; color: string }[],
    }));

    if (entries.length > 0) {
      const ids = entries.map((e) => e.id);
      const placeholders = ids.map(() => '?').join(',');
      const tagResult = await db.execute({
        sql: `
          SELECT rt.resource_id, t.id AS tag_id, t.name, t.color
          FROM resource_tags rt
          JOIN tags t ON t.id = rt.tag_id
          WHERE rt.resource_type = 'knowledge' AND rt.resource_id IN (${placeholders})
        `,
        args: ids,
      });
      for (const tr of tagResult.rows) {
        const entry = entries.find((e) => e.id === tr.resource_id);
        if (entry) {
          entry.tags.push({ id: tr.tag_id as string, name: tr.name as string, color: tr.color as string });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, entries }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ─── POST /api/knowledge ───────────────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);

    const body = (await context.request.json()) as Record<string, string>;
    const { title, content, category, icon } = body;

    if (!title?.trim() || !content?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫標題和內容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validCategories = ['template', 'best-practice', 'qa', 'other'];
    const finalCategory = validCategories.includes(category) ? category : 'other';

    const db = getDb(context.env);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO knowledge_entries (id, title, content, category, icon, contributor_id, upvotes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [id, title.trim(), content.trim(), finalCategory, icon?.trim() || '📘', user.id, now, now],
    });

    return new Response(JSON.stringify({ ok: true, id }), {
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
