// How each game looks outside the table, shared by the web app and the iPhone app: its colours, a line that sets
// the mood, and its picture.
//
// The pictures are one drawn system ("stickers"): a flat colour field, one bold subject, every shape with the same
// dark outline and a hard flat shadow. No gradients, glows, blurs or captions inside a picture: the game's name goes
// on the band under it (see `band`). A picture is a list of shapes; `prims()` turns the list into plain paths and
// text that the web (src/ui/GameIllustrations.tsx) and the app (native/src/components/game-picture.tsx) draw the
// same way. Suits are paths, never font glyphs, so they look the same on every phone.
import { CIRCLE_HOURS, type Variant } from '../game/variants';

export interface GameLook {
  /** The picture's flat field colour, as a pair (the web's CSS reads it as a gradient; both stops are the same). */
  card: readonly [string, string];
  /** The name band under the picture: a darker shade of the field. */
  band: string;
  /** The soft spot and scattered suits behind the subject: a lighter shade of the field. */
  tone: string;
  /** A line that sets the mood. Shown on the game's start sheet. */
  mood: string;
  /** Two or three words under the game's name on Home: why it's fun. */
  hook: string;
  /** Table sounds are pitched by this (1 is normal): low and heavy for the ghost, bright for the pineapple. */
  pitch: number;
}

const look = (field: string, band: string, tone: string, mood: string, hook: string, pitch: number): GameLook => ({ card: [field, field], band, tone, mood, hook, pitch });

export const GAME_LOOK: Record<Variant, GameLook> = {
  holdem: look('#1fa463', '#137347', '#35b877', 'The classic. Your felt, your rules.', 'The classic', 1),
  pineapple: look('#19b3a6', '#0f7d76', '#33c4b8', 'Sunny, juicy and a bit silly.', 'Throw one away', 1.12),
  deuces: look('#ef4a93', '#b32a6a', '#f46aa8', 'Wild cards, loud colours.', 'Every 2 is wild', 1.2),
  ghost: look('#4b4fa6', '#30337a', '#6064b8', 'Cold air. Something is watching the pot.', 'Beat the ghost', 0.82),
  pittsburgh: look('#53708f', '#374f69', '#6885a3', 'Steel, rivers and a bridge in the dark.', 'Three rivers', 0.94),
  dice: look('#f5871f', '#c05f0c', '#f89c44', 'Craps table energy. Everything is one roll from changing.', 'A die swaps a card', 1),
  redriver: look('#e8414f', '#ad2331', '#ee5f6b', 'The river runs red. Keep going until it stops.', 'Red keeps dealing', 0.9),
  crucifix: look('#7b57c9', '#553a96', '#8f6fd4', 'Five cards in a cross. Read the arms.', 'Read the cross', 0.92),
  circle: look('#2f7de0', '#1f58a6', '#4c91e6', 'Six cards round a clock. Hours matter.', 'Round the clock', 1.05),
  memory: look('#5b63e6', '#3c42ad', '#737aec', 'Twenty cards gone. Do you remember which?', 'Remember the 20', 1.08),
  beanstalk: look('#4db5ee', '#2b83b8', '#6ac3f2', 'Your hand keeps growing. How high can it climb?', 'Your hand grows', 1.1),
  bjholdem: look('#2a2e3d', '#191c27', '#3a3f52', 'Hit or stand. Half for the best hand, half for 21.', 'Hit, then bet', 0.97),
  imposter: look('#6a5f8f', '#4a4169', '#7f74a3', 'Trust nobody. Watch the bets.', 'Find the imposter', 0.88),
  power: look('#d99a00', '#9e6f00', '#e8b02a', 'Everyone has a secret power. Pick your moment.', 'Secret powers', 1.08),
  missions: look('#1f7a5c', '#13513d', '#2f9273', 'Your mission, should you choose to accept it.', 'Secret missions', 0.94),
  slide: look('#74b72e', '#4f8a1c', '#8cc84b', 'Nothing stays yours for long. Pass it on.', 'Slide a card left', 1.06),
  headband: look('#a447d6', '#7a2ca6', '#b566df', 'Everyone knows your card. Except you.', 'A card on your head', 1.04),
  belt: look('#7a8699', '#56606f', '#8d98aa', 'One card in, one card off. Keep up.', 'The board moves', 0.95),
  onion: look('#b5648f', '#87436a', '#c47ca2', 'Peel it back, one layer at a time.', 'Peel a card a street', 1),
  chain: look('#c2533a', '#8f3524', '#cf6b54', 'Every card links to the last. Watch it snowball.', 'A linked board', 0.96),
  elevator: look('#b08d57', '#80643a', '#c0a06f', 'Going up. Every card climbs a floor.', 'The board climbs', 1.08),
  plo: look('#8c2f4a', '#621f33', '#a04663', 'Five cards, two boards, two halves of every pot.', 'Two boards, five cards', 0.92),
};

export const gameLook = (v: Variant): GameLook => GAME_LOOK[v] ?? GAME_LOOK.holdem;

/** The deck's four colours: spades black, hearts red, diamonds blue, clubs green. */
export const SUIT_COLOUR: Record<string, string> = { '♠': '#16161d', '♥': '#e5322d', '♦': '#2563eb', '♣': '#16a34a' };
export const GLOW = '#ffc933';
/** The outline every shape in a picture shares, and how thick it is on the 100-wide square. */
export const INK = '#14141c';
export const OUTLINE = 3;
const WHITE = '#ffffff';
const BACK = '#2b5fe3';

/** A playing card centred on (x, y), tilted `r` degrees, scaled `s`. `deal` is its place in the dealing order. */
export interface CardShape {
  kind: 'card';
  x: number;
  y: number;
  r?: number;
  s?: number;
  rank?: string;
  suit?: string;
  back?: boolean;
  /** The back's colour (the deck's blue when left out). */
  backFill?: string;
  /** A gold frame: the card that matters. */
  glow?: boolean;
  faded?: boolean;
  /** A small card: one big suit, no rank. */
  mini?: boolean;
  deal?: number;
}
/** The big faded suit behind a picture, cropped by the edge. Only the solo cards still use it. */
export interface MarkShape {
  kind: 'mark';
  suit: string;
  x: number;
  y: number;
  size: number;
}
export interface DieShape {
  kind: 'die';
  x: number;
  y: number;
  r: number;
  pips: 1 | 2 | 3 | 4 | 5 | 6;
  s?: number;
}
/** White capitals across a picture. Only the solo cards still use it: a game's name goes on its band. */
export interface LabelShape {
  kind: 'label';
  x: number;
  y: number;
  text: string;
}
/** A letter or number laid over the shapes (the 21 on Hit Me's chip). */
export interface GlyphShape {
  kind: 'glyph';
  x: number;
  y: number;
  text: string;
  size: number;
  bold?: boolean;
  ink?: string;
}
/** Any drawn shape. With `fill` and no `stroke` it gets the shared outline; `flat` leaves the outline off. */
export interface PathShape {
  kind: 'path';
  d: string;
  fill?: string;
  stroke?: string;
  sw?: number;
  flat?: boolean;
  opacity?: number;
  dash?: string;
  /** An SVG transform. */
  t?: string;
  /** Leave the hard shadow off (small details drawn on top of another shape). */
  noShadow?: boolean;
}
/** Shapes moved, turned or scaled together. */
export interface GroupShape {
  kind: 'group';
  t: string;
  shapes: Shape[];
}
export type Shape = CardShape | MarkShape | DieShape | LabelShape | GlyphShape | PathShape | GroupShape;

/** What the renderers draw: paths, text and groups, nothing else. */
export type Prim =
  | { tag: 'path'; d: string; fill: string; stroke?: string; sw?: number; opacity?: number; dash?: string; t?: string }
  | { tag: 'text'; x: number; y: number; text: string; size: number; weight: number; fill: string; anchor: 'start' | 'middle'; opacity?: number; spacing?: number }
  | { tag: 'g'; t?: string; opacity?: number; deal?: number; roll?: boolean; kids: Prim[] };

/** Where the dots sit on each face of a die, around its centre. */
export const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-7, -7], [7, 7]],
  3: [[-8, -8], [0, 0], [8, 8]],
  4: [[-7, -7], [7, -7], [-7, 7], [7, 7]],
  5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]],
  6: [[-7, -9], [7, -9], [-7, 0], [7, 0], [-7, 9], [7, 9]],
};

// ── Geometry ────────────────────────────────────────────────────────────────

const n = (v: number) => Math.round(v * 100) / 100;
/** A rounded rectangle as a path. */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  return `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${n(h - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${r}h${n(-(w - 2 * r))}a${r} ${r} 0 0 1 ${-r} ${-r}v${n(-(h - 2 * r))}a${r} ${r} 0 0 1 ${r} ${-r}z`;
}
export function oval(cx: number, cy: number, rx: number, ry = rx): string {
  return `M${n(cx - rx)} ${n(cy)}a${rx} ${ry} 0 1 0 ${n(rx * 2)} 0a${rx} ${ry} 0 1 0 ${n(-rx * 2)} 0z`;
}

/** The four suits as paths about (0, 0), each about 20 tall. */
export const SUIT_PATH: Record<string, string> = {
  '♥': 'M0 9.5C-13 0-11.5-9.5-5.5-9.5C-2.6-9.5-.6-7.6 0-5.4C.6-7.6 2.6-9.5 5.5-9.5C11.5-9.5 13 0 0 9.5Z',
  '♦': 'M0-10.5L8.2 0L0 10.5L-8.2 0Z',
  '♠': 'M0-10.5C9.5-2 10.5 1 10.5 3.4C10.5 7.4 5.6 8.6 1.9 5.4C2.3 7.6 3.2 9 4.6 10.5H-4.6C-3.2 9-2.3 7.6-1.9 5.4C-5.6 8.6-10.5 7.4-10.5 3.4C-10.5 1-9.5-2 0-10.5Z',
  '♣': `${oval(0, -5.3, 4.9)}${oval(-5.4, 1.9, 4.9)}${oval(5.4, 1.9, 4.9)}M1.6 0H-1.6C-1.7 5-2.6 8-4.6 10.5H4.6C2.6 8 1.7 5 1.6 0Z`,
};

// ── Shapes to primitives ────────────────────────────────────────────────────

const SHADOW = 0.24;

function cardPrims({ x, y, r = 0, rank = '', suit = '♠', s = 1, back, backFill = BACK, glow, faded, mini, deal }: CardShape): Prim {
  const colour = SUIT_COLOUR[suit] ?? SUIT_COLOUR['♠'];
  const sw = OUTLINE / s;
  const body = rr(-21, -30, 42, 60, 6.5);
  const kids: Prim[] = [{ tag: 'path', d: body, fill: INK, opacity: SHADOW, t: `translate(0 ${n(3.4 / s)})` }];
  if (back) {
    kids.push({ tag: 'path', d: body, fill: backFill, stroke: INK, sw });
    kids.push({ tag: 'path', d: rr(-14, -23, 28, 46, 3.5), fill: 'none', stroke: WHITE, sw: 2.4, opacity: 0.6 });
    kids.push({ tag: 'path', d: SUIT_PATH['♦'], fill: WHITE, opacity: 0.6, t: 'scale(0.9)' });
  } else {
    kids.push({ tag: 'path', d: body, fill: WHITE, stroke: INK, sw });
    if (glow) kids.push({ tag: 'path', d: rr(-21 + sw / 2 + 1.6, -30 + sw / 2 + 1.6, 42 - sw - 3.2, 60 - sw - 3.2, 4.6), fill: 'none', stroke: GLOW, sw: 3.2 });
    if (mini) kids.push({ tag: 'path', d: SUIT_PATH[suit] ?? SUIT_PATH['♠'], fill: colour, t: 'translate(0 1) scale(1.75)' });
    else {
      kids.push({ tag: 'text', x: rank.length > 1 ? -17 : -15.5, y: -9.5, text: rank, size: 19, weight: 900, fill: colour, anchor: 'start', spacing: rank.length > 1 ? -1.5 : 0 });
      kids.push({ tag: 'path', d: SUIT_PATH[suit] ?? SUIT_PATH['♠'], fill: colour, t: 'translate(3.5 11) scale(1.42)' });
    }
  }
  return { tag: 'g', t: `translate(${x} ${y}) rotate(${r}) scale(${s})`, opacity: faded ? 0.5 : undefined, deal, kids };
}

function diePrims({ x, y, r, pips, s = 1 }: DieShape): Prim {
  const body = rr(-19, -19, 38, 38, 8.5);
  return {
    tag: 'g',
    roll: true,
    t: `translate(${x} ${y}) rotate(${r}) scale(${s})`,
    kids: [
      { tag: 'path', d: body, fill: INK, opacity: SHADOW, t: `translate(0 ${n(3.4 / s)})` },
      { tag: 'path', d: body, fill: WHITE, stroke: INK, sw: OUTLINE / s },
      ...PIPS[pips].map(([px, py]): Prim => ({ tag: 'path', d: oval(px, py, 3.7), fill: SUIT_COLOUR['♥'] })),
    ],
  };
}

function pathPrims(p: PathShape): Prim[] {
  const outlined = !p.flat && !p.stroke && p.fill !== undefined && p.fill !== 'none';
  const main: Prim = { tag: 'path', d: p.d, fill: p.fill ?? 'none', stroke: p.stroke ?? (outlined ? INK : undefined), sw: p.sw ?? (outlined ? OUTLINE : undefined), opacity: p.opacity, dash: p.dash, t: p.t };
  if (!outlined || p.noShadow) return [main];
  return [{ tag: 'path', d: p.d, fill: INK, stroke: INK, sw: p.sw ?? OUTLINE, opacity: SHADOW, t: `translate(0 3.4)${p.t ? ` ${p.t}` : ''}` }, main];
}

/** A list of shapes as the plain paths, text and groups the renderers draw, back to front. */
export function prims(shapes: Shape[]): Prim[] {
  return shapes.flatMap((shape): Prim[] => {
    switch (shape.kind) {
      case 'card':
        return [cardPrims(shape)];
      case 'die':
        return [diePrims(shape)];
      case 'path':
        return pathPrims(shape);
      case 'group':
        return [{ tag: 'g', t: shape.t, kids: prims(shape.shapes) }];
      case 'mark':
        return [{ tag: 'path', d: SUIT_PATH[shape.suit] ?? SUIT_PATH['♠'], fill: WHITE, opacity: 0.12, t: `translate(${shape.x} ${n(shape.y - shape.size * 0.36)}) scale(${n(shape.size / 22)})` }];
      case 'label':
        return [{ tag: 'text', x: shape.x, y: shape.y, text: shape.text, size: 11, weight: 800, fill: WHITE, anchor: 'middle', spacing: 1.5 }];
      case 'glyph':
        return [{ tag: 'text', x: shape.x, y: shape.y, text: shape.text, size: shape.size, weight: shape.bold ? 900 : 400, fill: shape.ink ?? INK, anchor: 'middle' }];
    }
  });
}

// ── The pictures ────────────────────────────────────────────────────────────

const card = (c: Omit<CardShape, 'kind'>): CardShape => ({ kind: 'card', ...c });
/** An outlined shape. */
const ink = (d: string, fill: string, more: Partial<PathShape> = {}): PathShape => ({ kind: 'path', d, fill, ...more });
/** A shape with no outline: a detail drawn on top of an outlined one. */
const flat = (d: string, fill: string, more: Partial<PathShape> = {}): PathShape => ({ kind: 'path', d, fill, flat: true, ...more });
/** A line of colour `c` and width `w` with the outline round it. */
const line = (d: string, c: string, w: number): PathShape[] => [
  { kind: 'path', d, stroke: INK, sw: w + OUTLINE * 1.6, opacity: SHADOW, t: 'translate(0 3.4)' },
  { kind: 'path', d, stroke: INK, sw: w + OUTLINE * 1.6 },
  { kind: 'path', d, stroke: c, sw: w },
];
/** A four-point sparkle. */
const sparkle = (x: number, y: number, r: number, fill = GLOW): PathShape => {
  const k = r * 0.3;
  return ink(`M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z`, fill, { noShadow: true });
};
/** A leaf growing from (x, y) at `deg` (0 points right). */
const leaf = (x: number, y: number, deg: number, len: number, fill: string): PathShape[] => [
  ink(`M0 0C${n(len * 0.25)} ${n(-len * 0.5)} ${n(len * 0.8)} ${n(-len * 0.42)} ${len} 0C${n(len * 0.8)} ${n(len * 0.42)} ${n(len * 0.25)} ${n(len * 0.5)} 0 0Z`, fill, { t: `translate(${x} ${y}) rotate(${deg})` }),
  { kind: 'path', d: `M${n(len * 0.18)} 0H${n(len * 0.72)}`, stroke: INK, sw: 1.8, opacity: 0.55, t: `translate(${x} ${y}) rotate(${deg})` },
];
/** A row of waves running well past both edges (the wide picture shows more of it), crests at `y`, filled down to the bottom of the square. */
const waves = (y: number, fill: string, shift = 0): PathShape => {
  let d = `M${-80 + shift} ${y}`;
  for (let x = -80 + shift; x < 190; x += 20) d += `q5 -7 10 0t10 0`;
  return ink(`${d}V130H${-80 + shift}Z`, fill, { noShadow: true });
};

const GREEN = '#2fb457';
const GREEN_DARK = '#1f8a41';
const RED = SUIT_COLOUR['♥'];
/** Power Cards' own card: the game's midnight felt, framed in its electric rail (tableThemes.power in tokens.ts). */
const POWER_CARD = '#1b2556';
const POWER_FRAME = '#3ee0ff';
/** Secret Missions' own card: the game's green felt, a shade lighter so it reads on the green field, in its gold rail (tableThemes.missions). */
const MISSION_CARD = '#174a3a';
const MISSION_FRAME = '#d4a94e';

/** Each game's subject on a 100 × 100 square, back to front. It keeps clear of the bottom 6 (the band overlaps it). */
const SUBJECTS: Record<Variant, () => Shape[]> = {
  // The hand everyone knows, and a chip to play it with.
  holdem: () => [
    card({ x: 36, y: 47, r: -12, rank: 'A', suit: '♠', s: 1.02, deal: 0 }),
    card({ x: 61, y: 46, r: 9, rank: 'K', suit: '♥', s: 1.02, deal: 1 }),
    ink(oval(76, 76, 14), RED),
    { kind: 'path', d: oval(76, 76, 10.6), stroke: WHITE, sw: 4.2, dash: '5 6.1' },
    flat(oval(76, 76, 4.2), WHITE),
  ],
  // A pineapple in sunglasses, and the card it's throwing away.
  pineapple: () => {
    const cx = 46;
    const cy = 61;
    const rx = 22;
    const ry = 26;
    // The criss-cross on the skin: diagonal lines cut off at the edge of the fruit.
    const chord = (c: number, dir: 1 | -1) => {
      // Points on y - cy = dir * (x - cx) + c inside the oval, pulled in a little from the edge.
      const A = 1 / (rx * rx) + 1 / (ry * ry);
      const B = (2 * dir * c) / (ry * ry);
      const C = (c * c) / (ry * ry) - 0.8;
      const disc = B * B - 4 * A * C;
      if (disc <= 0) return '';
      const x1 = (-B - Math.sqrt(disc)) / (2 * A);
      const x2 = (-B + Math.sqrt(disc)) / (2 * A);
      return `M${n(cx + x1)} ${n(cy + dir * x1 + c)}L${n(cx + x2)} ${n(cy + dir * x2 + c)}`;
    };
    const hatch = [-24, -8, 8, 24].map((c) => chord(c, 1) + chord(c, -1)).join('');
    return [
      card({ x: 77, y: 34, r: 22, rank: '3', suit: '♠', s: 0.6, deal: 0 }),
      ...[-34, -17, 0, 17, 34].map((a) => ink('M-6 0C-6 -12 -3 -20 0 -27C3 -20 6 -12 6 0Z', a === 0 ? GREEN : Math.abs(a) === 17 ? GREEN_DARK : GREEN, { t: `translate(${cx} ${cy - ry + 5}) rotate(${a})`, noShadow: true })),
      ink(oval(cx, cy, rx, ry), '#ffc628'),
      { kind: 'path', d: hatch, stroke: '#e08f0a', sw: 2.2 },
      ink(`${rr(cx - 17, cy - 11, 15, 11, 4.5)}${rr(cx + 2, cy - 11, 15, 11, 4.5)}`, INK, { noShadow: true, sw: 1 }),
      { kind: 'path', d: `M${cx - 3} ${cy - 7}H${cx + 3}`, stroke: INK, sw: 2.6 },
      { kind: 'path', d: `M${cx - 13} ${cy - 8}l4 -1.5M${cx + 6} ${cy - 8}l4 -1.5`, stroke: WHITE, sw: 1.8, opacity: 0.9 },
      { kind: 'path', d: `M${cx - 7} ${cy + 8}Q${cx} ${cy + 15} ${cx + 7} ${cy + 8}`, stroke: INK, sw: 2.6 },
    ];
  },
  // One big wild two.
  deuces: () => [
    card({ x: 50, y: 49, r: -7, rank: '2', suit: '♥', s: 1.22, glow: true, deal: 0 }),
    sparkle(17, 26, 9),
    sparkle(85, 22, 6.5, WHITE),
    sparkle(83, 74, 10),
    sparkle(15, 72, 6, WHITE),
  ],
  // The ghost and the two cards nobody sees.
  ghost: () => [
    ink('M25 86V44C25 28 36 16 50 16C64 16 75 28 75 44V86L66.7 78L58.3 86L50 78L41.7 86L33.3 78Z', '#f4f5ff'),
    flat(`${oval(41, 40, 4, 5.6)}${oval(59, 40, 4, 5.6)}`, INK),
    flat(oval(50, 52, 3.4, 4.2), INK),
    card({ x: 41, y: 70, r: -12, s: 0.52, back: true, deal: 0 }),
    card({ x: 59, y: 70, r: 12, s: 0.52, back: true, deal: 1 }),
  ],
  // Three rivers: three last cards over the water.
  pittsburgh: () => [
    ...line('M-4 76q6.5 -8 13 0t13 0t13 0t13 0t13 0t13 0t13 0t13 0', '#9fd4ff', 4),
    ...line('M-10 87q6.5 -8 13 0t13 0t13 0t13 0t13 0t13 0t13 0t13 0t13 0', '#9fd4ff', 4),
    card({ x: 22, y: 44, r: -8, rank: '9', suit: '♣', s: 0.62, deal: 0 }),
    card({ x: 78, y: 44, r: 8, rank: '7', suit: '♦', s: 0.62, deal: 2 }),
    card({ x: 50, y: 38, rank: 'K', suit: '♠', s: 0.68, glow: true, deal: 1 }),
  ],
  // The river card and the die that swaps it.
  dice: () => [card({ x: 37, y: 45, r: -11, rank: 'J', suit: '♥', s: 1, deal: 0 }), { kind: 'die', x: 67, y: 66, r: 14, pips: 5, s: 1.08 }],
  // A red card riding a red river.
  redriver: () => [
    waves(64, '#b81c2e', 6),
    card({ x: 50, y: 44, r: -9, rank: 'K', suit: '♥', s: 0.98, deal: 0 }),
    waves(72, '#8f1322'),
    { kind: 'path', d: 'M14 84q5 -5 10 0M58 88q5 -5 10 0M80 80q5 -5 10 0', stroke: WHITE, sw: 2.2, opacity: 0.55 },
  ],
  // The cross.
  crucifix: () =>
    (
      [
        [50, 22, '♥'],
        [27.5, 50, '♣'],
        [72.5, 50, '♦'],
        [50, 78, '♥'],
        [50, 50, '♠'],
      ] as [number, number, string][]
    ).map(([x, y, suit], i) => card({ x, y, suit, s: 0.43, mini: true, glow: i === 4, deal: i })),
  // Six cards round a clock.
  circle: () => [
    ink(oval(50, 50, 15), WHITE),
    { kind: 'path', d: 'M50 50V40M50 50L57 54', stroke: INK, sw: 3 },
    flat(oval(50, 50, 2.4), RED),
    ...CIRCLE_HOURS.map((h, i) => {
      const a = (h / 12) * 2 * Math.PI;
      return card({ x: n(50 + Math.sin(a) * 34), y: n(50 - Math.cos(a) * 34), suit: ['♠', '♥', '♦', '♣', '♥', '♠'][i], s: 0.35, mini: true, deal: i });
    }),
  ],
  // Cards you saw, and the gaps where the rest were.
  memory: () => [
    { kind: 'path', d: rr(54.5, 12.5, 25, 35, 4.5), stroke: WHITE, sw: 2.6, dash: '5 4.2', opacity: 0.85 },
    { kind: 'path', d: rr(20.5, 54.5, 25, 35, 4.5), stroke: WHITE, sw: 2.6, dash: '5 4.2', opacity: 0.85 },
    { kind: 'glyph', x: 67, y: 36.5, text: '?', size: 19, bold: true, ink: WHITE },
    { kind: 'glyph', x: 33, y: 78.5, text: '?', size: 19, bold: true, ink: WHITE },
    card({ x: 33, y: 30, rank: 'A', suit: '♠', s: 0.6, deal: 0 }),
    card({ x: 67, y: 72, rank: 'Q', suit: '♦', s: 0.6, deal: 1 }),
  ],
  // A stalk with a hand that grows as it climbs.
  beanstalk: () => [
    ...line('M50 104C28 90 74 72 50 56C28 41 70 28 52 6', GREEN, 7),
    ...leaf(42, 84, 205, 17, GREEN),
    ...leaf(59, 66, -22, 17, GREEN_DARK),
    ...leaf(42, 47, 200, 15, GREEN),
    card({ x: 73, y: 80, r: 10, rank: '9', suit: '♣', s: 0.4, deal: 0 }),
    card({ x: 25, y: 62, r: -10, rank: '9', suit: '♥', s: 0.48, deal: 1 }),
    card({ x: 72, y: 34, r: 9, rank: 'K', suit: '♥', s: 0.6, glow: true, deal: 2 }),
  ],
  // A blackjack, and the 21 that takes half the pot.
  bjholdem: () => [
    card({ x: 36, y: 46, r: -12, rank: 'A', suit: '♠', s: 1.02, deal: 0 }),
    card({ x: 60, y: 45, r: 9, rank: 'K', suit: '♥', s: 1.02, deal: 1 }),
    ink(oval(75, 75, 15.5), GLOW),
    { kind: 'path', d: oval(75, 75, 11.6), stroke: INK, sw: 1.6, opacity: 0.35 },
    { kind: 'glyph', x: 75, y: 81, text: '21', size: 17, bold: true, ink: INK },
  ],
  // Three cards that look the same, and the one that's watching you.
  imposter: () => [
    card({ x: 26, y: 53, r: -15, s: 0.82, back: true, deal: 0 }),
    card({ x: 74, y: 53, r: 15, s: 0.82, back: true, deal: 1 }),
    card({ x: 50, y: 48, s: 1, back: true, backFill: RED, deal: 2 }),
    flat(rr(31, 33, 38, 22, 5), RED),
    ink(`${oval(41.5, 43, 6.6, 7.6)}${oval(58.5, 43, 6.6, 7.6)}`, WHITE, { noShadow: true, sw: 2.4 }),
    flat(`${oval(44, 44.5, 3)}${oval(61, 44.5, 3)}`, INK),
    { kind: 'path', d: 'M34 33.5L47 36.5M66 33.5L53 36.5', stroke: INK, sw: 2.8 },
  ],
  // Your hand, and the power card dealt with it: a midnight card (the table's felt) with the rail's electric frame and
  // a gold bolt. Laid out like Hold'em's two cards so it reads as one of the family.
  power: () => [
    card({ x: 35, y: 48, r: -13, rank: 'A', suit: '♠', s: 0.94, deal: 0 }),
    {
      kind: 'group',
      t: 'translate(62 50) rotate(9) scale(1.06)',
      shapes: [
        ink(rr(-21, -30, 42, 60, 6.5), POWER_CARD, { sw: OUTLINE / 1.06 }),
        { kind: 'path', d: rr(-15.5, -24.5, 31, 49, 3.5), stroke: POWER_FRAME, sw: 2.2, opacity: 0.85 },
        ink('M4.5 -21L-11 3H-1.5L-5.5 21L11.5 -5H1.5Z', GLOW, { noShadow: true, sw: OUTLINE / 1.06 }),
      ],
    },
    sparkle(86, 22, 7, WHITE),
    sparkle(84, 80, 9),
  ],
  // Your hand, and the mission card dealt with it, laid out exactly like Power Cards: the mission card is the game's
  // green felt (tableThemes.missions) in its gold rail, with a target on it. Every mark is a path, no font glyphs.
  missions: () => [
    card({ x: 35, y: 48, r: -13, rank: 'A', suit: '♠', s: 0.94, deal: 0 }),
    {
      kind: 'group',
      t: 'translate(62 50) rotate(9) scale(1.06)',
      shapes: [
        ink(rr(-21, -30, 42, 60, 6.5), MISSION_CARD, { sw: OUTLINE / 1.06 }),
        { kind: 'path', d: rr(-15.5, -24.5, 31, 49, 3.5), stroke: MISSION_FRAME, sw: 2.2, opacity: 0.9 },
        ink(oval(0, 0, 11.5), WHITE, { noShadow: true, sw: OUTLINE / 1.06 }),
        flat(oval(0, 0, 7.6), RED),
        flat(oval(0, 0, 4.4), WHITE),
        flat(oval(0, 0, 2), RED),
      ],
    },
    sparkle(86, 22, 7, WHITE),
    sparkle(84, 80, 9),
  ],
  // Your two cards, one of them on its way to the player on your left: a curved arrow sweeping under them to the left.
  slide: () => [
    card({ x: 64, y: 46, r: 11, rank: 'K', suit: '♥', s: 0.96, deal: 0 }),
    card({ x: 33, y: 43, r: -18, rank: 'A', suit: '♠', s: 0.96, deal: 1 }),
    ...line('M84 72C72 88 44 90 26 80', WHITE, 5.5),
    ink('M13 77L29 70L28 88Z', WHITE, { noShadow: true }),
    sparkle(88, 20, 7, WHITE),
    sparkle(12, 24, 6),
  ],
  // A card wearing a red headband with its knot's tails flying, and a question mark: whose card is it?
  headband: () => [
    card({ x: 34, y: 52, r: -14, s: 0.86, back: true, deal: 0 }),
    card({ x: 60, y: 48, r: 8, rank: 'K', suit: '♠', s: 1, deal: 1 }),
    ink(rr(37, 24, 46, 9, 4), RED, { t: 'rotate(8 60 28)' }),
    ink('M82 27L95 20L93 32Z', RED, { noShadow: true }),
    ink('M82 29L94 38L84 40Z', RED, { noShadow: true }),
    { kind: 'glyph', x: 34, y: 57, text: '?', size: 26, bold: true, ink: WHITE },
    sparkle(14, 22, 6),
  ],
  // Three cards riding a belt on rollers, the one on the left tipping off the end.
  belt: () => [
    ink(rr(10, 66, 80, 14, 7), '#3b3f48'),
    flat(`${oval(18, 73, 3.4)}${oval(36, 73, 3.4)}${oval(54, 73, 3.4)}${oval(72, 73, 3.4)}`, '#9aa3b2'),
    card({ x: 16, y: 50, r: -38, s: 0.62, rank: '7', suit: '♣', deal: 0 }),
    card({ x: 40, y: 45, s: 0.7, rank: 'K', suit: '♥', deal: 1 }),
    card({ x: 62, y: 45, s: 0.7, rank: 'Q', suit: '♠', deal: 2 }),
    card({ x: 84, y: 45, s: 0.7, rank: 'J', suit: '♦', deal: 3 }),
    ...line('M30 88H72', WHITE, 3.4),
    ink('M24 88L33 83V93Z', WHITE, { noShadow: true }),
  ],
  // A red onion with its top sprout, and a card peeling off it.
  onion: () => [
    ink('M50 30C66 40 76 52 74 66C72 80 62 88 50 88C38 88 28 80 26 66C24 52 34 40 50 30Z', '#b5487a'),
    { kind: 'path', d: 'M50 34C42 46 40 66 46 86M50 34C58 46 60 66 54 86M50 32C36 46 32 68 38 84M50 32C64 46 68 68 62 84', stroke: '#7d2a52', sw: 1.8, opacity: 0.6 },
    ink('M50 30C48 22 44 16 40 12M50 30C52 22 56 16 62 13', '#7fbf4d', { noShadow: true }),
    { kind: 'path', d: 'M50 30C48 22 44 16 40 12M50 30C52 22 56 16 62 13', stroke: '#5c9a33', sw: 3 },
    card({ x: 77, y: 40, r: 22, s: 0.66, rank: '9', suit: '♦', deal: 0 }),
    sparkle(16, 30, 6, WHITE),
  ],
  // Two cards joined by chain links.
  chain: () => [
    card({ x: 26, y: 48, r: -12, rank: 'A', suit: '♥', s: 0.84, deal: 0 }),
    card({ x: 74, y: 48, r: 12, rank: 'A', suit: '♠', s: 0.84, deal: 1 }),
    { kind: 'path', d: rr(38, 42, 16, 10, 5), stroke: '#c9ccd6', sw: 4 },
    { kind: 'path', d: rr(48, 46, 16, 10, 5), stroke: '#e6e8ee', sw: 4 },
    sparkle(50, 74, 8),
    sparkle(86, 18, 6, WHITE),
  ],
  // Two cards going up, with an elevator arrow and its floor light.
  elevator: () => [
    card({ x: 36, y: 60, r: -8, rank: '7', suit: '♣', s: 0.8, deal: 0 }),
    card({ x: 58, y: 42, r: 6, rank: '8', suit: '♣', s: 0.86, deal: 1 }),
    ink('M84 46L94 60H88V80H80V60H74Z', WHITE),
    ink(oval(84, 22, 8), GLOW),
    { kind: 'glyph', x: 84, y: 25.5, text: '8', size: 10, bold: true, ink: INK },
  ],
  // Five cards fanned out, and two little boards under them.
  plo: () => [
    card({ x: 26, y: 50, r: -24, rank: 'A', suit: '♠', s: 0.7, deal: 0 }),
    card({ x: 38, y: 45, r: -12, rank: 'K', suit: '♦', s: 0.7, deal: 1 }),
    card({ x: 50, y: 43, r: 0, rank: 'Q', suit: '♥', s: 0.7, deal: 2 }),
    card({ x: 62, y: 45, r: 12, rank: 'J', suit: '♣', s: 0.7, deal: 3 }),
    card({ x: 74, y: 50, r: 24, rank: 'T', suit: '♠', s: 0.7, deal: 4 }),
    ink(rr(18, 78, 28, 9, 4.5), '#2fb457'),
    ink(rr(54, 78, 28, 9, 4.5), '#2fb457'),
  ],
};

/** The suit scattered behind each game's wide picture. */
const SCATTER: Record<Variant, string> = { holdem: '♠', pineapple: '♦', deuces: '♥', ghost: '♠', pittsburgh: '♣', dice: '♦', redriver: '♥', crucifix: '♠', circle: '♣', memory: '♦', beanstalk: '♣', bjholdem: '♠', imposter: '♣', power: '♦', missions: '♠', slide: '♥', headband: '♣', belt: '♦', onion: '♥', chain: '♠', elevator: '♣', plo: '♦' };

/** A game's small square picture on a 100 × 100 box, back to front: a soft spot, then the subject. */
export const gameThumb = (v: Variant): Shape[] => {
  const id = SUBJECTS[v] ? v : 'holdem';
  return [flat(oval(50, 50, 41), gameLook(id).tone), ...SUBJECTS[id]()];
};

/**
 * A game's wide picture on a 200 × 120 box, for big cards and sheets: the same subject, bigger and in the middle,
 * with the game's suit scattered in the lighter tone either side.
 */
export const gameScene = (v: Variant): Shape[] => {
  const id = SUBJECTS[v] ? v : 'holdem';
  const { tone } = gameLook(id);
  const suit = SUIT_PATH[SCATTER[id]];
  const spots: [number, number, number, number][] = [
    [22, 26, -18, 1.5],
    [38, 92, 14, 1.1],
    [-2, 74, 24, 1.9],
    [178, 30, 16, 1.6],
    [166, 96, -12, 1.2],
    [204, 70, -22, 1.9],
  ];
  return [
    flat(oval(100, 62, 58), tone),
    ...spots.map(([x, y, r, s]) => flat(suit, tone, { t: `translate(${x} ${y}) rotate(${r}) scale(${s})` })),
    { kind: 'group', t: 'translate(42 3) scale(1.16)', shapes: SUBJECTS[id]() },
  ];
};
