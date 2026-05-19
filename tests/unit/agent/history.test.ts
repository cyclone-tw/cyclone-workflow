import './mock-db.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedUsers, seedChatHistory } from './mock-db.ts';

const BASE = 'http://localhost:4321';
type MockEnv = { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string };

function makeCtx(path: string, token?: string) {
  return {
    request: new Request(`${BASE}${path}`, {
      method: 'GET',
      headers: { ...(token ? { Cookie: `session=${token}` } : {}) },
    }),
    env: {} as MockEnv,
    params: {},
  };
}

interface HistoryResponse {
  ok: boolean;
  history: Array<{ user_id: string }>;
  total: number;
}

describe('GET /api/agent/history — issue #5 隱私 self-scope', () => {
  beforeEach(() => {
    resetDb();
    seedUsers();
    seedChatHistory();
  });

  it('未登入應回 401,不外洩任何對話', async () => {
    const { onRequestGet } = await import('../../../functions/api/agent/history.ts');
    const res = await onRequestGet(makeCtx('/api/agent/history') as any);
    expect(res.status).toBe(401);
  });

  it('登入者只看得到自己的對話,看不到其他成員的', async () => {
    const { onRequestGet } = await import('../../../functions/api/agent/history.ts');
    const res = await onRequestGet(makeCtx('/api/agent/history', 'valid-member-token') as any);
    expect(res.status).toBe(200);
    const data = await res.json() as HistoryResponse;
    expect(data.ok).toBe(true);
    expect(data.total).toBe(2);
    expect(data.history.every((h) => h.user_id === 'member-1')).toBe(true);
    expect(data.history.some((h) => h.user_id === 'member-2')).toBe(false);
  });

  it('看不到其他成員或修補前留下的亂數 user_id 對話', async () => {
    const { onRequestGet } = await import('../../../functions/api/agent/history.ts');
    const res = await onRequestGet(makeCtx('/api/agent/history', 'valid-other-token') as any);
    const data = await res.json() as HistoryResponse;
    expect(data.total).toBe(1);
    expect(data.history[0].user_id).toBe('member-2');
    expect(data.history.some((h) => h.user_id === 'user-legacyxx')).toBe(false);
  });
});
