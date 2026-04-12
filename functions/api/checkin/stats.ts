import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function calculateStreak(db: ReturnType<typeof createClient>, userId: string): Promise<number> {
  const result = await db.execute({
    sql: `SELECT checkin_date FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 365`,
    args: [userId],
  });

  if (result.rows.length === 0) return 0;

  const dates: string[] = result.rows.map((r) => r.checkin_date as string);
  const today = getToday();

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  const latest = dates[0];
  if (latest !== today && latest !== yesterday) return 0;

  let streak = 1;
  let expected = new Date(latest + 'T00:00:00');

  for (let i = 1; i < dates.length; i++) {
    expected.setDate(expected.getDate() - 1);
    const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
    if (dates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

async function calculateLongestStreak(db: ReturnType<typeof createClient>, userId: string): Promise<number> {
  const result = await db.execute({
    sql: `SELECT checkin_date FROM checkins WHERE user_id = ? ORDER BY checkin_date ASC`,
    args: [userId],
  });

  if (result.rows.length === 0) return 0;

  const dates: string[] = result.rows.map((r) => r.checkin_date as string);
  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T00:00:00');
    const curr = new Date(dates[i] + 'T00:00:00');
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

// ---------------------------------------------------------------------------
// GET /api/checkin/stats — 查詢統計
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const [pointsResult, countResult, lastResult, knowledgeCountResult] = await Promise.all([
      db.execute({
        sql: `SELECT COALESCE(SUM(points), 0) AS totalPoints FROM checkins WHERE user_id = ?`,
        args: [user.id],
      }),
      db.execute({
        sql: `SELECT COUNT(*) AS totalCheckins FROM checkins WHERE user_id = ?`,
        args: [user.id],
      }),
      db.execute({
        sql: `SELECT checkin_date FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1`,
        args: [user.id],
      }),
      db.execute({
        sql: `SELECT COUNT(*) AS knowledgeCount FROM knowledge_entries WHERE contributor_id = ?`,
        args: [user.id],
      }),
    ]);

    const [currentStreak, longestStreak] = await Promise.all([
      calculateStreak(db, user.id),
      calculateLongestStreak(db, user.id),
    ]);

    const totalPoints = Number(pointsResult.rows[0]?.totalPoints ?? 0);
    const totalCheckins = Number(countResult.rows[0]?.totalCheckins ?? 0);
    const lastCheckinDate = (lastResult.rows[0]?.checkin_date as string) ?? null;
    const knowledgeCount = Number(knowledgeCountResult.rows[0]?.knowledgeCount ?? 0);

    return new Response(
      JSON.stringify({
        ok: true,
        stats: {
          totalPoints,
          totalCheckins,
          currentStreak,
          longestStreak,
          lastCheckinDate,
          knowledgeCount,
        },
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
