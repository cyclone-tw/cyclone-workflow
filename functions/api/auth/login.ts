interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { GOOGLE_CLIENT_ID } = context.env;

    if (!GOOGLE_CLIENT_ID) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Google OAuth 未設定' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const state = crypto.randomUUID();

    // Build redirect URI — same origin /api/auth/callback
    const url = new URL(context.request.url);
    const redirectUri = `${url.origin}/api/auth/callback`;

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    // Set state in a short-lived cookie so we can verify it in callback
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: googleAuthUrl,
        'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/callback; Max-Age=600`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
