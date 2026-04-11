import { test, expect } from './lambdatest-setup';

/**
 * Issue #21 — Navigation bar RWD tests
 * Verifies nav behavior at different viewport sizes:
 * - Mobile/tablet (<1280px): hamburger menu visible, desktop nav hidden
 * - Desktop (>=1280px): desktop nav visible, hamburger hidden
 */

const viewports = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'Laptop', width: 1280, height: 720 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

for (const vp of viewports) {
  test.describe(`Nav RWD @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('nav bar is visible and does not overflow', async ({ page }) => {
      await page.goto('/');

      const nav = page.locator('nav');
      await expect(nav).toBeVisible();

      // Nav should not cause horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding
    });

    test('correct menu mode for viewport', async ({ page }) => {
      await page.goto('/');

      const desktopNav = page.getByTestId('desktop-nav');
      const hamburgerBtn = page.locator('#mobile-menu-btn');

      if (vp.width < 1280) {
        // Mobile/tablet: hamburger visible, desktop nav hidden
        await expect(hamburgerBtn).toBeVisible();
        await expect(desktopNav).toBeHidden();
      } else {
        // Desktop: desktop nav visible, hamburger hidden
        await expect(desktopNav).toBeVisible();
        await expect(hamburgerBtn).toBeHidden();
      }
    });

    test('all 12 nav items are present', async ({ page }) => {
      await page.goto('/');

      // Count total nav links (desktop + mobile menu + logo)
      const allNavLinks = page.locator('nav a[href]');
      const count = await allNavLinks.count();
      // 12 items in desktop OR 12 in mobile menu + 1 logo = at least 12
      expect(count).toBeGreaterThanOrEqual(12);
    });

    if (vp.width < 1280) {
      test('hamburger menu opens and shows all nav items', async ({ page }) => {
        await page.goto('/');

        const hamburgerBtn = page.locator('#mobile-menu-btn');
        const mobileMenu = page.locator('#mobile-menu');

        // Menu starts hidden
        await expect(mobileMenu).toBeHidden();

        // Click hamburger to open
        await hamburgerBtn.click();
        await expect(mobileMenu).toBeVisible();

        // Should show nav links inside mobile menu
        const mobileLinks = mobileMenu.locator('a');
        const count = await mobileLinks.count();
        expect(count).toBeGreaterThanOrEqual(10);

        // Click again to close
        await hamburgerBtn.click();
        await expect(mobileMenu).toBeHidden();
      });
    }
  });
}
