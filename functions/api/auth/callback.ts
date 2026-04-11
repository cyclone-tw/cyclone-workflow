import { createClient } from '@libsql/client/web';
import { parseCookies, createSession } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

function getDb(env: Env) {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = context.env;
    const url = new URL(context.request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // Verify state to prevent CSRF
    const cookieHeader = context.request.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const savedState = cookies['oauth_state'];

    if (!code || !state || state !== savedState) {
      return new Response(
        JSON.stringify({ ok: false, error: '無效的 OAuth 回調' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Build redirect URI (must match the one used in login)
    const redirectUri = `${url.origin}/api/auth/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Token exchange failed:', errText);
      return new Response(
        JSON.stringify({ ok: false, error: '無法取得 Google access token' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    // Fetch user profile from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: '無法取得 Google 用戶資料' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const googleUser = (await userResponse.json()) as GoogleUserInfo;

    if (!googleUser.email) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Google 帳號沒有提供 email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const db = getDb(context.env);

    // Check if user exists by email
    const existingUser = await db.execute({
      sql: `SELECT id FROM users WHERE email = ?`,
      args: [googleUser.email],
    });

    let userId: string;

    if (existingUser.rows.length > 0) {
      // Update existing user's name and avatar
      userId = existingUser.rows[0].id as string;
      await db.execute({
        sql: `UPDATE users SET name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [googleUser.name, googleUser.picture, userId],
      });
    } else {
      // No email match — try to claim a seed user with matching name and empty email
      // 1. Exact name match (fast path)
      let seedMatch = await db.execute({
        sql: `SELECT id FROM users WHERE name = ? AND (email = '' OR email IS NULL) LIMIT 1`,
        args: [googleUser.name],
      });

      // 2. Prefix fallback: Google name starts with seed name (min 4 chars)
      //    e.g. Google "Cyclone Kang" → seed "Cyclone" (prefix, 7 chars ✓)
      //    NOT: Google "Darren Smith" → seed "Dar" (3 chars ✗, too short)
      if (seedMatch.rows.length === 0) {
        seedMatch = await db.execute({
          sql: `SELECT id FROM users WHERE (email = '' OR email IS NULL) AND LENGTH(name) >= 4 AND INSTR(?, name) = 1 ORDER BY LENGTH(name) DESC LIMIT 1`,
          args: [googleUser.name],
        });
      }

      if (seedMatch.rows.length > 0) {
        // Claim existing seed user: set email + avatar, keep their roles
        userId = seedMatch.rows[0].id as string;
        await db.execute({
          sql: `UPDATE users SET email = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
          args: [googleUser.email, googleUser.picture, userId],
        });
      } else {
        // Truly new user — create with companion role
        userId = crypto.randomUUID();
        await db.execute({
          sql: `INSERT INTO users (id, email, name, avatar_url, preferences, created_at, updated_at) VALUES (?, ?, ?, ?, '{}', datetime('now'), datetime('now'))`,
          args: [userId, googleUser.email, googleUser.name, googleUser.picture],
        });

        const roleId = crypto.randomUUID();
        await db.execute({
          sql: `INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'companion')`,
          args: [roleId, userId],
        });
      }
    }

    // Create session (detect HTTPS for Secure cookie flag)
    const isSecure = url.protocol === 'https:';
    const { setCookie } = await createSession(context.env, userId, isSecure);

    // Redirect to homepage with session cookie
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': setCookie,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('OAuth callback error:', message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
