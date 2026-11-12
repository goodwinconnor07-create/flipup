// How Range training's ways to train look on their tiles, drawn exactly like the games' tiles (gameArt.ts): a flat
// field, one bold subject in the shared sticker style (white cards in the four-colour deck, the dark outline and the
// hard flat shadow), a softer spot behind it, and the name on a band in a darker shade of the field. The colours
// stay in the app's palette (blue, night and gold), so the Train tab reads as a calmer cousin of Play.
// Drawn by native/src/components/range/mode-tiles.tsx.
import { GLOW, INK, oval, rr, type CardShape, type PathShape, type Shape } from './gameArt';

export type TrainMode = 'daily' | 'endless' | 'sets' | 'gaps';

export interface TrainLook {
  /** The picture's flat field. */
  field: string;
  /** The name band under the picture: a darker shade of the field. */
  band: string;
  /** The soft spot behind the subject: a lighter shade of the field. */
  tone: string;
}

export const TRAIN_LOOK: Record<TrainMode, TrainLook> = {
  daily: { field: '#2557d6', band: '#163a9e', tone: '#3d6ce4' },
  endless: { field: '#1b2556', band: '#10173a', tone: '#2b376f' },
  sets: { field: '#3a5694', band: '#253a69', tone: '#5069a6' },
  gaps: { field: '#c98a00', band: '#8f6200', tone: '#dca42a' },
};

const card = (c: Omit<CardShape, 'kind'>): CardShape => ({ kind: 'card', ...c });
const ink = (d: string, fill: string, more: Partial<PathShape> = {}): PathShape => ({ kind: 'path', d, fill, ...more });
const flat = (d: string, fill: string, more: Partial<PathShape> = {}): PathShape => ({ kind: 'path', d, fill, flat: true, ...more });

/** An infinity sign about (cx, cy), `w` wide: two loops crossing in the middle. */
function infinity(cx: number, cy: number, w: number): string {
  const a = w / 2;
  const h = w * 0.3;
  return `M${cx} ${cy}C${cx + a * 0.35} ${cy - h} ${cx + a} ${cy - h} ${cx + a} ${cy}C${cx + a} ${cy + h} ${cx + a * 0.35} ${cy + h} ${cx} ${cy}C${cx - a * 0.35} ${cy - h} ${cx - a} ${cy - h} ${cx - a} ${cy}C${cx - a} ${cy + h} ${cx - a * 0.35} ${cy + h} ${cx} ${cy}Z`;
}

const SUBJECTS: Record<TrainMode, (day: number) => Shape[]> = {
  // Today's one hand: a single ace, and a gold tab with the date on it.
  daily: (day) => [
    card({ x: 45, y: 52, r: -8, rank: 'A', suit: '♠', s: 1.08 }),
    ink(oval(72, 25, 14), GLOW),
    { kind: 'glyph', x: 72, y: 30.5, text: String(day), size: 15, bold: true, ink: INK },
  ],
  // Hand after hand: a run of cards coming face down, and infinity over them in gold.
  endless: () => [
    card({ x: 30, y: 60, r: -16, s: 0.78, back: true }),
    card({ x: 50, y: 57, s: 0.78, back: true }),
    card({ x: 70, y: 60, r: 16, rank: 'K', suit: '♥', s: 0.78 }),
    { kind: 'path', d: infinity(50, 22, 46), stroke: INK, sw: 10.5 },
    { kind: 'path', d: infinity(50, 22, 46), stroke: GLOW, sw: 5.5 },
  ],
  // A set: five cards in a fan, one of each suit and the ace on top.
  sets: () =>
    (['♣', '♦', '♠', '♥', '♠'] as const).map((suit, i) => {
      const deg = -32 + i * 16;
      const a = (deg * Math.PI) / 180;
      return card({ x: 50 + Math.sin(a) * 46, y: 100 - Math.cos(a) * 46, r: deg, s: 0.7, mini: i !== 4, rank: 'A', suit });
    }),
  // A hand chart on a white board, with the hands you keep missing left open in gold.
  gaps: () => {
    const x0 = 23;
    const y0 = 15;
    const step = 9.4;
    const size = 7.6;
    const open = new Set([8, 15, 19, 26]);
    const cells: Shape[] = [ink(rr(17, 9, 66, 66, 8), '#ffffff')];
    for (let i = 0; i < 36; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = x0 + col * step;
      const y = y0 + row * step;
      if (open.has(i)) cells.push({ kind: 'path', d: rr(x + 0.6, y + 0.6, size - 1.2, size - 1.2, 1.6), stroke: GLOW, sw: 2.2, dash: '2.4 1.8' });
      else cells.push(flat(rr(x, y, size, size, 1.8), row + col < 7 ? '#2557d6' : '#dfe6f7'));
    }
    return cells;
  },
};

/** A mode's square picture on a 100 × 100 box, back to front: a soft spot, then the subject. `day` dates the daily tab. */
export const trainThumb = (mode: TrainMode, day = new Date().getDate()): Shape[] => [flat(oval(50, 50, 41), TRAIN_LOOK[mode].tone), ...SUBJECTS[mode](day)];
