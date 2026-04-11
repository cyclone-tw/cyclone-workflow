import { test, expect } from './lambdatest-setup';

/**
 * Issue #21 — Navigation bar RWD tests
 * Updated for PR #24: desktop nav now uses 3 top-level items + "更多" dropdown
 *
 * Verifies nav behavior at different viewport sizes:
 * - Mobile/tablet (<1280px): hamburger menu visible, desktop nav hidden
 * - Desktop (>=1280px): 3 top-level items + "更多" dropdown visible, hamburger hidden
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

    test('logo link is present', async ({ page }) => {
      await page.goto('/');
      const logo = page.locator('nav a[href="/"]').first();
      await expect(logo).toBeVisible();
    });

    if (vp.width < 1280) {
      // ── Mobile/tablet tests ──
      test('hamburger menu opens and shows all nav items', async ({ page }) => {
        await page.goto('/');

        const hamburgerBtn = page.locator('#mobile-menu-btn');
        const mobileMenu = page.locator('#mobile-menu');

        // Menu starts hidden
        await expect(mobileMenu).toBeHidden();

        // Click hamburger to open
        await hamburgerBtn.click();
        await expect(mobileMenu).toBeVisible();

        // Should show all 12 nav links inside mobile menu
        const mobileLinks = mobileMenu.locator('a');
        const count = await mobileLinks.count();
        expect(count).toBeGreaterThanOrEqual(10);

        // Click again to close
        await hamburgerBtn.click();
        await expect(mobileMenu).toBeHidden();
      });
    } else {
      // ── Desktop tests (≥1280px) ──
      test('shows 3 top-level nav items and "更多" button', async ({ page }) => {
        await page.goto('/');

        const desktopNav = page.getByTestId('desktop-nav');

        // 3 top-level links: 首頁, 說明, 儀表板
        const topLevelLinks = desktopNav.locator(':scope > a');
        const count = await topLevelLinks.count();
        expect(count).toBe(3);

        // "更多" button exists
        const moreBtn = page.locator('#more-menu-btn');
        await expect(moreBtn).toBeVisible();
      });

      test('"更多" dropdown opens with all 9 items', async ({ page }) => {
        await page.goto('/');

        const moreBtn = page.locator('#more-menu-btn');
        const morePanel = page.locator('#more-menu-panel');

        // Dropdown starts hidden
        await expect(morePanel).toBeHidden();

        // Click to open
        await moreBtn.click();
        await expect(morePanel).toBeVisible();

        // Should contain 9 dropdown links (5 功能 + 4 許願&反饋)
        const dropdownLinks = morePanel.locator('a');
        const count = await dropdownLinks.count();
        expect(count).toBe(9);

        // Verify group headers exist
        await expect(morePanel.getByText('功能')).toBeVisible();
        await expect(morePanel.getByText('許願 & 反饋')).toBeVisible();
      });

      test('"更多" dropdown closes on outside click', async ({ page }) => {
        await page.goto('/');

        const moreBtn = page.locator('#more-menu-btn');
        const morePanel = page.locator('#more-menu-panel');

        // Open dropdown
        await moreBtn.click();
        await expect(morePanel).toBeVisible();

        // Click outside (on the body/main area)
        await page.locator('main').click();
        await expect(morePanel).toBeHidden();
      });

      test('"更多" dropdown chevron rotates on toggle', async ({ page }) => {
        await page.goto('/');

        const moreBtn = page.locator('#more-menu-btn');
        const chevron = page.locator('#more-menu-chevron');

        // Initially not rotated
        await expect(chevron).not.toHaveClass(/rotate-180/);

        // Open — chevron rotates
        await moreBtn.click();
        await expect(chevron).toHaveClass(/rotate-180/);

        // Close — chevron resets
        await moreBtn.click();
        await expect(chevron).not.toHaveClass(/rotate-180/);
      });
    }
  });
}
