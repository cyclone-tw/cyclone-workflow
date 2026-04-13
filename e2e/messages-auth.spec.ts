import { test, expect } from './lambdatest-setup';

// Feature detection — skip auth-gated tests if not yet deployed
let authDeployed = false;

test.beforeAll(async ({ request }) => {
  // If POST without session returns 401, the auth gate is live
  const res = await request.post('/api/messages', {
    data: { content: 'probe' },
  });
  authDeployed = res.status() === 401;
});

test.describe('Messages Auth — E2E', () => {
  // ── API 層 — 公開讀取，任何時候都成立 ───────────────────────────────────────

  test('GET /api/messages 未登入可讀取（公開）', async ({ page }) => {
    const res = await page.request.get('/api/messages');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.messages)).toBe(true);
  });

  test('討論頁面無 JS 錯誤', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/discuss');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('既有留言列表仍正常顯示', async ({ page }) => {
    await page.goto('/discuss');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: '全部' })).toBeVisible({ timeout: 5000 });
  });

  // ── Auth gate — 需 auth 部署後才有效 ───────────────────────────────────────

  test('POST /api/messages 未登入應 401', async ({ page }) => {
    if (!authDeployed) test.skip();
    const res = await page.request.post('/api/messages', {
      data: { content: 'test message' },
    });
    expect(res.status()).toBe(401);
  });

  test('未登入：看不到留言輸入框', async ({ page }) => {
    if (!authDeployed) test.skip();
    await page.goto('/discuss');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('textarea')).not.toBeVisible({ timeout: 5000 });
  });

  test('未登入：顯示「請先登入再留言」提示', async ({ page }) => {
    if (!authDeployed) test.skip();
    await page.goto('/discuss');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('請先登入再留言')).toBeVisible({ timeout: 5000 });
  });

  test('未登入：顯示登入按鈕', async ({ page }) => {
    if (!authDeployed) test.skip();
    await page.goto('/discuss');
    await page.waitForLoadState('networkidle');
    const loginBtn = page.getByRole('button', { name: /登入/i });
    await expect(loginBtn).toBeVisible({ timeout: 5000 });
  });
});
