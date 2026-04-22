import { createClient } from '@libsql/client/web';
import { requireAuth } from '../../../src/lib/auth.ts';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

function getDb(env: Env) {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}

// GET: Fetch messages (top-level with nested replies)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = getDb(context.env);

    let currentUserId: string | null = null;
    try {
      const { requireAuth } = await import('../../../src/lib/auth.ts');
      const u = await requireAuth(context.request, context.env);
      currentUserId = u.id;
    } catch {
      // 未登入，繼續以訪客身份
    }

    // Top-level messages with reply_count
    const result = await db.execute({
      sql: `SELECT m.*,
                   COALESCE(lc.like_count, 0) as like_count,
                   COALESCE(mr.report_count, 0) AS report_count,
                   COALESCE(rc.reply_count, 0) AS reply_count
            FROM messages m
            LEFT JOIN (
              SELECT message_id, COUNT(*) as like_count
              FROM discussion_likes
              GROUP BY message_id
            ) lc ON lc.message_id = m.id
            LEFT JOIN (
              SELECT message_id, COUNT(*) AS report_count
              FROM message_reports
              WHERE status = 'pending'
              GROUP BY message_id
            ) mr ON mr.message_id = m.id
            LEFT JOIN (
              SELECT parent_id, COUNT(*) AS reply_count
              FROM messages
              WHERE parent_id IS NOT NULL AND deleted_at IS NULL
              GROUP BY parent_id
            ) rc ON rc.parent_id = m.id
            WHERE m.parent_id IS NULL
            ORDER BY m.pinned DESC, m.created_at DESC LIMIT 100`,
      args: [],
    });

    // All replies (parent_id IS NOT NULL) — only for current top-level messages
    const topLevelIds = result.rows.map((row) => row.id as number);
    const repliesResult = topLevelIds.length > 0
      ? await db.execute({
          sql: `SELECT m.*,
                       COALESCE(lc.like_count, 0) as like_count,
                       COALESCE(mr.report_count, 0) AS report_count
                FROM messages m
                LEFT JOIN (
                  SELECT message_id, COUNT(*) as like_count
                  FROM discussion_likes
                  GROUP BY message_id
                ) lc ON lc.message_id = m.id
                LEFT JOIN (
                  SELECT message_id, COUNT(*) AS report_count
                  FROM message_reports
                  WHERE status = 'pending'
                  GROUP BY message_id
                ) mr ON mr.message_id = m.id
                WHERE m.parent_id IN (${topLevelIds.map(() => '?').join(', ')})
                ORDER BY m.created_at ASC`,
          args: topLevelIds,
        })
      : { rows: [] as any[] };

    // User's report records
    let reportedByMe: Set<number> = new Set();
    if (currentUserId) {
      const reports = await db.execute({
        sql: 'SELECT message_id FROM message_reports WHERE reporter_id = ?',
        args: [currentUserId],
      });
      for (const row of reports.rows) {
        reportedByMe.add(row.message_id as number);
      }
    }

    // Strip content/author from soft-deleted messages (privacy)
    const stripDeleted = (row: Record<string, unknown>) => {
      if (row.deleted_at) {
        return { ...row, content: null, author: null, tag: null };
      }
      return row;
    };

    // Group replies by parent_id
    const repliesByParent = new Map<number, any[]>();
    for (const row of repliesResult.rows) {
      const pid = row.parent_id as number;
      if (!repliesByParent.has(pid)) repliesByParent.set(pid, []);
      repliesByParent.get(pid)!.push(stripDeleted({
        ...row,
        reported_by_me: reportedByMe.has(row.id as number),
      }));
    }

    const messages = result.rows.map((row) => stripDeleted({
      ...row,
      reported_by_me: reportedByMe.has(row.id as number),
      reply_count: Number(row.reply_count ?? 0),
      replies: repliesByParent.get(row.id as number) ?? [],
    }));

    return new Response(JSON.stringify({ ok: true, messages }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Create a new message or reply (requires login)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const user = await requireAuth(context.request, context.env);

    const { content, tag, category, parent_id } = await context.request.json() as {
      content?: string;
      tag?: string;
      category?: string;
      parent_id?: number | null;
    };

    const author = user.name;

    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: '請填寫留言內容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (content.length > 2000) {
      return new Response(JSON.stringify({ error: '留言不得超過 2000 字' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(context.env);

    // Validate parent_id if provided (reply)
    if (parent_id != null && parent_id !== undefined) {
      const parent = await db.execute({
        sql: 'SELECT id, parent_id FROM messages WHERE id = ? AND deleted_at IS NULL',
        args: [parent_id],
      });
      if (parent.rows.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: '找不到要回覆的留言' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (parent.rows[0].parent_id !== null) {
        return new Response(JSON.stringify({ ok: false, error: '只能回覆頂層留言' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const effectiveTag = parent_id != null ? '' : (tag?.trim() || '');
    const effectiveCategory = parent_id != null ? '' : (category || '閒聊');

    await db.execute({
      sql: `INSERT INTO messages (author, author_id, content, tag, category, parent_id) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [author.trim(), user.id, content.trim(), effectiveTag, effectiveCategory, parent_id != null ? parent_id : null],
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
