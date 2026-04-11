import { createClient } from '@libsql/client/web';
import { requireAuth, ROLE_LEVEL } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

function isAdmin(user: { effectiveRole: string }): boolean {
  return (ROLE_LEVEL[user.effectiveRole] ?? 0) >= (ROLE_LEVEL['admin'] ?? 0);
}

// ---------------------------------------------------------------------------
// GET /api/wishes/:id — single wish
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    const db = getDb(context.env);

    const result = await db.execute({
      sql: `
        SELECT
          w.id, w.title, w.description, w.category, w.status, w.icon, w.points,
          w.created_at, w.updated_at,
          wisher.id AS wisher_id,
          wisher.name AS wisher_name,
          wisher.avatar_url AS wisher_avatar,
          claimer.id AS claimer_id,
          claimer.name AS claimer_name,
          claimer.avatar_url AS claimer_avatar
        FROM wishes w
        JOIN users wisher ON wisher.id = w.wisher_id AND wisher.archived_at IS NULL AND wisher.status = 'active'
        LEFT JOIN users claimer ON claimer.id = w.claimer_id AND claimer.archived_at IS NULL AND claimer.status = 'active'
        WHERE w.id = ?
      `,
      args: [id],
    });

    if (!result.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此願望' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const r = result.rows[0];
    const wish = {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status,
      icon: r.icon,
      points: r.points,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      wisher: {
        id: r.wisher_id,
        name: r.wisher_name,
        avatarUrl: r.wisher_avatar,
      },
      claimer: r.claimer_id
        ? { id: r.claimer_id, name: r.claimer_name, avatarUrl: r.claimer_avatar }
        : null,
    };

    return new Response(JSON.stringify({ ok: true, wish }), {
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

// ---------------------------------------------------------------------------
// PATCH /api/wishes/:id — claim / status change / edit
// ---------------------------------------------------------------------------

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const db = getDb(context.env);

    // Fetch current wish
    const existing = await db.execute({
      sql: 'SELECT wisher_id, claimer_id, status FROM wishes WHERE id = ?',
      args: [id],
    });

    if (!existing.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此願望' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const wish = existing.rows[0];
    const body = await context.request.json() as {
      action?: string;
      status?: string;
      title?: string;
      description?: string;
      category?: string;
      icon?: string;
    };

    // ── Claim action ──────────────────────────────────────────────────────
    if (body.action === 'claim') {
      if (wish.wisher_id === user.id) {
        return new Response(JSON.stringify({ ok: false, error: '不能認領自己的願望' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (wish.status !== 'pending') {
        return new Response(JSON.stringify({ ok: false, error: '此願望無法被認領' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await db.execute({
        sql: `UPDATE wishes SET claimer_id = ?, status = 'claimed', updated_at = datetime('now') WHERE id = ?`,
        args: [user.id, id],
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Status change ─────────────────────────────────────────────────────
    if (body.status) {
      const validStatuses = ['in-progress', 'completed'];
      if (!validStatuses.includes(body.status)) {
        return new Response(JSON.stringify({ ok: false, error: '無效的狀態' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const canChangeStatus =
        wish.claimer_id === user.id || isAdmin(user);
      if (!canChangeStatus) {
        return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await db.execute({
        sql: `UPDATE wishes SET status = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [body.status, id],
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Edit fields ───────────────────────────────────────────────────────
    const canEdit = wish.wisher_id === user.id || isAdmin(user);
    if (!canEdit) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates: string[] = [];
    const args: string[] = [];

    if (body.title !== undefined) { updates.push('title = ?'); args.push(body.title.trim()); }
    if (body.description !== undefined) { updates.push('description = ?'); args.push(body.description.trim()); }
    if (body.category !== undefined && ['personal', 'site'].includes(body.category)) {
      updates.push('category = ?'); args.push(body.category);
    }
    if (body.icon !== undefined) { updates.push('icon = ?'); args.push(body.icon.trim()); }

    if (!updates.length) {
      return new Response(JSON.stringify({ ok: false, error: '沒有更新內容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updates.push("updated_at = datetime('now')");
    args.push(id);

    await db.execute({
      sql: `UPDATE wishes SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return new Response(JSON.stringify({ ok: true }), {
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

// ---------------------------------------------------------------------------
// DELETE /api/wishes/:id — only wisher or admin+
// ---------------------------------------------------------------------------

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const id = context.params.id as string;
    const db = getDb(context.env);

    const existing = await db.execute({
      sql: 'SELECT wisher_id FROM wishes WHERE id = ?',
      args: [id],
    });

    if (!existing.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此願望' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const canDelete = existing.rows[0].wisher_id === user.id || isAdmin(user);
    if (!canDelete) {
      return new Response(JSON.stringify({ ok: false, error: '權限不足' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({ sql: 'DELETE FROM wishes WHERE id = ?', args: [id] });

    return new Response(JSON.stringify({ ok: true }), {
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
