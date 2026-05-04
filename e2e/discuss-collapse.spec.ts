import { test, expect } from './lambdatest-setup';

/**
 * Discussion collapse — visual evidence for #165 / PR #167.
 *
 * Mocks /api/messages so this test is deterministic regardless of prod
 * data. Captures three screenshots:
 *   1. collapsed-state.png — long message folded with "展開更多 ↓"
 *   2. expanded-state.png  — same message after click, "收納 ↑" visible
 *   3. short-no-button.png — short message, no toggle button
 *
 * Run locally:
 *   bun run dev                                # in another terminal
 *   E2E_BASE_URL=http://localhost:4321 bunx playwright test discuss-collapse
 *
 * Outputs land in test-results/ and playwright-report/.
 */

const LONG_BODY = Array.from({ length: 30 }, (_, i) =>
  `這是測試用的長文段第 ${i + 1} 行,目的是讓 MessageCard 的 4.8em maxHeight 被撐破,觸發展開/收納按鈕。`,
).join('\n\n');

const MOCK_RESPONSE = {
  ok: true,
  messages: [
    {
      id: 9001,
      author: '測試員 Alice',
      author_id: 'mock-alice',
      content: LONG_BODY,
      tag: '',
      category: '閒聊',
      created_at: new Date().toISOString(),
      edited_at: null,
      pinned: 0,
      like_count: 0,
      deleted_at: null,
      deleted_by: null,
      report_count: 0,
      reported_by_me: false,
      parent_id: null,
      reply_count: 0,
      replies: [],
    },
    {
      id: 9002,
      author: '測試員 Bob',
      author_id: 'mock-bob',
      content: '一行短文。',
      tag: '',
      category: '閒聊',
      created_at: new Date().toISOString(),
      edited_at: null,
      pinned: 0,
      like_count: 0,
      deleted_at: null,
      deleted_by: null,
      report_count: 0,
      reported_by_me: false,
      parent_id: null,
      reply_count: 0,
      replies: [],
    },
  ],
};

test.describe('Discussion collapse — #165', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/messages**', (route) => {
      const url = route.request().url();
      if (route.request().method() === 'GET' && !/\/api\/messages\/\d/.test(url)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSE),
        });
      }
      return route.continue();
    });
  });

  test('long content collapsed by default with 展開更多 button', async ({ page }) => {
    await page.goto('/discuss');
    await page.waitForLoadState('networkidle');

    const expandBtn = page.getByRole('button', { name: '展開更多 ↓' }).first();
    await expect(expandBtn).toBeVisible({ timeout: 5000 });

    await expandBtn.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'playwright-report/discuss-collapse-collapsed.png',
      fullPage: false,
    });
  });

  test('clicking 展開更多 reveals full content with 收納 button', async ({ page }) => {
    await page.goto('/discuss');
    await page.waitForLoadState('networkidle');

    const expandBtn = page.getByRole('button', { name: '展開更多 ↓' }).first();
    await expandBtn.click();

    const collapseBtn = page.getByRole('button', { name: '收納 ↑' }).first();
    await expect(collapseBtn).toBeVisible({ timeout: 3000 });
    await collapseBtn.scrollIntoViewIfNeeded();

    await page.screenshot({
      path: 'playwright-report/discuss-collapse-expanded.png',
      fullPage: false,
    });
  });

  test('short content shows no toggle button', async ({ page }) => {
    await page.goto('/discuss');
    await page.waitForLoadState('networkidle');

    // Bob's "一行短文。" message must NOT have an expand button next to it.
    const bobCard = page.locator('text=測試員 Bob').locator('..');
    await expect(bobCard.getByRole('button', { name: /展開更多/ })).toHaveCount(0);
    await bobCard.scrollIntoViewIfNeeded();

    await page.screenshot({
      path: 'playwright-report/discuss-collapse-short.png',
      fullPage: false,
    });
  });
});
