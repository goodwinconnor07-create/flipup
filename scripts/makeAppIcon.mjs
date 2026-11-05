// Draws FlipUp's app icon and splash from one set of shapes, so they always match:
//   native/assets/expo.icon/          the layered iOS 26 icon (Icon Composer format: a gradient fill and one glass
//                                     layer, with a dark look); iOS builds the older flat icons from it
//   native/assets/images/icon.png     the same icon flattened, 1024 × 1024, no transparency (web build, older tools)
//   native/assets/images/splash-icon.png        the rounded icon on a clear background, for the launch screen
//   native/assets/images/splash-icon-dark.png   the same in the dark look, for the launch screen in dark mode
//   native/assets/images/favicon.png  the web build's tab icon
// The mark is one white spade with an up chevron cut through it ("flip up"), on the brand violet
// (native/src/theme/brand.ts). The spade is drawn here, not an SF Symbol: Apple doesn't allow those in app icons.
// Run after changing the art:  node scripts/makeAppIcon.mjs   (PREVIEW=dir also saves a sheet of every size and look)
// (Needs Playwright's Chromium; in the cloud sandbox set CHROMIUM_PATH=/opt/pw-browsers/chromium if it can't find it.)
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = new URL('../native/assets/', import.meta.url);
const S = 1024;

// The brand's colours (native/src/theme/brand.ts and its cardColors).
const C = {
  violetTop: '#8f72f5',
  violetBottom: '#3a2796',
  nightTop: '#33247f',
  nightBottom: '#0c0826',
  spadeTop: '#ffffff',
  spadeBottom: '#e9e3ff',
  shadow: '#1a0f5c',
};

/** A spade about 116 wide and 125 tall, centred on 0,0: a slim curve off the tip, full lobes and a flared foot. */
const SPADE =
  'M0 -60 C6 -46 22 -34 38 -20 C52 -8 58 4 58 18 C58 37 44 49 27 49 C15 49 7 44 3.5 37 C5 48 12 57 25 62 C26 63 25.5 65 24 65 L-24 65 C-25.5 65 -26 63 -25 62 C-12 57 -5 48 -3.5 37 C-7 44 -15 49 -27 49 C-44 49 -58 37 -58 18 C-58 4 -52 -8 -38 -20 C-22 -34 -6 -46 0 -60 Z';

/**
 * The up chevron, as a filled outline (round ends and a round outer corner) so it can be cut out of the spade with
 * even-odd filling: no masks or strokes, which Icon Composer's SVG reader may not support.
 */
function chevron(apexY, arm, half) {
  const k = Math.SQRT1_2 * half;
  const ay = apexY + arm;
  const f = (n) => n.toFixed(2);
  return [
    `M${f(-arm - k)} ${f(ay - k)}`,
    `L${f(-k)} ${f(apexY - k)}`,
    `A${half} ${half} 0 0 1 ${f(k)} ${f(apexY - k)}`,
    `L${f(arm + k)} ${f(ay - k)}`,
    `A${half} ${half} 0 0 1 ${f(arm - k)} ${f(ay + k)}`,
    `L0 ${f(apexY + half * Math.SQRT2)}`,
    `L${f(-arm + k)} ${f(ay + k)}`,
    `A${half} ${half} 0 0 1 ${f(-arm - k)} ${f(ay - k)}`,
    'Z',
  ].join(' ');
}

const CHEVRON = chevron(-2, 22, 7.5);
/** Where the spade sits on the 1024 canvas: a touch above centre, since the foot is lighter than the lobes. */
const PLACE = 'translate(512 500) scale(5.15)';

const mark = (fill) => `<path d="${SPADE} ${CHEVRON}" fill-rule="evenodd" fill="${fill}" transform="${PLACE}"/>`;

const DEFS = `
  <linearGradient id="bg" x1="0.25" y1="0" x2="0.75" y2="1">
    <stop offset="0" stop-color="${C.violetTop}"/><stop offset="1" stop-color="${C.violetBottom}"/>
  </linearGradient>
  <linearGradient id="bgDark" x1="0.25" y1="0" x2="0.75" y2="1">
    <stop offset="0" stop-color="${C.nightTop}"/><stop offset="1" stop-color="${C.nightBottom}"/>
  </linearGradient>
  <radialGradient id="light" cx="0.5" cy="0.08" r="0.75">
    <stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lightDark" cx="0.5" cy="0.08" r="0.75">
    <stop offset="0" stop-color="#a58cff" stop-opacity="0.22"/><stop offset="1" stop-color="#a58cff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="spade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.spadeTop}"/><stop offset="1" stop-color="${C.spadeBottom}"/>
  </linearGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="28" result="b"/><feOffset in="b" dy="24" result="o"/>
    <feFlood flood-color="${C.shadow}" flood-opacity="0.5"/><feComposite in2="o" operator="in" result="s"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b2"/><feOffset in="b2" dy="4" result="o2"/>
    <feFlood flood-color="${C.shadow}" flood-opacity="0.25"/><feComposite in2="o2" operator="in" result="s2"/>
    <feMerge><feMergeNode in="s"/><feMergeNode in="s2"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

const svg = (body, size = S) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${S} ${S}"><defs>${DEFS}</defs>${body}</svg>`;

/** The whole icon, flat: what older iPhones, the web build and the splash show. */
function flat({ dark = false, rounded = false } = {}) {
  const shape = rounded ? `rx="${S * 0.2237}"` : '';
  return (
    `<rect width="${S}" height="${S}" ${shape} fill="url(#${dark ? 'bgDark' : 'bg'})"/>` +
    `<rect width="${S}" height="${S}" ${shape} fill="url(#${dark ? 'lightDark' : 'light'})"/>` +
    `<g filter="url(#lift)">${mark('url(#spade)')}</g>`
  );
}

// The Icon Composer layer: the plain mark on the full 1024 canvas, no shadow or blur (iOS adds the glass, its light
// and the shadow itself).
const LAYER = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${mark('#ffffff')}</svg>\n`;

const srgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => (v / 255).toFixed(5);
  return `srgb:${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)},1.00000`;
};

const ICON_JSON = {
  fill: { 'linear-gradient': [srgb(C.violetTop), srgb(C.violetBottom)] },
  'fill-specializations': [
    { value: { 'linear-gradient': [srgb(C.violetTop), srgb(C.violetBottom)] } },
    { appearance: 'dark', value: { 'linear-gradient': [srgb(C.nightTop), srgb(C.nightBottom)] } },
  ],
  groups: [
    {
      name: 'Spade',
      layers: [{ 'image-name': 'spade.svg', name: 'spade', glass: true }],
      shadow: { kind: 'neutral', opacity: 0.5 },
      translucency: { enabled: true, value: 0.15 },
      specular: true,
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

// The layered icon.
const iconDir = new URL('expo.icon/', ROOT);
mkdirSync(new URL('Assets/', iconDir), { recursive: true });
writeFileSync(new URL('Assets/spade.svg', iconDir), LAYER);
writeFileSync(new URL('icon.json', iconDir), JSON.stringify(ICON_JSON, null, 2) + '\n');

// The flat icons. The App Store icon must have no transparency, so icon.png is drawn on an opaque square.
writeFileSync(new URL('images/icon.png', ROOT), await png(svg(flat()), S));
writeFileSync(new URL('images/splash-icon.png', ROOT), await png(svg(flat({ rounded: true }), 600), 600, { transparent: true }));
writeFileSync(
  new URL('images/splash-icon-dark.png', ROOT),
  await png(svg(flat({ rounded: true, dark: true }), 600), 600, { transparent: true }),
);
writeFileSync(new URL('images/favicon.png', ROOT), await png(svg(flat({ rounded: true }), 96), 96, { transparent: true }));

// A sheet of every look and size, to check by eye.
if (process.env.PREVIEW) {
  const dir = process.env.PREVIEW.replace(/\/?$/, '/');
  mkdirSync(dir, { recursive: true });
  const tile = (look, size) =>
    `<div style="width:${size}px;height:${size}px;border-radius:${size * 0.2237}px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25)">${svg(flat(look), size)}</div>`;
  const row = (bg, look) =>
    `<div style="display:flex;align-items:flex-end;gap:36px;padding:40px;background:${bg}">${[360, 180, 120, 60, 40, 29].map((n) => tile(look, n)).join('')}</div>`;
  const sheet = `<div style="width:1000px">${row('#f2f2f7', {})}${row('#000', { dark: true })}${row('#1c1c1e', {})}</div>`;
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>body{margin:0}</style>${sheet}`);
  writeFileSync(`${dir}icon-sheet.png`, await page.locator('div').first().screenshot());
  await page.close();
  writeFileSync(`${dir}icon-1024.png`, await png(svg(flat()), S));
  writeFileSync(`${dir}icon-1024-dark.png`, await png(svg(flat({ dark: true })), S));
}

await browser.close();
console.log('App icon and splash written to native/assets');
