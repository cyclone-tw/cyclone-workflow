import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// ---------------------------------------------------------------------------
// GET /api/points/me — 查詢自己的積分記錄與總分
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const url = new URL(context.request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam || 20), 1), 100);

    const [recordsResult, totalResult] = await Promise.all([
      db.execute({
        sql: `SELECT id, action, points, ref_type, ref_id, created_at FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        args: [user.id, limit],
      }),
      db.execute({
        sql: `SELECT COALESCE(SUM(points), 0) AS totalPoints FROM points_ledger WHERE user_id = ?`,
        args: [user.id],
      }),
    ]);

    const totalPoints = Number(totalResult.rows[0]?.totalPoints ?? 0);

    return new Response(
      JSON.stringify({
        ok: true,
        totalPoints,
        records: recordsResult.rows.map((r) => ({
          id: r.id,
          action: r.action,
          points: r.points,
          refType: r.ref_type,
          refId: r.ref_id,
          createdAt: r.created_at,
        })),
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
