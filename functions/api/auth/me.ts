import { createClient } from '@libsql/client/web';
import { getSessionUser } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const user = await getSessionUser(context.request, context.env);

    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, user: null }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Fetch email + avatar from DB
    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const row = await db.execute({
      sql: `SELECT email, avatar_url FROM users WHERE id = ?`,
      args: [user.id],
    });

    const email = row.rows[0]?.email as string | undefined;
    const avatar_url = row.rows[0]?.avatar_url as string | undefined;

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          email: email || null,
          avatar_url: avatar_url || null,
          roles: user.roles,
          effectiveRole: user.effectiveRole,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
