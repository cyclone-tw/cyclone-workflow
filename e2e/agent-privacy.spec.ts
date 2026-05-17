import { test, expect } from './lambdatest-setup';

test.describe('管家隱私(issue #5)', () => {
  test('未登入訪客點「歷史」分頁 → 看到登入提示,而非他人對話', async ({ page }) => {
    await page.goto('/agent');
    await page.getByRole('button', { name: /歷史/ }).click();
    await expect(page.getByText(/登入後即可查看/)).toBeVisible({ timeout: 10_000 });
  });

  test('匿名訪客可使用聊天輸入框(管家維持公開)', async ({ page }) => {
    await page.goto('/agent');
    const input = page.getByPlaceholder(/跟管家說點什麼/);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });

  test('footer 顯示隱私聲明', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toContainText('不對外公開其他個資');
  });
});
