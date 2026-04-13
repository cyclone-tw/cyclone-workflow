// MUST import mock setup before API modules
import './mock-db.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedAdminUser, executeCalls, resetExecuteCalls } from './mock-db.ts';

const BASE = 'http://localhost:4321';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type MockEnv = { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string };

function makeCtx(method: string, path: string, body?: unknown, token?: string) {
  return {
    request: new Request(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `session=${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
    env: {} as MockEnv,
    params: {} as Record<string, string>,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Announcements API', () => {
  beforeEach(() => {
    resetDb();
    seedAdminUser();
    resetExecuteCalls();
  });

  // ─── POST /api/admin/announcements ──────────────────────────────────────

  describe('POST /api/admin/announcements', () => {
    it('缺 title 應回 400', async () => {
      const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
      const ctx = makeCtx('POST', '/api/admin/announcements', { content: '內容' }, 'valid-admin-session-token');
      const res = await onRequestPost(ctx as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/標題|請填寫/);
    });

    it('缺 content 應回 400', async () => {
      const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
      const ctx = makeCtx('POST', '/api/admin/announcements', { title: '標題' }, 'valid-admin-session-token');
      const res = await onRequestPost(ctx as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/內容|請填寫/);
    });

    it('正常 POST 應回 ok: true + id', async () => {
      const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
      const ctx = makeCtx('POST', '/api/admin/announcements',
        { title: '測試公告', content: '測試內容', pinned: false },
        'valid-admin-session-token'
      );
      const res = await onRequestPost(ctx as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.id).toBeTruthy();
    });
  });

  // ─── PUT /api/admin/announcements/:id ────────────────────────────────────

  describe('PUT /api/admin/announcements/:id', () => {
    it('空更新應回 400', async () => {
      const { onRequestPut } = await import('../../../functions/api/admin/announcements/[id].ts');
      const ctx = makeCtx('PUT', '/api/admin/announcements/test-id', {}, 'valid-admin-session-token');
      (ctx as any).params = { id: 'test-id' };
      const res = await onRequestPut(ctx as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/沒有要更新|欄位/);
    });

    it('正常更新應回 ok: true', async () => {
      const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
      const createRes = await onRequestPost(makeCtx('POST', '/api/admin/announcements',
        { title: '原本標題', content: '原本內容' }, 'valid-admin-session-token') as any);
      const { id } = await createRes.json();

      const { onRequestPut } = await import('../../../functions/api/admin/announcements/[id].ts');
      const ctx = makeCtx('PUT', `/api/admin/announcements/${id}`, { title: '更新後標題' }, 'valid-admin-session-token');
      (ctx as any).params = { id };
      const res = await onRequestPut(ctx as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  // ─── DELETE /api/admin/announcements/:id ──────────────────────────────────

  describe('DELETE /api/admin/announcements/:id', () => {
    it('正常刪除應回 ok: true', async () => {
      const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
      const createRes = await onRequestPost(makeCtx('POST', '/api/admin/announcements',
        { title: '要被刪的', content: '內容' }, 'valid-admin-session-token') as any);
      const { id } = await createRes.json();

      const { onRequestDelete } = await import('../../../functions/api/admin/announcements/[id].ts');
      const ctx = makeCtx('DELETE', `/api/admin/announcements/${id}`, undefined, 'valid-admin-session-token');
      (ctx as any).params = { id };
      const res = await onRequestDelete(ctx as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  // ─── GET /api/announcements ──────────────────────────────────────────────

  describe('GET /api/announcements', () => {
    it('公開端點，回傳列表', async () => {
      const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
      await onRequestPost(makeCtx('POST', '/api/admin/announcements',
        { title: '公告一', content: '內容一' }, 'valid-admin-session-token') as any);
      await onRequestPost(makeCtx('POST', '/api/admin/announcements',
        { title: '公告二', content: '內容二' }, 'valid-admin-session-token') as any);

      const { onRequestGet } = await import('../../../functions/api/announcements/index.ts');
      const ctx = { env: {} as MockEnv };
      const res = await onRequestGet(ctx as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.announcements)).toBe(true);
      expect(data.announcements.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── GET /api/admin/announcements ─────────────────────────────────────────

  describe('GET /api/admin/announcements', () => {
    it('未登入應回 401', async () => {
      const { onRequestGet } = await import('../../../functions/api/admin/announcements/index.ts');
      const ctx = makeCtx('GET', '/api/admin/announcements');
      const res = await onRequestGet(ctx as any);
      expect(res.status).toBe(401);
    });

    it('一般成員應回 403', async () => {
      const { onRequestGet } = await import('../../../functions/api/admin/announcements/index.ts');
      const ctx = makeCtx('GET', '/api/admin/announcements', undefined, 'valid-member-session-token');
      const res = await onRequestGet(ctx as any);
      expect(res.status).toBe(403);
    });
  });
});
