import { createClient } from '@libsql/client/web';

interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const db = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    await db.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          discord_id TEXT,
          preferences TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT CHECK(type IN ('fact','preference','goal','skill','interaction')),
          content TEXT NOT NULL,
          importance REAL DEFAULT 0.5,
          access_count INTEGER DEFAULT 0,
          last_accessed DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          input_type TEXT CHECK(input_type IN ('voice','text')),
          input_text TEXT,
          agent_response TEXT,
          memories_used TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS weekly_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          week_number INTEGER,
          goals TEXT DEFAULT '[]',
          achievements TEXT DEFAULT '[]',
          reflections TEXT,
          workflow_snapshot TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS shared_knowledge (
          id TEXT PRIMARY KEY,
          contributor_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT,
          upvotes INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contributor_id) REFERENCES users(id)
        )`,
        args: [],
      },
    ]);

    // Seed members
    const members = [
      ['cyclone', 'Cyclone', '#2707'],
      ['benben', 'βenben', '#0010'],
      ['dar', 'Dar', '#3808'],
      ['benson', 'Benson', '#2808'],
      ['tiffanyhou', 'Tiffanyhou', '#2623'],
      ['morning', '早安', '#1329'],
    ];

    for (const [id, name, discord_id] of members) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO users (id, name, discord_id) VALUES (?, ?, ?)`,
        args: [id, name, discord_id],
      });
    }

    return new Response(JSON.stringify({ ok: true, message: 'Schema initialized and members seeded' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
