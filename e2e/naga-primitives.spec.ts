import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

const SHOT_PATH = process.env.NAGA_SHOT_PATH ?? 'test-results/naga-primitives.png';
const STORAGE_KEY = 'nagaDrawings:BTC/USDT:1m';

function storedKinds(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return [] as string[];
    const parsed = JSON.parse(raw) as { kind?: string }[];
    return Array.isArray(parsed) ? parsed.map((d) => d.kind ?? '') : ([] as string[]);
  }, STORAGE_KEY);
}

test.describe('Naga', () => {
  test('primitives render, toggle and persist', async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
    await Promise.all([page.goto('/graph'), page.waitForResponse('**/pair_candles')]);
    await page.waitForSelector('span:has-text("NoActionStrategyFut | 1m")');

    await page.getByText('Naga chart', { exact: true }).click();

    const chart = page.getByTestId('naga-chart');
    await expect(chart.locator('canvas').first()).toBeVisible();
    const b = (await chart.boundingBox())!;
    expect(b.width).toBeGreaterThan(0);
    expect(b.height).toBeGreaterThan(0);

    // light-weight-charts swallows a second click inside its 500ms double-click
    // window, so every placement click waits it out before firing.
    const clickAt = async (fx: number, fy: number) => {
      const x = b.x + b.width * fx;
      const y = b.y + b.height * fy;
      await page.mouse.move(x, y);
      await page.waitForTimeout(600);
      await page.mouse.click(x, y);
    };
    const tool = (name: string) => page.getByRole('button', { name, exact: true }).click();

    await tool('RR Long');
    await clickAt(0.3, 0.5);
    await clickAt(0.5, 0.6);

    await tool('Block');
    await clickAt(0.55, 0.3);
    await clickAt(0.7, 0.4);

    await tool('Arrow');
    await clickAt(0.2, 0.3);
    await clickAt(0.35, 0.2);

    await tool('Entry Short');
    await clickAt(0.6, 0.6);

    await expect.poll(() => storedKinds(page)).toStrictEqual(['rr', 'zone', 'arrow', 'entry']);

    // Park the pointer off the chart so no crosshair lands in the screenshot.
    await page.mouse.move(0, 0);
    mkdirSync(dirname(SHOT_PATH), { recursive: true });
    const withRr = await chart.screenshot({ path: SHOT_PATH });

    await page.getByText('Show RR', { exact: true }).click();
    await page.waitForTimeout(300);
    const withoutRr = await chart.screenshot();
    expect(withoutRr.equals(withRr)).toBe(false);
    await page.getByText('Show RR', { exact: true }).click();

    await Promise.all([page.reload(), page.waitForResponse('**/pair_candles')]);
    await expect(page.getByTestId('naga-chart').locator('canvas').first()).toBeVisible();
    await expect.poll(() => storedKinds(page)).toStrictEqual(['rr', 'zone', 'arrow', 'entry']);
  });
});
