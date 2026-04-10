import { createClient } from '@libsql/client/web';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// ---------------------------------------------------------------------------
// GET /api/checkin/leaderboard — 公開排行榜（不需登入）
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const result = await db.execute({
      sql: `
        SELECT
          c.user_id,
          u.name,
          u.avatar_url,
          SUM(c.points) AS totalPoints,
          COUNT(c.id) AS totalCheckins
        FROM checkins c
        JOIN users u ON u.id = c.user_id
        GROUP BY c.user_id
        ORDER BY totalPoints DESC
        LIMIT 20
      `,
      args: [],
    });

    const leaderboard = result.rows.map((r, index) => ({
      rank: index + 1,
      userId: r.user_id,
      name: r.name,
      avatarUrl: r.avatar_url,
      totalPoints: Number(r.totalPoints),
      totalCheckins: Number(r.totalCheckins),
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
