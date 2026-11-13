import type { Hand } from '../game/types';

/**
 * The table director: keeps a Casual table lively without ever touching a card.
 *
 * It reads only how active the table has been (flops seen, showdowns, pot sizes, hands checked down), from public
 * moves, over the last few hands. When the table has gone dull it raises a `lift` from 0 to 1 that the Casual bots read
 * at the start of the next hand: they bet their not-so-big hands a little more, fold to a single bet a little less and
 * come into pots a little wider. When the table is lively again the lift fades.
 *
 * What it never reads or does, so the "no adaptive difficulty" promise holds: who won or lost, anyone's chips, the
 * human's results or how long they've played; it never changes a deal, never adds an all-in, and never touches how a big
 * hand is played. The lift is frozen for the hand it was set for, like the bot level.
 */
export const DIRECTOR_WINDOW = 8;
/**
 * What a table of ordinary players sits above (our estimates, set below what six Casual bots do against each other: about
 * 59% flops, 20% showdowns and 27bb pots, so a normal table doesn't trip it): flops seen, showdowns, pot size in big
 * blinds, flops nobody bet on.
 */
export const LIVELY = { flop: 0.42, showdown: 0.14, potBb: 6, dead: 0.3 };
/** How much each lift point moves the bots, so the limits are written in one place. */
export const LIFT = { bet: 0.3, fold: 0.35, preflopWidth: 0.1 };

export interface HandPulse {
  /** A flop was dealt. */
  flop: boolean;
  showdown: boolean;
  /** Chips that were won, in big blinds. */
  potBb: number;
  /** A flop that nobody bet on, all the way down. */
  dead: boolean;
}
export interface DirectorState {
  recent: HandPulse[];
  lift: number;
}
export const emptyDirector = (): DirectorState => ({ recent: [], lift: 0 });

/** What a finished hand looked like, from public information only. */
export function pulseOf(hand: Pick<Hand, 'actions' | 'board' | 'result'>, bigBlind: number): HandPulse {
  const flop = hand.board.length >= 3;
  const postflopBet = (hand.actions ?? []).some((a) => a.street !== 'preflop' && !a.outOfTurn && ['bet', 'raise', 'allin'].includes(a.move));
  return {
    flop,
    showdown: !!hand.result?.showdown,
    potBb: (hand.result?.pots.reduce((s, p) => s + p.amount, 0) ?? 0) / Math.max(1, bigBlind),
    dead: flop && !postflopBet,
  };
}

/** 0 for a table at its liveliest, up to 1 for one where nothing happens. Needs at least four hands to say anything. */
export function dullness(recent: HandPulse[]): number {
  if (recent.length < 4) return 0;
  const mean = (f: (p: HandPulse) => number) => recent.reduce((s, p) => s + f(p), 0) / recent.length;
  const short = (have: number, want: number) => Math.max(0, Math.min(1, (want - have) / want));
  const flop = short(mean((p) => +p.flop), LIVELY.flop);
  const show = short(mean((p) => +p.showdown), LIVELY.showdown);
  const pot = short(mean((p) => Math.min(p.potBb, 3 * LIVELY.potBb)), LIVELY.potBb);
  const dead = Math.max(0, Math.min(1, (mean((p) => +p.dead) - LIVELY.dead) / (1 - LIVELY.dead)));
  return Math.min(1, 0.35 * flop + 0.3 * show + 0.2 * pot + 0.15 * dead);
}

/** Add a finished hand and move the lift towards what the last few hands say (it rises and fades over a few hands, never jumps). */
export function noteHand(state: DirectorState, pulse: HandPulse): void {
  state.recent = [...state.recent, pulse].slice(-DIRECTOR_WINDOW);
  const target = Math.min(1, dullness(state.recent) * 2.2);
  state.lift = Math.max(0, Math.min(1, state.lift * 0.6 + target * 0.4));
}
