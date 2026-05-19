import './mock-db.ts';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetDb } from './mock-db.ts';

const env = { LETTA_API_KEY: 'k', TURSO_DATABASE_URL: 'u', TURSO_AUTH_TOKEN: 't' };

let agentSeq = 0;
const fakeFetch = vi.fn(async () =>
  new Response(
    JSON.stringify({ id: `agent-new-${++agentSeq}` }),
    { status: 200 },
  ),
);

beforeEach(() => {
  resetDb();
  agentSeq = 0;
  vi.stubGlobal('fetch', fakeFetch);
  fakeFetch.mockClear();
});

describe('getOrCreateUserAgent — per-user Letta agent', () => {
  it('未命中即建:空表 → 新建 agent 並回傳 id', async () => {
    const { getOrCreateUserAgent } = await import('../../../functions/api/agent/_userAgent.ts');
    const id = await getOrCreateUserAgent(env, 'member-1', 'Alice');
    expect(id).toBe('agent-new-1');
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it('命中不重建:已有 mapping 時直接回傳,不再呼叫 Letta API', async () => {
    const { getOrCreateUserAgent } = await import('../../../functions/api/agent/_userAgent.ts');
    const first = await getOrCreateUserAgent(env, 'member-1');
    fakeFetch.mockClear();

    const second = await getOrCreateUserAgent(env, 'member-1');
    expect(second).toBe(first);
    expect(fakeFetch).toHaveBeenCalledTimes(0);
  });

  it('隔離:不同 userKey 會建立不同的 agent', async () => {
    const { getOrCreateUserAgent } = await import('../../../functions/api/agent/_userAgent.ts');
    const id1 = await getOrCreateUserAgent(env, 'member-1');
    const id2 = await getOrCreateUserAgent(env, 'member-2');
    expect(id1).not.toBe(id2);
  });

  it('匿名:__guest__ 首次建立後再次呼叫回傳同一 id', async () => {
    const { getOrCreateUserAgent } = await import('../../../functions/api/agent/_userAgent.ts');
    const first = await getOrCreateUserAgent(env, '__guest__');
    fakeFetch.mockClear();

    const second = await getOrCreateUserAgent(env, '__guest__');
    expect(second).toBe(first);
    expect(fakeFetch).toHaveBeenCalledTimes(0);
  });
});
