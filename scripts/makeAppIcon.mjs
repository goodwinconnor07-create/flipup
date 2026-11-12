// Draws FlipUp's app icon from the one copy of its art, so the icon, the web icons and the launch cover always match:
//   native/assets/expo.icon/          the layered iOS 26 icon (Icon Composer format: a flat fill with a dark look, and
//                                     one layer with the card); iOS builds the older flat icons from it
//   native/assets/images/icon.png     the same icon flattened, 1024 × 1024, no transparency (web build, older tools)
//   native/assets/images/favicon.png  the web build's tab icon
// The art is in native/src/components/launch-mark.ts (ICON_ART): one white playing card, tilted, drawn like the game
// pictures (outline and hard shadow), with the FlipUp spade and up chevron on it, on a flat blue field. The launch
// cover (components/launch-cover.tsx) draws the same list. The spade is drawn, not an SF Symbol: Apple doesn't allow
// those in app icons. The layer is plain filled paths (no strokes, masks or filters) for Icon Composer's SVG reader.
// Run after changing the art:  npx tsx scripts/makeAppIcon.mjs   (PREVIEW=dir also saves a sheet of every size and look)
// (Needs Playwright's Chromium; in the cloud sandbox set CHROMIUM_PATH=/opt/pw-browsers/chromium if it can't find it.)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

import launchMark from '../native/src/components/launch-mark.ts';

// (native/ isn't an ES module package, so tsx hands the file over as one CommonJS module.)
const { ICON_COLORS: C, iconArtSvg } = launchMark;

const ROOT = new URL('../native/assets/', import.meta.url);
const S = 1024;

const svg = (body, size = S) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${S} ${S}">${body}</svg>`;

/** The whole icon, flat: what older iPhones and the web build show. */
function flat({ dark = false, rounded = false } = {}) {
  const shape = rounded ? `rx="${S * 0.2237}"` : '';
  return `<rect width="${S}" height="${S}" ${shape} fill="${dark ? C.fieldDark : C.field}"/>${iconArtSvg()}`;
}

// The Icon Composer layer: the spot and the card on the full 1024 canvas. It brings its own outline and hard shadow,
// so the group has no glass, no shine and no shadow of iOS's: it stays flat like the game pictures.
const LAYER = `${svg(iconArtSvg())}\n`;

const srgb = (hex) => {
  const v = parseInt(hex.slice(1), 16);
  const f = (x) => (x / 255).toFixed(5);
  return `srgb:${f(v >> 16)},${f((v >> 8) & 255)},${f(v & 255)},1.00000`;
};
// A flat fill, written as a gradient with both stops the same (the form this file has always used).
const fill = (hex) => ({ 'linear-gradient': [srgb(hex), srgb(hex)] });

const ICON_JSON = {
  fill: fill(C.field),
  'fill-specializations': [{ value: fill(C.field) }, { appearance: 'dark', value: fill(C.fieldDark) }],
  groups: [
    {
      name: 'Card',
      layers: [{ 'image-name': 'card.svg', name: 'card', glass: false }],
      shadow: { kind: 'neutral', opacity: 0 },
      translucency: { enabled: false, value: 0 },
      specular: false,
    },
  ],
  'supported-platforms': { squares: 'shared' },
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function png(markup, size, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup}`);
  const out = await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  return out;
}

// The layered icon (the spade layer of the old icon is gone).
const iconDir = new URL('expo.icon/', ROOT);
mkdirSync(new URL('Assets/', iconDir), { recursive: true });
rmSync(new URL('Assets/spade.svg', iconDir), { force: true });
writeFileSync(new URL('Assets/card.svg', iconDir), LAYER);
writeFileSync(new URL('icon.json', iconDir), JSON.stringify(ICON_JSON, null, 2) + '\n');

// The flat icons. The App Store icon must have no transparency, so icon.png is drawn on an opaque square.
writeFileSync(new URL('images/icon.png', ROOT), await png(svg(flat()), S));
writeFileSync(new URL('images/favicon.png', ROOT), await png(svg(flat({ rounded: true }), 96), 96, { transparent: true }));

// A sheet of every look and size, to check by eye.
if (process.env.PREVIEW) {
  const dir = process.env.PREVIEW.replace(/\/?$/, '/');
  mkdirSync(dir, { recursive: true });
  const tile = (look, size) =>
    `<div style="width:${size}px;height:${size}px;border-radius:${size * 0.2237}px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25)">${svg(flat(look), size)}</div>`;
  const row = (bg, look) =>
    `<div style="display:flex;align-items:flex-end;gap:36px;padding:40px;background:${bg}">${[360, 180, 120, 60, 40, 29].map((size) => tile(look, size)).join('')}</div>`;
  const sheet = `<div style="width:1000px">${row('#f2f2f7', {})}${row('#000', { dark: true })}${row('#1c1c1e', {})}</div>`;
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>body{margin:0}</style>${sheet}`);
  writeFileSync(`${dir}icon-sheet.png`, await page.locator('div').first().screenshot());
  await page.close();
  writeFileSync(`${dir}icon-1024.png`, await png(svg(flat()), S));
  writeFileSync(`${dir}icon-1024-dark.png`, await png(svg(flat({ dark: true })), S));
}

await browser.close();
console.log('App icon written to native/assets');
