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
      sql: `SELECT email, avatar_url, display_name, emoji, color, bio FROM users WHERE id = ?`,
      args: [user.id],
    });

    const r = row.rows[0];
    const email = r?.email as string | undefined;
    const avatar_url = r?.avatar_url as string | undefined;
    const display_name = r?.display_name as string | undefined;
    const emoji = r?.emoji as string | undefined;
    const color = r?.color as string | undefined;
    const bio = r?.bio as string | undefined;

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
          status: user.status,
          display_name: display_name || '',
          emoji: emoji || '',
          color: color || '#6C63FF',
          bio: bio || '',
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
