import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Draws the App Store icon and cards from art.html (run capture.spec.ts first for the screens).
const ART = new URL('./art.html', import.meta.url).href;
const OUT = new URL('./out/', import.meta.url).pathname;

test.use({ deviceScaleFactor: 1, isMobile: false, hasTouch: false });

test('icon and cards', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.goto(`${ART}?icon`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#icon').screenshot({ path: `${OUT}icon-1024.png`, omitBackground: false });

  await page.setViewportSize({ width: 1290, height: 2796 });
  const names = await page.evaluate(() => (window as unknown as { CARD_NAMES: string[] }).CARD_NAMES);
  for (const [i, name] of names.entries()) {
    await page.goto(`${ART}?card=${i}`);
    await page.locator('.screen img').evaluate((img) => (img as HTMLImageElement).decode());
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.card').screenshot({ path: `${OUT}${String(i + 1).padStart(2, '0')}-${name}.png` });
  }
});
