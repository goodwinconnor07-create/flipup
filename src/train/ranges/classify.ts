// What a two-card hand is on a board, the way a player thinks of it: "set", "top pair, weak kicker", "flush draw",
// "missed straight draw". The hand generator (generate.ts) uses this to decide how each hand plays a line and to
// name the groups of a range.

import { categoryOf, score, toInt } from '../../game/botEval';
import { rankOf, suitOf, type Card } from '../../game/cards';

/**
 * How strong a made hand is, low to high:
 * 0 nothing, 1 ace-high, 3 weak pair (third pair, bottom pair, small pocket pair), 4 second pair (or a pocket pair
 * between the top two board cards), 5 top pair with a weak kicker, 6 top pair with a good kicker or an overpair,
 * 7 two pair, 8 set or trips, 9 straight, 10 flush, 11 full house or better.
 */
export type Level = 0 | 1 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type Draw = 'none' | 'gutshot' | 'open-ender' | 'flush draw' | 'nut flush draw' | 'combo draw';

export interface Kind {
  level: Level;
  draw: Draw;
  /** "Top pair, good kicker", "Flush draw", "Set"... */
  label: string;
}

const ranks = (cards: Card[]) => cards.map(rankOf);

/** Ranks that would give the hand a straight it doesn't have now, using at least one hole card. */
function straightOuts(hole: Card[], board: Card[]): number {
  const has = (cards: Card[]) => {
    let mask = 0;
    for (const r of ranks(cards)) mask |= 1 << r;
    if (mask & (1 << 14)) mask |= 2;
    for (let high = 14; high >= 5; high--) if (((mask >> (high - 4)) & 31) === 31) return true;
    return false;
  };
  if (has([...hole, ...board])) return 0;
  let outs = 0;
  for (let r = 2; r <= 14; r++) {
    const card = `${'23456789TJQKA'[r - 2]}x`;
    if (has([...hole, ...board, card]) && !has([...board, card])) outs++;
  }
  return outs;
}

/** The made-hand level of a combo on a board (3, 4 or 5 cards). */
function levelOf(hole: Card[], board: Card[]): Level {
  const all = score([...hole, ...board].map(toInt));
  const cat = categoryOf(all);
  const boardRanks = ranks(board).sort((a, b) => b - a);
  const boardPaired = new Set(boardRanks).size < boardRanks.length;
  const boardCat = board.length >= 5 ? categoryOf(score(board.map(toInt))) : boardPaired ? 1 : 0;
  // Playing the board, or not improving it: count only what the hole cards add.
  if (cat >= 8) return 11;
  if (cat >= 6) return board.length >= 5 && boardCat >= 6 ? 0 : 11;
  if (cat === 5) return board.length >= 5 && boardCat === 5 ? 1 : 10;
  if (cat === 4) return board.length >= 5 && boardCat === 4 ? 1 : 9;
  const [h1, h2] = ranks(hole);
  const top = boardRanks[0];
  const distinct = [...new Set(boardRanks)];
  const second = distinct[1] ?? 0;
  if (cat === 3) {
    // Three of a kind with a hole card: a set (pocket pair) or trips.
    return h1 === h2 || boardRanks.includes(h1) || boardRanks.includes(h2) ? 8 : 0;
  }
  const pairWith = (r: number) => boardRanks.includes(r);
  if (cat === 2) {
    // Two pair made with both hole cards (or a pocket pair over a paired board).
    if (!boardPaired && pairWith(h1) && pairWith(h2) && h1 !== h2) return 7;
    if (boardPaired && h1 === h2) return h1 > top ? 6 : h1 > second ? 4 : 3;
    if (boardPaired) {
      const mine = pairWith(h1) ? h1 : pairWith(h2) ? h2 : 0;
      if (!mine) return h1 === 14 || h2 === 14 ? 1 : 0;
      const kicker = mine === h1 ? h2 : h1;
      if (mine === top) return kicker >= 12 ? 6 : 5;
      return mine === second ? 4 : 3;
    }
    return 7;
  }
  if (cat === 1) {
    if (boardPaired) return h1 === 14 || h2 === 14 ? 1 : 0;
    if (h1 === h2) return h1 > top ? 6 : h1 > second ? 4 : 3;
    const mine = pairWith(h1) ? h1 : h2;
    const kicker = mine === h1 ? h2 : h1;
    if (mine === top) return kicker >= 12 || (top === 14 && kicker >= 11) ? 6 : 5;
    return mine === second ? 4 : 3;
  }
  return h1 === 14 || h2 === 14 ? 1 : 0;
}

/** The draw a combo has (flop or turn only). */
function drawOf(hole: Card[], board: Card[]): Draw {
  if (board.length >= 5) return 'none';
  let flush: Draw = 'none';
  for (const s of new Set(hole.map(suitOf))) {
    const n = [...hole, ...board].filter((c) => suitOf(c) === s).length;
    if (n === 4) {
      const mineHigh = Math.max(...hole.filter((c) => suitOf(c) === s).map(rankOf));
      const boardHigh = board.filter((c) => suitOf(c) === s).map(rankOf);
      const nut = mineHigh === 14 || (mineHigh === 13 && boardHigh.includes(14));
      flush = nut ? 'nut flush draw' : 'flush draw';
    }
  }
  const outs = straightOuts(hole, board);
  const straight: Draw = outs >= 2 ? 'open-ender' : outs === 1 ? 'gutshot' : 'none';
  if (flush !== 'none' && straight !== 'none') return 'combo draw';
  return flush !== 'none' ? flush : straight;
}

const LEVEL_NAME: Record<Level, string> = {
  0: 'Nothing',
  1: 'Ace-high',
  3: 'Weak pairs',
  4: 'Second pair',
  5: 'Top pair, weak kicker',
  6: 'Top pair, good kicker',
  7: 'Two pair',
  8: 'Sets and trips',
  9: 'Straights',
  10: 'Flushes',
  11: 'Full houses',
};

/** What a combo is on this board. `before` is the board a street earlier, to spot a draw that missed. */
export function classify(hole: Card[], board: Card[], before?: Card[]): Kind {
  const level = levelOf(hole, board);
  const draw = drawOf(hole, board);
  let label = LEVEL_NAME[level];
  // An overpair reads better than "top pair, good kicker".
  const [h1, h2] = ranks(hole);
  if (level === 6 && h1 === h2) label = 'Overpairs';
  if (level === 8 && h1 !== h2) label = 'Trips';
  if (level === 8 && h1 === h2) label = 'Sets';
  if (level <= 4 && draw !== 'none')
    label =
      draw === 'combo draw'
        ? 'Combo draws'
        : draw === 'nut flush draw'
          ? 'Nut flush draws'
          : draw === 'flush draw'
            ? 'Flush draws'
            : draw === 'open-ender'
              ? 'Open-enders'
              : 'Gutshots';
  if (level <= 1 && before && board.length === 5) {
    const had = drawOf(hole, before);
    if (had === 'flush draw' || had === 'nut flush draw' || had === 'combo draw') label = 'Missed flush draws';
    else if (had === 'open-ender' || had === 'gutshot') label = 'Missed straight draws';
  }
  return { level, draw, label };
}

/** Is the board "dry" (no flush draw, not connected) and high (a Q, K or A)? Raisers bet those boards a lot. */
export function texture(board: Card[]) {
  const flop = board.slice(0, 3);
  const r = ranks(flop).sort((a, b) => b - a);
  const suits = new Set(flop.map(suitOf)).size;
  const gaps = r[0] - r[2];
  const paired = new Set(r).size < 3;
  return {
    high: r[0] >= 12,
    twoTone: suits === 2,
    mono: suits === 1,
    connected: gaps <= 4 && !paired,
    low: r[0] <= 9,
    paired,
    dry: suits === 3 && (gaps > 4 || paired),
  };
}
