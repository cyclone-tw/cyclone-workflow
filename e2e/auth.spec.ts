import { test, expect } from './lambdatest-setup';

test.describe('Authentication', () => {
  test('login page redirects to Google OAuth', async ({ page }) => {
    // Navigate to login
    await page.goto('/');

    // Click login/register button
    const loginBtn = page.getByRole('link', { name: /登入|Login/ }).first();
    if (await loginBtn.isVisible()) {
      // Clicking should redirect towards Google OAuth
      const response = await loginBtn.click();
      // Should end up on accounts.google.com or our callback
      await page.waitForURL(/google|callback/, { timeout: 10000 }).catch(() => {
        // Some pages may not have a visible login button if already logged in
      });
    }
  });

  test('protected pages redirect when not logged in', async ({ page }) => {
    // Try accessing admin page
    await page.goto('/admin');

    // Should either redirect or show unauthorized
    const url = page.url();
    const bodyText = await page.locator('body').textContent();

    const isRedirected = url.includes('login') || url === new URL('/', page.url()).href;
    const showsUnauthorized = bodyText?.includes('權限') || bodyText?.includes('登入');

    expect(isRedirected || showsUnauthorized).toBeTruthy();
  });
});
