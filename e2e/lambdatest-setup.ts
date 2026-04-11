/**
 * LambdaTest Playwright fixture — import `test` from this file in all E2E tests.
 *
 * When LT_USERNAME is set → connects to LambdaTest cloud.
 * Otherwise → uses standard local Playwright.
 */
import * as base from '@playwright/test';
import path from 'path';
import { chromium } from 'playwright';

const capabilities = {
  browserName: 'chrome',
  browserVersion: 'latest',
  'LT:Options': {
    platform: 'Windows 10',
    build: `Cyclone E2E — ${new Date().toISOString().slice(0, 10)}`,
    name: 'Cyclone Test',
    user: process.env.LT_USERNAME || '',
    accessKey: process.env.LT_ACCESS_KEY || '',
    network: true,
    video: true,
    console: true,
    tunnel: false,
    geoLocation: '',
  },
};

export const test = base.test.extend({
  page: async ({ page, viewport }, use, testInfo) => {
    const isLT = !!process.env.LT_USERNAME && testInfo.project.name.includes('lambdatest');

    if (isLT) {
      const fileName = testInfo.file.split(path.sep).pop();
      capabilities['LT:Options']['name'] = `${testInfo.title} - ${fileName}`;

      const browser = await chromium.connect({
        wsEndpoint: `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(
          JSON.stringify(capabilities),
        )}`,
      });

      const ltPage = await browser.newPage(testInfo.project.use);

      // LambdaTest cloud browser ignores viewport in newPage().
      // Force it via CDP setViewportSize so per-test viewports work.
      // Must use the 'viewport' fixture (not testInfo.project.use) to get
      // describe-level overrides from test.use({ viewport }).
      if (viewport) {
        await ltPage.setViewportSize(viewport);
      }

      await use(ltPage);

      // Report test status
      const testStatus = {
        action: 'setTestStatus',
        arguments: {
          status: testInfo.status,
          remark: testInfo.error?.message?.slice(0, 200) || '',
        },
      };
      await ltPage.evaluate(() => {}, `lambdatest_action: ${JSON.stringify(testStatus)}`);

      // Get public video URL
      try {
        const details = JSON.parse(
          await ltPage.evaluate(
            () => '',
            `lambdatest_action: ${JSON.stringify({ action: 'getTestDetails' })}`,
          ),
        );
        if (details?.data?.video_url) {
          console.log(`\n📹 ${testInfo.title}: ${details.data.video_url}`);
          const fs = await import('fs');
          fs.appendFileSync(
            'test-results/video-urls.txt',
            `${testInfo.title}: ${details.data.video_url}\n`,
          );
        }
      } catch {
        // Non-critical
      }

      await ltPage.close();
      await browser.close();
    } else {
      await use(page);
    }
  },
});

export const expect = base.expect;
