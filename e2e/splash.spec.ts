import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { watchErrors } from './helpers';

/** A screenshot (with SHOTS_DIR) taken through the browser directly: Playwright's own waits for the page to settle, which a held script never lets it do. */
async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env.SHOTS_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(400);
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${dir}/${name}.png`, Buffer.from(data, 'base64'));
}

test('a loading screen shows while the app downloads, says when it is slow, and goes once the app draws', async ({ page }) => {
  watchErrors(page);
  // Hold the app's script back, like a slow connection.
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/src/main.tsx*', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  const splash = page.locator('#splash');
  await expect(splash).toBeVisible();
  await expect(splash.getByText('FlipUp')).toBeVisible();
  await expect(splash.getByText('Slow connection. Still dealing…')).toBeHidden();
  await shot(page, 'splash');
  await expect(splash.getByText('Slow connection. Still dealing…')).toBeVisible({ timeout: 9000 });
  await shot(page, 'splash-slow');
  release();
  await expect(page.getByRole('tab', { name: 'Play' })).toBeVisible({ timeout: 30_000 });
  await expect(splash).toHaveCount(0);
});

test('the loading screen follows the dark appearance', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('flipup.appearance', JSON.stringify('dark')));
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/src/main.tsx*', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('#splash')).toBeVisible();
  expect(await page.locator('#splash').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(0, 0, 0)');
  await shot(page, 'splash-dark');
  release();
  await expect(page.locator('#splash')).toHaveCount(0, { timeout: 30_000 });
});
