// Moments: the beats that make the mini games feel different from plain Hold'em. A die rolls, a red river keeps
// dealing, the ghost turns over its cards, the table argues about the imposter. The engine sets `hand.moment` with
// the table times, holds the betting until it is over, and the screens play it from the clock (`visibleBoard()`,
// `momentCaption()`), so every phone sees the same thing at the same time.

import type { Card } from './cards';
import type { Hand, Moment } from './types';
import { rankLabel, suitOf } from './cards';
import { describeHand } from './evaluate';
import { CIRCLE_RING, CROSS_LINES, handSets, bestHand, type Variant } from './variants';

/** Slower, so each twist can be seen. When only bots are left in the hand it all runs at this share of the time. */
export const MOMENT_TIMING = {
  /** Between the cards of a flop (or the cross) as they land one at a time. */
  cardStep: 450,
  /** After the last card of a street lands, before betting. */
  settle: 800,
  /** Pittsburgh: gap between the three rivers. */
  riverStep: 1000,
  /** Red River: gap before each extra card, long enough to say "another one". */
  redStep: 1500,
  /** Die on the River: the river lands, the die tumbles, the number shows, the card swaps, then betting. */
  diceRoll: 900,
  diceShow: 2400,
  diceSwap: 3100,
  diceEnd: 4400,
  /** A beat before the showdown, with the ghost or the 21 count hanging in the air. */
  suspenseGhost: 3200,
  suspenseBlackjack: 2400,
  suspenseWild: 1400,
  /** Crazy Pineapple: the thrown-away cards are shown for this long before the turn. */
  discards: 3000,
  /** Imposter: the table talks it over this long before the vote (or less when everyone has pointed). */
  discuss: 14000,
  discussMin: 5000,
  /** Imposter: each vote is read out, then the imposter is named. */
  tallyStep: 1100,
  tallyEnd: 2600,
  /** Blackjack Hold'em: a bust is shown for this long before the next player acts. */
  bust: 2000,
  /** When only bots are left in the hand. */
  fastShare: 0.2,
} as const;

const T = MOMENT_TIMING;

export const scaled = (ms: number, fast: boolean): number => (fast ? Math.round(ms * T.fastShare) : ms);

/** The moment for cards just dealt: board indexes `from` on up land at these offsets. */
export function dealMoment(variant: Variant, now: number, from: number, count: number, fast: boolean, redExtra = 0): Moment | null {
  if (variant === 'holdem') return null;
  let offsets: number[];
  let kind: Moment['kind'] = 'reveal';
  if (variant === 'pittsburgh' && from >= 4 && count === 3) {
    kind = 'rivers';
    offsets = [0, T.riverStep, T.riverStep * 2];
  } else if (variant === 'redriver' && redExtra > 0) {
    kind = 'redriver';
    offsets = Array.from({ length: count }, (_, i) => i * T.redStep);
  } else if (variant === 'dice' && from >= 4) {
    // The die's own show (dice.until in holdem.ts) holds the river; nothing more here.
    return null;
  } else {
    offsets = Array.from({ length: count }, (_, i) => i * T.cardStep);
  }
  const last = offsets[offsets.length - 1] ?? 0;
  const end = kind === 'dice' ? T.diceEnd : last + T.settle + (kind === 'redriver' ? 400 : 0);
  const m: Moment = { kind, at: now, until: now + scaled(end, fast), from, offsets: offsets.map((o) => scaled(o, fast)) };
  if (kind === 'dice') {
    m.rollAt = now + scaled(T.diceShow, fast);
    m.swapAt = now + scaled(T.diceSwap, fast);
  }
  return m;
}

/** True while the table is holding everyone back. */
export const momentOn = (hand: Hand | null | undefined, now: number): boolean => !!hand?.moment && now < hand.moment.until;
export const gated = (hand: Hand | null | undefined, now: number): boolean => !!hand?.moment?.gate && now < hand.moment.until;

/**
 * The board as it should look right now: cards that haven't landed yet are null, and on a die swap the old card
 * stays until the swap. Once the moment is over (or on a phone that joined late) it's the whole board.
 */
export function visibleBoard(hand: Hand, now: number): (Card | null)[] {
  const m = hand.moment;
  if (!m || hand.result || now >= m.until) return hand.board;
  const from = m.from ?? hand.board.length;
  return hand.board.map((card, i) => {
    if (i >= from) {
      const at = m.at + (m.offsets?.[i - from] ?? 0);
      return now >= at ? card : null;
    }
    if (m.kind === 'dice' && hand.dice?.out && hand.dice.in && card === hand.dice.in && m.swapAt && now < m.swapAt) return hand.dice.out;
    return card;
  });
}

/** What the die shows right now: still tumbling (null), or the number it landed on. */
export function diceFace(hand: Hand, now: number): { phase: 'none' | 'tumble' | 'rolled'; roll?: number } {
  const m = hand.moment;
  if (!hand.dice) return { phase: 'none' };
  if (!m || m.kind !== 'dice' || hand.result || now >= m.until) return { phase: 'rolled', roll: hand.dice.roll };
  if (m.rollAt && now >= m.rollAt) return { phase: 'rolled', roll: hand.dice.roll };
  if (now >= m.at + T.diceRoll) return { phase: 'tumble' };
  return { phase: 'none' };
}

/** A line for the felt while a moment plays. */
export function momentCaption(variant: Variant, hand: Hand, now: number): string | null {
  const m = hand.moment;
  if (!m || hand.result || now >= m.until) return null;
  switch (m.kind) {
    case 'redriver': {
      const shown = visibleBoard(hand, now).filter(Boolean).length;
      return shown > 5 ? '🟥 Red again! Another card…' : '🟥 Is the river red?';
    }
    case 'rivers':
      return '🌉 Three rivers. Your hand uses one';
    case 'dice': {
      const f = diceFace(hand, now);
      if (f.phase === 'none') return '🎲 Here comes the die…';
      if (f.phase === 'tumble') return '🎲 Rolling…';
      return hand.dice?.out ? `🎲 Rolled ${f.roll}: card ${f.roll} changes` : `🎲 Rolled ${f.roll}: the board stays`;
    }
    case 'suspense':
      return variant === 'ghost' ? '👻 Can anyone beat the ghost?' : variant === 'bjholdem' ? '♠️ Best hand and closest to 21…' : '🤪 Working out the wild cards…';
    case 'discuss':
      return '🕵️ Who is the imposter? Point a finger';
    case 'bust':
      return null;
    case 'discards':
      return '🍍 Cards thrown away';
    case 'reveal':
      return variant === 'beanstalk' && hand.board.length >= 3 ? '🌱 Everyone grows a card' : null;
    default:
      return null;
  }
}

/** Imposter's tally: how many votes have been read out by now, and in what order. */
export function tallyShown(hand: Hand, order: string[], now: number): number {
  const m = hand.moment;
  if (!hand.tally || !m || m.kind !== 'tally') return order.length;
  return Math.min(order.length, Math.max(0, Math.floor((now - m.at) / (m.step ?? T.tallyStep)) + 1));
}

// ── Which cards make a hand, in words ────────────────────────────────────────

export interface HandExplain {
  /** Board indexes the hand is made from. */
  board: number[];
  /** "Down the cross", "River 2", "10-12-2 on the clock". */
  note?: string;
  /** Deuces: each wild 2 in the best five and what it became ("K"). */
  wilds?: { card: Card; as: string }[];
}

const HOURS = [12, 6, 8, 2, 10, 4];

/** Which line, river or run a player's best hand uses, and what their wild cards became. */
export function explainHand(v: Variant, hole: Card[], board: Card[]): HandExplain {
  const best = bestHand(v, hole, board);
  const all = board.map((_, i) => i);
  if (v === 'crucifix' && board.length >= 5) {
    const sets = handSets(v, hole, board);
    let at = 0;
    let top = -1;
    sets.forEach((set, i) => {
      const s = describeHand(set).score;
      if (s > top) {
        top = s;
        at = i;
      }
    });
    return { board: CROSS_LINES[at].filter((i) => i < board.length), note: at === 0 ? 'down the cross' : 'across the cross' };
  }
  if (v === 'pittsburgh' && board.length > 5) {
    const used = board.slice(4).findIndex((c) => best.best.includes(c));
    const river = Math.max(0, used);
    return { board: [0, 1, 2, 3, 4 + river], note: `river ${river + 1}` };
  }
  if (v === 'circle') {
    if (board.length < 6) return { board: [] };
    let at = 0;
    let top = -1;
    for (let p = 0; p < 6; p++) {
      const run = [0, 1, 2].map((k) => CIRCLE_RING[(p + k) % 6]);
      const sc = describeHand([...hole, ...run.map((i) => board[i])]).score;
      if (sc > top) {
        top = sc;
        at = p;
      }
    }
    const run = [0, 1, 2].map((k) => CIRCLE_RING[(at + k) % 6]);
    return { board: run, note: `${run.map((i) => HOURS[i]).join('-')} o'clock` };
  }
  if (v === 'deuces') {
    const wilds = (best.wilds ?? []).map((w) => ({ card: w.card, as: w.as }));
    return { board: all, ...(wilds.length ? { wilds } : {}) };
  }
  return { board: all };
}

/** "Five of a kind, Kings · 2♣ = K" style addition for a hand pill. */
export function wildText(e: HandExplain): string {
  if (!e.wilds?.length) return '';
  const SYM = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;
  return e.wilds.map((w) => `${rankLabel(w.card)}${SYM[suitOf(w.card)]} = ${w.as}`).join(', ');
}

/** Imposter's tally: who voted, in the order the votes are read out (seat order from the button). */
export function tallyOrder(hand: Hand): string[] {
  const voted = hand.votes ?? {};
  const n = hand.seats.length;
  const from = Math.max(0, hand.seats.findIndex((s) => s.playerId === hand.buttonId));
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    const id = hand.seats[(from + i) % n].playerId;
    if (id in voted) out.push(id);
  }
  return out;
}
