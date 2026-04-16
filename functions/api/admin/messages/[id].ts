import { createClient } from '@libsql/client/web';
import { requireRole } from '../../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/messages/:id — restore deleted message or toggle pinned
// Body: { restore?: boolean, pinned?: number }
// ---------------------------------------------------------------------------

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireRole(context.request, context.env, 'admin');
    const id = context.params.id as string;
    const db = getDb(context.env);

    const body = (await context.request.json()) as { restore?: boolean; delete?: boolean; pinned?: number };
    const { restore, delete: doDelete, pinned } = body;

    const existing = await db.execute({ sql: 'SELECT id FROM messages WHERE id = ?', args: [id] });
    if (!existing.rows.length) {
      return new Response(JSON.stringify({ ok: false, error: '找不到此留言' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (restore) {
      updates.push('deleted_at = NULL', 'deleted_by = NULL');
    } else if (doDelete) {
      updates.push("deleted_at = datetime('now')", 'deleted_by = ?');
      args.push(user.id);
    }

    if (pinned !== undefined) {
      if (pinned !== 0 && pinned !== 1) {
        return new Response(JSON.stringify({ ok: false, error: 'pinned 只能是 0 或 1' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      updates.push('pinned = ?');
      args.push(pinned);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '請提供 delete / restore / pinned' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE messages SET ${updates.join(', ')} WHERE id = ?`,
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
