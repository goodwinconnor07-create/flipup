// Where a share card's playing cards go (designs.tsx draws them). Pure, so tests/share-layout.test.ts can check every
// game's real hands: Bean Stalk ends with five hole cards, Hit Me with more after a hit, Pineapple with three if you
// folded before the throw-away, and boards run from five cards to Pittsburgh's seven, Crucifix's nine and Red River's
// as many as it deals. Cards shrink to fit their box, and a board over six cards goes on two rows.
import type { ShareData } from './data';

/** A sticker card at s = 1 (gameArt.ts: CARD_W, CARD_H). */
export const STICKER_W = 42;
export const STICKER_H = 60;

export interface Placed {
  x: number;
  y: number;
  /** Scale, 1 being the game pictures' card. */
  s: number;
  /** Degrees. */
  r: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The box a card takes up once turned (its corners, so a fanned hand never pokes out of its space unnoticed). */
export function cardBox(p: Placed): Box {
  const a = (Math.abs(p.r) * Math.PI) / 180;
  const w = STICKER_W * p.s;
  const h = STICKER_H * p.s;
  const hw = (w * Math.cos(a) + h * Math.sin(a)) / 2;
  const hh = (w * Math.sin(a) + h * Math.cos(a)) / 2;
  return { left: p.x - hw, right: p.x + hw, top: p.y - hh, bottom: p.y + hh };
}

export function boxOf(cards: Placed[]): Box | null {
  if (!cards.length) return null;
  const boxes = cards.map(cardBox);
  return {
    left: Math.min(...boxes.map((b) => b.left)),
    right: Math.max(...boxes.map((b) => b.right)),
    top: Math.min(...boxes.map((b) => b.top)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
}

/** How far apart a fan's cards sit, as a share of a card's width: two show most of the back card, more tuck in. */
const fanStep = (n: number) => (n <= 2 ? 0.6 : 0.5);
/** The whole fan turns this much from end to end; a bigger hand spreads it over more cards. */
const FAN_DEG = 22;

/**
 * Hole cards fanned like the game pictures' pair, centred on (cx, cy): the first tilted left, the last right (and,
 * for two, a little higher). `s` is the size wanted; it shrinks until the fan fits `maxW` across and `maxH` down.
 */
export function fanLayout(n: number, cx: number, cy: number, s: number, maxW: number, maxH: number): Placed[] {
  if (n <= 0) return [];
  const mid = (n - 1) / 2;
  const at = (scale: number): Placed[] =>
    Array.from({ length: n }, (_, i) => ({
      x: cx + (i - mid) * fanStep(n) * STICKER_W * scale,
      y: cy - (n === 2 && i === 1 ? 2 * scale : 0),
      s: scale,
      r: n === 1 ? 0 : (i - mid) * (FAN_DEG / (n - 1)),
    }));
  const box = boxOf(at(s))!;
  const k = Math.min(1, maxW / (box.right - box.left), maxH / (box.bottom - box.top));
  return at(s * k);
}

/** The most cards a board puts on one row before it splits in two. */
export const ROW_MAX = 6;

/**
 * A board in a row (two rows past `ROW_MAX`, the first one the longer), centred on (cx, cy), filling at most `width`
 * across and `maxH` down, with cards no bigger than `maxS`.
 */
export function boardLayout(n: number, cx: number, cy: number, width: number, maxH: number, maxS: number): Placed[] {
  if (n <= 0) return [];
  const rows = n > ROW_MAX ? 2 : 1;
  const perRow = Math.ceil(n / rows);
  const gap = 6;
  const byWidth = (width / perRow - gap) / STICKER_W;
  const byHeight = (maxH - gap * (rows - 1)) / rows / STICKER_H;
  const s = Math.min(maxS, byWidth, byHeight);
  const step = STICKER_W * s + gap;
  const rowH = STICKER_H * s + gap;
  const out: Placed[] = [];
  for (let row = 0; row < rows; row++) {
    const count = row === 0 ? perRow : n - perRow;
    const y = cy + (row - (rows - 1) / 2) * rowH;
    for (let i = 0; i < count; i++) out.push({ x: cx + (i - (count - 1) / 2) * step, y, s, r: 0 });
  }
  return out;
}

// ── Each card's cards ───────────────────────────────────────────────────────

/** The card's own size, the room the header and band take, and where the hand card's words sit. */
export const CARD_W = 360;
export const CARD_H = 450;
export const BAND = 58;
/** Under the capsule at the top of a hand card, and over its big number. */
const HAND_TOP = 116;
const HAND_BOTTOM = 298;
const GAP = 10;

/** The hand card: your hole cards over the board, sharing the space between the capsule and the big number. */
export function handCardLayout(holes: number, board: number): { hole: Placed[]; board: Placed[] } {
  const room = HAND_BOTTOM - HAND_TOP;
  if (!board) {
    // No board (everyone folded before the flop): the hand alone, bigger, in the middle.
    return { hole: fanLayout(holes, CARD_W / 2, (HAND_TOP + HAND_BOTTOM) / 2, 1.7, 300, room), board: [] };
  }
  // The board's share of the height grows with its rows; the hand gets the rest.
  const rows = board > ROW_MAX ? 2 : 1;
  const boardH = Math.min(rows === 1 ? 76 : 112, room * (rows === 1 ? 0.42 : 0.56));
  const holeH = room - boardH - GAP;
  const hole = fanLayout(holes, CARD_W / 2, HAND_TOP + holeH / 2, 1.5, 300, holeH);
  const placed = boardLayout(board, CARD_W / 2, HAND_BOTTOM - boardH / 2, 300, boardH, 1.24);
  return { hole, board: placed };
}

/** The showdown card: each side's hand either side of the VS badge, and the board under the names. */
export const SIDE_X = [94, 266] as const;
export const VS = { x: 180, y: 168, r: 23 };
export function showdownLayout(you: number, them: number, board: number): { you: Placed[]; them: Placed[]; board: Placed[] } {
  // Each side keeps to its half, clear of the VS badge (120 across, 100 down).
  const side = (n: number, x: number) => fanLayout(n, x, 170, 1.15, 120, 96);
  return { you: side(you, SIDE_X[0]), them: side(them, SIDE_X[1]), board: boardLayout(board, CARD_W / 2, 320, 260, 82, 1) };
}

// ── Which ways a card can be drawn ───────────────────────────────────────────

export type ShareLayout = 'hand' | 'showdown' | 'odds';
export const LAYOUT_NAMES: Record<ShareLayout, string> = { hand: 'Hand', showdown: 'Showdown', odds: 'Odds' };

const theirCards = (d: ShareData) => (d.matchup?.them?.cards.length ?? 0) > 0;
/** The ways this card can be drawn: only a hand has a choice, and only of the ones it has the data for. */
export function layoutsFor(d: ShareData): ShareLayout[] {
  if (d.kind !== 'hand') return ['hand'];
  return ['hand', ...(theirCards(d) ? (['showdown'] as const) : []), ...((d.odds?.length ?? 0) >= 2 ? (['odds'] as const) : [])];
}
export const isShareLayout = (v: unknown): v is ShareLayout => v === 'hand' || v === 'showdown' || v === 'odds';

