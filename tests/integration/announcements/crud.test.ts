import '../../unit/announcements/mock-db.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedAdminUser, executeCalls } from '../../unit/announcements/mock-db.ts';

const BASE = 'http://localhost:4321';

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

describe('Announcements CRUD Integration', () => {
  beforeEach(() => {
    resetDb();
    seedAdminUser();
  });

  it('建立 announcement → 讀取 → 驗證欄位', async () => {
    const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
    const createRes = await onRequestPost(makeCtx('POST', '/api/admin/announcements',
      { title: '整合測試公告', content: '這是測試內容', pinned: false },
      'valid-admin-session-token'
    ) as any);
    expect(createRes.status).toBe(200);
    const { id } = await createRes.json();

    const { onRequestGet } = await import('../../../functions/api/admin/announcements/[id].ts');
    const readCtx = makeCtx('GET', `/api/admin/announcements/${id}`, undefined, 'valid-admin-session-token');
    (readCtx as any).params = { id };
    const readRes = await onRequestGet(readCtx as any);
    expect(readRes.status).toBe(200);
    const announcement = (await readRes.json()).announcement;
    expect(announcement.title).toBe('整合測試公告');
    expect(announcement.content).toBe('這是測試內容');
    expect(announcement.pinned).toBe(false);
    expect(announcement.author_id).toBe('admin-user-1');
    expect(announcement.created_at).toBeTruthy();
    expect(announcement.updated_at).toBeTruthy();
  });

  it('更新 announcement → 驗證 updated_at 改變、欄位正確', async () => {
    const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
    const createRes = await onRequestPost(makeCtx('POST', '/api/admin/announcements',
      { title: '原本標題', content: '原本內容', pinned: false },
      'valid-admin-session-token'
    ) as any);
    const { id } = await createRes.json();

    // Read before
    const { onRequestGet } = await import('../../../functions/api/admin/announcements/[id].ts');
    const readCtx1 = makeCtx('GET', `/api/admin/announcements/${id}`, undefined, 'valid-admin-session-token');
    (readCtx1 as any).params = { id };
    const beforeAnn = (await (await onRequestGet(readCtx1 as any)).json()).announcement;

    // Update
    const { onRequestPut } = await import('../../../functions/api/admin/announcements/[id].ts');
    const updateCtx = makeCtx('PUT', `/api/admin/announcements/${id}`,
      { title: '新標題', content: '新內容', pinned: true },
      'valid-admin-session-token'
    );
    (updateCtx as any).params = { id };
    const updateRes = await onRequestPut(updateCtx as any);
    expect(updateRes.status).toBe(200);

    // Read after
    const readCtx2 = makeCtx('GET', `/api/admin/announcements/${id}`, undefined, 'valid-admin-session-token');
    (readCtx2 as any).params = { id };
    const afterAnn = (await (await onRequestGet(readCtx2 as any)).json()).announcement;
    expect(afterAnn.title).toBe('新標題');
    expect(afterAnn.content).toBe('新內容');
    expect(afterAnn.pinned).toBe(true);
    expect(afterAnn.updated_at).not.toBe(beforeAnn.updated_at);
  });

  it('切換 pinned → 驗證排序變化', async () => {
    const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
    const r1 = await onRequestPost(makeCtx('POST', '/api/admin/announcements',
      { title: '一般公告', content: '內容', pinned: false }, 'valid-admin-session-token') as any);
    await onRequestPost(makeCtx('POST', '/api/admin/announcements',
      { title: '置頂公告', content: '內容', pinned: true }, 'valid-admin-session-token') as any);
    const { id: idUnpinned } = await r1.json();

    // Fetch public list — pinned should come first
    const { onRequestGet: pubGet } = await import('../../../functions/api/announcements/index.ts');
    const pubCtx = { env: {} as MockEnv };
    const listRes = await pubGet(pubCtx as any);
    const { announcements } = await listRes.json();

    const pinnedIdx = announcements.findIndex((a: any) => a.pinned === true);
    const unpinnedIdx = announcements.findIndex((a: any) => a.pinned === false);
    expect(pinnedIdx).toBeGreaterThanOrEqual(0);
    expect(unpinnedIdx).toBeGreaterThanOrEqual(0);
    expect(pinnedIdx).toBeLessThan(unpinnedIdx);
  });

  it('刪除 → 再 GET 確認 404', async () => {
    const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
    const createRes = await onRequestPost(makeCtx('POST', '/api/admin/announcements',
      { title: '要被刪', content: '內容' }, 'valid-admin-session-token') as any);
    const { id } = await createRes.json();

    const { onRequestDelete } = await import('../../../functions/api/admin/announcements/[id].ts');
    const delCtx = makeCtx('DELETE', `/api/admin/announcements/${id}`, undefined, 'valid-admin-session-token');
    (delCtx as any).params = { id };
    const delRes = await onRequestDelete(delCtx as any);
    expect(delRes.status).toBe(200);

    const { onRequestGet } = await import('../../../functions/api/admin/announcements/[id].ts');
    const readCtx = makeCtx('GET', `/api/admin/announcements/${id}`, undefined, 'valid-admin-session-token');
    (readCtx as any).params = { id };
    const readRes = await onRequestGet(readCtx as any);
    expect(readRes.status).toBe(404);
  });

  it('未登入者呼叫 admin API 應被拒', async () => {
    const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
    const ctx = makeCtx('POST', '/api/admin/announcements', { title: 'test', content: 'body' });
    const res = await onRequestPost(ctx as any);
    expect(res.status).toBe(401);
  });

  it('一般成員呼叫 admin API 應被拒', async () => {
    const { onRequestPost } = await import('../../../functions/api/admin/announcements/index.ts');
    const ctx = makeCtx('POST', '/api/admin/announcements', { title: 'test', content: 'body' }, 'valid-member-session-token');
    const res = await onRequestPost(ctx as any);
    expect(res.status).toBe(403);
  });
});
