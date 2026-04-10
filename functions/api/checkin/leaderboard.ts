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
          u.name AS user_name,
          u.avatar_url,
          SUM(c.points) AS total_points,
          COUNT(c.id) AS total_checkins
        FROM checkins c
        JOIN users u ON u.id = c.user_id
        GROUP BY c.user_id
        ORDER BY total_points DESC
        LIMIT 20
      `,
      args: [],
    });

    // Batch-fetch all checkin dates for the top-20 users, then compute streaks in JS
    const userIds = result.rows.map((r) => r.user_id as string);
    const dateResult = userIds.length > 0
      ? await db.execute({
          sql: `SELECT user_id, checkin_date AS day FROM checkins WHERE user_id IN (${userIds.map(() => '?').join(',')}) ORDER BY user_id, day DESC`,
          args: userIds,
        })
      : { rows: [] as { user_id: string; day: string }[] };

    // Build per-user streak map (local-date aware)
    const streakMap = new Map<string, number>();
    const userDays = new Map<string, Set<string>>();
    for (const dr of dateResult.rows as { user_id: string; day: string }[]) {
      if (!userDays.has(dr.user_id)) userDays.set(dr.user_id, new Set());
      userDays.get(dr.user_id)!.add(dr.day);
    }
    function toLocalDate(d: Date): string {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    for (const uid of userIds) {
      const days = userDays.get(uid);
      if (!days || days.size === 0) { streakMap.set(uid, 0); continue; }
      // Determine starting offset: 0 = today, 1 = yesterday (grace for not-yet-checked-in-today)
      const now = new Date();
      let offset = 0;
      if (!days.has(toLocalDate(now))) {
        const yd = new Date(now);
        yd.setDate(yd.getDate() - 1);
        if (days.has(toLocalDate(yd))) {
          offset = 1; // start counting from yesterday
        } else {
          streakMap.set(uid, 0);
          continue;
        }
      }
      let streak = 0;
      for (let i = offset; i < 365; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = toLocalDate(d);
        if (days.has(key)) { streak++; } else { break; }
      }
      streakMap.set(uid, streak);
    }

    const leaderboard = result.rows.map((r) => ({
      user_id: r.user_id as string,
      user_name: (r.user_name as string) ?? '',
      avatar_url: r.avatar_url as string | null,
      total_points: Number(r.total_points),
      total_checkins: Number(r.total_checkins),
      current_streak: streakMap.get(r.user_id as string) ?? 0,
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
