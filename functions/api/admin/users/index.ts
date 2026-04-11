import { createClient } from '@libsql/client/web';
import { requireRole } from '../../../../src/lib/auth.ts';
import { listUsersWithRoles } from '../../../../src/lib/members.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

const VALID_ROLES = ['captain', 'tech', 'admin', 'member', 'companion'] as const;
type ValidRole = typeof VALID_ROLES[number];
function isValidRole(r: string): r is ValidRole {
  return (VALID_ROLES as readonly string[]).includes(r);
}

// ---------------------------------------------------------------------------
// GET /api/admin/users
// Query params:
//   includeArchived=1 — include soft-deleted users
//   status=active|pending|all (default: all active + pending visible; omitted returns active only)
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');

    const url = new URL(context.request.url);
    const includeArchived = url.searchParams.get('includeArchived') === '1';
    const statusParam = url.searchParams.get('status') ?? 'all';
    const status = (['active', 'pending', 'all'].includes(statusParam) ? statusParam : 'all') as
      | 'active' | 'pending' | 'all';

    const users = await listUsersWithRoles(context.env, { includeArchived, status });

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
// POST /api/admin/users
// Body: { name: string, email?: string, role?: ValidRole, discord_id?: string }
// Creates an active user immediately; role defaults to 'member'.
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');

    const body = await context.request.json() as {
      name?: string;
      email?: string;
      role?: string;
      discord_id?: string;
    };

    const name = body.name?.trim();
    const email = (body.email ?? '').trim();
    const role = body.role?.trim() || 'member';
    const discordId = body.discord_id?.trim() || null;

    if (!name) {
      return new Response(
        JSON.stringify({ ok: false, error: '姓名必填' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (!isValidRole(role)) {
      return new Response(
        JSON.stringify({ ok: false, error: `無效的角色：${role}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    // Check email uniqueness if provided
    if (email) {
      const dup = await db.execute({
        sql: `SELECT id FROM users WHERE email = ? AND archived_at IS NULL LIMIT 1`,
        args: [email],
      });
      if (dup.rows.length > 0) {
        return new Response(
          JSON.stringify({ ok: false, error: `email 已存在：${email}` }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    const id = crypto.randomUUID();
    const roleRowId = crypto.randomUUID();

    await db.batch([
      {
        sql: `INSERT INTO users (id, email, name, avatar_url, discord_id, preferences, status, created_at, updated_at)
              VALUES (?, ?, ?, '', ?, '{}', 'active', datetime('now'), datetime('now'))`,
        args: [id, email, name, discordId],
      },
      {
        sql: `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
        args: [roleRowId, id, role],
      },
    ]);

    return new Response(
      JSON.stringify({ ok: true, id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
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
