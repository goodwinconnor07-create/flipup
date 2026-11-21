// Moments: the beats that make the mini games feel different from plain Hold'em. A die rolls, a red river keeps
// dealing, the ghost turns over its cards, The engine sets `hand.moment` with
// the table times, holds the betting until it is over, and the screens play it from the clock (`visibleBoard()`,
// `momentCaption()`), so every phone sees the same thing at the same time.

import type { Card } from './cards';
import type { Hand, Moment } from './types';
import { rankLabel, suitOf } from './cards';
import { describeHand } from './evaluate';
import { CIRCLE_HOURS, circleRuns, CROSS_LINE_NAMES, CROSS_LINES, handSets, bestHand, redBoardAt, RED_DRAWS, type Variant } from './variants';

/** Slower, so each twist can be seen. When only bots are left in the hand it all runs at this share of the time. */
export const MOMENT_TIMING = {
  /** Between the cards of a flop (or the cross) as they land one at a time. */
  cardStep: 450,
  /** After the last card of a street lands, before betting. */
  settle: 800,
  /** Pittsburgh: gap between the three rivers. */
  riverStep: 1000,
  /** Red River: gap between the cards of the river run (ten draws and the river), long enough to see each one. */
  redStep: 900,
  /** A beat before the showdown, with the ghost or the 21 count hanging in the air. */
  suspenseGhost: 3200,
  suspenseBlackjack: 2400,
  suspenseWild: 1400,
  /** Crazy Pineapple: the thrown-away cards are shown for this long before the turn. */
  discards: 3000,
  /** Slide Switch: the cards slide round the table for this long before the street's betting. */
  slides: 1600,
  /** Onion: the peeled cards turn over together and stay up this long. */
  peels: 2200,
  /** Hit Me: a bust is shown for this long before the next player acts. */
  bust: 2000,
  /** Power Cards: the table stops this long when a power is played, so everyone sees it. */
  power: 1800,
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
  } else if (variant === 'redriver' && from >= 4 && redExtra > 0) {
    kind = 'redriver';
    offsets = Array.from({ length: count }, (_, i) => i * T.redStep);
  } else if (variant === 'dice' && from >= 4) {
    // The die's own show (dice.until in holdem.ts) holds the river; nothing more here.
    return null;
  } else {
    offsets = Array.from({ length: count }, (_, i) => i * T.cardStep);
  }
  const last = offsets[offsets.length - 1] ?? 0;
  const end = last + T.settle + (kind === 'redriver' ? 400 : 0);
  const m: Moment = { kind, at: now, until: now + scaled(end, fast), from, offsets: offsets.map((o) => scaled(o, fast)) };
  return m;
}

/**
 * The board as it should look right now: cards that haven't landed yet are null, and on a die swap the old card
 * stays until the swap. Once the moment is over (or on a phone that joined late) it's the whole board.
 */
export function visibleBoard(hand: Hand, now: number): (Card | null)[] {
  const m = hand.moment;
  if (!m || hand.result || now >= m.until) return hand.board;
  // Red River: the run replays step by step (a red card added, a black one swapping out the newest card).
  if (m.kind === 'redriver' && hand.redRun) return redBoardAt(hand.redRun.base, hand.redRun.steps, redStepsShown(hand, now));
  const from = m.from ?? hand.board.length;
  return hand.board.map((card, i) => {
    if (i >= from) {
      const at = m.at + (m.offsets?.[i - from] ?? 0);
      return now >= at ? card : null;
    }
    return card;
  });
}

/** Red River: how many steps of the run have landed by now. */
export function redStepsShown(hand: Hand, now: number): number {
  const m = hand.moment;
  if (!m || m.kind !== 'redriver' || !hand.redRun) return hand.redRun?.steps.length ?? 0;
  return (m.offsets ?? []).filter((o) => now >= m.at + o).length;
}

/** A line for the felt while a moment plays. */
export function momentCaption(variant: Variant, hand: Hand, now: number): string | null {
  const m = hand.moment;
  if (!m || hand.result || now >= m.until) return null;
  switch (m.kind) {
    case 'redriver': {
      if (!hand.redRun) return '🟥 The river run';
      const n = redStepsShown(hand, now);
      const st = hand.redRun.steps[n - 1];
      if (!st) return `🟥 The river run: ${RED_DRAWS} cards, then the river`;
      const name = (c: Card) => `${rankLabel(c)}${({ s: '♠', h: '♥', d: '♦', c: '♣' } as const)[suitOf(c)]}`;
      if (st.kind === 'river') return `🏁 The river: ${name(st.card)}`;
      return st.kind === 'add' ? `🟥 ${name(st.card)} stays · ${n} of ${RED_DRAWS}` : `⬛ ${name(st.card)} swaps out ${name(st.out!)} · ${n} of ${RED_DRAWS}`;
    }
    case 'rivers':
      return '🌉 Three rivers. Your hand uses one';
    case 'suspense':
      return variant === 'ghost' ? '👻 Can anyone beat the ghost?' : variant === 'bjholdem' ? '♠️ Best hand and closest to 21…' : '🤪 Working out the wild cards…';
    case 'bust':
      return null;
    case 'discards':
      return '🍍 Cards thrown away';
    case 'reveal':
      if (variant === 'beanstalk' && hand.board.length >= 3) return '🌱 Everyone grows a card';
      return null;
    default:
      return null;
  }
}

// ── Which cards make a hand, in words ────────────────────────────────────────

export interface HandExplain {
  /** Board indexes the hand is made from. */
  board: number[];
  /** "The column", "River 2", "10-12-2 on the clock". */
  note?: string;
  /** Deuces: each wild 2 in the best five and what it became ("K"). */
  wilds?: { card: Card; as: string }[];
}


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
    return { board: CROSS_LINES[at].filter((i) => i < board.length), note: CROSS_LINE_NAMES[at] };
  }
  if (v === 'pittsburgh' && board.length > 5) {
    const used = board.slice(4).findIndex((c) => best.best.includes(c));
    const river = Math.max(0, used);
    return { board: [0, 1, 2, 3, 4 + river], note: `river ${river + 1}` };
  }
  if (v === 'circle') {
    const runs = circleRuns(board.length);
    if (!runs.length) return { board: [] };
    let run = runs[0];
    let top = -1;
    for (const r of runs) {
      const sc = describeHand([...hole, ...r.map((i) => board[i])]).score;
      if (sc > top) {
        top = sc;
        run = r;
      }
    }
    return { board: run, note: `${CIRCLE_HOURS[run[0]]} to ${CIRCLE_HOURS[run[run.length - 1]]} o'clock` };
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

