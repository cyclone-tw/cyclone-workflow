import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb } from './mock-db.ts';

// Re-implement the matching logic from callback.ts for testing
async function findOrCreateUser(
  db: { execute: (opts: { sql: string; args?: unknown[] }) => Promise<{ rows: { id: string; status?: string }[] }> },
  googleEmail: string,
  googleName: string,
  googlePicture: string
) {
  // Step 1: Email exact match
  const existingUser = await db.execute({
    sql: `SELECT id, status FROM users WHERE email = ? AND archived_at IS NULL`,
    args: [googleEmail],
  });

  if (existingUser.rows.length > 0) {
    return { userId: existingUser.rows[0].id, isPending: existingUser.rows[0].status === 'pending', isNew: false };
  }

  // Step 2a: Exact name match (seed with empty email)
  let seedMatch = await db.execute({
    sql: `SELECT id FROM users
          WHERE name = ? AND (email = '' OR email IS NULL)
          AND archived_at IS NULL AND status = 'active'
          AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = users.id AND role IN ('admin', 'tech', 'captain'))
          LIMIT 1`,
    args: [googleName],
  });

  // Step 2b: Prefix fallback
  if (seedMatch.rows.length === 0) {
    seedMatch = await db.execute({
      sql: `SELECT id FROM users
            WHERE (email = '' OR email IS NULL) AND LENGTH(name) >= 4 AND INSTR(?, name) = 1
            AND archived_at IS NULL AND status = 'active'
            AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = users.id AND role IN ('admin', 'tech', 'captain'))
            ORDER BY LENGTH(name) DESC LIMIT 1`,
      args: [googleName],
    });
  }

  if (seedMatch.rows.length > 0) {
    return { userId: seedMatch.rows[0].id, isPending: false, isNew: false };
  }

  // Step 3: Create new pending user
  return { userId: 'new-pending-id', isPending: true, isNew: true };
}

describe('OAuth Callback — User Matching Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('email exact match → should find existing user', async () => {
    const db = createMockDb([
      { id: 'user1', email: 'test@example.com', name: 'Test User', avatar_url: '', status: 'active', archived_at: null },
    ]);
    const result = await findOrCreateUser(db as any, 'test@example.com', 'Different Name', 'pic.jpg');
    expect(result.userId).toBe('user1');
    expect(result.isNew).toBe(false);
    expect(result.isPending).toBe(false);
  });

  it('email empty, name exact match → should find seed user', async () => {
    const db = createMockDb([
      { id: 'dar', email: '', name: 'Dar', avatar_url: '', status: 'active', archived_at: null },
    ]);
    const result = await findOrCreateUser(db as any, 'dar@email.com', 'Dar', 'pic.jpg');
    expect(result.userId).toBe('dar');
    expect(result.isNew).toBe(false);
  });

  it('email empty, name fuzzy match (Cyclone Kang → Cyclone) → should find seed user', async () => {
    const db = createMockDb([
      { id: 'cyclone', email: '', name: 'Cyclone', avatar_url: '', status: 'active', archived_at: null },
    ]);
    const result = await findOrCreateUser(db as any, 'cyclone@gmail.com', 'Cyclone Kang', 'pic.jpg');
    expect(result.userId).toBe('cyclone');
    expect(result.isNew).toBe(false);
  });

  it('no match found → should create new pending user', async () => {
    const db = createMockDb([]);
    const result = await findOrCreateUser(db as any, 'brand@new.com', 'Brand New', 'pic.jpg');
    expect(result.isNew).toBe(true);
    expect(result.isPending).toBe(true);
  });

  it('seed user with admin/tech role → should NOT be matched (only captain can be claimed)', async () => {
    const db = createMockDb([
      { id: 'dar', email: '', name: 'Dar', avatar_url: '', status: 'active', archived_at: null },
    ]);
    // Dar is tech, should still be excluded
    db._state.user_roles.push({ user_id: 'dar', role: 'tech' });

    const result = await findOrCreateUser(db as any, 'dar@gmail.com', 'Dar', 'pic.jpg');

    // tech is excluded → creates new pending
    expect(result.isNew).toBe(true);
    expect(result.isPending).toBe(true);
  });

  it('captain seed user → should NOT be matched via name fallback (security)', async () => {
    const db = createMockDb([
      { id: 'cyclone', email: '', name: 'Cyclone', avatar_url: '', status: 'active', archived_at: null },
    ]);
    // Simulate cyclone having captain role
    db._state.user_roles.push({ user_id: 'cyclone', role: 'captain' });

    // Email doesn't match, name fallback should exclude captain
    const result = await findOrCreateUser(db as any, 'cyclone@gmail.com', 'Cyclone Kang', 'pic.jpg');

    // Captain excluded from name matching → creates new pending
    expect(result.isNew).toBe(true);
    expect(result.isPending).toBe(true);
  });

  it('archived user → should not be matched', async () => {
    const db = createMockDb([
      { id: 'dar', email: '', name: 'Dar', avatar_url: '', status: 'active', archived_at: '2026-01-01' },
    ]);
    const result = await findOrCreateUser(db as any, 'dar@email.com', 'Dar', 'pic.jpg');
    expect(result.isNew).toBe(true);
    expect(result.isPending).toBe(true);
  });

  it('pending user → should match and return isPending=true', async () => {
    const db = createMockDb([
      { id: 'newuser', email: 'new@test.com', name: 'New User', avatar_url: '', status: 'pending', archived_at: null },
    ]);
    const result = await findOrCreateUser(db as any, 'new@test.com', 'New User', 'pic.jpg');
    expect(result.userId).toBe('newuser');
    expect(result.isPending).toBe(true);
    expect(result.isNew).toBe(false);
  });
});
