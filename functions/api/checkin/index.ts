import { createClient } from '@libsql/client/web';
import { requireAuth, getSessionUser } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(monday), end: fmt(sunday) };
}

async function calculateStreak(db: ReturnType<typeof createClient>, userId: string): Promise<number> {
  const result = await db.execute({
    sql: `SELECT checkin_date FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 365`,
    args: [userId],
  });

  if (result.rows.length === 0) return 0;

  const dates: string[] = result.rows.map((r) => r.checkin_date as string);
  const today = getToday();

  // Yesterday in YYYY-MM-DD
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  // Streak is alive only if last checkin is today or yesterday
  const latest = dates[0];
  if (latest !== today && latest !== yesterday) return 0;

  // Count consecutive days backwards
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

// ---------------------------------------------------------------------------
// POST /api/checkin — 打卡
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);
    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const today = getToday();
    const id = crypto.randomUUID();

    // Parse optional note from body
    let note = '';
    try {
      const body = await context.request.json() as { note?: string };
      note = body.note || '';
    } catch {
      // No body or invalid JSON — note stays empty
    }

    // INSERT OR IGNORE — 如果今天已打卡則靜默跳過
    const result = await db.execute({
      sql: `INSERT OR IGNORE INTO checkins (id, user_id, checkin_date, note, points) VALUES (?, ?, ?, ?, 10)`,
      args: [id, user.id, today, note],
    });

    const alreadyCheckedIn = result.rowsAffected === 0;

    // 寫入積分明細（僅首次打卡）
    if (!alreadyCheckedIn) {
      await db.execute({
        sql: `INSERT INTO points_ledger (id, user_id, action, points, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), user.id, 'checkin', 10, 'checkin', id],
      });
    }

    const streak = await calculateStreak(db, user.id);

    return new Response(
      JSON.stringify({
        ok: true,
        alreadyCheckedIn,
        streak,
        checkinDate: today,
        points: alreadyCheckedIn ? 0 : 10,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    // Auth errors are thrown as Response objects
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : '未知錯誤';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

// ---------------------------------------------------------------------------
// GET /api/checkin — 查詢打卡紀錄
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const user = await getSessionUser(context.request, context.env);

    if (!user) {
      return new Response(
        JSON.stringify({ ok: true, checkins: [], totalPoints: 0, streak: 0 }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    const url = new URL(context.request.url);
    const dateParam = url.searchParams.get('date');
    const rangeParam = url.searchParams.get('range');

    let checkinsResult;

    if (dateParam) {
      // 查特定日期
      checkinsResult = await db.execute({
        sql: `SELECT id, checkin_date, note, points, created_at FROM checkins WHERE user_id = ? AND checkin_date = ? ORDER BY checkin_date DESC`,
        args: [user.id, dateParam],
      });
    } else if (rangeParam === 'week') {
      // 查本週
      const { start, end } = getWeekRange();
      checkinsResult = await db.execute({
        sql: `SELECT id, checkin_date, note, points, created_at FROM checkins WHERE user_id = ? AND checkin_date >= ? AND checkin_date <= ? ORDER BY checkin_date DESC`,
        args: [user.id, start, end],
      });
    } else {
      // 最近 30 筆
      checkinsResult = await db.execute({
        sql: `SELECT id, checkin_date, note, points, created_at FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 30`,
        args: [user.id],
      });
    }

    // 總點數
    const pointsResult = await db.execute({
      sql: `SELECT COALESCE(SUM(points), 0) AS totalPoints FROM checkins WHERE user_id = ?`,
      args: [user.id],
    });

    const streak = await calculateStreak(db, user.id);
    const totalPoints = Number(pointsResult.rows[0]?.totalPoints ?? 0);

    return new Response(
      JSON.stringify({
        ok: true,
        checkins: checkinsResult.rows.map((r) => ({
          id: r.id,
          checkinDate: r.checkin_date,
          note: r.note,
          points: r.points,
          createdAt: r.created_at,
        })),
        totalPoints,
        streak,
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
