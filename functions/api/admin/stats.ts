import { createClient } from '@libsql/client/web';
import { requireRole } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

async function safeCount(db: ReturnType<typeof createClient>, table: string): Promise<number> {
  try {
    const result = await db.execute({ sql: `SELECT COUNT(*) as count FROM ${table}`, args: [] });
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

async function safeCountActiveUsers(db: ReturnType<typeof createClient>): Promise<number> {
  try {
    const result = await db.execute({
      sql: `SELECT COUNT(*) as count FROM users WHERE archived_at IS NULL AND status = 'active'`,
      args: [],
    });
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/stats — aggregate site statistics
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await requireRole(context.request, context.env, 'admin');

    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const [totalUsers, totalCheckins, totalKnowledge, totalWishes, totalMessages] =
      await Promise.all([
        safeCountActiveUsers(db),
        safeCount(db, 'checkins'),
        safeCount(db, 'knowledge_entries'),
        safeCount(db, 'wishes'),
        safeCount(db, 'messages'),
      ]);

    return new Response(
      JSON.stringify({
        ok: true,
        stats: { totalUsers, totalCheckins, totalKnowledge, totalWishes, totalMessages },
      }),
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
