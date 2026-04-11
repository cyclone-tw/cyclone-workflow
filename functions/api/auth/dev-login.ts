import { createClient } from '@libsql/client/web';
import { createSession } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  ENVIRONMENT?: string;
}

/**
 * POST /api/auth/dev-login
 *
 * Development-only endpoint that creates a captain session for testing.
 * Returns a Set-Cookie header with the session token.
 *
 * ONLY works on localhost — blocked on any deployed environment.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Guard: ONLY allow requests from localhost
  const url = new URL(context.request.url);
  const host = url.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    return new Response(JSON.stringify({ ok: false, error: 'Not available' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Guard: never allow in production env
  if (context.env.ENVIRONMENT === 'production') {
    return new Response(JSON.stringify({ ok: false, error: 'Not available' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = createClient({ url: context.env.TURSO_DATABASE_URL, authToken: context.env.TURSO_AUTH_TOKEN });

  // Check if test admin user exists, create if not
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
  const TEST_USER_NAME = 'Test Admin';

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [TEST_USER_ID],
  });

  if (existing.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO users (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      args: [TEST_USER_ID, TEST_USER_NAME, 'test-admin@localhost', new Date().toISOString(), new Date().toISOString()],
    });

    // Grant captain role
    await db.execute({
      sql: 'INSERT INTO user_roles (user_id, role) VALUES (?, ?)',
      args: [TEST_USER_ID, 'captain'],
    });
  } else {
    // Ensure captain role exists
    const roles = await db.execute({
      sql: 'SELECT role FROM user_roles WHERE user_id = ?',
      args: [TEST_USER_ID],
    });
    const hasCaptain = roles.rows.some((r) => r.role === 'captain');
    if (!hasCaptain) {
      await db.execute({
        sql: 'INSERT INTO user_roles (user_id, role) VALUES (?, ?)',
        args: [TEST_USER_ID, 'captain'],
      });
    }
  }

  // Create session (secure=false for localhost)
  const { token, setCookie } = await createSession(context.env, TEST_USER_ID, false);

  return new Response(JSON.stringify({
    ok: true,
    user: { id: TEST_USER_ID, name: TEST_USER_NAME, role: 'captain' },
    token,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookie,
    },
  });
};
