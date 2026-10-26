// Hand and board features: what a hand is made of and what the board looks like. Pure functions of
// cards, shared by the bots' charts and the AI twin's memory. Keep in step with gto/scripts/train_bots.py.

import { rankOf, suitOf, type Card } from './cards';

/** 0 high card, 1 pair, 2 two pair, 3 trips, 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush. */
export function category(cards: Card[]): number {
  const ranks = cards.map(rankOf);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const suits = new Map<string, number[]>();
  for (const c of cards) suits.set(suitOf(c), [...(suits.get(suitOf(c)) ?? []), rankOf(c)]);
  const flushRanks = [...suits.values()].find((rs) => rs.length >= 5);
  const hasStraight = (rs: number[]) => {
    const u = new Set(rs);
    if (u.has(14)) u.add(1);
    for (let lo = 1; lo <= 10; lo++) {
      let ok = true;
      for (let r = lo; r < lo + 5; r++) if (!u.has(r)) ok = false;
      if (ok) return true;
    }
    return false;
  };
  if (flushRanks && hasStraight(flushRanks)) return 8;
  const c = [...counts.values()].sort((a, b) => b - a);
  if (c[0] >= 4) return 7;
  if (c[0] === 3 && c.length > 1 && c[1] >= 2) return 6;
  if (flushRanks) return 5;
  if (hasStraight(ranks)) return 4;
  if (c[0] === 3) return 3;
  if (c[0] === 2 && c.length > 1 && c[1] === 2) return 2;
  if (c[0] === 2) return 1;
  return 0;
}

function boardOnly(board: Card[]): number {
  const counts = new Map<number, number>();
  for (const c of board) counts.set(rankOf(c), (counts.get(rankOf(c)) ?? 0) + 1);
  const c = [...counts.values()].sort((a, b) => b - a);
  if (c[0] >= 3) return 3;
  if (c[0] === 2 && c.length > 1 && c[1] === 2) return 2;
  return c[0] === 2 ? 1 : 0;
}

/** How many ranks would make a straight that uses a hole card (2 or more: open-ended or double gutter). */
export function straightOuts(hole: Card[], board: Card[]): number {
  if (category([...hole, ...board]) >= 4) return 0;
  const have = new Set([...hole, ...board].map(rankOf));
  const boardRanks = board.map(rankOf);
  let outs = 0;
  for (let r = 2; r <= 14; r++) {
    if (have.has(r)) continue;
    const u = new Set([...have, r]);
    if (u.has(14)) u.add(1);
    const bu = new Set([...boardRanks, r]);
    if (bu.has(14)) bu.add(1);
    for (let lo = 1; lo <= 10; lo++) {
      let inU = true;
      let inB = true;
      for (let x = lo; x < lo + 5; x++) {
        if (!u.has(x)) inU = false;
        if (!bu.has(x)) inB = false;
      }
      if (inU && !inB) {
        outs++;
        break;
      }
    }
  }
  return outs;
}

export function flushDraw(hole: Card[], board: Card[]): boolean {
  if (board.length >= 5) return false;
  for (const s of ['s', 'h', 'd', 'c']) {
    const n = [...hole, ...board].filter((c) => suitOf(c) === s).length;
    if (n === 4 && hole.some((c) => suitOf(c) === s)) return true;
  }
  return false;
}

export type Bucket = 'monster' | 'strong' | 'top' | 'mid' | 'draw' | 'weak' | 'air';

export function handBucket(hole: Card[], board: Card[]): Bucket {
  const cat = category([...hole, ...board]);
  const boardCat = board.length >= 5 ? category(board) : boardOnly(board);
  const top = Math.max(...board.map(rankOf));
  if (cat >= 3 && cat > boardCat) return 'monster';
  if (cat === 2 && boardCat === 0) return 'strong';
  if ((cat >= 1 && cat > boardCat) || (cat === 2 && boardCat === 1)) {
    const h = hole.map(rankOf).sort((a, b) => b - a);
    const boardRanks = new Set(board.map(rankOf));
    if (h[0] === h[1] && !boardRanks.has(h[0])) return h[0] > top ? 'top' : 'mid';
    const mine = h.filter((r) => boardRanks.has(r));
    if (mine.length) return Math.max(...mine) === top ? 'top' : 'mid';
  }
  const overcards = hole.every((c) => rankOf(c) > top);
  if (board.length < 5) {
    if (flushDraw(hole, board) || straightOuts(hole, board) >= 2) return 'draw';
    if (straightOuts(hole, board) === 1 || overcards) return 'weak';
  } else if (overcards) return 'weak';
  return 'air';
}

export type Texture = 'dry' | 'wet' | 'paired' | 'mono';

export function boardTexture(board: Card[]): Texture {
  const ranks = [...new Set(board.map(rankOf))].sort((a, b) => a - b);
  if (ranks.length < board.length) return 'paired';
  const suitMax = Math.max(...['s', 'h', 'd', 'c'].map((s) => board.filter((c) => suitOf(c) === s).length));
  if (suitMax >= 3) return 'mono';
  const u = [...new Set(ranks.includes(14) ? [1, ...ranks] : ranks)].sort((a, b) => a - b);
  let connected = false;
  for (let lo = 1; lo <= 10; lo++) if (u.filter((r) => r >= lo && r < lo + 5).length >= 3) connected = true;
  let close = false;
  for (let i = 1; i < u.length; i++) if (u[i] - u[i - 1] <= 2) close = true;
  return connected || (suitMax === 2 && close) ? 'wet' : 'dry';
}
