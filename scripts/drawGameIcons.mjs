// Draws every game's and solo card's app icon as SVG: `node scripts/drawGameIcons.mjs` writes src/design/icons/<id>.svg.
// One shared recipe (docs/DESIGN_DIRECTION.md): the game's two colours as a diagonal gradient, a soft light from the
// top left, a vignette, one big lit subject and a soft contact shadow. No SVG filters (react-native-svg can't draw
// them): shadows and glows are radial gradients. Playing cards are the game's own card, as on the table.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'design', 'icons');

// The table's four-colour deck (native/src/components/table/playing-card.tsx).
const INK = { s: '#16161d', h: '#e5322d', d: '#2563eb', c: '#16a34a' };
const FONT = 'SF Pro Rounded, ui-rounded, -apple-system, system-ui, sans-serif';
const GOLD = ['#ffe28a', '#f5b700'];

let uid = 0;
const id = (p) => `${p}${++uid}`;

const SUITS = `
  <symbol id="s-h" viewBox="-60 -60 120 100"><path d="M0 38 C-12 26 -58 2 -58 -26 C-58 -52 -24 -60 0 -34 C24 -60 58 -52 58 -26 C58 2 12 26 0 38 Z"/></symbol>
  <symbol id="s-s" viewBox="-60 -50 120 116"><path d="M0 -46 C12 -30 58 -6 58 20 C58 44 30 52 8 38 C10 50 16 58 26 64 L-26 64 C-16 58 -10 50 -8 38 C-30 52 -58 44 -58 20 C-58 -6 -12 -30 0 -46 Z"/></symbol>
  <symbol id="s-d" viewBox="-52 -60 104 120"><path d="M0 -58 C14 -36 34 -16 50 0 C34 16 14 36 0 58 C-14 36 -34 16 -50 0 C-34 -16 -14 -36 0 -58 Z"/></symbol>
  <symbol id="s-c" viewBox="-58 -56 116 118"><circle cx="0" cy="-27" r="27"/><circle cx="-29" cy="13" r="27"/><circle cx="29" cy="13" r="27"/><path d="M-9 4 C-9 34 -16 48 -30 60 L30 60 C16 48 9 34 9 4 Z"/></symbol>`;

/** The page: gradient, light and vignette, with the shared defs. */
function icon([c0, c1], body, extraDefs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>
    <radialGradient id="light" cx="0.28" cy="0.14" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx="0.5" cy="0.42" r="0.72"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.38"/></radialGradient>
    <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="goldGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffc933" stop-opacity="0.6"/><stop offset="1" stop-color="#ffc933" stop-opacity="0"/></radialGradient>
    <radialGradient id="whiteGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1eff5"/></linearGradient>
    <linearGradient id="backFill" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#3b4256"/><stop offset="1" stop-color="#161821"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD[0]}"/><stop offset="1" stop-color="${GOLD[1]}"/></linearGradient>
    ${SUITS}
    ${extraDefs}
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#light)"/><rect width="1024" height="1024" fill="url(#vig)"/>
${body}
</svg>
`;
}

const shadow = (cx, cy, rx, ry, o = 1) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#shadow)" opacity="${o}"/>`;
const glow = (cx, cy, r, fill = 'goldGlow', o = 1) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${fill})" opacity="${o}"/>`;
const at = (x, y, r = 0, s = 1) => `translate(${x} ${y}) rotate(${r}) scale(${s})`;

const W = 390;
const H = 550;
const RX = 42;

/** A face-up card in the table's style: white, a heavy rank top left, one big suit. Centred on (x, y). */
function card({ x, y, r = 0, s = 1, rank, suit, lift = 1, glowing = false }) {
  const ink = INK[suit];
  const ten = rank === '10';
  const box = { h: [230, 192], d: [184, 212], s: [196, 190], c: [196, 200] }[suit];
  return `<g transform="${at(x, y, r, s)}">
    ${glowing ? `<circle r="420" fill="url(#goldGlow)"/>` : ''}
    <rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="${RX}" fill="#000" opacity="${0.24 * lift}" transform="translate(${12 * lift} ${24 * lift})"/>
    ${glowing ? `<rect x="${-W / 2 - 12}" y="${-H / 2 - 12}" width="${W + 24}" height="${H + 24}" rx="${RX + 10}" fill="none" stroke="#ffb020" stroke-width="12"/>` : ''}
    <rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="${RX}" fill="url(#face)" stroke="#d9d5e2" stroke-width="3"/>
    <text x="-142" y="-95" font-family="${FONT}" font-weight="800" font-size="${ten ? 168 : 190}" letter-spacing="${ten ? -16 : -6}" fill="${ink}">${rank}</text>
    <use href="#s-${suit}" x="${-box[0] / 2 - 10}" y="${-8}" width="${box[0]}" height="${box[1]}" fill="${ink}"/>
  </g>`;
}

/** A face-down card: the app's plain back (white edge, dark slate, a fine sheen). `mark` is a glyph on it. */
function back({ x, y, r = 0, s = 1, mark = '', lift = 1 }) {
  const clip = id('bk');
  return `<g transform="${at(x, y, r, s)}">
    <clipPath id="${clip}"><rect x="${-W / 2 + 16}" y="${-H / 2 + 16}" width="${W - 32}" height="${H - 32}" rx="${RX - 12}"/></clipPath>
    <rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="${RX}" fill="#000" opacity="${0.26 * lift}" transform="translate(${12 * lift} ${24 * lift})"/>
    <rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="${RX}" fill="#f4f4f8"/>
    <rect x="${-W / 2 + 16}" y="${-H / 2 + 16}" width="${W - 32}" height="${H - 32}" rx="${RX - 12}" fill="url(#backFill)"/>
    <g clip-path="url(#${clip})" stroke="#fff" stroke-opacity="0.13" stroke-width="22">
      <line x1="-260" y1="260" x2="120" y2="-360"/><line x1="-120" y1="360" x2="260" y2="-260"/>
    </g>
    ${mark}
  </g>`;
}

/** A chip seen from above. */
function chip({ x, y, r = 150, base = ['#ffe28a', '#e0a100'], edge = '#fff', ink = '', text = '' }) {
  const g = id('chip');
  const stripes = Array.from({ length: 8 }, (_, i) => `<rect x="-16" y="${-r}" width="32" height="${r * 0.24}" rx="6" fill="${edge}" transform="rotate(${i * 45})"/>`).join('');
  return `<g transform="translate(${x} ${y})">
    <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></linearGradient>
    <circle r="${r}" fill="#000" opacity="0.3" transform="translate(10 22)"/>
    <circle r="${r}" fill="url(#${g})"/>
    ${stripes}
    <circle r="${r * 0.66}" fill="none" stroke="${edge}" stroke-opacity="0.7" stroke-width="${r * 0.05}" stroke-dasharray="${r * 0.12} ${r * 0.08}"/>
    <circle r="${r * 0.56}" fill="url(#${g})" stroke="#000" stroke-opacity="0.12" stroke-width="4"/>
    <ellipse cx="${-r * 0.3}" cy="${-r * 0.5}" rx="${r * 0.35}" ry="${r * 0.14}" fill="#fff" opacity="0.35" transform="rotate(-25 ${-r * 0.3} ${-r * 0.5})"/>
    ${text ? `<text y="${r * 0.2}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${r * 0.62}" fill="${ink}">${text}</text>` : ''}
  </g>`;
}

/** A four-point sparkle. */
const sparkle = (x, y, s, fill = '#fff', o = 1) =>
  `<path transform="translate(${x} ${y})" d="M0 ${-s} Q${s * 0.12} ${-s * 0.12} ${s} 0 Q${s * 0.12} ${s * 0.12} 0 ${s} Q${-s * 0.12} ${s * 0.12} ${-s} 0 Q${-s * 0.12} ${-s * 0.12} 0 ${-s} Z" fill="${fill}" opacity="${o}"/>`;

// ---------------------------------------------------------------------------------------------------------------

const ICONS = {};

ICONS.holdem = icon(['#2aa86b', '#06301d'], `
  ${shadow(530, 860, 330, 56)}
  ${card({ x: 372, y: 505, r: -14, rank: 'A', suit: 's' })}
  ${card({ x: 652, y: 566, r: 10, rank: 'K', suit: 'h', lift: 1.4 })}`);

ICONS.deuces = icon(['#ff4fa0', '#6a22f0'], `
  ${glow(512, 500, 470, 'whiteGlow', 0.45)}
  ${shadow(520, 880, 320, 52)}
  ${card({ x: 640, y: 500, r: 16, s: 0.92, rank: '2', suit: 'd' })}
  <g>${card({ x: 450, y: 545, r: -8, rank: '2', suit: 'c', lift: 1.4 })}</g>
  <g transform="${at(450, 545, -8)}"><clipPath id="dc"><rect x="-195" y="-275" width="390" height="550" rx="42"/></clipPath>
    <rect clip-path="url(#dc)" x="-195" y="-275" width="390" height="550" fill="url(#holo)"/></g>
  ${sparkle(205, 250, 70, '#fff')}${sparkle(820, 230, 46, '#ffe28a')}${sparkle(835, 760, 58, '#fff')}${sparkle(190, 760, 34, '#ffe28a')}${sparkle(300, 150, 22, '#fff', 0.8)}`,
`<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0.25" stop-color="#ff4fa0" stop-opacity="0"/><stop offset="0.38" stop-color="#ff4fa0" stop-opacity="0.22"/><stop offset="0.48" stop-color="#ffd84a" stop-opacity="0.24"/><stop offset="0.58" stop-color="#3dd6ff" stop-opacity="0.22"/><stop offset="0.7" stop-color="#7a2cff" stop-opacity="0"/></linearGradient>`);

ICONS.ghost = icon(['#24405c', '#03070c'], `
  <circle cx="500" cy="500" r="430" fill="url(#aura)"/>
  <circle cx="200" cy="230" r="9" fill="#cfefff" opacity="0.8"/><circle cx="830" cy="190" r="6" fill="#cfefff" opacity="0.7"/><circle cx="860" cy="560" r="8" fill="#cfefff" opacity="0.5"/><circle cx="170" cy="640" r="5" fill="#cfefff" opacity="0.6"/>
  ${shadow(500, 890, 230, 40)}
  <g transform="rotate(-7 500 520)">
    ${back({ x: 735, y: 600, r: 18, s: 0.62 })}
    <path fill="url(#body)" d="M290 520 C290 330 385 205 500 205 C615 205 710 330 710 520 L710 770 Q657.5 850 605 770 Q552.5 850 500 770 Q447.5 850 395 770 Q342.5 850 290 770 Z"/>
    <path fill="url(#gshade)" d="M290 520 C290 330 385 205 500 205 C615 205 710 330 710 520 L710 770 Q657.5 850 605 770 Q552.5 850 500 770 Q447.5 850 395 770 Q342.5 850 290 770 Z"/>
    <ellipse cx="390" cy="320" rx="46" ry="74" fill="#fff" opacity="0.8" transform="rotate(30 390 320)"/>
    <ellipse cx="690" cy="600" rx="62" ry="44" fill="#eef3fc" transform="rotate(-25 690 600)"/>
    <ellipse cx="300" cy="610" rx="50" ry="36" fill="#e6edf9" transform="rotate(30 300 610)"/>
    <ellipse cx="438" cy="455" rx="36" ry="50" fill="url(#eye)"/><ellipse cx="572" cy="455" rx="36" ry="50" fill="url(#eye)"/>
    <circle cx="428" cy="436" r="13" fill="#fff"/><circle cx="562" cy="436" r="13" fill="#fff"/>
    <circle cx="446" cy="474" r="6" fill="#fff" opacity="0.7"/><circle cx="580" cy="474" r="6" fill="#fff" opacity="0.7"/>
    <ellipse cx="385" cy="535" rx="42" ry="26" fill="url(#blush)"/><ellipse cx="625" cy="535" rx="42" ry="26" fill="url(#blush)"/>
    <path d="M470 545 Q505 585 545 540" fill="none" stroke="#1a2236" stroke-width="16" stroke-linecap="round"/>
  </g>`,
`<radialGradient id="aura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6fd3ff" stop-opacity="0.55"/><stop offset="1" stop-color="#6fd3ff" stop-opacity="0"/></radialGradient>
 <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="#e3ecfb"/><stop offset="1" stop-color="#b7c8e6" stop-opacity="0.85"/></linearGradient>
 <linearGradient id="gshade" x1="0" y1="0" x2="1" y2="0"><stop offset="0.45" stop-color="#5b7cb0" stop-opacity="0"/><stop offset="1" stop-color="#5b7cb0" stop-opacity="0.35"/></linearGradient>
 <linearGradient id="eye" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3550"/><stop offset="1" stop-color="#0c1120"/></linearGradient>
 <radialGradient id="blush" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff8fb3" stop-opacity="0.7"/><stop offset="1" stop-color="#ff8fb3" stop-opacity="0"/></radialGradient>`);

ICONS.pittsburgh = icon(['#3a5574', '#070c12'], `
  <rect x="0" y="600" width="1024" height="424" fill="url(#water)"/>
  ${[650, 700, 760, 830].map((y, i) => `<path d="M${80 + i * 30} ${y} H${944 - i * 30}" stroke="#ffc933" stroke-opacity="${0.22 - i * 0.04}" stroke-width="${8 - i}" stroke-dasharray="${60 - i * 8} ${40 + i * 10}"/>`).join('')}
  <g stroke="url(#gold)" fill="none" stroke-linecap="round">
    <path d="M60 560 Q512 120 964 560" stroke-width="26"/>
    ${Array.from({ length: 13 }, (_, i) => {
      const x = 130 + i * 63.5;
      const t = (x - 60) / 904;
      const yArc = (1 - t) * (1 - t) * 560 + 2 * (1 - t) * t * 120 + t * t * 560;
      return `<line x1="${x}" y1="${yArc + 10}" x2="${x}" y2="560" stroke="#f5c23a" stroke-width="7" opacity="0.85"/>`;
    }).join('')}
    <line x1="20" y1="572" x2="1004" y2="572" stroke="#f5c23a" stroke-width="30"/><line x1="20" y1="562" x2="1004" y2="562" stroke="#fff3c4" stroke-width="6" opacity="0.7"/>
  </g>
  ${shadow(512, 900, 380, 50)}
  ${card({ x: 290, y: 760, r: -9, s: 0.5, rank: 'J', suit: 'd' })}
  ${card({ x: 512, y: 735, r: 0, s: 0.52, rank: '9', suit: 'c', lift: 1.2 })}
  ${card({ x: 734, y: 760, r: 9, s: 0.5, rank: '5', suit: 'h' })}`,
`<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1622" stop-opacity="0.2"/><stop offset="1" stop-color="#02050a" stop-opacity="0.8"/></linearGradient>`);

ICONS.dice = icon(['#e0334f', '#3a0610'], `
  <path d="M-20 820 Q130 780 280 820 T580 820 T880 820 T1180 820 V1044 H-20 Z" fill="url(#river)"/>
  <path d="M-20 900 Q130 860 280 900 T580 900 T880 900 T1180 900 V1044 H-20 Z" fill="#ff6b7d" opacity="0.12"/>
  ${shadow(512, 850, 290, 56)}
  <g transform="rotate(-6 512 540)" stroke-linejoin="round">
    <path d="M262 395 L512 540 L512 830 L262 685 Z" fill="url(#dl)" stroke="#d8d2e3" stroke-width="44"/>
    <path d="M512 540 L762 395 L762 685 L512 830 Z" fill="url(#dr)" stroke="#b6adc8" stroke-width="44"/>
    <path d="M512 250 L762 395 L512 540 L262 395 Z" fill="url(#dt)" stroke="#fbfaff" stroke-width="44"/>
    <path d="M262 395 L512 540 L762 395" fill="none" stroke="#fff" stroke-width="10" opacity="0.7"/>
    <path d="M512 540 L512 830" fill="none" stroke="#fff" stroke-width="6" opacity="0.35"/>
    <g transform="matrix(2.5,-1.45,2.5,1.45,262,395)"><circle cx="50" cy="50" r="17" fill="url(#pipred)"/></g>
    <g transform="matrix(2.5,1.45,0,2.9,262,395)"><circle cx="27" cy="27" r="11.5" fill="url(#pip)"/><circle cx="73" cy="73" r="11.5" fill="url(#pip)"/></g>
    <g transform="matrix(2.5,-1.45,0,2.9,512,540)"><circle cx="25" cy="25" r="10.5" fill="url(#pip)"/><circle cx="50" cy="50" r="10.5" fill="url(#pip)"/><circle cx="75" cy="75" r="10.5" fill="url(#pip)"/></g>
    <ellipse cx="430" cy="330" rx="70" ry="24" fill="#fff" opacity="0.6" transform="rotate(-30 430 330)"/>
  </g>`,
`<linearGradient id="dt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f0ecf6"/></linearGradient>
 <linearGradient id="dl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8e3f0"/><stop offset="1" stop-color="#c3bcd2"/></linearGradient>
 <linearGradient id="dr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfc7dd"/><stop offset="1" stop-color="#9d93b3"/></linearGradient>
 <radialGradient id="pip" cx="0.5" cy="0.35" r="0.6"><stop offset="0" stop-color="#3a3a4a"/><stop offset="1" stop-color="#0b0b12"/></radialGradient>
 <radialGradient id="pipred" cx="0.5" cy="0.35" r="0.6"><stop offset="0" stop-color="#ff5a52"/><stop offset="1" stop-color="#b3141c"/></radialGradient>
 <linearGradient id="river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b7d" stop-opacity="0"/><stop offset="1" stop-color="#ff6b7d" stop-opacity="0.35"/></linearGradient>`);

ICONS.crucifix = icon(['#6a55a8', '#140d26'], `
  ${glow(512, 512, 460, 'goldGlow', 0.8)}
  ${shadow(512, 920, 260, 40, 0.7)}
  ${card({ x: 512, y: 270, s: 0.4, rank: 'Q', suit: 'd' })}
  ${card({ x: 512, y: 760, s: 0.4, rank: 'J', suit: 'c' })}
  ${card({ x: 280, y: 515, s: 0.4, rank: 'K', suit: 'h' })}
  ${card({ x: 744, y: 515, s: 0.4, rank: '10', suit: 's' })}
  ${card({ x: 512, y: 515, s: 0.46, rank: 'A', suit: 's', glowing: true, lift: 1.3 })}`);

ICONS.circle = icon(['#2a93cf', '#06203a'], `
  ${glow(512, 512, 430, 'whiteGlow', 0.35)}
  <circle cx="512" cy="512" r="330" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="10"/>
  ${Array.from({ length: 12 }, (_, i) => `<line x1="512" y1="${512 - 300}" x2="512" y2="${512 - (i % 3 === 0 ? 268 : 284)}" stroke="#fff" stroke-opacity="${i % 3 === 0 ? 0.6 : 0.3}" stroke-width="${i % 3 === 0 ? 12 : 7}" stroke-linecap="round" transform="rotate(${i * 30} 512 512)"/>`).join('')}
  ${[['A', 'h'], ['K', 'd'], ['9', 'c'], ['6', 's'], ['Q', 'h'], ['4', 'd']].map(([rank, suit], i) => {
    const a = (i * 60 * Math.PI) / 180;
    return card({ x: 512 + Math.sin(a) * 335, y: 512 - Math.cos(a) * 335, r: i * 60, s: 0.3, rank, suit, lift: 0.6 });
  }).join('')}
  <g stroke-linecap="round">
    <line x1="512" y1="512" x2="512" y2="330" stroke="#f5c23a" stroke-width="26"/>
    <line x1="512" y1="512" x2="640" y2="585" stroke="#f5c23a" stroke-width="20"/>
  </g>
  <circle cx="512" cy="512" r="34" fill="url(#gold)"/><circle cx="502" cy="502" r="10" fill="#fff" opacity="0.7"/>`);

// Memory: a grid of face-down cards with the one you remember turned up.
ICONS.memory = icon(['#8a6bff', '#1f0f5c'], `
  ${shadow(512, 900, 380, 50, 0.8)}
  ${[[-1, -1, -5], [0, -1, 3], [1, -1, -2], [-1, 0, 4], [1, 0, -4], [-1, 1, -3], [0, 1, 5], [1, 1, 2]]
    .map(([cx, cy, r]) => back({ x: 512 + cx * 230, y: 520 + cy * 290, r, s: 0.48, lift: 0.6 }))
    .join('')}
  ${card({ x: 512, y: 505, r: -4, s: 0.6, rank: 'Q', suit: 'h', glowing: true, lift: 1.5 })}
  ${sparkle(700, 300, 48, '#fff')}${sparkle(310, 720, 32, '#ffe28a')}`);

ICONS.bjholdem = icon(['#16855a', '#041d12'], `
  ${shadow(500, 860, 330, 56)}
  ${card({ x: 360, y: 490, r: -14, rank: 'K', suit: 's' })}
  ${card({ x: 620, y: 540, r: 9, rank: 'A', suit: 'd', lift: 1.4 })}
  ${chip({ x: 760, y: 790, r: 150, base: ['#ffe28a', '#e09a00'], edge: '#fff7d6', ink: '#5a3a00', text: '21' })}`);

// ----- Solo cards: the three challenges and Range training (colours from CHALLENGE_LOOK in challengeArt.ts) -----

ICONS.detective = icon(['#3a24a8', '#0b0626'], `
  ${shadow(470, 860, 300, 50)}
  ${card({ x: 430, y: 470, r: -10, s: 0.95, rank: 'Q', suit: 'h' })}
  <clipPath id="lensClip"><circle cx="560" cy="600" r="180"/></clipPath>
  <g clip-path="url(#lensClip)">
    <g transform="translate(560 600) scale(1.45) translate(-560 -600)">${card({ x: 430, y: 470, r: -10, s: 0.95, rank: 'Q', suit: 'h', lift: 0 })}</g>
    <circle cx="560" cy="600" r="180" fill="url(#glass)"/>
  </g>
  <g transform="rotate(-45 560 600)">
    <rect x="530" y="800" width="60" height="230" rx="30" fill="url(#handle)"/>
    <rect x="538" y="770" width="44" height="44" rx="8" fill="#c9a24a"/>
  </g>
  <circle cx="560" cy="600" r="180" fill="none" stroke="url(#rim)" stroke-width="40"/>
  <path d="M440 500 A140 140 0 0 1 520 455" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity="0.7"/>`,
`<radialGradient id="glass" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.6" stop-color="#bfe6ff" stop-opacity="0.08"/><stop offset="1" stop-color="#6fd3ff" stop-opacity="0.2"/></radialGradient>
 <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe28a"/><stop offset="1" stop-color="#b37a00"/></linearGradient>
 <linearGradient id="handle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3a1a"/><stop offset="0.5" stop-color="#8a5a2a"/><stop offset="1" stop-color="#3a2410"/></linearGradient>`);

ICONS.rewind = icon(['#5a34f0', '#120838'], `
  ${glow(512, 520, 400, 'whiteGlow', 0.35)}
  ${shadow(512, 860, 260, 46)}
  ${card({ x: 512, y: 530, r: -6, s: 0.72, rank: 'A', suit: 'h', lift: 1.2 })}
  <path d="M${512 + 330 * Math.sin((40 * Math.PI) / 180)} ${520 - 330 * Math.cos((40 * Math.PI) / 180)} A330 330 0 1 1 ${512 + 330 * Math.sin((-30 * Math.PI) / 180)} ${520 - 330 * Math.cos((-30 * Math.PI) / 180)}" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="58" stroke-linecap="round" transform="translate(8 16)"/>
  <path d="M${512 + 330 * Math.sin((40 * Math.PI) / 180)} ${520 - 330 * Math.cos((40 * Math.PI) / 180)} A330 330 0 1 1 ${512 + 330 * Math.sin((-30 * Math.PI) / 180)} ${520 - 330 * Math.cos((-30 * Math.PI) / 180)}" fill="none" stroke="url(#gold)" stroke-width="54" stroke-linecap="round"/>
  <g transform="translate(${512 + 330 * Math.sin((-30 * Math.PI) / 180)} ${520 - 330 * Math.cos((-30 * Math.PI) / 180)}) rotate(60)">
    <path d="M-10 -80 L110 0 L-10 80 Z" fill="#ffe28a" stroke="#ffe28a" stroke-width="24" stroke-linejoin="round"/>
  </g>`);

// Range training: the 13 × 13 chart, a sensible opening range lit gold.
function inRange(i, j) {
  if (i === j) return i <= 11;
  if (i < j) return i <= 1 || (i <= 4 && j <= 9) || (i <= 8 && j <= i + 3);
  return (j <= 1 && i <= 9) || (j <= 4 && i <= j + 3);
}
ICONS.ranges = icon(['#5a35f0', '#160a4a'], `
  ${glow(380, 380, 420, 'goldGlow', 0.6)}
  <g transform="translate(512 520) rotate(-8) translate(-377 -377)">
    <rect x="-26" y="-26" width="806" height="806" rx="56" fill="#000" opacity="0.28" transform="translate(12 24)"/>
    <rect x="-26" y="-26" width="806" height="806" rx="56" fill="#140a3d" opacity="0.65"/>
    ${Array.from({ length: 169 }, (_, k) => {
      const i = Math.floor(k / 13);
      const j = k % 13;
      const on = inRange(i, j);
      const fill = on ? (i === j ? 'url(#gold)' : i < j ? '#ffc933' : '#e6a91a') : '#ffffff';
      return `<rect x="${j * 58}" y="${i * 58}" width="50" height="50" rx="11" fill="${fill}" opacity="${on ? 1 : 0.1}"/>`;
    }).join('')}
  </g>
  ${sparkle(830, 220, 44, '#fff')}`);

// ----- The characters and the detailed scenes. Same faces as the ghost: big dark eyes with two lights, blush, a
// small smile, glossy bodies lit from the top left. -----

/** Ghost-style eyes: dark ovals with a big and a small light. `look` moves the pupils sideways. */
function eyes(lx, rx, y, { w = 34, h = 46, look = 0 } = {}) {
  const one = (x) => `<ellipse cx="${x + look}" cy="${y}" rx="${w}" ry="${h}" fill="url(#eyeInk)"/>
    <circle cx="${x + look - w * 0.3}" cy="${y - h * 0.38}" r="${w * 0.38}" fill="#fff"/>
    <circle cx="${x + look + w * 0.25}" cy="${y + h * 0.35}" r="${w * 0.16}" fill="#fff" opacity="0.75"/>`;
  return one(lx) + one(rx);
}
const blush = (x, y, rx = 44, ry = 26) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#blushG)"/>`;
const FACE_DEFS = `<linearGradient id="eyeInk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a3a"/><stop offset="1" stop-color="#0a0a12"/></linearGradient>
 <radialGradient id="blushG" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff7aa2" stop-opacity="0.75"/><stop offset="1" stop-color="#ff7aa2" stop-opacity="0"/></radialGradient>`;

/** Sun rays from (x, y): alternating soft wedges. */
function rays(x, y, n = 14, o = 0.07) {
  return Array.from({ length: n }, (_, i) => {
    const a0 = ((i * 360) / n) * (Math.PI / 180);
    const a1 = (((i + 0.5) * 360) / n) * (Math.PI / 180);
    const R = 900;
    return `<path d="M${x} ${y} L${x + Math.cos(a0) * R} ${y + Math.sin(a0) * R} L${x + Math.cos(a1) * R} ${y + Math.sin(a1) * R} Z" fill="#fff" opacity="${o}"/>`;
  }).join('');
}

// Pineapple: a round, glossy pineapple with real scales, a layered crown, its sunglasses pushed up, three cards.
{
  const cx = 470;
  const cy = 610;
  const rx = 212;
  const ry = 240;
  const scales = [];
  for (let row = -6; row <= 6; row++) {
    for (let col = -5; col <= 5; col++) {
      const x = cx + col * 66 + (row % 2 ? 33 : 0);
      const y = cy + row * 54;
      scales.push(`<path d="M${x} ${y - 30} Q${x + 30} ${y - 28} ${x + 35} ${y} Q${x + 30} ${y + 28} ${x} ${y + 31} Q${x - 30} ${y + 28} ${x - 35} ${y} Q${x - 30} ${y - 28} ${x} ${y - 30} Z" fill="url(#scale)" stroke="#c0600a" stroke-opacity="0.55" stroke-width="4"/>
        <path d="M${x - 16} ${y - 14} Q${x} ${y - 24} ${x + 16} ${y - 14}" stroke="#fff6c2" stroke-opacity="0.7" stroke-width="5" fill="none" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y + 10}" r="5" fill="#8a3d04" opacity="0.55"/>`);
    }
  }
  const leaf = (a, len, w, fill, bend = 0) =>
    `<g transform="rotate(${a})"><path d="M0 24 C${-w} ${-len * 0.25} ${-w * 0.6 + bend} ${-len * 0.75} ${bend} ${-len} C${w * 0.5 + bend} ${-len * 0.7} ${w} ${-len * 0.25} 0 24 Z" fill="${fill}"/>
      <path d="M0 10 Q${bend * 0.4} ${-len * 0.5} ${bend * 0.9} ${-len * 0.92}" stroke="#0f5a26" stroke-opacity="0.35" stroke-width="5" fill="none"/></g>`;
  ICONS.pineapple = icon(['#ffcf52', '#e2570f'], `
  ${rays(cx, cy - 40)}
  ${glow(cx, 520, 420, 'whiteGlow', 0.5)}
  ${shadow(cx + 40, 905, 320, 46)}
  <g transform="translate(${cx} ${cy - ry + 34})">
    ${leaf(-58, 190, 40, 'url(#leafDark)', -20)}${leaf(58, 190, 40, 'url(#leafDark)', 20)}
    ${leaf(-34, 250, 46, 'url(#leafDark)', -14)}${leaf(34, 250, 46, 'url(#leafDark)', 14)}
    ${leaf(-16, 300, 48, 'url(#leaf)', -10)}${leaf(16, 300, 48, 'url(#leaf)', 18)}${leaf(0, 330, 52, 'url(#leaf)', 6)}
    ${leaf(-44, 180, 40, 'url(#leaf)', -16)}${leaf(44, 180, 40, 'url(#leaf)', 16)}
  </g>
  <ellipse cx="${cx - 70}" cy="855" rx="54" ry="30" fill="#d9761a"/><ellipse cx="${cx + 70}" cy="855" rx="54" ry="30" fill="#d9761a"/>
  <clipPath id="pBody"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#f5a524"/>
  <g clip-path="url(#pBody)">${scales.join('')}
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#pineShade)"/>
    <ellipse cx="${cx}" cy="${cy + 40}" rx="140" ry="110" fill="#ffd866" opacity="0.55"/>
  </g>
  <ellipse cx="${cx - 110}" cy="${cy - 130}" rx="46" ry="90" fill="#fff" opacity="0.38" transform="rotate(28 ${cx - 110} ${cy - 130})"/>
  ${eyes(cx - 66, cx + 66, cy + 10, { w: 32, h: 44 })}
  ${blush(cx - 128, cy + 68, 42, 24)}${blush(cx + 128, cy + 68, 42, 24)}
  <path d="M${cx - 30} ${cy + 74} Q${cx} ${cy + 118} ${cx + 30} ${cy + 74} Z" fill="#6a2304"/>
  <ellipse cx="${cx}" cy="${cy + 98}" rx="14" ry="9" fill="#ff7a8a"/>
  <g transform="rotate(-10 ${cx} ${cy - ry + 40})">
    <path d="M${cx - 150} ${cy - ry + 40} Q${cx - 150} ${cy - ry + 4} ${cx - 112} ${cy - ry + 2} L${cx - 26} ${cy - ry + 2} Q${cx - 8} ${cy - ry + 6} ${cx - 10} ${cy - ry + 40} Q${cx - 16} ${cy - ry + 86} ${cx - 70} ${cy - ry + 88} Q${cx - 146} ${cy - ry + 86} ${cx - 150} ${cy - ry + 40} Z" fill="url(#shades)" stroke="#16161d" stroke-width="10"/>
    <path d="M${cx + 10} ${cy - ry + 40} Q${cx + 8} ${cy - ry + 6} ${cx + 26} ${cy - ry + 2} L${cx + 112} ${cy - ry + 2} Q${cx + 150} ${cy - ry + 4} ${cx + 150} ${cy - ry + 40} Q${cx + 146} ${cy - ry + 86} ${cx + 70} ${cy - ry + 88} Q${cx + 16} ${cy - ry + 86} ${cx + 10} ${cy - ry + 40} Z" fill="url(#shades)" stroke="#16161d" stroke-width="10"/>
    <path d="M${cx - 12} ${cy - ry + 22} Q${cx} ${cy - ry + 10} ${cx + 12} ${cy - ry + 22}" stroke="#16161d" stroke-width="12" fill="none"/>
    <path d="M${cx - 120} ${cy - ry + 20} L${cx - 84} ${cy - ry + 18} L${cx - 118} ${cy - ry + 66} Z" fill="#fff" opacity="0.45"/>
    <path d="M${cx + 40} ${cy - ry + 20} L${cx + 76} ${cy - ry + 18} L${cx + 42} ${cy - ry + 66} Z" fill="#fff" opacity="0.45"/>
  </g>
  ${card({ x: 690, y: 790, r: -18, s: 0.36, rank: 'Q', suit: 'd' })}
  ${card({ x: 752, y: 772, r: 0, s: 0.36, rank: '8', suit: 'c' })}
  ${card({ x: 814, y: 790, r: 18, s: 0.36, rank: '8', suit: 'h' })}
  <ellipse cx="676" cy="872" rx="28" ry="22" fill="url(#mitt)" stroke="#c0600a" stroke-opacity="0.4" stroke-width="4"/>
  <ellipse cx="826" cy="876" rx="26" ry="20" fill="url(#mitt)" stroke="#c0600a" stroke-opacity="0.4" stroke-width="4"/>
  ${sparkle(170, 230, 40, '#fff')}${sparkle(860, 210, 30, '#fff', 0.85)}`,
  `${FACE_DEFS}
 <linearGradient id="leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8f58a"/><stop offset="1" stop-color="#22a04a"/></linearGradient>
 <linearGradient id="leafDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ccf63"/><stop offset="1" stop-color="#11692e"/></linearGradient>
 <linearGradient id="scale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f29a1a"/></linearGradient>
 <radialGradient id="pineShade" cx="0.32" cy="0.25" r="0.85"><stop offset="0.45" stop-color="#a33f00" stop-opacity="0"/><stop offset="1" stop-color="#a33f00" stop-opacity="0.5"/></radialGradient>
 <linearGradient id="shades" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5fa2"/><stop offset="0.5" stop-color="#3a1a5a"/><stop offset="1" stop-color="#0b0b12"/></linearGradient>
 <linearGradient id="mitt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd866"/><stop offset="1" stop-color="#f29a1a"/></linearGradient>`);
}

// Imposter: a police lineup of blank heads, all the same, except one is smiling.
{
  const xs = [190, 397, 627, 834];
  const bust = (x, n, smile) => `<g>
    <ellipse cx="${x + 26}" cy="520" rx="96" ry="104" fill="#000" opacity="0.18"/>
    <path d="M${x - 150} 1060 C${x - 150} 690 ${x - 96} 610 ${x} 610 C${x + 96} 610 ${x + 150} 690 ${x + 150} 1060 Z" fill="url(#torso)" stroke="#2a2d3c" stroke-opacity="0.7" stroke-width="8"/>
    <path d="M${x - 118} 720 C${x - 100} 660 ${x - 60} 632 ${x - 20} 626" stroke="#fff" stroke-opacity="0.3" stroke-width="10" fill="none" stroke-linecap="round"/>
    <rect x="${x - 26}" y="560" width="52" height="70" fill="url(#neck)"/>
    <ellipse cx="${x}" cy="478" rx="92" ry="104" fill="url(#head)" stroke="#2a2d3c" stroke-opacity="0.5" stroke-width="6"/>
    <ellipse cx="${x - 34}" cy="430" rx="26" ry="40" fill="#fff" opacity="0.5" transform="rotate(25 ${x - 34} 430)"/>
    ${smile ? `<path d="M${x - 50} 492 Q${x + 2} 556 ${x + 54} 484" stroke="#1a1d2a" stroke-width="18" fill="none" stroke-linecap="round"/>` : ''}
    <rect x="${x - 72}" y="740" width="144" height="100" rx="12" fill="#000" opacity="0.25" transform="translate(6 10)"/>
    <rect x="${x - 72}" y="740" width="144" height="100" rx="12" fill="url(#plate)"/>
    <text x="${x}" y="814" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="72" fill="#1a1d2a">${n}</text>
  </g>`;
  ICONS.imposter = icon(['#3a4152', '#07080c'], `
  <rect x="40" y="120" width="944" height="904" rx="20" fill="#fff" opacity="0.04"/>
  ${[0, 1, 2, 3, 4, 5, 6].map((k) => `<line x1="40" y1="${180 + k * 76}" x2="984" y2="${180 + k * 76}" stroke="#fff" stroke-opacity="${k % 2 ? 0.1 : 0.2}" stroke-width="${k % 2 ? 4 : 7}"/>`).join('')}
  ${[0, 2, 4, 6].map((k) => `<text x="58" y="${172 + k * 76}" font-family="${FONT}" font-weight="700" font-size="30" fill="#fff" opacity="0.3">${7 - k / 2}</text>`).join('')}
  <path d="M520 0 H700 L860 1024 H360 Z" fill="url(#spot)"/>
  ${xs.map((x, k) => bust(x, k + 1, k === 2)).join('')}
  <rect x="0" y="880" width="1024" height="144" fill="url(#floor)"/>`,
  `<linearGradient id="spot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3f1fa"/><stop offset="1" stop-color="#9c98b4"/></linearGradient>
 <linearGradient id="neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a86a2"/><stop offset="1" stop-color="#b9b5cc"/></linearGradient>
 <linearGradient id="torso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9c5da"/><stop offset="1" stop-color="#6e6a88"/></linearGradient>
 <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e3ee"/></linearGradient>
 <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient>`);
}

// Bean Stalk: a twisting stalk climbing into the clouds, cards for leaves, and a little bean hugging it.
{
  const stalk = 'M520 1080 C380 880 680 760 520 600 C380 470 640 340 520 160';
  const twin = 'M500 1080 C420 900 640 760 540 600 C430 480 600 350 540 160';
  const leaf = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
    <path d="M0 0 C40 -74 150 -76 200 -8 C146 44 52 52 0 0 Z" fill="url(#leafG)"/>
    <path d="M8 -4 C70 -32 128 -32 186 -10" stroke="#0f5a26" stroke-opacity="0.5" stroke-width="6" fill="none"/>
    ${[50, 90, 130].map((v) => `<path d="M${v} -20 L${v + 18} -46 M${v} -20 L${v + 20} 6" stroke="#0f5a26" stroke-opacity="0.3" stroke-width="4"/>`).join('')}
    <path d="M30 -36 C70 -62 120 -62 160 -40" stroke="#fff" stroke-opacity="0.35" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
  const curl = (x, y, r, s = 1) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 0 C30 -10 50 -40 36 -62 C24 -80 -4 -70 2 -50 C6 -38 22 -40 22 -52" fill="none" stroke="#7ee06a" stroke-width="9" stroke-linecap="round"/>`;
  const puff = (pts, shade = '#c9d8ff') => `<g>${pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y + 10}" r="${r}" fill="${shade}"/>`).join('')}${pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#cloud)"/>`).join('')}</g>`;
  ICONS.beanstalk = icon(['#6fd6ff', '#1d7a3a'], `
  ${glow(512, 160, 420, 'whiteGlow', 0.6)}
  ${sparkle(170, 330, 34, '#fff', 0.9)}${sparkle(860, 400, 26, '#fff', 0.8)}
  <path d="${stalk}" fill="none" stroke="#0f5a26" stroke-width="70" stroke-linecap="round"/>
  <path d="${stalk}" fill="none" stroke="url(#stalkG)" stroke-width="54" stroke-linecap="round"/>
  <path d="${twin}" fill="none" stroke="#2f9e44" stroke-width="24" stroke-linecap="round" opacity="0.9"/>
  <path d="M506 1060 C370 880 664 760 506 600 C370 470 626 340 506 180" fill="none" stroke="#d6ffb0" stroke-opacity="0.55" stroke-width="10" stroke-linecap="round"/>
  ${leaf(590, 700, 24)}${leaf(440, 520, -156, 0.9)}${leaf(560, 360, 14, 0.8)}${leaf(470, 880, -170, 0.85)}
  ${curl(620, 800, 20)}${curl(420, 640, -150, 0.9)}${curl(600, 450, 10, 0.8)}
  ${card({ x: 300, y: 780, r: -22, s: 0.32, rank: 'J', suit: 'c', lift: 0.7 })}
  ${card({ x: 760, y: 560, r: 18, s: 0.28, rank: '6', suit: 'd', lift: 0.7 })}
  ${card({ x: 330, y: 400, r: -16, s: 0.24, rank: 'A', suit: 'h', lift: 0.6 })}
  <g transform="translate(560 560) rotate(8)">
    <path d="M-80 -60 C-96 -150 -10 -186 50 -156 C96 -132 80 -84 104 -50 C140 4 110 110 20 118 C-70 126 -100 40 -80 -60 Z" fill="url(#beanG)"/>
    <path d="M-80 -60 C-96 -150 -10 -186 50 -156 C96 -132 80 -84 104 -50 C140 4 110 110 20 118 C-70 126 -100 40 -80 -60 Z" fill="url(#beanShade)"/>
    <ellipse cx="-34" cy="-118" rx="30" ry="14" fill="#fff" opacity="0.6" transform="rotate(-25 -34 -118)"/>
    <path d="M10 -160 C0 -196 20 -214 40 -220" stroke="#2f9e44" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M40 -220 C70 -246 110 -230 112 -206 C88 -196 60 -200 40 -220 Z" fill="url(#leafG)"/>
    <path d="M30 -212 C0 -244 -36 -232 -40 -208 C-16 -198 10 -200 30 -212 Z" fill="url(#leafG)"/>
    ${eyes(-24, 50, -40, { w: 22, h: 30, look: 4 })}
    ${blush(-56, 4, 26, 16)}${blush(84, 4, 26, 16)}
    <path d="M2 10 Q14 30 30 10" stroke="#16301c" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="-92" cy="30" rx="34" ry="24" fill="url(#beanG)" transform="rotate(-30 -92 30)"/>
    <ellipse cx="-76" cy="80" rx="30" ry="22" fill="url(#beanG)" transform="rotate(-10 -76 80)"/>
  </g>
  ${puff([[120, 90, 90], [230, 60, 110], [350, 100, 80], [40, 150, 70]])}
  ${puff([[600, 70, 100], [720, 40, 120], [840, 90, 100], [960, 60, 90], [520, 120, 70]])}`,
  `${FACE_DEFS}
 <linearGradient id="stalkG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8ee86f"/><stop offset="1" stop-color="#2f9e44"/></linearGradient>
 <linearGradient id="leafG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6f79a"/><stop offset="1" stop-color="#2a8f3e"/></linearGradient>
 <linearGradient id="beanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4fba8"/><stop offset="1" stop-color="#5cbf3a"/></linearGradient>
 <radialGradient id="beanShade" cx="0.3" cy="0.25" r="0.9"><stop offset="0.5" stop-color="#1f6a20" stop-opacity="0"/><stop offset="1" stop-color="#1f6a20" stop-opacity="0.45"/></radialGradient>
 <radialGradient id="cloud" cx="0.4" cy="0.3" r="0.7"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6eeff"/></radialGradient>`);
}

// Red River: night, a red moon on the horizon, a glowing river winding toward you, cards drifting on it.
{
  const stars = [[90, 80], [180, 160], [300, 60], [420, 130], [690, 90], [780, 170], [900, 70], [960, 200], [130, 260], [860, 280]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${3 + (i % 3)}" fill="#fff" opacity="${0.4 + (i % 3) * 0.2}"/>`)
    .join('');
  const ripple = (x, y, w, o) => `<path d="M${x - w} ${y} Q${x - w / 2} ${y - w * 0.18} ${x} ${y} T${x + w} ${y}" stroke="#ffd6d6" stroke-width="${Math.max(3, w / 10)}" fill="none" stroke-linecap="round" opacity="${o}"/>`;
  ICONS.redriver = icon(['#3a0a14', '#0a0204'], `
  ${stars}
  <circle cx="600" cy="300" r="240" fill="url(#moonGlow)"/>
  <circle cx="600" cy="300" r="88" fill="url(#moon)"/>
  <circle cx="570" cy="280" r="14" fill="#c8303a" opacity="0.3"/><circle cx="628" cy="322" r="10" fill="#c8303a" opacity="0.3"/><circle cx="600" cy="262" r="6" fill="#c8303a" opacity="0.3"/>
  <path d="M0 360 C120 300 220 320 320 350 C420 300 520 310 600 352 C700 320 820 290 1024 350 V1024 H0 Z" fill="#2a0810"/>
  <path d="M0 380 C160 350 300 380 420 372 C560 360 720 380 1024 372 V1024 H0 Z" fill="url(#land)"/>
  <path d="M500 368 C470 470 650 540 600 660 C550 790 330 870 230 1060 L880 1060 C810 880 740 790 742 660 C744 530 572 470 538 368 Z" fill="url(#rv)"/>
  <path d="M519 380 C510 470 640 540 662 660 C680 780 560 880 540 1060" stroke="#ffc0a8" stroke-opacity="0.25" stroke-width="80" fill="none"/><path d="M519 380 C510 470 640 540 662 660 C680 780 560 880 540 1060" stroke="#ffd6c4" stroke-opacity="0.22" stroke-width="30" fill="none"/>
  ${ripple(520, 430, 14, 0.5)}${ripple(610, 520, 26, 0.5)}${ripple(690, 640, 34, 0.5)}${ripple(400, 900, 50, 0.6)}${ripple(700, 960, 60, 0.6)}${ripple(560, 1000, 40, 0.4)}
  
  <ellipse cx="522" cy="430" rx="30" ry="6" fill="#ffe0e0" opacity="0.35"/>
  ${card({ x: 522, y: 405, r: 4, s: 0.12, rank: '3', suit: 'h', lift: 0.3 })}
  <ellipse cx="640" cy="610" rx="70" ry="12" fill="#ffe0e0" opacity="0.3"/>
  ${card({ x: 636, y: 560, r: 12, s: 0.24, rank: '9', suit: 'd', lift: 0.4 })}
    <ellipse cx="490" cy="935" rx="230" ry="44" fill="none" stroke="#ffd6d6" stroke-opacity="0.45" stroke-width="6"/>
  ${card({ x: 480, y: 780, r: -12, s: 0.58, rank: '7', suit: 'h', lift: 0.9 })}
  ${sparkle(380, 700, 18, '#ffd6d6', 0.8)}${sparkle(720, 840, 24, '#fff', 0.8)}`,
  `<radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff5a4a" stop-opacity="0.75"/><stop offset="1" stop-color="#ff4a4a" stop-opacity="0"/></radialGradient>
 <radialGradient id="moon" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#ffb08a"/><stop offset="1" stop-color="#e2343c"/></radialGradient>
 <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a0c16"/><stop offset="1" stop-color="#16030a"/></linearGradient>
 <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3a0"/><stop offset="0.25" stop-color="#ff4b4b"/><stop offset="1" stop-color="#b8121b"/></linearGradient>
 <radialGradient id="rock" cx="0.4" cy="0.3" r="0.7"><stop offset="0" stop-color="#4a1a22"/><stop offset="1" stop-color="#140408"/></radialGradient>`);
}

// Short Stack: three detailed chips in a short pile, two tall stacks behind it in the dark.
{
  /** One chip seen from the side, top centre at (x, y): edge inserts that follow the curve, a lit top with an inlay. */
  function chipSide(x, y, [c0, c1], { rx = 200, ry = 62, t = 50, r = 0, emblem = false } = {}) {
    const g = id('cs');
    const inserts = [];
    for (let k = 0; k < 6; k++) {
      const a0 = (Math.PI * (k + 0.15)) / 6;
      const a1 = (Math.PI * (k + 0.55)) / 6;
      const x0 = rx * Math.cos(a0);
      const x1 = rx * Math.cos(a1);
      const y0 = ry * Math.sin(a0);
      const y1 = ry * Math.sin(a1);
      inserts.push(`<path d="M${x0} ${y0} L${x1} ${y1} L${x1} ${y1 + t} L${x0} ${y0 + t} Z" fill="#fff" opacity="0.92"/>`);
    }
    const topInserts = Array.from({ length: 12 }, (_, k) => {
      const a = (Math.PI * 2 * k) / 12;
      return `<ellipse cx="${rx * 0.86 * Math.cos(a)}" cy="${ry * 0.86 * Math.sin(a)}" rx="${rx * 0.07}" ry="${ry * 0.12}" fill="#fff" opacity="0.9"/>`;
    }).join('');
    return `<g transform="translate(${x} ${y}) rotate(${r})">
      <linearGradient id="${g}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="0.35" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>
      <radialGradient id="${g}t" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></radialGradient>
      <path d="M${-rx} 0 V${t} A${rx} ${ry} 0 0 0 ${rx} ${t} V0 A${rx} ${ry} 0 0 1 ${-rx} 0 Z" fill="url(#${g}s)"/>
      ${inserts.join('')}
      <path d="M${-rx} ${t} A${rx} ${ry} 0 0 0 ${rx} ${t}" stroke="#000" stroke-opacity="0.25" stroke-width="4" fill="none"/>
      <ellipse rx="${rx}" ry="${ry}" fill="url(#${g}t)"/>
      ${topInserts}
      <ellipse rx="${rx * 0.62}" ry="${ry * 0.62}" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="5" stroke-dasharray="14 10"/>
      <ellipse rx="${rx * 0.5}" ry="${ry * 0.5}" fill="url(#${g}t)" stroke="#000" stroke-opacity="0.15" stroke-width="3"/>
      ${emblem ? `<use href="#s-s" x="${-rx * 0.22}" y="${-ry * 0.36}" width="${rx * 0.44}" height="${ry * 0.72}" fill="#fff" opacity="0.9"/>` : ''}
      <path d="M${-rx * 0.8} ${-ry * 0.35} Q${-rx * 0.3} ${-ry * 0.95} ${rx * 0.3} ${-ry * 0.9}" stroke="#fff" stroke-opacity="0.45" stroke-width="7" fill="none" stroke-linecap="round"/>
    </g>`;
  }
  const VIO = ['#a48cff', '#4a26d9'];
  const GLD = ['#ffe28a', '#d18e00'];
  const tall = (x, n) => Array.from({ length: n }, (_, k) => chipSide(x, 600 - k * 42, k % 3 === 1 ? ['#8a7240', '#4a3a14'] : ['#5a48b0', '#26166a'], { rx: 130, ry: 40, t: 40 })).join('');
  ICONS.shortStack = icon(['#8263ff', '#2a1290'], `
  ${glow(512, 640, 420, 'whiteGlow', 0.35)}
  ${shadow(230, 640, 170, 30, 0.6)}${shadow(800, 620, 170, 30, 0.6)}
  ${tall(230, 9)}${tall(800, 11)}
  <rect width="1024" height="1024" fill="url(#fog)"/>
  ${shadow(512, 900, 320, 56)}
  ${chipSide(512, 790, VIO)}
  ${chipSide(500, 736, GLD)}
  ${chipSide(520, 682, VIO, { emblem: true })}
  ${sparkle(300, 280, 30, '#ffe28a')}${sparkle(720, 220, 22, '#fff', 0.8)}`,
  `<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1290" stop-opacity="0.15"/><stop offset="1" stop-color="#2a1290" stop-opacity="0.45"/></linearGradient>`);
}


mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(ICONS)) writeFileSync(join(OUT, `${name}.svg`), svg);
console.log(`Wrote ${Object.keys(ICONS).length} icons to ${OUT}`);
