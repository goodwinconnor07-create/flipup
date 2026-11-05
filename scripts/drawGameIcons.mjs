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

ICONS.pineapple = icon(['#ffc24a', '#e2570f'], `
  ${glow(470, 480, 420, 'whiteGlow', 0.5)}
  ${shadow(512, 905, 320, 50)}
  <g transform="translate(470 360)">
    ${[-44, -22, 0, 22, 44].map((a, i) => `<path transform="rotate(${a}) scale(${i === 2 ? 1.12 : 1})" d="M0 20 C-46 -50 -36 -170 0 -240 C36 -170 46 -50 0 20 Z" fill="url(#leaf)" stroke="#156b2c" stroke-opacity="0.35" stroke-width="5"/>`).join('')}
  </g>
  <g transform="translate(-30 0)"><clipPath id="pBody"><ellipse cx="500" cy="600" rx="215" ry="260"/></clipPath>
  <ellipse cx="500" cy="600" rx="215" ry="260" fill="url(#pine)"/>
  <g clip-path="url(#pBody)" stroke="#b9560a" stroke-opacity="0.4" stroke-width="9">
    ${Array.from({ length: 12 }, (_, i) => `<line x1="${120 + i * 70}" y1="300" x2="${120 + i * 70 - 600}" y2="900"/><line x1="${-120 + i * 70}" y1="300" x2="${-120 + i * 70 + 600}" y2="900"/>`).join('')}
  </g>
  <ellipse cx="500" cy="600" rx="215" ry="260" fill="url(#pineShade)"/>
  <ellipse cx="400" cy="440" rx="50" ry="90" fill="#fff" opacity="0.4" transform="rotate(28 400 440)"/>
  <ellipse cx="400" cy="640" rx="40" ry="24" fill="#ff7a59" opacity="0.55"/><ellipse cx="610" cy="640" rx="40" ry="24" fill="#ff7a59" opacity="0.55"/>
  <g>
    <path d="M360 548 Q365 515 400 512 L460 512 Q492 515 492 548 Q490 600 440 604 L412 604 Q362 600 360 548 Z" fill="url(#lens)"/>
    <path d="M512 548 Q512 515 545 512 L605 512 Q640 515 642 548 Q640 600 590 604 L562 604 Q514 600 512 548 Z" fill="url(#lens)"/>
    <path d="M488 530 Q502 518 516 530" stroke="#16161d" stroke-width="14" fill="none"/>
    <path d="M335 528 L362 535 M642 535 L668 528" stroke="#16161d" stroke-width="14" stroke-linecap="round"/>
    <path d="M385 530 L420 528 L392 575 Z" fill="#fff" opacity="0.35"/><path d="M537 530 L572 528 L544 575 Z" fill="#fff" opacity="0.35"/>
  </g>
  <path d="M452 668 Q505 720 560 664" fill="none" stroke="#7a3205" stroke-width="16" stroke-linecap="round"/>
  </g>
  ${card({ x: 660, y: 800, r: -18, s: 0.4, rank: 'Q', suit: 'd' })}
  ${card({ x: 735, y: 785, r: 0, s: 0.4, rank: '8', suit: 'c' })}
  ${card({ x: 810, y: 800, r: 18, s: 0.4, rank: '8', suit: 'h' })}`,
`<linearGradient id="leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9af07a"/><stop offset="1" stop-color="#1f9a45"/></linearGradient>
 <linearGradient id="pine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#f39a1b"/></linearGradient>
 <linearGradient id="pineShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0.5" stop-color="#b34a00" stop-opacity="0"/><stop offset="1" stop-color="#b34a00" stop-opacity="0.35"/></linearGradient>
 <linearGradient id="lens" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a4a"/><stop offset="1" stop-color="#0b0b12"/></linearGradient>`);

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

ICONS.redriver = icon(['#7a1420', '#120205'], `
  <rect x="0" y="250" width="1024" height="780" fill="url(#ground)"/>
  ${glow(520, 330, 380, 'redGlow', 1)}
  <path d="M500 330 C470 450 640 520 590 650 C540 780 330 860 250 1060 L860 1060 C800 880 720 780 730 650 C740 520 570 450 540 330 Z" fill="url(#rv)"/>
  <g fill="none" stroke="#ffd6d6" stroke-linecap="round" opacity="0.6">
    <path d="M520 420 q14 -6 28 0" stroke-width="4"/><path d="M600 560 q24 -10 48 0" stroke-width="6"/>
    <path d="M640 700 q34 -12 68 0" stroke-width="8"/><path d="M380 900 q50 -18 100 0" stroke-width="10"/><path d="M640 960 q50 -18 100 0" stroke-width="10"/>
  </g>
  ${card({ x: 522, y: 385, r: 4, s: 0.14, rank: '3', suit: 'h', lift: 0.4 })}
  ${card({ x: 625, y: 560, r: 12, s: 0.26, rank: '9', suit: 'd', lift: 0.6 })}
  ${shadow(500, 900, 250, 40, 0.8)}
  ${card({ x: 480, y: 790, r: -12, s: 0.6, rank: '7', suit: 'h', lift: 1.2 })}`,
`<linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3b3"/><stop offset="0.35" stop-color="#ff4b4b"/><stop offset="1" stop-color="#c41616"/></linearGradient>
 <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.12" stop-color="#000" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>
 <radialGradient id="redGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff6b6b" stop-opacity="0.7"/><stop offset="1" stop-color="#ff6b6b" stop-opacity="0"/></radialGradient>`);

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

ICONS.beanstalk = icon(['#5cc761', '#0e3d20'], `
  ${glow(512, 300, 380, 'whiteGlow', 0.45)}
  <path d="M520 1080 C380 880 680 760 520 600 C380 470 640 340 520 200" fill="none" stroke="#0f5a26" stroke-width="64" stroke-linecap="round"/>
  <path d="M520 1080 C380 880 680 760 520 600 C380 470 640 340 520 200" fill="none" stroke="url(#stalk)" stroke-width="48" stroke-linecap="round"/>
  <path d="M506 1060 C370 880 664 760 506 600 C370 470 626 340 506 210" fill="none" stroke="#c8ff9e" stroke-opacity="0.5" stroke-width="10" stroke-linecap="round"/>
  <path d="M520 205 C540 150 620 150 615 205 C610 245 560 240 565 210" fill="none" stroke="url(#stalk)" stroke-width="18" stroke-linecap="round"/>
  ${[[600, 690, 30], [420, 480, -150], [585, 340, 20]].map(([x, y, r]) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 0 C40 -70 140 -70 190 -10 C140 40 50 50 0 0 Z" fill="url(#leaf)"/><path transform="translate(${x} ${y}) rotate(${r})" d="M10 -4 C70 -30 120 -30 175 -12" stroke="#0f5a26" stroke-opacity="0.45" stroke-width="6" fill="none"/>`).join('')}
  ${card({ x: 300, y: 760, r: -22, s: 0.34, rank: 'J', suit: 'c', lift: 0.7 })}
  ${card({ x: 735, y: 520, r: 18, s: 0.3, rank: '6', suit: 'd', lift: 0.7 })}
  ${card({ x: 335, y: 330, r: -16, s: 0.26, rank: 'A', suit: 'h', lift: 0.6 })}
  <g transform="translate(560 150) rotate(-10)">
    <path d="M-70 10 C-80 -50 -20 -80 20 -60 C50 -46 40 -20 70 -10 C100 2 90 60 30 66 C-30 72 -62 50 -70 10 Z" fill="url(#bean)"/>
    <ellipse cx="-30" cy="-40" rx="20" ry="10" fill="#fff" opacity="0.55" transform="rotate(-20 -30 -40)"/>
    <circle cx="-14" cy="6" r="10" fill="#16301c"/><circle cx="34" cy="10" r="10" fill="#16301c"/>
    <circle cx="-17" cy="2" r="3.5" fill="#fff"/><circle cx="31" cy="6" r="3.5" fill="#fff"/>
    <path d="M-2 28 Q10 40 24 28" fill="none" stroke="#16301c" stroke-width="7" stroke-linecap="round"/>
  </g>`,
`<linearGradient id="stalk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7ee06a"/><stop offset="1" stop-color="#2f9e44"/></linearGradient>
 <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a6f28a"/><stop offset="1" stop-color="#2a8f3e"/></linearGradient>
 <linearGradient id="bean" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c6f59a"/><stop offset="1" stop-color="#5cbf3a"/></linearGradient>`);

ICONS.bjholdem = icon(['#16855a', '#041d12'], `
  ${shadow(500, 860, 330, 56)}
  ${card({ x: 360, y: 490, r: -14, rank: 'K', suit: 's' })}
  ${card({ x: 620, y: 540, r: 9, rank: 'A', suit: 'd', lift: 1.4 })}
  ${chip({ x: 760, y: 790, r: 150, base: ['#ffe28a', '#e09a00'], edge: '#fff7d6', ink: '#5a3a00', text: '21' })}`);

ICONS.imposter = icon(['#3a4152', '#07080c'], `
  <path d="M430 0 H594 L860 1024 H164 Z" fill="url(#spot)"/>
  ${shadow(512, 1000, 320, 50)}
  <path d="M320 600 C320 420 400 320 512 320 C624 320 704 420 704 600 L704 1060 L320 1060 Z" fill="url(#skin)"/>
  <path d="M290 760 Q512 720 734 760 L780 1060 L244 1060 Z" fill="url(#coat)"/>
  <path d="M300 690 L470 790 L400 940 Z" fill="#a8783c"/><path d="M724 690 L554 790 L624 940 Z" fill="#a8783c"/>
  <line x1="512" y1="800" x2="512" y2="1060" stroke="#7d5526" stroke-width="8"/>
  <ellipse cx="452" cy="500" rx="44" ry="36" fill="#fff"/><ellipse cx="580" cy="500" rx="44" ry="36" fill="#fff"/>
  <circle cx="430" cy="506" r="19" fill="#141724"/><circle cx="558" cy="506" r="19" fill="#141724"/>
  <circle cx="424" cy="500" r="6" fill="#fff"/><circle cx="552" cy="500" r="6" fill="#fff"/>
  <path d="M400 452 L498 470 M538 470 L632 446" stroke="#2a2e3c" stroke-width="18" stroke-linecap="round"/>
  <g transform="rotate(-6 512 360)">
    <path d="M370 380 C370 260 400 210 512 210 C624 210 654 260 654 380 Z" fill="url(#hat)"/>
    <path d="M440 222 Q512 260 584 222" stroke="#000" stroke-opacity="0.35" stroke-width="12" fill="none"/>
    <rect x="370" y="330" width="284" height="44" fill="#7a2232"/>
    <ellipse cx="512" cy="382" rx="270" ry="50" fill="url(#hat)"/>
    <ellipse cx="460" cy="370" rx="150" ry="14" fill="#fff" opacity="0.12"/>
  </g>
  ${back({ x: 560, y: 690, r: -10, s: 0.5, lift: 1.2, mark: `<text y="70" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="230" fill="url(#gold)">?</text>` })}
  <ellipse cx="455" cy="760" rx="56" ry="42" fill="#c99a57" transform="rotate(-30 455 760)"/>`,
`<linearGradient id="spot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2e6f2"/><stop offset="1" stop-color="#8d95ad"/></linearGradient>
 <linearGradient id="coat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6ac68"/><stop offset="1" stop-color="#8f6630"/></linearGradient>
 <linearGradient id="hat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f4f"/><stop offset="1" stop-color="#14161e"/></linearGradient>`);

// ----- Solo cards: the three challenges and Range training (colours from CHALLENGE_LOOK in challengeArt.ts) -----

/** A chip seen from the side, its top at (x, y). */
function sideChip(x, y, base, r = 0) {
  const g = id('sc');
  const rx = 210;
  const ry = 66;
  const t = 52;
  const stripes = [-170, -80, 10, 100, 180].map((sx) => `<rect x="${sx}" y="0" width="34" height="${t + ry}" fill="#fff" opacity="0.85"/>`).join('');
  return `<g transform="translate(${x} ${y}) rotate(${r})">
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></linearGradient>
    <path d="M${-rx} 0 V${t} A${rx} ${ry} 0 0 0 ${rx} ${t} V0 Z" fill="url(#${g})"/>
    <clipPath id="${g}c"><path d="M${-rx} 0 V${t} A${rx} ${ry} 0 0 0 ${rx} ${t} V0 Z"/></clipPath>
    <g clip-path="url(#${g}c)">${stripes}</g>
    <ellipse rx="${rx}" ry="${ry}" fill="${base[0]}"/>
    <ellipse rx="${rx * 0.66}" ry="${ry * 0.66}" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="8" stroke-dasharray="26 18"/>
    <ellipse cx="-60" cy="-22" rx="80" ry="14" fill="#fff" opacity="0.3"/>
  </g>`;
}

const VIOLET = ['#9b84ff', '#5a35f0'];
const GOLDC = ['#ffe28a', '#e0a100'];
const WHITE = ['#ffffff', '#cfc8ea'];

ICONS.shortStack = icon(['#8263ff', '#2a1290'], `
  ${glow(512, 560, 420, 'whiteGlow', 0.35)}
  ${shadow(500, 860, 320, 60)}
  ${sideChip(500, 760, VIOLET)}
  ${sideChip(492, 708, GOLDC)}
  ${sideChip(506, 656, VIOLET)}
  ${sideChip(560, 560, GOLDC, 16)}
  ${sparkle(800, 300, 40, '#ffe28a')}${sparkle(230, 330, 26, '#fff', 0.8)}`);

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

mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(ICONS)) writeFileSync(join(OUT, `${name}.svg`), svg);
console.log(`Wrote ${Object.keys(ICONS).length} icons to ${OUT}`);
