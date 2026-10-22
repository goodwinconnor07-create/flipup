// Hand ranking: the best five-card hand from five to seven cards.

import { rankName, rankOf, suitOf, type Card } from './cards';

export const CATEGORY_NAMES = [
  'High card',
  'Pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
  'Royal flush',
] as const;

export interface HandValue {
  /** Higher beats lower; equal is a split. */
  score: number;
  /** Index into CATEGORY_NAMES (9 is a royal flush, scored as an ace-high straight flush). */
  category: number;
  /** Short name for the pill under the board: "Pair", "Flush". */
  name: string;
  /** Longer name for results: "Pair of eights", "Flush, ace high". */
  detail: string;
  /** The five cards that make the hand, best first. */
  best: Card[];
}

/** category, then up to five tie-break ranks, packed so plain number comparison works. */
function pack(category: number, ranks: number[]): number {
  let s = category;
  for (let i = 0; i < 5; i++) s = s * 16 + (ranks[i] ?? 0);
  return s;
}

/** Highest straight in a set of ranks (ace can be low), or 0. */
function straightHigh(present: boolean[]): number {
  for (let high = 14; high >= 5; high--) {
    let ok = true;
    for (let r = high; r > high - 5; r--) {
      if (!present[r === 1 ? 14 : r]) {
        ok = false;
        break;
      }
    }
    if (ok) return high;
  }
  return 0;
}

/** Just the score, for the odds calculator and the bots, where speed matters. */
export function scoreHand(cards: Card[]): number {
  return evaluate(cards, false).score;
}

/** Full details of the best hand. */
export function describeHand(cards: Card[]): HandValue {
  return evaluate(cards, true);
}

function evaluate(cards: Card[], full: boolean): HandValue {
  const counts = new Array<number>(15).fill(0);
  const bySuit: Record<string, number[]> = { s: [], h: [], d: [], c: [] };
  for (const c of cards) {
    const r = rankOf(c);
    counts[r]++;
    bySuit[suitOf(c)].push(r);
  }

  // Flush (and straight flush).
  let flushSuit: string | null = null;
  for (const s of 'shdc') if (bySuit[s].length >= 5) flushSuit = s;
  if (flushSuit) {
    const ranks = bySuit[flushSuit].sort((a, b) => b - a);
    const present = new Array<boolean>(15).fill(false);
    for (const r of ranks) present[r] = true;
    const sf = straightHigh(present);
    if (sf) {
      const want = straightRanks(sf);
      const best = full ? want.map((r) => cards.find((c) => rankOf(c) === r && suitOf(c) === flushSuit)!) : [];
      const royal = sf === 14;
      return result(
        8,
        [sf],
        full,
        best,
        royal ? 'Royal flush' : 'Straight flush',
        royal ? 'Royal flush' : `Straight flush, ${rankName(sf)} high`,
        royal,
      );
    }
  }

  // Groups by count, then rank, highest first.
  const groups: { rank: number; count: number }[] = [];
  for (let r = 14; r >= 2; r--) if (counts[r]) groups.push({ rank: r, count: counts[r] });
  groups.sort((a, b) => b.count - a.count || b.rank - a.rank);

  const top = groups[0];
  if (top.count === 4) {
    const kicker = Math.max(...groups.filter((g) => g.rank !== top.rank).map((g) => g.rank));
    return result(
      7,
      [top.rank, kicker],
      full,
      pick(cards, [top.rank, top.rank, top.rank, top.rank, kicker]),
      'Four of a kind',
      `Four ${rankName(top.rank, true)}`,
    );
  }

  if (top.count === 3) {
    const pair = groups.find((g) => g.rank !== top.rank && g.count >= 2);
    if (pair) {
      return result(
        6,
        [top.rank, pair.rank],
        full,
        pick(cards, [top.rank, top.rank, top.rank, pair.rank, pair.rank]),
        'Full house',
        `Full house, ${rankName(top.rank, true)} full of ${rankName(pair.rank, true)}`,
      );
    }
  }

  if (flushSuit) {
    const ranks = bySuit[flushSuit].slice(0, 5);
    const best = full ? ranks.map((r) => cards.find((c) => rankOf(c) === r && suitOf(c) === flushSuit)!) : [];
    return result(5, ranks, full, best, 'Flush', `Flush, ${rankName(ranks[0])} high`);
  }

  const present = counts.map((n) => n > 0);
  const st = straightHigh(present);
  if (st) return result(4, [st], full, pick(cards, straightRanks(st)), 'Straight', `Straight, ${rankName(st)} high`);

  const singles = groups.filter((g) => g.count === 1).map((g) => g.rank);
  if (top.count === 3) {
    const kick = groups
      .filter((g) => g.rank !== top.rank)
      .map((g) => g.rank)
      .slice(0, 2);
    return result(
      3,
      [top.rank, ...kick],
      full,
      pick(cards, [top.rank, top.rank, top.rank, ...kick]),
      'Three of a kind',
      `Three ${rankName(top.rank, true)}`,
    );
  }

  if (top.count === 2) {
    const second = groups[1];
    if (second && second.count === 2) {
      // A third pair can be the kicker, so take the highest rank left, not the next group.
      const kicker = Math.max(0, ...groups.slice(2).map((g) => g.rank));
      const ranks = [top.rank, top.rank, second.rank, second.rank, ...(kicker ? [kicker] : [])];
      return result(
        2,
        [top.rank, second.rank, kicker],
        full,
        pick(cards, ranks),
        'Two pair',
        `Two pair, ${rankName(top.rank, true)} and ${rankName(second.rank, true)}`,
      );
    }
    const kick = singles.slice(0, 3);
    return result(1, [top.rank, ...kick], full, pick(cards, [top.rank, top.rank, ...kick]), 'Pair', `Pair of ${rankName(top.rank, true)}`);
  }

  const high = singles.slice(0, 5);
  return result(0, high, full, pick(cards, high), 'High card', `${cap(rankName(high[0]))} high`);
}

function straightRanks(high: number): number[] {
  return [high, high - 1, high - 2, high - 3, high - 4].map((r) => (r === 1 ? 14 : r));
}

/** The cards for a list of ranks (each card used once). */
function pick(cards: Card[], ranks: number[]): Card[] {
  const used = new Set<Card>();
  const out: Card[] = [];
  for (const r of ranks) {
    const c = cards.find((x) => rankOf(x) === r && !used.has(x));
    if (c) {
      used.add(c);
      out.push(c);
    }
  }
  return out;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function result(category: number, ranks: number[], full: boolean, best: Card[], name: string, detail: string, royal = false): HandValue {
  return {
    score: pack(category, ranks),
    category: royal ? 9 : category,
    name: full ? name : '',
    detail: full ? detail : '',
    best: full ? best : [],
  };
}
