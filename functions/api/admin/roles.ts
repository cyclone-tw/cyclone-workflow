import { createClient } from '@libsql/client/web';
import { requireRole, requireAuth } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// ---------------------------------------------------------------------------
// GET /api/admin/roles — list all users with roles
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');

    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const result = await db.execute({
      sql: `
        SELECT u.id, u.name, u.email, u.avatar_url, GROUP_CONCAT(ur.role) as roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        GROUP BY u.id
        ORDER BY u.name
      `,
      args: [],
    });

    const users = result.rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      email: (r.email as string) ?? '',
      avatar_url: (r.avatar_url as string) ?? null,
      roles: r.roles ? (r.roles as string).split(',') : [],
    }));

    return new Response(
      JSON.stringify({ ok: true, users }),
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
// PUT /api/admin/roles — add or remove a role
// ---------------------------------------------------------------------------

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const operator = await requireRole(context.request, context.env, 'admin');

    const body = await context.request.json() as { user_id?: string; role?: string; action?: 'add' | 'remove' };
    const { user_id, role, action } = body;

    // Prevent self-lockout: cannot remove own admin-level role
    if (action === 'remove' && user_id === operator.id && ['captain', 'tech', 'admin'].includes(role)) {
      return new Response(
        JSON.stringify({ ok: false, error: '不能移除自己的管理權限，避免帳號被鎖定' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!user_id || !role || !action) {
      return new Response(
        JSON.stringify({ ok: false, error: '缺少必要欄位' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    if (action === 'add') {
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
        args: [id, user_id, role],
      });
    } else if (action === 'remove') {
      await db.execute({
        sql: `DELETE FROM user_roles WHERE user_id = ? AND role = ?`,
        args: [user_id, role],
      });
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: '無效的 action' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
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
