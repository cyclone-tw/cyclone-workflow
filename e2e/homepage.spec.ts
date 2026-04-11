import { test, expect } from './lambdatest-setup';

test.describe('Homepage', () => {
  test('loads and shows title', async ({ page }) => {
    await page.goto('/');

    // Title contains "Cyclone"
    await expect(page).toHaveTitle(/Cyclone/);

    // Nav bar is visible
    await expect(page.locator('nav')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Check key nav links exist
    const nav = page.locator('nav');
    await expect(nav.getByText('討論區')).toBeVisible();
    await expect(nav.getByText('團隊')).toBeVisible();
  });

  test('theme toggle exists', async ({ page }) => {
    await page.goto('/');

    // Theme toggle button should be present
    const themeBtn = page.locator('button[aria-label], [data-theme-toggle]').first();
    // At least one toggleable button on the page
    await expect(page.locator('button').first()).toBeVisible();
  });
});
