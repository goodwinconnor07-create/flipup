// Draws the five alternate app icons FlipUp Premium unlocks (Settings > App icon):
//   native/assets/icons/<id>.png          1024 × 1024, no transparency, for the expo-alternate-app-icons plugin
//   native/assets/icons/<id>-preview.png  180 × 180, for the picker in the app
// Each is its own picture, not a recolour of the spade: a royal flush fan, a high roller chip, gold foil on black
// lacquer, a neon sign and pocket aces on the felt. The ids match ALT_ICONS in native/src/state/app-icon.ts.
// Run after changing the art:  node scripts/makeAltIcons.mjs   (PREVIEW=file.png also saves a sheet of all five)
// (Needs Playwright's Chromium; in the cloud sandbox set CHROMIUM_PATH=/opt/pw-browsers/chromium if it can't find it.)
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT = new URL('../native/assets/icons/', import.meta.url);
const S = 1024;

// The FlipUp mark (scripts/makeAppIcon.mjs): a spade with an up chevron cut through it, centred on 0,0.
const SPADE =
  'M0 -60 C6 -46 22 -34 38 -20 C52 -8 58 4 58 18 C58 37 44 49 27 49 C15 49 7 44 3.5 37 C5 48 12 57 25 62 C26 63 25.5 65 24 65 L-24 65 C-25.5 65 -26 63 -25 62 C-12 57 -5 48 -3.5 37 C-7 44 -15 49 -27 49 C-44 49 -58 37 -58 18 C-58 4 -52 -8 -38 -20 C-22 -34 -6 -46 0 -60 Z';
function chevron(apexY, arm, half) {
  const k = Math.SQRT1_2 * half;
  const ay = apexY + arm;
  const f = (n) => n.toFixed(2);
  return `M${f(-arm - k)} ${f(ay - k)} L${f(-k)} ${f(apexY - k)} A${half} ${half} 0 0 1 ${f(k)} ${f(apexY - k)} L${f(arm + k)} ${f(ay - k)} A${half} ${half} 0 0 1 ${f(arm - k)} ${f(ay + k)} L0 ${f(apexY + half * Math.SQRT2)} L${f(-arm + k)} ${f(ay + k)} A${half} ${half} 0 0 1 ${f(-arm - k)} ${f(ay - k)} Z`;
}
const MARK = `${SPADE} ${chevron(-2, 22, 7.5)}`;
const HEART = 'M0 60 C-10 46 -58 18 -58 -16 C-58 -40 -40 -56 -22 -56 C-10 -56 -3 -48 0 -40 C3 -48 10 -56 22 -56 C40 -56 58 -40 58 -16 C58 18 10 46 0 60 Z';

const GOLD = `
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff3c4"/><stop offset="0.22" stop-color="#f2c75c"/><stop offset="0.45" stop-color="#a8741c"/>
    <stop offset="0.62" stop-color="#f7d77a"/><stop offset="0.8" stop-color="#b9862a"/><stop offset="1" stop-color="#ffe9a6"/>
  </linearGradient>`;

/** A playing card, 300 × 420, centred on 0,0: white with a rank in the corners and a pip in the middle. */
function card({ rank, suit, red = false, big = false, edge = '#e7dcc0' }) {
  const ink = red ? '#d3242f' : '#121418';
  const pip = suit === 'heart' ? HEART : SPADE;
  const small = (x, y, flip) =>
    `<g transform="translate(${x} ${y}) ${flip ? 'rotate(180)' : ''}">
       <text x="0" y="0" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="64" fill="${ink}">${rank}</text>
       <path d="${pip}" transform="translate(0 34) scale(0.36)" fill="${ink}"/>
     </g>`;
  return `
    <rect x="-150" y="-210" width="300" height="420" rx="26" fill="#fffdf7" stroke="${edge}" stroke-width="6"/>
    ${small(-104, -142, false)}${small(104, 142, true)}
    <path d="${pip}" transform="scale(${big ? 1.75 : 1.2})" fill="${ink}"/>`;
}

const ICONS = {
  // Five spades fanned out on deep green-black: the best hand there is.
  royal: () => `
    <defs>${GOLD}
      <radialGradient id="bg" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="#173d33"/><stop offset="0.6" stop-color="#0a1f1a"/><stop offset="1" stop-color="#030a08"/></radialGradient>
      <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity="0.55"/></filter>
    </defs>
    <rect width="${S}" height="${S}" fill="url(#bg)"/>
    <g transform="translate(512 640) scale(1.32)">
      ${['10', 'J', 'Q', 'K', 'A']
        .map((r, i) => `<g filter="url(#sh)" transform="rotate(${(i - 2) * 13}) translate(0 -150)">${card({ rank: r, suit: 'spade', big: r === 'A', edge: 'url(#gold)' })}</g>`)
        .join('')}
    </g>`,

  // A high roller's chip from above: black clay, white and gold inserts round the edge, the mark in gold.
  chip: () => {
    const inserts = Array.from({ length: 8 }, (_, i) => `<rect x="-34" y="-392" width="68" height="104" rx="10" fill="${i % 2 ? 'url(#gold)' : '#f4f1ea'}" transform="rotate(${i * 45 + 22.5})"/>`).join('');
    const dots = Array.from({ length: 36 }, (_, i) => `<circle cx="0" cy="-262" r="7" fill="url(#gold)" transform="rotate(${i * 10})"/>`).join('');
    return `
    <defs>${GOLD}
      <radialGradient id="bg" cx="0.5" cy="0.42" r="0.8"><stop offset="0" stop-color="#1c2a5a"/><stop offset="1" stop-color="#05081a"/></radialGradient>
      <radialGradient id="clay" cx="0.42" cy="0.36" r="0.7"><stop offset="0" stop-color="#2a2d36"/><stop offset="1" stop-color="#0b0c10"/></radialGradient>
      <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="22" stdDeviation="26" flood-color="#000" flood-opacity="0.6"/></filter>
    </defs>
    <rect width="${S}" height="${S}" fill="url(#bg)"/>
    <g transform="translate(512 512)">
      <circle r="400" fill="url(#clay)" filter="url(#sh)"/>
      ${inserts}
      <circle r="290" fill="none" stroke="url(#gold)" stroke-width="10"/>
      ${dots}
      <circle r="238" fill="#101218"/>
      <circle r="238" fill="none" stroke="url(#gold)" stroke-width="4" opacity="0.7"/>
      <path d="${MARK}" fill-rule="evenodd" fill="url(#gold)" transform="translate(0 -6) scale(2.85)"/>
    </g>`;
  },

  // Black lacquer with a slow sheen, a thin gold frame and the mark struck in gold foil.
  gold: () => `
    <defs>${GOLD}
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1a1f"/><stop offset="0.5" stop-color="#0a0a0c"/><stop offset="1" stop-color="#16151a"/></linearGradient>
      <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.48" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.56" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <filter id="emboss" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.7"/>
      </filter>
    </defs>
    <rect width="${S}" height="${S}" fill="url(#bg)"/>
    <rect width="${S}" height="${S}" fill="url(#sheen)"/>
    <rect x="96" y="96" width="832" height="832" rx="120" fill="none" stroke="url(#gold)" stroke-width="7"/>
    <rect x="124" y="124" width="776" height="776" rx="96" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.6"/>
    <path d="${MARK}" fill-rule="evenodd" fill="url(#gold)" filter="url(#emboss)" transform="translate(512 496) scale(4.3)"/>
    <path d="${MARK}" fill-rule="evenodd" fill="none" stroke="#fff6d6" stroke-opacity="0.55" stroke-width="0.6" transform="translate(512 494) scale(4.3)"/>`,

  // A neon sign on a dark wall: the mark in glowing cyan tube, a pink tube frame.
  neon: () => {
    const tube = (d, color, w, t) => `
      <path d="${d}" ${t} fill="none" stroke="${color}" stroke-width="${w * 3.2}" stroke-linejoin="round" stroke-linecap="round" opacity="0.35" filter="url(#glowBig)"/>
      <path d="${d}" ${t} fill="none" stroke="${color}" stroke-width="${w * 1.4}" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)"/>
      <path d="${d}" ${t} fill="none" stroke="#ffffff" stroke-width="${w * 0.45}" stroke-linejoin="round" stroke-linecap="round"/>`;
    return `
    <defs>
      <radialGradient id="bg" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="#1d1036"/><stop offset="1" stop-color="#06030e"/></radialGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="glowBig" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
    </defs>
    <rect width="${S}" height="${S}" fill="url(#bg)"/>
    ${tube('M150 210 Q150 150 210 150 L814 150 Q874 150 874 210 L874 814 Q874 874 814 874 L210 874 Q150 874 150 814 Z', '#ff3fae', 4, '')}
    ${tube(SPADE, '#38e8ff', 2.2, 'transform="translate(512 500) scale(4.4)"')}
    ${tube('M-22 20 L0 -2 L22 20', '#ff3fae', 2.2, 'transform="translate(512 500) scale(4.4)"')}`;
  },

  // Pocket aces face up on the felt, inside the table's gold rail.
  aces: () => `
    <defs>${GOLD}
      <radialGradient id="felt" cx="0.5" cy="0.45" r="0.72"><stop offset="0" stop-color="#2f9a5a"/><stop offset="0.65" stop-color="#16673a"/><stop offset="1" stop-color="#083a20"/></radialGradient>
      <filter id="cloth" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/>
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>
      <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000" flood-opacity="0.5"/></filter>
    </defs>
    <rect width="${S}" height="${S}" fill="url(#felt)"/>
    <rect width="${S}" height="${S}" fill="#fff" filter="url(#cloth)"/>
    <rect x="40" y="40" width="944" height="944" rx="200" fill="none" stroke="url(#gold)" stroke-width="14" opacity="0.85"/>
    <g transform="translate(372 530) rotate(-12) scale(1.3)" filter="url(#sh)">${card({ rank: 'A', suit: 'spade', big: true })}</g>
    <g transform="translate(652 530) rotate(12) scale(1.3)" filter="url(#sh)">${card({ rank: 'A', suit: 'heart', red: true, big: true })}</g>`,
};

const svg = (inner, size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${S} ${S}">${inner}</svg>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });
mkdirSync(OUT, { recursive: true });
async function shot(markup, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${markup}</body></html>`);
  return page.screenshot({ omitBackground: false, clip: { x: 0, y: 0, width: size, height: size } });
}
for (const [id, draw] of Object.entries(ICONS)) {
  const inner = draw();
  writeFileSync(new URL(`${id}.png`, OUT), await shot(svg(inner, S), S));
  writeFileSync(new URL(`${id}-preview.png`, OUT), await shot(svg(inner, 180), 180));
  console.log('wrote', id);
}
if (process.env.PREVIEW) {
  // As pictures, so each icon's gradient ids can't clash with the next one's.
  const tiles = Object.values(ICONS)
    .map((d) => `<img src="data:image/svg+xml;base64,${Buffer.from(svg(d(), 220)).toString('base64')}" style="width:220px;height:220px;border-radius:50px;box-shadow:0 8px 24px #0006">`)
    .join('');
  await page.setViewportSize({ width: 1300, height: 300 });
  await page.setContent(`<body style="margin:0;background:#e9e9ee;display:flex;gap:30px;padding:40px">${tiles}</body>`);
  writeFileSync(process.env.PREVIEW, await page.screenshot());
}
await browser.close();
