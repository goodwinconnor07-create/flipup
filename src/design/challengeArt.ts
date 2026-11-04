// How each challenge looks on its card: a picture drawn the same way as the games' (src/design/gameArt.ts), from
// playing cards in the four-colour deck on a 200 × 120 box, plus four shapes only the solo cards use: a stack of
// chips, a magnifying glass, a rewind arrow and Range training's grid of hands. The colours stay in the app's palette (violet, night and gold).
// Drawn by native/src/components/challenge-picture.tsx.
import type { ChallengeId } from '../game/challenges';
import type { CardShape, LabelShape, MarkShape, Shape } from './gameArt';

/** A stack of chips seen from the side, `count` high, standing on (x, y). Colours go bottom to top. */
export interface ChipsShape {
  kind: 'chips';
  x: number;
  y: number;
  colours: string[];
  /** Half the chip's width. */
  r?: number;
}
/** A magnifying glass: the lens centred on (x, y), the handle pointing down and right. */
export interface LensShape {
  kind: 'lens';
  x: number;
  y: number;
  r: number;
}
/** A rewind arrow: an arc round (x, y) from `from` to `to` degrees (0 is up, clockwise), the head at `to`. */
export interface ArcShape {
  kind: 'arc';
  x: number;
  y: number;
  r: number;
  from: number;
  to: number;
}
/**
 * A range grid, the way a hand chart is drawn: `cols` by `rows` little squares from (x, y), each `cell` wide.
 * The ones in `on` (row by row, left to right) are filled gold; the rest are faint.
 */
export interface GridShape {
  kind: 'grid';
  x: number;
  y: number;
  cols: number;
  rows: number;
  cell: number;
  on: number[];
}
export type ChallengeShape = Shape | ChipsShape | LensShape | ArcShape | GridShape;

/** The solo cards on Home: the three challenges, then Range training (not a challenge: no table, no score). */
export type SoloId = ChallengeId | 'ranges';

export const CHIP = { gold: '#f5b700', violet: '#6e4bff', white: '#f4f1ff', night: '#2b1a80' } as const;
export const ART_GOLD = '#ffc933';

export interface ChallengeLook {
  /** The picture's gradient, top left to bottom right. */
  card: readonly [string, string];
}

export const CHALLENGE_LOOK: Record<SoloId, ChallengeLook> = {
  shortStack: { card: ['#8263ff', '#2a1290'] },
  detective: { card: ['#2b1a80', '#0b0626'] },
  rewind: { card: ['#4a26d9', '#160b45'] },
  ranges: { card: ['#5a35f0', '#1d0f5c'] },
};

const mark = (suit: string, x: number, y = 100, size = 150): MarkShape => ({ kind: 'mark', suit, x, y, size });
const label = (x: number, y: number, text: string): LabelShape => ({ kind: 'label', x, y, text });
const card = (c: Omit<CardShape, 'kind'>): CardShape => ({ kind: 'card', ...c });

const SCENES: Record<SoloId, () => ChallengeShape[]> = {
  // A short stack in front of the hand you'd shove with: five chips is all there is.
  shortStack: () => [
    mark('♦', 150),
    card({ x: 112, y: 52, r: -10, rank: 'A', suit: '♦', s: 1.1 }),
    card({ x: 148, y: 56, r: 12, rank: '7', suit: '♣', s: 1.1 }),
    { kind: 'chips', x: 58, y: 92, colours: [CHIP.violet, CHIP.white, CHIP.gold, CHIP.violet, CHIP.gold] },
    label(58, 112, '10 BB'),
  ],
  // Three cards face down, and the glass over the one in the middle: who's holding what, and how do they play it?
  detective: () => [
    mark('♣', 40),
    card({ x: 58, y: 56, r: -14, s: 0.95, back: true }),
    card({ x: 100, y: 50, s: 0.95, back: true }),
    card({ x: 142, y: 56, r: 14, s: 0.95, back: true }),
    { kind: 'lens', x: 108, y: 56, r: 24 },
    { kind: 'glyph', x: 108, y: 67, text: '?', size: 30, bold: true, ink: '#fff' },
    label(100, 112, 'WHO IS WHO'),
  ],
  // The hand you played, and the arrow that takes it back.
  rewind: () => [
    mark('♥', 160),
    card({ x: 84, y: 58, r: -10, rank: 'K', suit: '♥', s: 1.05 }),
    card({ x: 118, y: 56, r: 8, rank: 'Q', suit: '♠', s: 1.05, faded: true }),
    { kind: 'arc', x: 100, y: 52, r: 44, from: 60, to: -235 },
    label(100, 113, 'PLAY IT AGAIN'),
  ],
  // Your hand in front of the chart of what they could have: which of their hands is it up against?
  ranges: () => [
    mark('♠', 150),
    // A hand chart's corner: pairs down the diagonal, the strong hands round the top left, the rest left out.
    { kind: 'grid', x: 26, y: 18, cols: 6, rows: 6, cell: 13, on: [0, 1, 2, 3, 4, 6, 7, 8, 9, 12, 13, 14, 18, 19, 21, 28] },
    card({ x: 124, y: 54, r: -10, rank: 'A', suit: '♠', s: 1.05 }),
    card({ x: 156, y: 58, r: 10, rank: 'J', suit: '♦', s: 1.05 }),
    label(100, 113, 'READ THE RANGE'),
  ],
};

/** The shapes of a challenge's picture, back to front. */
export const challengeScene = (id: SoloId): ChallengeShape[] => SCENES[id]();
export const challengeLook = (id: SoloId): ChallengeLook => CHALLENGE_LOOK[id];
