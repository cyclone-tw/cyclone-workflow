import './mock-db.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedUsers, tables } from './mock-db.ts';

const BASE = 'http://localhost:4321';
type MockEnv = { TURSO_DATABASE_URL: string; TURSO_AUTH_TOKEN: string };

function makeCtx(method: string, path: string, body?: unknown, token?: string) {
  // Extract route params from path like /api/messages/:id → { id: '123' }
  const params: Record<string, string> = {};
  const match = path.match(/\/api\/messages\/(\d+)$/);
  if (match) params.id = match[1];

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
    params,
  };
}

describe('Messages API', () => {
  beforeEach(() => {
    resetDb();
    seedUsers();
  });

  // ── GET /api/messages — public ──────────────────────────────────────────────

  describe('GET /api/messages', () => {
    it('未登入可讀取留言列表（公開端點）', async () => {
      const { onRequestGet } = await import('../../../functions/api/messages/index.ts');
      const ctx = makeCtx('GET', '/api/messages');
      const res = await onRequestGet(ctx as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.messages)).toBe(true);
    });

    it('已登入也可讀取留言列表', async () => {
      const { onRequestGet } = await import('../../../functions/api/messages/index.ts');
      const ctx = makeCtx('GET', '/api/messages', undefined, 'valid-member-token');
      const res = await onRequestGet(ctx as any);
      expect(res.status).toBe(200);
    });
  });

  // ── POST /api/messages — requires auth ─────────────────────────────────────

  describe('POST /api/messages', () => {
    it('未登入應回 401', async () => {
      const { onRequestPost } = await import('../../../functions/api/messages/index.ts');
      const ctx = makeCtx('POST', '/api/messages', { content: '測試留言' });
      const res = await onRequestPost(ctx as any);
      expect(res.status).toBe(401);
    });

    it('已登入且有內容應回 200', async () => {
      const { onRequestPost } = await import('../../../functions/api/messages/index.ts');
      const ctx = makeCtx('POST', '/api/messages',
        { content: '這是測試留言', category: '一般討論' },
        'valid-member-token'
      );
      const res = await onRequestPost(ctx as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it('已登入但 content 空白應回 400', async () => {
      const { onRequestPost } = await import('../../../functions/api/messages/index.ts');
      const ctx = makeCtx('POST', '/api/messages',
        { content: '   ' },
        'valid-member-token'
      );
      const res = await onRequestPost(ctx as any);
      expect(res.status).toBe(400);
    });

    it('POST 成功後 GET 可查到該留言', async () => {
      const { onRequestPost } = await import('../../../functions/api/messages/index.ts');
      await onRequestPost(makeCtx('POST', '/api/messages',
        { content: '整合驗證留言', category: '技術問題' },
        'valid-member-token'
      ) as any);

      const { onRequestGet } = await import('../../../functions/api/messages/index.ts');
      const res = await onRequestGet(makeCtx('GET', '/api/messages') as any);
      const { messages } = await res.json();
      expect(messages.some((m: any) => m.content === '整合驗證留言')).toBe(true);
    });

    it('author 欄位為登入用戶名稱，非 body 傳入值', async () => {
      const { onRequestPost } = await import('../../../functions/api/messages/index.ts');
      await onRequestPost(makeCtx('POST', '/api/messages',
        { content: '驗證 author', author: '假冒者' },
        'valid-member-token'
      ) as any);

      const { onRequestGet } = await import('../../../functions/api/messages/index.ts');
      const res = await onRequestGet(makeCtx('GET', '/api/messages') as any);
      const { messages } = await res.json();
      const msg = messages.find((m: any) => m.content === '驗證 author');
      expect(msg.author).toBe('Test Member');
      expect(msg.author).not.toBe('假冒者');
    });
  });

  // ── DELETE /api/messages/:id — author or admin ─────────────────────────────

  describe('DELETE /api/messages/:id', () => {
    it('未登入應回 401', async () => {
      const { onRequestDelete } = await import('../../../functions/api/messages/[id].ts');
      const ctx = makeCtx('DELETE', '/api/messages/999');
      const res = await onRequestDelete(ctx as any);
      expect(res.status).toBe(401);
    });

    it('作者可刪除自己的留言', async () => {
      // 先用 POST 留言
      const { onRequestPost } = await import('../../../functions/api/messages/index.ts');
      await onRequestPost(makeCtx('POST', '/api/messages',
        { content: '要被刪除的留言', category: '測試' },
        'valid-member-token'
      ) as any);
      expect(tables.messages.length).toBe(1);

      // 再刪除
      const { onRequestDelete } = await import('../../../functions/api/messages/[id].ts');
      const ctx = makeCtx('DELETE', '/api/messages/1', undefined, 'valid-member-token');
      const res = await onRequestDelete(ctx as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      // 確認被軟刪除了
      expect(tables.messages[0].deleted_at).toBeTruthy();
      expect(tables.messages[0].deleted_by).toBe('member-1');
    });

    it('管理員可刪除他人的留言', async () => {
      // member 發留言
      const { onRequestPost } = await import('../../../functions/api/messages/index.ts');
      await onRequestPost(makeCtx('POST', '/api/messages',
        { content: '別人的留言' },
        'valid-member-token'
      ) as any);

      // admin 刪除
      const { onRequestDelete } = await import('../../../functions/api/messages/[id].ts');
      const ctx = makeCtx('DELETE', '/api/messages/1', undefined, 'valid-admin-token');
      const res = await onRequestDelete(ctx as any);
      expect(res.status).toBe(200);
    });

    it('非作者非管理員刪除他人留言應回 403', async () => {
      // member-1 發留言
      const { onRequestPost } = await import('../../../functions/api/messages/index.ts');
      await onRequestPost(makeCtx('POST', '/api/messages',
        { content: '別人的留言' },
        'valid-admin-token'
      ) as any);

      // member-1（非作者、非 admin）嘗試刪除 → 403
      // But wait, we need a second member. Let's use the same member-1 token
      // to delete admin's message — member role < admin, not the author → 403
      const { onRequestDelete } = await import('../../../functions/api/messages/[id].ts');
      const ctx = makeCtx('DELETE', '/api/messages/1', undefined, 'valid-member-token');
      const res = await onRequestDelete(ctx as any);
      expect(res.status).toBe(403);
    });

    it('刪除不存在的留言應回 404', async () => {
      const { onRequestDelete } = await import('../../../functions/api/messages/[id].ts');
      const ctx = makeCtx('DELETE', '/api/messages/99999', undefined, 'valid-member-token');
      const res = await onRequestDelete(ctx as any);
      expect(res.status).toBe(404);
    });
  });
});
