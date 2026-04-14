import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// GET /api/tags — list all tags, optionally filtered by category
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);
    const url = new URL(context.request.url);
    const category = url.searchParams.get('category'); // 'knowledge' | 'ai-tools' | 'both' | null

    let sql = 'SELECT id, name, category, color, sort_order, created_at FROM tags';
    const args: string[] = [];
    if (category && category !== 'all') {
      sql += ' WHERE category = ? OR category = \'both\'';
      args.push(category);
    }
    sql += ' ORDER BY sort_order ASC, name ASC';

    const result = await db.execute({ sql, args });
    const tags = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      color: row.color,
      sort_order: row.sort_order,
      created_at: row.created_at,
    }));

    return new Response(JSON.stringify({ ok: true, tags }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/tags — create a new tag (admin only)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    await requireAuth(context.request, context.env);
    const body = (await context.request.json()) as Record<string, unknown>;
    const { name, category, color, sort_order } = body as {
      name?: string;
      category?: string;
      color?: string;
      sort_order?: number;
    };

    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫標籤名稱' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const validCategories = ['knowledge', 'ai-tools', 'both'];
    const finalCategory = validCategories.includes(category as string) ? category : 'both';
    const finalColor = (color as string)?.trim() || '#6C63FF';
    const finalSortOrder = typeof sort_order === 'number' ? sort_order : 0;

    const db = getDb(context.env);
    const id = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO tags (id, name, category, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
      args: [id, name.trim(), finalCategory, finalColor, finalSortOrder],
    });

    return new Response(JSON.stringify({ ok: true, id }), {
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

// PATCH /api/tags — update a tag (admin only)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    await requireAuth(context.request, context.env);
    const body = (await context.request.json()) as Record<string, unknown>;
    const { id, name, category, color, sort_order } = body as {
      id?: string;
      name?: string;
      category?: string;
      color?: string;
      sort_order?: number;
    };

    if (!id?.trim()) {
      return new Response(JSON.stringify({ error: '缺少標籤 ID' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name.trim());
    }
    if (category !== undefined) {
      const validCategories = ['knowledge', 'ai-tools', 'both'];
      updates.push('category = ?');
      args.push(validCategories.includes(category) ? category : 'both');
    }
    if (color !== undefined) {
      updates.push('color = ?');
      args.push((color as string)?.trim() || '#6C63FF');
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      args.push(typeof sort_order === 'number' ? sort_order : 0);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: '沒有要更新的欄位' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    args.push(id.trim());
    const db = getDb(context.env);
    await db.execute({
      sql: `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`,
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

// DELETE /api/tags — delete a tag (admin only)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    await requireAuth(context.request, context.env);
    const body = (await context.request.json()) as Record<string, unknown>;
    const { id } = body as { id?: string };

    if (!id?.trim()) {
      return new Response(JSON.stringify({ error: '缺少標籤 ID' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);
    // Remove all resource_tag associations first
    await db.execute({ sql: `DELETE FROM resource_tags WHERE tag_id = ?`, args: [id.trim()] });
    // Delete the tag itself
    await db.execute({ sql: `DELETE FROM tags WHERE id = ?`, args: [id.trim()] });

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
