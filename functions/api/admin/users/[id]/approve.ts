import { requireRole } from '../../../../../src/lib/auth.ts';
import { findUserById, approveUser } from '../../../../../src/lib/members.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// ---------------------------------------------------------------------------
// POST /api/admin/users/:id/approve
// Promotes a pending user to active + assigns the default 'member' role.
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
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

    if (target.status === 'active') {
      return new Response(
        JSON.stringify({ ok: false, error: '該成員已是啟用狀態' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    await approveUser(context.env, id);

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
