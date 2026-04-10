import { createClient } from '@libsql/client/web';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

export interface SessionUser {
  id: string;
  name: string;
  discord_id: string | null;
  roles: string[];
  effectiveRole: string;
}

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

export const ROLE_LEVEL: Record<string, number> = {
  captain: 100,
  tech: 80,
  admin: 60,
  member: 20,
  companion: 10,
};

// ---------------------------------------------------------------------------
// DB helper (matches existing pattern in functions/api/)
// ---------------------------------------------------------------------------

function getDb(env: Env): Client {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    if (key) {
      cookies[key] = rest.join('=').trim();
    }
  }
  return cookies;
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function createSessionCookie(token: string, secure = true): string {
  const secureFlag = secure ? 'Secure;' : '';
  return `session=${token}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`;
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export function getEffectiveRole(roles: string[]): string {
  let best = 'companion';
  let bestLevel = ROLE_LEVEL['companion'] ?? 0;

  for (const role of roles) {
    const level = ROLE_LEVEL[role] ?? 0;
    if (level > bestLevel) {
      bestLevel = level;
      best = role;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Session helpers
// Tables are created by /api/db/init — auth functions trust they exist.
// ---------------------------------------------------------------------------

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(
  env: Env,
  userId: string,
  secure = true,
): Promise<{ token: string; setCookie: string }> {
  const db = getDb(env);

  const token = generateSessionToken();
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);

  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
    args: [id, userId, token, now.toISOString(), expiresAt.toISOString()],
  });

  return {
    token,
    setCookie: createSessionCookie(token, secure),
  };
}

export async function destroySession(env: Env, token: string): Promise<void> {
  const db = getDb(env);
  await db.execute({
    sql: `DELETE FROM sessions WHERE token = ?`,
    args: [token],
  });
}

// ---------------------------------------------------------------------------
// Auth middleware functions
// ---------------------------------------------------------------------------

export async function getSessionUser(
  request: Request,
  env: Env,
): Promise<SessionUser | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  const token = cookies['session'];
  if (!token) return null;

  const db = getDb(env);

  const result = await db.execute({
    sql: `
      SELECT
        u.id        AS user_id,
        u.name      AS user_name,
        u.discord_id AS user_discord_id,
        s.expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `,
    args: [token],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const expiresAt = new Date(row.expires_at as string);
  if (expiresAt <= new Date()) {
    // Session expired — clean up
    await db.execute({ sql: `DELETE FROM sessions WHERE token = ?`, args: [token] });
    return null;
  }

  const userId = row.user_id as string;

  // Fetch roles
  const rolesResult = await db.execute({
    sql: `SELECT role FROM user_roles WHERE user_id = ?`,
    args: [userId],
  });

  const roles = rolesResult.rows.map((r) => r.role as string);
  // If no roles assigned, default to 'companion'
  const effectiveRole = roles.length > 0 ? getEffectiveRole(roles) : 'companion';

  return {
    id: userId,
    name: row.user_name as string,
    discord_id: (row.user_discord_id as string) ?? null,
    roles: roles.length > 0 ? roles : ['companion'],
    effectiveRole,
  };
}

/**
 * requireAuth — returns the authenticated user or throws a 401 Response.
 * Usage inside a PagesFunction handler:
 *   const user = await requireAuth(context.request, context.env);
 */
export async function requireAuth(
  request: Request,
  env: Env,
): Promise<SessionUser> {
  const user = await getSessionUser(request, env);
  if (!user) {
    throw new Response(JSON.stringify({ ok: false, error: '未登入' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

/**
 * requireRole — returns the authenticated user with sufficient role, or throws 401/403.
 * @param minRole Minimum role required (checked against ROLE_LEVEL hierarchy)
 */
export async function requireRole(
  request: Request,
  env: Env,
  minRole: string,
): Promise<SessionUser> {
  const user = await requireAuth(request, env);

  const userLevel = ROLE_LEVEL[user.effectiveRole] ?? 0;
  const requiredLevel = ROLE_LEVEL[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    throw new Response(
      JSON.stringify({ ok: false, error: '權限不足' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return user;
}
