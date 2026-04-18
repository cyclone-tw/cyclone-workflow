import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BASE = resolve(__dirname, '..');

// ─── Stop gate: source code 靜態檢查（永遠執行） ───
describe('Members API — archived 成員安全回歸測試 (stop gate)', () => {
  const indexPath = resolve(BASE, 'functions/api/members/index.ts');
  const idPath = resolve(BASE, 'functions/api/members/[id].ts');

  const indexSrc = readFileSync(indexPath, 'utf-8');
  const idSrc = readFileSync(idPath, 'utf-8');

  it('/api/members (list) 應包含 archived_at IS NULL', () => {
    expect(indexSrc).toContain('archived_at IS NULL');
  });

  it('/api/members (list) 應包含 status = \'active\'', () => {
    expect(indexSrc).toContain("status = 'active'");
  });

  it('/api/members/:id Try 1 應包含 archived_at IS NULL', () => {
    const matches = idSrc.match(/archived_at IS NULL/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2); // Try 1 + Try 2
  });

  it('/api/members/:id 不應有未使用的 ROLE_LEVEL import', () => {
    expect(idSrc).not.toMatch(/import.*ROLE_LEVEL.*from/);
  });
});

// ─── 線上驗證（需 API_BASE_URL，否則 skip） ───
const onlineUrl = process.env.API_BASE_URL;

describe.skipIf(!onlineUrl)(`Members API — 線上驗證 (${onlineUrl || 'skip'})`, () => {
  it('/api/members 回傳 ok=true 且 members 為陣列', async () => {
    const res = await fetch(`${onlineUrl}/api/members`);
    const data = await res.json() as { ok: boolean; members: Array<{ id: string; name: string }> };
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.members)).toBe(true);
    for (const m of data.members) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
    }
  });

  it('/api/members/dar 回傳 ok=true', async () => {
    const res = await fetch(`${onlineUrl}/api/members/dar`);
    const data = await res.json() as { ok: boolean; member: { name: string } };
    expect(data.ok).toBe(true);
    expect(data.member.name).toBeTruthy();
  });

  it('/api/members/nonexistent-id 回傳 404', async () => {
    const res = await fetch(`${onlineUrl}/api/members/zzz-nonexistent-999`);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(false);
    expect(res.status).toBe(404);
  });
});
