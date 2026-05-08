import { test, expect } from './lambdatest-setup';

// Feature detection — announcement-dependent tests skip in dev (default) but
// FAIL when E2E_STRICT=1 is set in CI. Silent skip used to mask the gap
// between "table missing" and "feature green"; strict mode catches regressions.
// TODO: Set E2E_STRICT=1 in CI once E2E workflow is added.
let featureAvailable = false;
const strictMode = process.env.E2E_STRICT === '1';

test.beforeAll(async ({ request }) => {
  const res = await request.get('/api/announcements');
  featureAvailable = res.status() === 200;
  if (!featureAvailable) {
    const reason = `[announcements] feature not available (probe got ${res.status()}, expected 200)`;
    if (strictMode) throw new Error(reason);
    console.warn(`${reason} — feature-gated tests will skip. Set E2E_STRICT=1 in CI to fail.`);
  }
});

test.describe('Announcements — E2E', () => {
  // ── Admin API (unauthenticated) — works regardless of DB table ──────────────

  test('GET /api/admin/announcements 未登入應 401', async ({ page }) => {
    const res = await page.request.get('/api/admin/announcements');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/announcements 未登入應 401', async ({ page }) => {
    const res = await page.request.post('/api/admin/announcements', {
      data: { title: 'test', content: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  // ── Homepage — no JS errors ─────────────────────────────────────────────────

  test('首頁無 JS 錯誤', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  // ── Public API — requires feature deployed ──────────────────────────────────

  // In strict mode, beforeAll throws — these skips only fire in non-strict dev mode
  test('GET /api/announcements 回傳正確結構', async ({ page }) => {
    if (!featureAvailable) test.skip();

    const res = await page.request.get('/api/announcements');
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.announcements)).toBe(true);

    for (const ann of data.announcements) {
      expect(typeof ann.id).toBe('string');
      expect(typeof ann.title).toBe('string');
      expect(typeof ann.content).toBe('string');
      expect(typeof ann.pinned).toBe('boolean');
      expect(typeof ann.created_at).toBe('string');
    }
  });

  test('置頂公告排在未置頂之前', async ({ page }) => {
    if (!featureAvailable) test.skip();

    const res = await page.request.get('/api/announcements');
    const { announcements } = await res.json();

    const hasPinned = announcements.some((a: { pinned: boolean }) => a.pinned);
    const hasUnpinned = announcements.some((a: { pinned: boolean }) => !a.pinned);

    if (hasPinned && hasUnpinned) {
      const pinnedIdx = announcements.findIndex((a: { pinned: boolean }) => a.pinned);
      const unpinnedIdx = announcements.findIndex((a: { pinned: boolean }) => !a.pinned);
      expect(pinnedIdx).toBeLessThan(unpinnedIdx);
    }
  });

  // ── Banner UI — requires feature deployed ───────────────────────────────────

  test('有公告時首頁顯示 Banner', async ({ page }) => {
    if (!featureAvailable) test.skip();

    const res = await page.request.get('/api/announcements');
    const { announcements } = await res.json();

    if (announcements.length === 0) test.skip();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // AnnouncementBanner currently renders without a close button (dismiss
    // feature removed). Use the first announcement's title — coming straight
    // from the API — as proof the banner mounted with content.
    await expect(page.getByText(announcements[0].title)).toBeVisible({ timeout: 5000 });
  });

  // Dismiss / localStorage tests assume the banner has a `[aria-label="關閉公告"]`
  // close button, which AnnouncementBanner.tsx no longer renders. Skipping until
  // (and unless) the dismiss feature is reintroduced. See #174.
  test.skip('點關閉後 Banner 消失', async ({ page }) => {
    if (!featureAvailable) test.skip();

    const res = await page.request.get('/api/announcements');
    const { announcements } = await res.json();

    if (announcements.length === 0) test.skip();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const closeBtn = page.locator('[aria-label="關閉公告"]');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(300);

    if (announcements.length === 1) {
      await expect(closeBtn).not.toBeVisible();
    }
  });

  test.skip('dismiss 記錄存入 localStorage', async ({ page }) => {
    if (!featureAvailable) test.skip();

    const res = await page.request.get('/api/announcements');
    const { announcements } = await res.json();

    if (announcements.length === 0) test.skip();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const closeBtn = page.locator('[aria-label="關閉公告"]');
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(300);

    const stored = await page.evaluate(() =>
      localStorage.getItem('announcement-dismissed')
    );
    expect(stored).toBeTruthy();
    const dismissed = JSON.parse(stored!);
    expect(Array.isArray(dismissed)).toBe(true);
    expect(dismissed.length).toBeGreaterThan(0);
  });

  // Misleading-green: also depends on the removed `[aria-label="關閉公告"]`
  // element. With dismiss feature gone the close button is never rendered, so
  // `not.toBeVisible` is trivially true and verifies nothing. Skip together
  // with :101 / :122 until dismiss returns. See #174.
  test.skip('重新整理後已 dismiss 的公告不再顯示', async ({ page }) => {
    if (!featureAvailable) test.skip();

    const res = await page.request.get('/api/announcements');
    const { announcements } = await res.json();

    if (announcements.length === 0) test.skip();

    const allIds = announcements.map((a: { id: string }) => a.id);
    await page.goto('/');
    await page.evaluate((ids) => {
      localStorage.setItem('announcement-dismissed', JSON.stringify(ids));
    }, allIds);

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[aria-label="關閉公告"]')).not.toBeVisible({ timeout: 3000 });
  });
});
