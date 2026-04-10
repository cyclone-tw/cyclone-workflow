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

    // --- Core tables ---
    await db.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          avatar_url TEXT DEFAULT '',
          discord_id TEXT,
          preferences TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(email)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS user_roles (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          role TEXT NOT NULL CHECK(role IN ('captain', 'tech', 'admin', 'member', 'companion')),
          assigned_at TEXT DEFAULT (datetime('now')),
          UNIQUE(user_id, role)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          token TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
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
      {
        sql: `CREATE TABLE IF NOT EXISTS checkins (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          checkin_date TEXT NOT NULL,
          note TEXT DEFAULT '',
          points INTEGER DEFAULT 10,
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(user_id, checkin_date)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT DEFAULT 'both' CHECK(category IN ('knowledge', 'ai-tools', 'both')),
          color TEXT DEFAULT '#6C63FF',
          created_at TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS resource_tags (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          resource_type TEXT NOT NULL CHECK(resource_type IN ('knowledge', 'ai-tool', 'wish')),
          tag_id TEXT NOT NULL REFERENCES tags(id),
          UNIQUE(resource_id, resource_type, tag_id)
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS knowledge_entries (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT DEFAULT 'template' CHECK(category IN ('template', 'best-practice', 'qa', 'other')),
          icon TEXT DEFAULT '📘',
          contributor_id TEXT NOT NULL REFERENCES users(id),
          upvotes INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS wishes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT DEFAULT 'personal' CHECK(category IN ('personal', 'site')),
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'claimed', 'in-progress', 'completed')),
          wisher_id TEXT NOT NULL REFERENCES users(id),
          claimer_id TEXT REFERENCES users(id),
          icon TEXT DEFAULT '✨',
          points INTEGER DEFAULT 10,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS discussion_likes (
          id TEXT PRIMARY KEY,
          message_id INTEGER NOT NULL,
          user_id TEXT NOT NULL REFERENCES users(id),
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(message_id, user_id)
        )`,
        args: [],
      },
    ]);

    // --- Migrations: add missing columns to existing tables ---
    const migrations: { sql: string; note: string }[] = [
      { sql: `ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''`, note: 'users.email' },
      { sql: `ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''`, note: 'users.avatar_url' },
      { sql: `ALTER TABLE users ADD COLUMN discord_id TEXT`, note: 'users.discord_id' },
      { sql: `ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'`, note: 'users.preferences' },
      { sql: `ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`, note: 'users.updated_at' },
      { sql: `ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`, note: 'users.created_at' },
    ];
    for (const m of migrations) {
      try { await db.execute({ sql: m.sql, args: [] }); } catch { /* column already exists */ }
    }

    // Recreate UNIQUE index on email if missing
    try {
      await db.execute({ sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email != ''`, args: [] });
    } catch { /* index already exists */ }

    // --- Seed members (from constants) ---
    // Each entry: [id, name, groupRole, tag]
    const members: [string, string, string, string][] = [
      // 隊長
      ['cyclone', 'Cyclone', 'captain', '#2707'],
      // 技術維護
      ['dar', 'Dar', 'tech', '#3808'],
      ['benben', 'Benben', 'tech', ''],
      // 行政協作
      ['tiffanyhou', 'Tiffanyhou', 'admin', '#2623'],
      ['sandy', '珊迪', 'admin', ''],
      // 正式隊員
      ['benson', 'Benson', 'companion', ''],
      ['chijie', '志傑', 'member', ''],
      ['cake', '蛋糕', 'member', ''],
      ['winnie', '維尼熊', 'member', ''],
      ['lucy', 'Lucy', 'member', ''],
      ['myra', 'Myra', 'member', '#2716'],
      // 陪跑員
      ['vision', 'Vision', 'companion', ''],
      ['yawen', '雅雯', 'companion', ''],
      ['annie', '安妮想要飛', 'companion', ''],
      ['innoblue', 'innoblue', 'companion', ''],
      ['twentysix', '26', 'companion', ''],
      ['qiying', '琪穎', 'companion', ''],
      ['ck', 'CK', 'companion', ''],
      ['shunzi', '舜子', 'companion', ''],
      ['ding', 'Ding', 'companion', ''],
      ['lucia', 'Lucia', 'companion', ''],
      ['panda', '熊貓', 'companion', ''],
      ['rupert', 'Rupert', 'companion', ''],
      ['mengxuan', '孟璇', 'companion', ''],
      ['beast', 'Beast', 'companion', ''],
      ['maggie', 'Maggie', 'companion', '#0696'],
      ['rycen', 'Rycen', 'companion', ''],
      ['muye', '牧野悠', 'companion', ''],
      ['jerry', 'Jerry', 'companion', ''],
    ];

    // Seed users
    for (const [id, name, _role, tag] of members) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO users (id, email, name, avatar_url, discord_id) VALUES (?, '', ?, '', ?)`,
        args: [id, name, tag],
      });
    }

    // Seed roles
    for (const [id, _name, role, _tag] of members) {
      const roleId = `${id}_${role}`;
      await db.execute({
        sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`,
        args: [roleId, id, role],
      });
    }

    // Seed captain with known email
    await db.execute({
      sql: `UPDATE users SET email = ? WHERE id = 'cyclone' AND (email = '' OR email = 'cyclone.tw@gmail.com')`,
      args: ['cyclonetw@gmail.com'],
    });

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
