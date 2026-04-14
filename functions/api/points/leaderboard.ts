import { createClient } from '@libsql/client/web';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// ---------------------------------------------------------------------------
// GET /api/points/leaderboard — 積分排行榜（公開，不需登入）
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const url = new URL(context.request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam || 20), 1), 100);

    const result = await db.execute({
      sql: `
        SELECT
          p.user_id,
          u.name AS user_name,
          u.avatar_url,
          COALESCE(SUM(p.points), 0) AS total_points,
          COUNT(p.id) AS total_records
        FROM points_ledger p
        JOIN users u ON u.id = p.user_id AND u.archived_at IS NULL AND u.status = 'active'
        GROUP BY p.user_id
        ORDER BY total_points DESC
        LIMIT ?
      `,
      args: [limit],
    });

    const leaderboard = result.rows.map((r) => ({
      user_id: r.user_id as string,
      user_name: (r.user_name as string) ?? '',
      avatar_url: r.avatar_url as string | null,
      total_points: Number(r.total_points),
      total_records: Number(r.total_records),
    }));

    return new Response(
      JSON.stringify({ ok: true, leaderboard }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
