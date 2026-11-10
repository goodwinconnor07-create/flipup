// How each game looks outside the table, shared by the web app and the iPhone app: its card gradient, a line that
// sets the mood, and its picture. A picture is a list of plain shapes on a 200 × 120 box, built from playing cards
// in the same four-colour deck the table uses (no faces, no scenes). The web draws the shapes as SVG
// (src/ui/GameIllustrations.tsx) and the app with react-native-svg (native/src/components/game-picture.tsx).
import { CIRCLE_HOURS, CROSS_CELLS, type Variant } from '../game/variants';

export interface GameLook {
  /** Home card: the gradient, top to bottom. */
  card: readonly [string, string];
  /** A line that sets the mood. Shown on the game's start sheet. */
  mood: string;
  /** Two or three words under the game's name on Home: why it's fun. */
  hook: string;
  /** Table sounds are pitched by this (1 is normal): low and heavy for the ghost, bright for the pineapple. */
  pitch: number;
}

export const GAME_LOOK: Record<Variant, GameLook> = {
  holdem: { card: ['#1f8a57', '#0a3b25'], mood: 'The classic. Your felt, your rules.', hook: 'The classic', pitch: 1 },
  pineapple: { card: ['#f9b233', '#e8641b'], mood: 'Sunny, juicy and a bit silly.', hook: 'Throw one away', pitch: 1.12 },
  deuces: { card: ['#ff4fa0', '#7a2cff'], mood: 'Wild cards, loud colours.', hook: 'Every 2 is wild', pitch: 1.2 },
  ghost: { card: ['#1b2a3a', '#050a10'], mood: 'Cold air. Something is watching the pot.', hook: 'Beat the ghost', pitch: 0.82 },
  pittsburgh: { card: ['#32465c', '#0e151d'], mood: 'Steel, rivers and a bridge in the dark.', hook: 'Three rivers', pitch: 0.94 },
  dice: { card: ['#c0283f', '#4a0a16'], mood: 'Craps table energy. Everything is one roll from changing.', hook: 'A die swaps a card', pitch: 1 },
  redriver: { card: ['#d92b2b', '#2a0606'], mood: 'The river runs red. Keep going until it stops.', hook: 'Red keeps dealing', pitch: 0.9 },
  crucifix: { card: ['#5a4691', '#1a1230'], mood: 'Five cards in a cross. Read the arms.', hook: 'Read the cross', pitch: 0.92 },
  circle: { card: ['#1d7fb8', '#0a2a45'], mood: 'Six cards round a clock. Hours matter.', hook: 'Round the clock', pitch: 1.05 },
  memory: { card: ['#7b5cff', '#2a1670'], mood: 'Twenty cards gone. Do you remember which?', hook: 'Remember the 20', pitch: 1.08 },
  beanstalk: { card: ['#4caf50', '#14532d'], mood: 'Your hand keeps growing. How high can it climb?', hook: 'Your hand grows', pitch: 1.1 },
  bjholdem: { card: ['#0f6b45', '#06281a'], mood: 'Hit or stand. Half for the best hand, half for 21.', hook: 'Hit, then bet', pitch: 0.97 },
  imposter: { card: ['#2f3441', '#0a0b10'], mood: 'Trust nobody. Watch the bets.', hook: 'Find the imposter', pitch: 0.88 },
};

export const gameLook = (v: Variant): GameLook => GAME_LOOK[v] ?? GAME_LOOK.holdem;

/** The deck's four colours: spades black, hearts red, diamonds blue, clubs green. */
export const SUIT_COLOUR: Record<string, string> = { '♠': '#16161d', '♥': '#e5322d', '♦': '#2563eb', '♣': '#16a34a' };
export const GLOW = '#ffc933';

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
  glow?: boolean;
  faded?: boolean;
  deal?: number;
}
/** The big faded suit behind a picture, cropped by the edge. */
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
}
/** White capitals across the picture: "WILD", "THREE RIVERS". */
export interface LabelShape {
  kind: 'label';
  x: number;
  y: number;
  text: string;
}
/** A big glyph laid over the cards (the ? on the imposter's card, the brain on Memory). */
export interface GlyphShape {
  kind: 'glyph';
  x: number;
  y: number;
  text: string;
  size: number;
  bold?: boolean;
  /** Text colour; emoji leave it out. */
  ink?: string;
}
export type Shape = CardShape | MarkShape | DieShape | LabelShape | GlyphShape;

/** Where the dots sit on each face of a die, around its centre. */
export const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-7, -7], [7, 7]],
  3: [[-8, -8], [0, 0], [8, 8]],
  4: [[-7, -7], [7, -7], [-7, 7], [7, 7]],
  5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]],
  6: [[-7, -9], [7, -9], [-7, 0], [7, 0], [-7, 9], [7, 9]],
};

const mark = (suit: string, x = 160, y = 96, size = 150): MarkShape => ({ kind: 'mark', suit, x, y, size });
const label = (x: number, y: number, text: string): LabelShape => ({ kind: 'label', x, y, text });
const card = (c: Omit<CardShape, 'kind'>): CardShape => ({ kind: 'card', ...c });

/** A row of cards across the middle, for the games with a long board. */
function row(cards: [string, string][], y: number, s: number, gap: number, glowFrom?: number): CardShape[] {
  const start = 100 - ((cards.length - 1) * gap) / 2;
  return cards.map(([rank, suit], i) => card({ x: start + i * gap, y, rank, suit, s, glow: glowFrom !== undefined && i >= glowFrom, deal: i }));
}

const SCENES: Record<Variant, () => Shape[]> = {
  holdem: () => [mark('♠'), card({ x: 80, y: 60, r: -12, rank: 'A', suit: '♠', s: 1.35, deal: 0 }), card({ x: 122, y: 58, r: 10, rank: 'K', suit: '♥', s: 1.35, deal: 1 })],
  pineapple: () => [
    mark('♦', 40),
    card({ x: 64, y: 58, r: -14, rank: 'Q', suit: '♦', s: 1.15, deal: 0 }),
    card({ x: 102, y: 54, r: -2, rank: 'J', suit: '♣', s: 1.15, deal: 1 }),
    card({ x: 146, y: 72, r: 24, rank: '3', suit: '♠', s: 1.05, faded: true, deal: 2 }),
    label(146, 104, 'TOSS ONE'),
  ],
  deuces: () => [
    mark('♣'),
    card({ x: 54, y: 62, r: -10, rank: '2', suit: '♠', s: 1.1, glow: true, deal: 0 }),
    card({ x: 100, y: 56, r: 0, rank: '2', suit: '♥', s: 1.1, glow: true, deal: 1 }),
    card({ x: 146, y: 62, r: 10, rank: '2', suit: '♦', s: 1.1, glow: true, deal: 2 }),
    label(100, 108, 'WILD'),
  ],
  ghost: () => [
    mark('♠', 40),
    card({ x: 58, y: 62, r: -8, rank: 'A', suit: '♠', s: 1.15, deal: 0 }),
    card({ x: 96, y: 58, r: 4, rank: 'A', suit: '♥', s: 1.15, deal: 1 }),
    card({ x: 150, y: 60, r: 8, rank: 'K', suit: '♦', s: 1.15, faded: true, deal: 2 }),
    card({ x: 150, y: 60, r: 8, s: 1.15, back: true, faded: true }),
    label(150, 106, 'THE GHOST'),
  ],
  pittsburgh: () => [mark('♥'), ...row([['9', '♣'], ['5', '♦'], ['K', '♠'], ['Q', '♥'], ['7', '♦']], 52, 0.86, 36, 2), label(100, 104, 'THREE RIVERS')],
  dice: () => [mark('♦'), ...row([['T', '♠'], ['8', '♦'], ['4', '♣'], ['J', '♥']], 48, 0.8, 32), { kind: 'die', x: 158, y: 84, r: 14, pips: 5 }, label(64, 104, 'DIE ON THE RIVER')],
  redriver: () => [mark('♥'), ...row([['9', '♠'], ['4', '♣'], ['K', '♥'], ['6', '♦'], ['Q', '♥'], ['2', '♦']], 52, 0.74, 29, 2), label(100, 104, 'RED KEEPS COMING')],
  imposter: () => [
    mark('♣', 40),
    card({ x: 70, y: 60, r: -8, rank: 'K', suit: '♠', s: 1.15, deal: 0 }),
    card({ x: 120, y: 58, r: 8, s: 1.15, back: true, deal: 1 }),
    { kind: 'glyph', x: 120, y: 70, text: '?', size: 34, bold: true, ink: '#fff' },
    label(100, 106, "WHO'S BLUFFING"),
  ],
  bjholdem: () => [
    mark('♠', 150),
    card({ x: 52, y: 62, r: -10, rank: 'K', suit: '♠', deal: 0 }),
    card({ x: 84, y: 58, r: 4, rank: 'A', suit: '♥', glow: true, deal: 1 }),
    label(150, 64, '21'),
  ],
  memory: () => [
    mark('♦', 44),
    ...Array.from({ length: 10 }, (_, i) =>
      card({ x: 42 + (i % 5) * 29, y: 36 + Math.floor(i / 5) * 46, rank: ['A', 'K', '7', '2', 'Q', '9', 'J', '4', 'A', '5'][i], suit: ['♠', '♥', '♦', '♣'][i % 4], s: 0.62, faded: i % 3 === 1, deal: i }),
    ),
    { kind: 'glyph', x: 170, y: 70, text: '🧠', size: 40 },
  ],
  beanstalk: () => [
    mark('♣', 150),
    ...[0, 1, 2, 3, 4].map((i) => card({ x: 60 + i * 14, y: 96 - i * 16, r: -10 + i * 5, rank: ['9', '9', 'K', '9', 'K'][i], suit: ['♣', '♥', '♠', '♦', '♥'][i], s: 0.72, glow: i === 4, deal: i })),
  ],
  crucifix: () => [
    mark('♠', 44),
    ...CROSS_CELLS.map(([r, c], i) => card({ x: 100 + (c - 3) * 21, y: 60 + (r - 3) * 22, rank: ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6'][i], suit: ['♠', '♥', '♦', '♣'][i % 4], s: 0.34, glow: i === 0, deal: i })),
  ],
  circle: () => [
    mark('♥', 44),
    ...CIRCLE_HOURS.map((h, i) => {
      const a = (h / 12) * 2 * Math.PI;
      return card({ x: 100 + Math.sin(a) * 52, y: 60 - Math.cos(a) * 34, rank: ['A', 'K', 'Q', 'J', 'T', '9'][i], suit: ['♠', '♥', '♦', '♣', '♠', '♥'][i], s: 0.5, glow: i < 2, deal: i });
    }),
  ],
};

/** The shapes of a game's picture, back to front. */
export const gameScene = (v: Variant): Shape[] => (SCENES[v] ?? SCENES.holdem)();

/**
 * The small square version of each game's picture, for lists (a 100 × 100 box): one to three big cards that say
 * what the game is about, no caption, so it still reads at 30 to 52 points.
 */
const THUMBS: Record<Variant, () => Shape[]> = {
  holdem: () => [card({ x: 38, y: 54, r: -10, rank: 'A', suit: '♠', s: 1.05 }), card({ x: 63, y: 50, r: 10, rank: 'K', suit: '♥', s: 1.05 })],
  pineapple: () => [
    card({ x: 29, y: 56, r: -16, rank: 'Q', suit: '♦', s: 0.9 }),
    card({ x: 50, y: 50, rank: 'J', suit: '♣', s: 0.9 }),
    card({ x: 72, y: 57, r: 16, rank: '3', suit: '♠', s: 0.9, faded: true }),
  ],
  deuces: () => [card({ x: 50, y: 52, rank: '2', suit: '♥', s: 1.2, glow: true })],
  ghost: () => [card({ x: 37, y: 53, r: -8, rank: 'A', suit: '♠', s: 1 }), card({ x: 64, y: 50, r: 8, s: 1, back: true, faded: true })],
  pittsburgh: () => [
    card({ x: 22, y: 50, rank: 'Q', suit: '♥', s: 0.62 }),
    card({ x: 50, y: 50, rank: 'K', suit: '♠', s: 0.62, glow: true }),
    card({ x: 78, y: 50, rank: '7', suit: '♦', s: 0.62 }),
  ],
  dice: () => [card({ x: 38, y: 48, r: -8, rank: 'J', suit: '♥', s: 1 }), { kind: 'die', x: 70, y: 68, r: 12, pips: 5 }],
  redriver: () => [card({ x: 38, y: 53, r: -10, rank: 'K', suit: '♥', s: 1 }), card({ x: 63, y: 50, r: 10, rank: '9', suit: '♥', s: 1, glow: true })],
  imposter: () => [card({ x: 50, y: 50, s: 1.15, back: true }), { kind: 'glyph', x: 50, y: 63, text: '?', size: 36, bold: true, ink: '#fff' }],
  bjholdem: () => [card({ x: 38, y: 54, r: -10, rank: 'K', suit: '♠', s: 1.05 }), card({ x: 63, y: 50, r: 10, rank: 'A', suit: '♥', s: 1.05, glow: true })],
  memory: () => [
    card({ x: 34, y: 30, rank: 'A', suit: '♠', s: 0.6 }),
    card({ x: 66, y: 30, rank: 'K', suit: '♥', s: 0.6, faded: true }),
    card({ x: 34, y: 72, rank: '7', suit: '♦', s: 0.6, faded: true }),
    card({ x: 66, y: 72, rank: '2', suit: '♣', s: 0.6 }),
  ],
  beanstalk: () => [
    card({ x: 30, y: 68, r: -10, rank: '9', suit: '♣', s: 0.75 }),
    card({ x: 50, y: 52, rank: '9', suit: '♥', s: 0.75 }),
    card({ x: 70, y: 36, r: 10, rank: 'K', suit: '♥', s: 0.75, glow: true }),
  ],
  crucifix: () =>
    [
      [50, 50],
      [50, 20],
      [50, 80],
      [22, 50],
      [78, 50],
    ].map(([x, y], i) => card({ x, y, rank: ['A', 'K', 'Q', 'J', 'T'][i], suit: ['♠', '♥', '♦', '♣', '♠'][i], s: 0.42, glow: i === 0 })),
  circle: () =>
    CIRCLE_HOURS.map((h, i) => {
      const a = (h / 12) * 2 * Math.PI;
      return card({ x: 50 + Math.sin(a) * 30, y: 50 - Math.cos(a) * 30, rank: ['A', 'K', 'Q', 'J', 'T', '9'][i], suit: ['♠', '♥', '♦', '♣', '♠', '♥'][i], s: 0.42, glow: i < 2 });
    }),
};

/** The shapes of a game's square thumbnail, back to front, on a 100 × 100 box. */
export const gameThumb = (v: Variant): Shape[] => (THUMBS[v] ?? THUMBS.holdem)();
