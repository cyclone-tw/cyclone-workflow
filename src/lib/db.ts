import { createClient, type Client } from '@libsql/client/web';

let _client: Client | null = null;

export function getDb(): Client {
  if (!_client) {
    const url = import.meta.env.TURSO_DATABASE_URL;
    const authToken = import.meta.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
    }
    _client = createClient({ url, authToken });
  }
  return _client;
}

export async function initSchema() {
  const db = getDb();
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
}

export async function seedMembers(db: Client) {
  const members = [
    { id: 'cyclone', name: 'Cyclone', discord_id: '#2707' },
    { id: 'benben', name: 'βenben', discord_id: '#0010' },
    { id: 'dar', name: 'Dar', discord_id: '#3808' },
    { id: 'benson', name: 'Benson', discord_id: '#2808' },
    { id: 'tiffanyhou', name: 'Tiffanyhou', discord_id: '#2623' },
    { id: 'morning', name: '早安', discord_id: '#1329' },
  ];
  for (const m of members) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, name, discord_id) VALUES (?, ?, ?)`,
      args: [m.id, m.name, m.discord_id],
    });
  }
}
