import { createClient } from '@libsql/client/web';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const db = createClient({ url: context.env.TURSO_DATABASE_URL, authToken: context.env.TURSO_AUTH_TOKEN });

    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT DEFAULT 'anonymous',
        user_message TEXT NOT NULL,
        agent_reply TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    });

    const url = new URL(context.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const search = url.searchParams.get('search')?.trim() || '';
    const limit = 10;
    const offset = (page - 1) * limit;

    let countSql = 'SELECT COUNT(*) as total FROM chat_history';
    let dataSql = 'SELECT * FROM chat_history';
    const args: (string | number)[] = [];
    const countArgs: string[] = [];

    if (search) {
      const where = ' WHERE user_message LIKE ? OR agent_reply LIKE ?';
      const searchParam = `%${search}%`;
      countSql += where;
      countArgs.push(searchParam, searchParam);
      dataSql += where;
      args.push(searchParam, searchParam);
    }

    dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      db.execute({ sql: countSql, args: countArgs }),
      db.execute({ sql: dataSql, args }),
    ]);

    const total = Number(countResult.rows[0]?.total || 0);

    return new Response(JSON.stringify({
      ok: true,
      history: dataResult.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
