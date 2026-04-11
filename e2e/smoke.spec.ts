import { test, expect } from './lambdatest-setup';

test.describe('Smoke — core pages load', () => {
  const pages = [
    { path: '/', name: '首頁' },
    { path: '/discuss', name: '討論區' },
    { path: '/team', name: '團隊' },
    { path: '/knowledge', name: '知識庫' },
    { path: '/issues', name: 'Issues' },
    { path: '/wishlist', name: '許願樹' },
    { path: '/changelog', name: 'Changelog' },
    { path: '/leaderboard', name: '積分榜' },
  ];

  for (const { path, name } of pages) {
    test(`${name} (${path}) loads with 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});
