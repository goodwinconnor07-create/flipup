// Turns the icons from drawGameIcons.mjs into the pictures the iPhone app shows: src/design/icons/<id>.svg becomes
// native/assets/game-icons/<id>.webp at 1024 × 1024. Pictures, not live SVG, because the detailed icons are a
// few hundred shapes each and the app shows dozens at once (the Party tab's belts).
//
//   node scripts/drawGameIcons.mjs && node scripts/renderGameIcons.mjs
//
// Needs Playwright's Chromium (CHROMIUM_PATH if it isn't where Playwright looks) and the Inter font installed, so the
// cards' letters come out in Inter ExtraBold. Chromium encodes the WebP itself (canvas.toDataURL), no other tools.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src', 'design', 'icons');
const OUT = join(ROOT, 'native', 'assets', 'game-icons');
const SIZE = 1024;
const QUALITY = 0.86;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort()) {
  const svg = readFileSync(join(SRC, file), 'utf8');
  const data = await page.evaluate(
    async ({ svg, size, quality }) => {
      // Make sure Inter is loaded before the SVG is drawn, or the first icon gets the fallback font.
      await document.fonts.load('800 100px Inter');
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(img, 0, 0, size, size);
      return canvas.toDataURL('image/webp', quality);
    },
    { svg, size: SIZE, quality: QUALITY },
  );
  const bytes = Buffer.from(data.split(',')[1], 'base64');
  writeFileSync(join(OUT, file.replace(/\.svg$/, '.webp')), bytes);
  console.log(`${file.replace(/\.svg$/, '')}: ${Math.round(bytes.length / 1024)} KB`);
}
await browser.close();
