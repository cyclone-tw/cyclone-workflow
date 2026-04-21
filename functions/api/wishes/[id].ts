import { createClient } from '@libsql/client/web';
import { requireAuth, ROLE_LEVEL } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

async function ensureWishHistoryMigration(db: ReturnType<typeof createClient>) {
  try {
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS wish_history (
        id TEXT PRIMARY KEY,
        wish_id TEXT NOT NULL REFERENCES wishes(id),
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    });
  } catch { /* table already exists */ }
}

async function recordStatusChange(
  db: ReturnType<typeof createClient>,
  wishId: string,
  fromStatus: string,
  toStatus: string,
  changedBy: string,
) {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO wish_history (id, wish_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?, ?)`,
    args: [id, wishId, fromStatus, toStatus, changedBy],
  });
}

function isAdminOrAbove(user: { effectiveRole: string }): boolean {
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

    // Fetch claimers
    const claimersResult = await db.execute({
      sql: `
        SELECT wc.status, u.id, u.name, u.avatar_url
        FROM wish_claimers wc
        JOIN users u ON u.id = wc.user_id AND u.archived_at IS NULL AND u.status = 'active'
        WHERE wc.wish_id = ?
      `,
      args: [id],
    });
    const claimers = claimersResult.rows.map((c) => ({
      id: c.id as string,
      name: c.name as string,
      avatarUrl: c.avatar_url as string | null,
      status: c.status as string,
    }));

    // Fetch comments count
    const commentsCountResult = await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM wish_comments WHERE wish_id = ?`,
      args: [id],
    });
    const comments_count = Number(commentsCountResult.rows[0]?.cnt ?? 0);

    // Fetch linked AI tools
    const toolsResult = await db.execute({
      sql: `SELECT id, name, url, contributor_id FROM ai_tools WHERE wish_id = ?`,
      args: [id],
    });
    const linked_tools = toolsResult.rows.map((t) => ({
      id: Number(t.id),
      name: t.name as string,
      url: t.url as string,
      contributor_id: t.contributor_id as string,
    }));

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
      claimers,
      comments_count,
      linked_tools,
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
      if (wish.status !== 'pending' && wish.status !== 'claimed') {
        return new Response(JSON.stringify({ ok: false, error: '此願望目前無法被認領' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Insert into wish_claimers (idempotent — UNIQUE prevents duplicates)
      const claimId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT OR IGNORE INTO wish_claimers (id, wish_id, user_id, status) VALUES (?, ?, ?, 'claimed')`,
        args: [claimId, id, user.id],
      });

      // Update wish status to claimed if it was pending
      if (wish.status === 'pending') {
        await db.execute({
          sql: `UPDATE wishes SET status = 'claimed', updated_at = datetime('now') WHERE id = ?`,
          args: [id],
        });
        await ensureWishHistoryMigration(db);
        await recordStatusChange(db, id, 'pending', 'claimed', user.id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Unclaim action ───────────────────────────────────────────────────
    if (body.action === 'unclaim') {
      const existingClaim = await db.execute({
        sql: `SELECT id FROM wish_claimers WHERE wish_id = ? AND user_id = ? AND status = 'claimed'`,
        args: [id, user.id],
      });
      if (existingClaim.rows.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: '你沒有認領此許願' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      await db.execute({
        sql: `DELETE FROM wish_claimers WHERE wish_id = ? AND user_id = ?`,
        args: [id, user.id],
      });

      // If no claimers remain, revert wish status to pending
      const remaining = await db.execute({
        sql: `SELECT COUNT(*) AS cnt FROM wish_claimers WHERE wish_id = ?`,
        args: [id],
      });
      if (Number(remaining.rows[0]?.cnt ?? 0) === 0 && (wish.status === 'claimed' || wish.status === 'in-progress')) {
        const oldStatus = wish.status as string;
        await db.execute({
          sql: `UPDATE wishes SET status = 'pending', updated_at = datetime('now') WHERE id = ?`,
          args: [id],
        });
        await ensureWishHistoryMigration(db);
        await recordStatusChange(db, id, oldStatus, 'pending', user.id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Complete action ──────────────────────────────────────────────────
    if (body.action === 'complete') {
      const wishRow = wish;
      // Only wisher or admin+ can mark as completed
      const canComplete = wishRow.wisher_id === user.id || isAdminOrAbove(user);
      if (!canComplete) {
        return new Response(JSON.stringify({ ok: false, error: '權限不足，只有許願者或管理員可確認完成' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (wishRow.status === 'completed') {
        return new Response(JSON.stringify({ ok: false, error: '此願望已經完成' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Mark all claimers as completed
      await db.execute({
        sql: `UPDATE wish_claimers SET status = 'completed' WHERE wish_id = ? AND status = 'claimed'`,
        args: [id],
      });

      // Update wish status
      await db.execute({
        sql: `UPDATE wishes SET status = 'completed', updated_at = datetime('now') WHERE id = ?`,
        args: [id],
      });
      await ensureWishHistoryMigration(db);
      await recordStatusChange(db, id, wishRow.status as string, 'completed', user.id);

      // Award points to claimers based on linked AI tool submissions
      const claimersResult = await db.execute({
        sql: `SELECT user_id FROM wish_claimers WHERE wish_id = ? AND status = 'completed'`,
        args: [id],
      });
      for (const row of claimersResult.rows) {
        const claimerId = row.user_id as string;
        // Idempotent: skip if points already awarded for this wish+claimer
        const existingPoints = await db.execute({
          sql: `SELECT id FROM points_ledger WHERE user_id = ? AND ref_type = 'wish' AND ref_id = ?`,
          args: [claimerId, id],
        });
        if (existingPoints.rows.length > 0) continue;

        const toolCheck = await db.execute({
          sql: `SELECT id FROM ai_tools WHERE wish_id = ? AND contributor_id = ? LIMIT 1`,
          args: [id, claimerId],
        });
        const hasTool = toolCheck.rows.length > 0;
        const ledgerId = crypto.randomUUID();
        await db.execute({
          sql: `INSERT INTO points_ledger (id, user_id, action, points, ref_type, ref_id) VALUES (?, ?, ?, ?, 'wish', ?)`,
          args: [ledgerId, claimerId, hasTool ? 'wish_completed_ai_tool' : 'wish_completed', hasTool ? 300 : 100, id],
        });
      }

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
        wish.claimer_id === user.id || isAdminOrAbove(user);
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
      await ensureWishHistoryMigration(db);
      await recordStatusChange(db, id, wish.status as string, body.status, user.id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Edit fields ───────────────────────────────────────────────────────
    const canEdit = wish.wisher_id === user.id || isAdminOrAbove(user);
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
    if (body.category !== undefined && ['personal', 'feature', 'teaching'].includes(body.category)) {
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

    const canDelete = existing.rows[0].wisher_id === user.id || isAdminOrAbove(user);
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
