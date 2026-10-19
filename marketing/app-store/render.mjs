// Renders each card in cards.html to out/<id>.png: the screenshots at 1320 × 2868 (Apple's 6.9" iPhone
// size) and the header banner at 1920 × 1080, with every emoji swapped for Apple's artwork.
// Also saves overview.png, the whole strip scaled down.
// Run: npm run store:render  (after npm run store:capture if the app screens changed)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { showAppleEmoji } from './apple-emoji.mjs';

const here = new URL('.', import.meta.url);
mkdirSync(new URL('out', here), { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 11000, height: 4200 }, deviceScaleFactor: 1 });
await page.goto(new URL('cards.html', here).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');
await showAppleEmoji(page);

for (const card of await page.locator('.card').all()) {
  const id = await card.getAttribute('id');
  await card.screenshot({ path: new URL(`out/${id}.png`, here).pathname, animations: 'disabled' });
  console.log('wrote', `out/${id}.png`);
}

// The overview: the whole strip at a fifth of its size, so the joins between cards show.
const small = await browser.newPage({ viewport: { width: 11000, height: 4200 }, deviceScaleFactor: 0.2 });
await small.goto(new URL('cards.html', here).href);
await small.waitForLoadState('networkidle');
await showAppleEmoji(small);
await small.locator('.strip').screenshot({ path: new URL('overview.png', here).pathname, animations: 'disabled' });
await browser.close();
