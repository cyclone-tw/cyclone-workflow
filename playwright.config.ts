import { defineConfig } from '@playwright/test';
import { readFileSync } from 'fs';

// Load .env into process.env (Playwright runs in Node, not Bun)
try {
  const envFile = readFileSync('.env', 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not found — use existing env vars
}

const useLambdaTest = !!process.env.LT_USERNAME;

export default defineConfig({
  testDir: './e2e',
  // demo-tour 是給 stakeholder 看的導覽影片，不屬於 regression 套件 —
  // 只有明確設 RUN_DEMO_TOUR=1（或 `bun run test:e2e:demo`）才納入。
  testIgnore: process.env.RUN_DEMO_TOUR ? [] : ['**/demo-tour.spec.ts'],
  timeout: 60_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://cyclone.tw',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: useLambdaTest
    ? [
        {
          name: 'chrome-latest-win10@lambdatest',
          use: { viewport: { width: 1920, height: 1080 } },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { viewport: { width: 1280, height: 720 } },
        },
      ],
});
