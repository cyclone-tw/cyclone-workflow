import { createClient } from '@libsql/client/web';
import { requireRole } from '../../../../src/lib/auth.ts';
import {
  findUserById,
  softDeleteUser,
  countActiveCaptains,
  getUserRelatedCounts,
} from '../../../../src/lib/members.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id
// Body: { name?, email?, discord_id?, status? }
// ---------------------------------------------------------------------------

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');

    const id = context.params.id as string;
    const target = await findUserById(context.env, id);
    if (!target || target.archived_at) {
      return new Response(
        JSON.stringify({ ok: false, error: '找不到成員' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const body = await context.request.json() as {
      name?: string;
      email?: string;
      discord_id?: string | null;
      status?: 'active' | 'pending';
    };

    const updates: string[] = [];
    const args: (string | null)[] = [];

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return new Response(
          JSON.stringify({ ok: false, error: '姓名不能為空' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
      updates.push('name = ?');
      args.push(name);
    }

    if (body.email !== undefined) {
      const email = body.email.trim();
      if (email) {
        const db = createClient({
          url: context.env.TURSO_DATABASE_URL,
          authToken: context.env.TURSO_AUTH_TOKEN,
        });
        const dup = await db.execute({
          sql: `SELECT id FROM users WHERE email = ? AND id != ? AND archived_at IS NULL LIMIT 1`,
          args: [email, id],
        });
        if (dup.rows.length > 0) {
          return new Response(
            JSON.stringify({ ok: false, error: `email 已存在：${email}` }),
            { status: 409, headers: { 'Content-Type': 'application/json' } },
          );
        }
      }
      updates.push('email = ?');
      args.push(email);
    }

    if (body.discord_id !== undefined) {
      updates.push('discord_id = ?');
      args.push(body.discord_id || null);
    }

    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'pending') {
        return new Response(
          JSON.stringify({ ok: false, error: `無效的 status：${body.status}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
      updates.push('status = ?');
      args.push(body.status);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: '沒有可更新的欄位' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    updates.push("updated_at = datetime('now')");
    args.push(id);

    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    const updated = await findUserById(context.env, id);
    return new Response(
      JSON.stringify({ ok: true, user: updated }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : '未知錯誤';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id
// Two-phase soft delete:
//   - preview=1: return relatedCounts without touching DB
//   - force=1:   actually archive + drop sessions
// Protections (run in both phases to surface errors upfront):
//   1. cannot delete self
//   2. cannot delete the last active captain
//   3. (warning) related data counts are returned so UI can confirm
// ---------------------------------------------------------------------------

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const operator = await requireRole(context.request, context.env, 'admin');
    const id = context.params.id as string;
    const url = new URL(context.request.url);
    const preview = url.searchParams.get('preview') === '1';
    const force = url.searchParams.get('force') === '1';

    if (!preview && !force) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: '請指定 preview=1 或 force=1',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (id === operator.id) {
      return new Response(
        JSON.stringify({ ok: false, error: '不能封存自己的帳號' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const target = await findUserById(context.env, id);
    if (!target || target.archived_at) {
      return new Response(
        JSON.stringify({ ok: false, error: '找不到成員' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (target.roles.includes('captain')) {
      const captainCount = await countActiveCaptains(context.env);
      if (captainCount <= 1) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: '不能封存系統中最後一位 captain',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    const relatedCounts = await getUserRelatedCounts(context.env, id);

    if (preview) {
      return new Response(
        JSON.stringify({ ok: true, preview: true, target, relatedCounts }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    await softDeleteUser(context.env, id);

    return new Response(
      JSON.stringify({ ok: true, archived: true, id, relatedCounts }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : '未知錯誤';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
