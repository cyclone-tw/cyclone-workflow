import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// ─── GET /api/knowledge/:id ────────────────────────────────────────────────────

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    const db = getDb(context.env);

    const result = await db.execute({
      sql: `
        SELECT
          ke.id, ke.title, ke.content, ke.category, ke.icon,
          ke.contributor_id, ke.upvotes,
          ke.created_at, ke.updated_at,
          u.name AS contributor_name,
          u.avatar_url AS contributor_avatar
        FROM knowledge_entries ke
        JOIN users u ON u.id = ke.contributor_id AND u.archived_at IS NULL AND u.status = 'active'
        WHERE ke.id = ?
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '找不到這筆知識' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const row = result.rows[0];

    // Fetch tags
    const tagResult = await db.execute({
      sql: `
        SELECT t.id, t.name, t.color
        FROM resource_tags rt
        JOIN tags t ON t.id = rt.tag_id
        WHERE rt.resource_type = 'knowledge' AND rt.resource_id = ?
      `,
      args: [id],
    });

    const entry = {
      ...row,
      contributor_name: row.contributor_name,
      contributor_avatar: row.contributor_avatar,
      tags: tagResult.rows.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    };

    return new Response(JSON.stringify({ ok: true, entry }), {
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

// ─── PATCH /api/knowledge/:id ──────────────────────────────────────────────────

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const body = (await context.request.json()) as Record<string, string>;
    const db = getDb(context.env);

    // Check ownership or admin+
    const existing = await db.execute({
      sql: 'SELECT contributor_id FROM knowledge_entries WHERE id = ?',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '找不到這筆知識' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isOwner = existing.rows[0].contributor_id === user.id;
    const isAdmin = ['captain', 'tech', 'admin'].includes(user.effectiveRole);
    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { title, content, category, icon, url: entryUrl } = body;
    const sets: string[] = [];
    const args: string[] = [];

    if (title !== undefined) { sets.push('title = ?'); args.push(title.trim()); }
    if (content !== undefined) { sets.push('content = ?'); args.push(content.trim()); }
    if (category !== undefined) {
      const validCategories = ['template', 'best-practice', 'qa', 'concept', 'other'];
      if (validCategories.includes(category)) { sets.push('category = ?'); args.push(category); }
    }
    if (icon !== undefined) { sets.push('icon = ?'); args.push(icon.trim()); }
    if (entryUrl !== undefined) {
      const trimmedUrl = entryUrl.trim();
      const urlLines = trimmedUrl.split('\n');
      for (const line of urlLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          return new Response(JSON.stringify({ ok: false, error: '所有連結必須以 http:// 或 https:// 開頭' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }
      sets.push('url = ?'); args.push(trimmedUrl);
    }

    if (sets.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '沒有提供更新欄位' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    sets.push('updated_at = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE knowledge_entries SET ${sets.join(', ')} WHERE id = ?`,
      args,
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

// ─── DELETE /api/knowledge/:id ─────────────────────────────────────────────────

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const db = getDb(context.env);

    // Check ownership or admin+
    const existing = await db.execute({
      sql: 'SELECT contributor_id FROM knowledge_entries WHERE id = ?',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '找不到這筆知識' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isOwner = existing.rows[0].contributor_id === user.id;
    const isAdmin = ['captain', 'tech', 'admin'].includes(user.effectiveRole);
    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete resource_tags first, then the entry
    await db.execute({
      sql: `DELETE FROM resource_tags WHERE resource_id = ? AND resource_type = 'knowledge'`,
      args: [id],
    });
    await db.execute({
      sql: 'DELETE FROM knowledge_entries WHERE id = ?',
      args: [id],
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
