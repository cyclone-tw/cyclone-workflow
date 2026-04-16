import { createClient } from '@libsql/client/web';
import { requireAuth, ROLE_LEVEL } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

function isAdminOrAbove(user: { effectiveRole: string }): boolean {
  return (ROLE_LEVEL[user.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0);
}

// GET /api/member-voices — list voices with optional type filter
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);
    const url = new URL(context.request.url);
    const type = url.searchParams.get('type');

    const conditions: string[] = [];
    const args: string[] = [];

    if (type && ['ai_inventory', 'pain_point'].includes(type)) {
      conditions.push('mv.type = ?');
      args.push(type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.execute({
      sql: `
        SELECT
          mv.id, mv.type, mv.title, mv.content, mv.metadata, mv.created_at, mv.updated_at,
          u.id AS user_id,
          u.name AS user_name,
          u.avatar_url AS user_avatar
        FROM member_voices mv
        JOIN users u ON u.id = mv.user_id AND u.archived_at IS NULL AND u.status = 'active'
        ${where}
        ORDER BY mv.created_at DESC
      `,
      args,
    });

    const voices = result.rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      content: r.content,
      metadata: (() => {
        try { return JSON.parse(r.metadata as string); } catch { return {}; }
      })(),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      user: {
        id: r.user_id,
        name: r.user_name,
        avatarUrl: r.user_avatar,
      },
    }));

    return new Response(JSON.stringify({ ok: true, voices }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/member-voices — create a voice (requires login)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const db = getDb(context.env);

    const body = await context.request.json() as {
      type?: string;
      title?: string;
      content?: string;
      metadata?: Record<string, unknown>;
    };

    const type = ['ai_inventory', 'pain_point'].includes(body.type || '') ? body.type as string : '';
    const title = (body.title || '').trim();
    const content = (body.content || '').trim();

    if (!type) {
      return new Response(JSON.stringify({ ok: false, error: '請選擇類型' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!title) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫標題' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!content) {
      return new Response(JSON.stringify({ ok: false, error: '請填寫內容' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (title.length > 200) {
      return new Response(JSON.stringify({ ok: false, error: '標題不得超過 200 字' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (content.length > 5000) {
      return new Response(JSON.stringify({ ok: false, error: '內容不得超過 5000 字' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: max 5 posts per minute
    const recent = await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM member_voices WHERE user_id = ? AND created_at > datetime('now', '-1 minute')`,
      args: [user.id],
    });
    if (Number(recent.rows[0]?.cnt) >= 5) {
      return new Response(JSON.stringify({ ok: false, error: '發文太頻繁，請稍後再試' }), {
        status: 429, headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = crypto.randomUUID();
    const metadata = JSON.stringify(body.metadata || {});

    await db.execute({
      sql: `INSERT INTO member_voices (id, user_id, type, title, content, metadata)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, user.id, type, title, content, metadata],
    });

    // Award +10 points for sharing
    const ledgerId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO points_ledger (id, user_id, action, points, ref_type, ref_id)
            VALUES (?, ?, 'member_voice_post', 10, 'member_voice', ?)`,
      args: [ledgerId, user.id, id],
    });

    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
