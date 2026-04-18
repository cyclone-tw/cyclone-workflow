import './mock-db.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedMembers } from './mock-db.ts';

type MockEnv = { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string };

function makeCtx(id: string) {
  return {
    request: new Request('http://localhost/api/members/' + id),
    env: {} as MockEnv,
    params: { id },
  };
}

describe('Members API — archived 安全 (execution path)', () => {
  beforeEach(() => {
    resetDb();
    seedMembers();
  });

  describe('GET /api/members/:id', () => {
    it('active 成員回傳 200', async () => {
      const { onRequestGet } = await import('../../../functions/api/members/[id].ts');
      const res = await onRequestGet(makeCtx('active-1') as any);
      expect(res.status).toBe(200);
      const data = await res.json() as { ok: boolean; member: { name: string } };
      expect(data.ok).toBe(true);
      expect(data.member.name).toBe('Active User');
    });

    it('archived 成員（status=active, archived_at≠null）回傳 404', async () => {
      const { onRequestGet } = await import('../../../functions/api/members/[id].ts');
      const res = await onRequestGet(makeCtx('archived-1') as any);
      expect(res.status).toBe(404);
      const data = await res.json() as { ok: boolean };
      expect(data.ok).toBe(false);
    });

    it('不存在的 ID 回傳 404', async () => {
      const { onRequestGet } = await import('../../../functions/api/members/[id].ts');
      const res = await onRequestGet(makeCtx('nonexistent') as any);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/members (list)', () => {
    it('不包含 archived 成員', async () => {
      const { onRequestGet } = await import('../../../functions/api/members/index.ts');
      const ctx = {
        request: new Request('http://localhost/api/members'),
        env: {} as MockEnv,
      };
      const res = await onRequestGet(ctx as any);
      expect(res.status).toBe(200);
      const data = await res.json() as { ok: boolean; members: Array<{ id: string }> };
      expect(data.ok).toBe(true);

      const ids = data.members.map((m) => m.id);
      expect(ids).toContain('active-1');
      expect(ids).toContain('active-legacy');
      expect(ids).not.toContain('archived-1');
    });
  });
});
