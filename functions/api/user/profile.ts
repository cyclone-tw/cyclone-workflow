import { createClient } from '@libsql/client/web';
import { getSessionUser } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// ---------------------------------------------------------------------------
// PATCH /api/user/profile
// Body: { display_name?, emoji?, color?, bio? }
// ---------------------------------------------------------------------------

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const user = await getSessionUser(context.request, context.env);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: '未登入' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json() as {
      display_name?: string;
      emoji?: string;
      color?: string;
      bio?: string;
    };

    const updates: string[] = [];
    const args: string[] = [];

    if (body.display_name !== undefined) {
      updates.push('display_name = ?');
      args.push(body.display_name.trim());
    }

    if (body.emoji !== undefined) {
      updates.push('emoji = ?');
      args.push(body.emoji.trim());
    }

    if (body.color !== undefined) {
      updates.push('color = ?');
      args.push(body.color.trim());
    }

    if (body.bio !== undefined) {
      updates.push('bio = ?');
      args.push(body.bio.trim());
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: '沒有可更新的欄位' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    updates.push("updated_at = datetime('now')");
    args.push(user.id);

    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: `SELECT id, name, email, avatar_url, discord_id, display_name, emoji, color, bio
            FROM users WHERE id = ?`,
      args: [user.id],
    });

    const row = result.rows[0];
    const updated = {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email ?? ''),
      avatar_url: String(row.avatar_url ?? ''),
      discord_id: String(row.discord_id ?? ''),
      display_name: String(row.display_name ?? ''),
      emoji: String(row.emoji ?? ''),
      color: String(row.color ?? '#6C63FF'),
      bio: String(row.bio ?? ''),
    };

    return new Response(JSON.stringify({ ok: true, user: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
