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

// GET /api/member-voices/:id — single voice
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    const db = getDb(context.env);

    const result = await db.execute({
      sql: `
        SELECT
          mv.id, mv.type, mv.title, mv.content, mv.metadata, mv.created_at, mv.updated_at,
          u.id AS user_id,
          u.name AS user_name,
          u.avatar_url AS user_avatar
        FROM member_voices mv
        JOIN users u ON u.id = mv.user_id AND u.archived_at IS NULL AND u.status = 'active'
        WHERE mv.id = ?
      `,
      args: [id],
    });

    if (!result.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此內容' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const r = result.rows[0];
    const voice = {
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
    };

    return new Response(JSON.stringify({ ok: true, voice }), {
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

// PATCH /api/member-voices/:id — edit own voice
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const db = getDb(context.env);

    const existing = await db.execute({
      sql: 'SELECT user_id FROM member_voices WHERE id = ?',
      args: [id],
    });

    if (!existing.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此內容' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const canEdit = existing.rows[0].user_id === user.id || isAdminOrAbove(user);
    if (!canEdit) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json() as {
      title?: string;
      content?: string;
      metadata?: Record<string, unknown>;
    };

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (body.title !== undefined) {
      const trimmed = body.title.trim();
      if (!trimmed) {
        return new Response(JSON.stringify({ ok: false, error: '標題不得為空' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      updates.push('title = ?');
      args.push(trimmed);
    }
    if (body.content !== undefined) {
      const trimmed = body.content.trim();
      if (!trimmed) {
        return new Response(JSON.stringify({ ok: false, error: '內容不得為空' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      updates.push('content = ?');
      args.push(trimmed);
    }
    if (body.metadata !== undefined) {
      updates.push('metadata = ?');
      args.push(JSON.stringify(body.metadata));
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '沒有可更新的內容' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    updates.push("updated_at = datetime('now')");
    args.push(id);

    await db.execute({
      sql: `UPDATE member_voices SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return new Response(JSON.stringify({ ok: true }), {
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

// DELETE /api/member-voices/:id — delete own voice or admin
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const db = getDb(context.env);

    const existing = await db.execute({
      sql: 'SELECT user_id FROM member_voices WHERE id = ?',
      args: [id],
    });

    if (!existing.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此內容' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const canDelete = existing.rows[0].user_id === user.id || isAdminOrAbove(user);
    if (!canDelete) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({
      sql: 'DELETE FROM member_voices WHERE id = ?',
      args: [id],
    });

    // Remove associated points
    await db.execute({
      sql: `DELETE FROM points_ledger WHERE user_id = ? AND ref_type = 'member_voice' AND ref_id = ?`,
      args: [existing.rows[0].user_id, id],
    });

    return new Response(JSON.stringify({ ok: true }), {
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
