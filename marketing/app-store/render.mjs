// Renders each card in cards.html to out/<id>.png: the screenshots at 1320 × 2868 (Apple's 6.9" iPhone
// size) and the header banner at 1920 × 1080.
// Run: npm run store:render  (after npm run store:capture if the app screens changed)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const here = new URL('.', import.meta.url);
mkdirSync(new URL('out', here), { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 2000, height: 3000 }, deviceScaleFactor: 1 });
await page.goto(new URL('cards.html', here).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');

for (const card of await page.locator('.card').all()) {
  const id = await card.getAttribute('id');
  await card.screenshot({ path: new URL(`out/${id}.png`, here).pathname, animations: 'disabled' });
  console.log('wrote', `out/${id}.png`);
}
await browser.close();
