// Fast hand maths for the bots. Cards are small numbers here ((rank - 2) * 4 + suit), and the
// evaluator scores a hand exactly like scoreHand() in evaluate.ts, only many times faster, so a bot
// can play out a few hundred imagined hands in a couple of milliseconds (the server has a CPU budget).

import { rankOf, RANKS, SUITS, type Card } from './cards';

export type CardInt = number;

export const toInt = (c: Card): CardInt => (rankOf(c) - 2) * 4 + SUITS.indexOf(c[1] as (typeof SUITS)[number]);
export const toCard = (c: CardInt): Card => RANKS[c >> 2] + SUITS[c & 3];
/** 2 to 14. */
export const rankInt = (c: CardInt) => (c >> 2) + 2;
export const suitInt = (c: CardInt) => c & 3;

const cnt = new Uint8Array(15);
const smask = new Uint16Array(4);
const scnt = new Uint8Array(4);

/** Highest straight in a bit mask of ranks (bit r for rank r, ace can be low), or 0. */
export function straightHigh(mask: number): number {
  const m = mask & (1 << 14) ? mask | 2 : mask;
  for (let high = 14; high >= 5; high--) if (((m >> (high - 4)) & 31) === 31) return high;
  return 0;
}

const pack = (cat: number, a = 0, b = 0, c = 0, d = 0, e = 0) => ((((cat * 16 + a) * 16 + b) * 16 + c) * 16 + d) * 16 + e;

/** Top `n` ranks set in a mask, highest first, skipping `skip`. */
function topRanks(mask: number, n: number, skip = 0, skip2 = 0): number[] {
  const out: number[] = [];
  for (let r = 14; r >= 2 && out.length < n; r--) if (mask & (1 << r) && r !== skip && r !== skip2) out.push(r);
  return out;
}

/** The same number scoreHand() gives, for 5 to 7 cards. */
export function score(cards: ArrayLike<CardInt>): number {
  cnt.fill(0);
  smask.fill(0);
  scnt.fill(0);
  let mask = 0;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const r = (c >> 2) + 2;
    const s = c & 3;
    cnt[r]++;
    smask[s] |= 1 << r;
    scnt[s]++;
    mask |= 1 << r;
  }
  let fs = -1;
  for (let s = 0; s < 4; s++) if (scnt[s] >= 5) fs = s;
  if (fs >= 0) {
    const sf = straightHigh(smask[fs]);
    if (sf) return pack(8, sf);
  }
  let quad = 0;
  let trips = 0;
  let trips2 = 0;
  let pair1 = 0;
  let pair2 = 0;
  let singles = 0;
  for (let r = 14; r >= 2; r--) {
    const n = cnt[r];
    if (n === 4) quad = r;
    else if (n === 3) {
      if (!trips) trips = r;
      else if (!trips2) trips2 = r;
    } else if (n === 2) {
      if (!pair1) pair1 = r;
      else if (!pair2) pair2 = r;
    } else if (n === 1) singles |= 1 << r;
  }
  if (quad) return pack(7, quad, topRanks(mask, 1, quad)[0] ?? 0);
  if (trips && (trips2 || pair1)) return pack(6, trips, trips2 || pair1);
  if (fs >= 0) {
    const t = topRanks(smask[fs], 5);
    return pack(5, t[0], t[1], t[2], t[3], t[4]);
  }
  const st = straightHigh(mask);
  if (st) return pack(4, st);
  if (trips) {
    const k = topRanks(mask, 2, trips);
    return pack(3, trips, k[0], k[1]);
  }
  if (pair1 && pair2) return pack(2, pair1, pair2, topRanks(mask, 1, pair1, pair2)[0] ?? 0);
  if (pair1) {
    const k = topRanks(singles, 3);
    return pack(1, pair1, k[0], k[1], k[2]);
  }
  const k = topRanks(singles, 5);
  return pack(0, k[0], k[1], k[2], k[3], k[4]);
}

/** The hand category (0 high card … 8 straight flush) from a score. */
export const categoryOf = (s: number) => Math.floor(s / 16 ** 5);

// ── What a hand is, for reading other players ──────────────────────────────
// A finer version of the buckets in botPlay.ts (and cheaper): how a player would think of their
// own hand on this board.

/** What's worth knowing about a board once, before sizing up many hands on it. */
export interface BoardInfo {
  cards: CardInt[];
  /** Bit r set for each rank r on the board. */
  mask: number;
  top: number;
  bottom: number;
  /** The board's own category: on the river its real one, before it pairs and trips only (0 to 3). */
  cat: number;
  suits: Uint8Array;
  river: boolean;
  /** For each rank r: adding it alone to the board already makes a straight. */
  straightWith: Uint8Array;
}

export function boardInfo(board: ArrayLike<CardInt>): BoardInfo {
  const cards = Array.from(board);
  let mask = 0;
  let top = 0;
  let bottom = 15;
  const suits = new Uint8Array(4);
  for (const c of cards) {
    const r = (c >> 2) + 2;
    mask |= 1 << r;
    top = Math.max(top, r);
    bottom = Math.min(bottom, r);
    suits[c & 3]++;
  }
  const straightWith = new Uint8Array(15);
  for (let r = 2; r <= 14; r++) straightWith[r] = straightHigh(mask | (1 << r)) ? 1 : 0;
  const river = cards.length >= 5;
  return { cards, mask, top, bottom, cat: river ? categoryOf(score(cards)) : boardOnlyCategory(cards), suits, river, straightWith };
}

/** 0 nothing, 1 overcards or a gutshot, 2 a draw (flush draw or open-ender), 3 a combo draw. */
export function drawLevelWith(a: CardInt, b: CardInt, info: BoardInfo): number {
  if (info.river) return 0;
  let level = 0;
  const sa = a & 3;
  const sb = b & 3;
  const na = info.suits[sa] + 1 + (sb === sa ? 1 : 0);
  const nb = info.suits[sb] + 1 + (sb === sa ? 1 : 0);
  if (na === 4 || nb === 4) level = 2;
  const ra = (a >> 2) + 2;
  const rb = (b >> 2) + 2;
  const mask = info.mask | (1 << ra) | (1 << rb);
  if (straightHigh(mask)) return level;
  let outs = 0;
  for (let r = 2; r <= 14; r++) {
    if (mask & (1 << r) || info.straightWith[r]) continue;
    if (straightHigh(mask | (1 << r))) outs++;
  }
  if (outs >= 2) level = level === 2 ? 3 : 2;
  else if (outs === 1 && level === 0) level = 1;
  if (level === 0 && ra > info.top && rb > info.top) level = 1;
  return level;
}

export function drawLevel(hole: ArrayLike<CardInt>, board: ArrayLike<CardInt>): number {
  return drawLevelWith(hole[0], hole[1], boardInfo(board));
}

/**
 * How strong a hand looks to the player holding it, 0 to 6:
 * 0 air, 1 weak (overcards, gutshot, bottom pair), 2 a draw, 3 a middle pair,
 * 4 top pair or an overpair, 5 two pair or trips that use a hole card, 6 a set, straight or better made with a hole card.
 */
export function tierWith(a: CardInt, b: CardInt, info: BoardInfo, scratch: CardInt[]): number {
  scratch.length = 0;
  scratch.push(a, b);
  for (const c of info.cards) scratch.push(c);
  const cat = categoryOf(score(scratch));
  const h0 = (a >> 2) + 2;
  const h1 = (b >> 2) + 2;
  if (cat > info.cat) {
    if (cat >= 4) return 6;
    // A set is the near-nuts; trips with one card in the hand is strong.
    if (cat === 3) return h0 === h1 ? 6 : 5;
    if (cat === 2 && info.cat === 0) return 5;
    // A pair made with a hole card (or a pocket pair on a paired board): top pair / overpair or less.
    if (h0 === h1) return h0 > info.top ? 4 : drawLevelWith(a, b, info) >= 2 ? 2 : 3;
    const paired = info.mask & (1 << h0) ? h0 : info.mask & (1 << h1) ? h1 : 0;
    if (paired === info.top) return 4;
    if (drawLevelWith(a, b, info) >= 2) return 2;
    return paired === info.bottom ? 1 : 3;
  }
  const d = drawLevelWith(a, b, info);
  if (d >= 2) return 2;
  return d === 1 ? 1 : 0;
}

export function tier(hole: ArrayLike<CardInt>, board: ArrayLike<CardInt>, scratch: CardInt[]): number {
  return tierWith(hole[0], hole[1], boardInfo(board), scratch);
}

/** Pairs/trips on the board alone (before the river): 0 none, 1 a pair, 2 two pair, 3 trips. */
function boardOnlyCategory(board: CardInt[]): number {
  let pairs = 0;
  let trips = false;
  for (let i = 0; i < board.length; i++) {
    let n = 0;
    for (let j = 0; j < board.length; j++) if (board[i] >> 2 === board[j] >> 2) n++;
    if (n >= 3) trips = true;
    else if (n === 2) pairs++;
  }
  if (trips) return 3;
  return pairs >= 4 ? 2 : pairs ? 1 : 0;
}

// ── Starting hands ─────────────────────────────────────────────────────────

/** All 1326 two-card combos as [a, b] pairs of card numbers, and each one's class index (0 to 168). */
export const COMBOS: [CardInt, CardInt][] = [];
export const COMBO_CLASS: number[] = [];
/** "AKs", "T9o", "77" for each class index, in the order the charts use (see botCharts.json). */
export function classIndexOf(a: CardInt, b: CardInt, index: Map<string, number>): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const ra = RANKS[hi >> 2];
  const rb = RANKS[lo >> 2];
  const cls = ra === rb ? ra + rb : ra + rb + ((hi & 3) === (lo & 3) ? 's' : 'o');
  return index.get(cls) ?? -1;
}
for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) COMBOS.push([b, a]);
