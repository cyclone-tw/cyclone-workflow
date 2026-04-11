import { test, expect } from './lambdatest-setup';
import type { Route } from '@playwright/test';

/**
 * E2E regression gate for Issue #27.
 *
 * Each test uses `page.route()` to inject a deterministic fixture that
 * exercises the exact code path the bug lived in. On a regression, the
 * assertion fails — these are real gates, not smoke checks.
 *
 * Imports `test` from `./lambdatest-setup` so the spec plugs into the same
 * fixture the rest of the suite uses: local chromium when LT_USERNAME is
 * unset, LambdaTest cloud (with automatic video URL capture) otherwise.
 *
 * Pinned viewport so CSS overflow assertions are reproducible.
 */

test.use({
  viewport: { width: 1280, height: 800 },
  video: 'on',
  screenshot: 'only-on-failure',
});

/**
 * SQLite's `datetime('now')` returns "YYYY-MM-DD HH:MM:SS" with no timezone
 * marker. Build one that's `offsetMs` milliseconds in the past from "now".
 */
function sqliteNaiveUtc(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString().replace('T', ' ').slice(0, 19);
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('Issue #27 — regression gate', () => {
  test('Bug 1 / wishlist: fresh naive-UTC timestamp must render as "剛剛"', async ({ page }) => {
    // Inject one wish created 30 seconds ago with a SQLite-style naive UTC
    // timestamp. Before the fix, WishBoard parsed this as local time (UTC+8
    // in Taiwan) and rendered "8 小時前".
    await page.route('**/api/wishes*', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, {
        ok: true,
        wishes: [
          {
            id: 'fixture-wish-1',
            title: 'E2E fixture: time gate',
            description: '用來驗證時間顯示修正的假資料',
            category: 'personal',
            status: 'pending',
            icon: '✨',
            points: 10,
            createdAt: sqliteNaiveUtc(30_000),
            updatedAt: sqliteNaiveUtc(30_000),
            wisher: { id: 'u1', name: '測試者', avatarUrl: null },
            claimer: null,
          },
        ],
      });
    });

    await page.goto('/wishlist');
    await expect(page.getByText('E2E fixture: time gate')).toBeVisible({ timeout: 10_000 });

    const body = await page.locator('body').innerText();
    expect(body).toContain('剛剛');
    // No drift: buggy code would render "8 小時前" here in UTC+8.
    expect(body).not.toMatch(/\d+\s*小時前/);
  });

  test('Bug 2 / discuss: 2000-char unbroken message must wrap inside its column', async ({ page }) => {
    // One message with 2000 chars of a single unbroken token. Before the fix,
    // the `<p>` used `whitespace-pre-wrap` without `break-words` and would
    // push the card beyond the viewport width.
    await page.route('**/api/messages*', async (route) => {
      const url = new URL(route.request().url());
      // The component also hits /api/messages/likes?message_id=... per card;
      // only intercept the list endpoint itself.
      if (url.pathname !== '/api/messages') return route.fallback();
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, {
        ok: true,
        messages: [
          {
            id: 999_901,
            author: 'LongTextBot',
            content: 'x'.repeat(2000),
            tag: '',
            category: '一般討論',
            created_at: sqliteNaiveUtc(60_000),
            like_count: 0,
          },
        ],
      });
    });

    await page.goto('/discuss');
    await expect(page.getByText('LongTextBot')).toBeVisible({ timeout: 10_000 });

    // Locate the <p> that holds the 2000-char content directly. Without
    // `break-words`, its `scrollWidth` will blow past its `clientWidth`
    // because `whitespace-pre-wrap` alone does not break unbroken tokens.
    // With the fix, scrollWidth stays within clientWidth.
    const contentP = page.locator('p', { hasText: /^x{2000}$/ });
    await expect(contentP).toBeVisible();

    const metrics = await contentP.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    // Regression gate: unbroken 2000 x's should fit inside the container
    // (2px tolerance for sub-pixel rounding).
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
  });

  test('Bug 3 / discuss: unliked heart button must render real emoji (not "U0001F90D")', async ({ page }) => {
    await page.route('**/api/messages*', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/api/messages') return route.fallback();
      if (route.request().method() !== 'GET') return route.fallback();
      await fulfillJson(route, {
        ok: true,
        messages: [
          {
            id: 999_902,
            author: 'EmojiBot',
            content: '驗證 heart emoji 逸出修正',
            tag: '',
            category: '一般討論',
            created_at: sqliteNaiveUtc(60_000),
            like_count: 0,
          },
        ],
      });
    });

    await page.goto('/discuss');
    await expect(page.getByText('驗證 heart emoji 逸出修正')).toBeVisible({ timeout: 10_000 });

    // The like button sits inside the message card. Before the fix, it
    // contained the literal string "U0001F90D" because JavaScript doesn't
    // recognize Python-style `\U...` escapes — the string `'\U0001F90D'`
    // degraded to `'U0001F90D'`.
    const button = page.locator('button[title*="按讚"], button[title*="登入才能按讚"]').first();
    const buttonText = await button.innerText();
    expect(buttonText).not.toContain('U0001F90D');
    // Must contain the literal 🤍 (white heart, U+1F90D).
    expect(buttonText).toContain('\u{1F90D}');
  });

  test('Bug 4 / issue: GitHub tab error state must expose a fallback link', async ({ page }) => {
    // Force the GitHub proxy to return a rate-limit error. Before the fix,
    // the error state of the GitHubIssuesTab had no link out of the page —
    // users were stuck on a generic error card with no way to reach GitHub.
    await page.route('**/api/github/issues', async (route) => {
      await fulfillJson(
        route,
        { ok: false, error: 'GitHub API error: 403 API rate limit exceeded' },
        403,
      );
    });

    await page.goto('/issue');
    await page.getByRole('button', { name: 'GitHub Issues' }).click();

    await expect(page.getByText(/GitHub API 限流|無法載入 GitHub Issues/)).toBeVisible({ timeout: 10_000 });
    const fallback = page.getByRole('link', { name: /前往 GitHub 儲存庫/ });
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveAttribute('href', /github\.com\/cyclone-tw\/cyclone-workflow/);
  });
});
