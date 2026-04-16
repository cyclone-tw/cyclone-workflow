import { test, expect } from './lambdatest-setup';
import fs from 'fs';

/**
 * 老闆 Demo Tour — 單一 test session（= 一支完整影片），內部用 test.step() 分段。
 * 每個 step 結束時累計時間，test 最後產生 ContactLoop 風格的 markdown 報告。
 */

test.describe.configure({ retries: 0 });
test.use({ viewport: { width: 1280, height: 720 } });

const dwell = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ACT = { timeout: 3000 };

type StepResult = { name: string; durationMs: number; status: 'passed' | 'failed' };

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

test.describe('Cyclone Demo Tour', () => {
  test('walkthrough with interactions', async ({ page }) => {
    test.setTimeout(360_000);

    const results: StepResult[] = [];
    const section = async (name: string, fn: () => Promise<void>) => {
      await test.step(name, async () => {
        const start = Date.now();
        try {
          await fn();
          results.push({ name, durationMs: Date.now() - start, status: 'passed' });
        } catch (e) {
          results.push({ name, durationMs: Date.now() - start, status: 'failed' });
          throw e;
        }
      });
    };

    await section('首頁 + 導覽列互動', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await dwell(2000);

      const nav = page.locator('nav').first();
      await nav.getByText('討論區').first().hover(ACT).catch(() => {});
      await dwell(600);
      await nav.getByText('團隊').first().hover(ACT).catch(() => {});
      await dwell(600);

      const moreBtn = page.locator('#more-menu-btn');
      if (await moreBtn.isVisible().catch(() => false)) {
        await moreBtn.click(ACT).catch(() => {});
        await dwell(1800);
        await page.keyboard.press('Escape').catch(() => {});
        await dwell(500);
      }

      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight / 2 }));
      await dwell(1200);
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await dwell(700);
    });

    const stops = [
      { path: '/discuss/', label: '討論區' },
      { path: '/team/', label: '團隊' },
      { path: '/knowledge/', label: '知識庫' },
      { path: '/wishlist/', label: '許願樹' },
      { path: '/changelog/', label: 'Changelog' },
      { path: '/leaderboard/', label: '積分榜' },
    ];

    for (const { path, label } of stops) {
      await section(label, async () => {
        const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(res?.status(), `${label} status`).toBeLessThan(400);
        await dwell(1500);

        await page.locator('main a, main article, main li').first().hover(ACT).catch(() => {});
        await dwell(600);

        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight / 2 }));
        await dwell(1200);
        await page.evaluate(() => window.scrollTo({ top: 0 }));
        await dwell(600);
      });
    }

    await section('手機 RWD（375×667 + 漢堡選單）', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await dwell(1500);

      const burger = page.locator('#mobile-menu-btn');
      if (await burger.isVisible().catch(() => false)) {
        await burger.click(ACT).catch(() => {});
        await dwell(2000);
        await burger.click(ACT).catch(() => {});
        await dwell(500);
      }
      await page.evaluate(() => window.scrollTo({ top: 400 }));
      await dwell(1000);
    });

    // 產生 ContactLoop 風格的 markdown 報告
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.length - passed;
    const header =
      failed === 0
        ? `ALL PASSED — 共 ${results.length} 項：✅ ${passed} passed, ❌ 0 failed, ⚠️ 0 error`
        : `共 ${results.length} 項：✅ ${passed} passed, ❌ ${failed} failed`;
    const lines = [
      `# Cyclone Tour — prod 測試報告`,
      ``,
      `日期：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`,
      `Base URL：${process.env.E2E_BASE_URL || 'https://cyclone.tw'}`,
      `Viewport：1280×720 → 375×667（末段手機 RWD）`,
      `Browser：Chrome latest @ Windows 10（LambdaTest 雲端）`,
      ``,
      header,
      ``,
      ...results.map((r) => {
        const icon = r.status === 'passed' ? '✅' : '❌';
        const status = r.status === 'passed' ? 'Passed' : 'Failed';
        return `${icon} ${r.name} — ${status} (${formatDuration(r.durationMs)})`;
      }),
      ``,
    ];
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/demo-report.md', lines.join('\n'));
    console.log('\n' + lines.join('\n'));
  });
});
