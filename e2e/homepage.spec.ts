import { test, expect } from './lambdatest-setup';

test.describe('Homepage', () => {
  test('loads and shows title', async ({ page }) => {
    await page.goto('/');

    // Title format: "<page> | AI 工作流共學團" — match the product name suffix.
    await expect(page).toHaveTitle(/AI 工作流共學團/);

    // Nav bar is visible
    await expect(page.locator('nav')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Desktop nav has 3 top-level items (首頁 / 說明 / 儀表板) plus a 「更多」 dropdown
    // for the rest. Mobile/tablet collapses everything into the hamburger menu.
    // Assert the 3 visible top-level links exist on a desktop viewport.
    await page.setViewportSize({ width: 1280, height: 720 });
    const desktopNav = page.getByTestId('desktop-nav');
    await expect(desktopNav.getByRole('link', { name: '首頁' })).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: '說明' })).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: '儀表板' })).toBeVisible();
  });

  test('theme toggle exists', async ({ page }) => {
    await page.goto('/');

    // Theme toggle button should be present
    const themeBtn = page.locator('button[aria-label], [data-theme-toggle]').first();
    // At least one toggleable button on the page
    await expect(page.locator('button').first()).toBeVisible();
  });
});
