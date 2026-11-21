// Hand review (FlipUp Premium, 19 Nov 2026): one finished Texas Hold'em hand, your moves one by one, with facts only.
//
// The owner's rule, after measuring a range-model version against 144 published hands (it agreed with the experts only
// 56% of the time, docs/BOTS.md "Hand review"): nothing here is an estimate.
//   - At a bots-only table every bot's cards are known once the hand is over, so each move shows your exact chance to
//     win against the real hands still in at that moment, next to the pot odds.
//   - Online, the same only when everyone still in at that moment showed their cards; otherwise the move shows facts:
//     what the call cost, the share of the pot it needed, the bet's size and the hand you had.
// The chance to win is the cards counted out (every board to come from the flop on; before the flop, 6,000 seeded
// boards, so it says "about" with more than one opponent). It's a hindsight number: true given their cards, which you
// couldn't see. So it never calls a move a mistake. Pure: no clock, no phone.

import { equity } from '../game/equity';
import { describeHand } from '../game/evaluate';
import { fullDeck, seededRng, type Card } from '../game/cards';
import { dealNextStreet, makeMove, potTotal, startHand } from '../game/holdem';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import type { HandAction, Move, Street } from '../game/types';

/** The fields of a saved hand the review needs (`Replay` in the app has them all). */
export interface ReviewHand {
  variant: string;
  smallBlind: number;
  bigBlind: number;
  buttonId: string;
  bbId: string;
  /** Your player id. */
  me: string;
  /** In seat order, with chips before the blinds. */
  players: { id: string; stack: number }[];
  actions: HandAction[];
  board: Card[];
  /** Your cards, and every other hand that's known: all of them at a bots-only table, those shown online. */
  holes: Record<string, Card[]>;
  /** House rules the hand was dealt with. */
  house?: { ante?: number; straddle?: boolean; bomb?: boolean };
}

/** exact: every hand still in was known, so `equity` is real. facts: someone's cards were never seen. */
export type ReviewKind = 'exact' | 'facts';

export interface ReviewedMove {
  /** Which move of the hand this is, counted from 1 (the replay's step). */
  step: number;
  street: Street;
  move: Move;
  kind: ReviewKind;
  /** Chips to call when you moved (0 if nobody had bet). */
  toCall: number;
  /** The pot before your move, bets on this street included. */
  pot: number;
  /** The share of the final pot a call needed (null with nothing to call). */
  price: number | null;
  /** Exact only: your share of the pot against their real cards, 0 to 1 (a tie counts half). */
  equity: number | null;
  /** Exact, facing a bet: what calling won or lost on average against their cards if nobody bet again, in big blinds. */
  callBb: number | null;
  /** The hand you had at that moment ("Two pair, kings and fives", or your two cards before the flop). */
  holding: string;
  /** A few words: "62% to win · needed 25%", "Needed 25% to call". */
  title: string;
  /** One or two plain sentences, facts only. */
  line: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const n0 = (x: number) => Math.round(x).toLocaleString('en-US');
const bbs = (x: number) => (Math.abs(x) >= 10 ? Math.round(x) : Math.round(x * 10) / 10);
const lower = (s: string) => (/^[2-9TJQKA][shdc] /.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/** Which saved hands can be reviewed: Texas Hold'em, with your own two cards, where you made a move. */
export function canReview(h: Pick<ReviewHand, 'variant' | 'holes' | 'me' | 'actions'>): boolean {
  return h.variant === 'holdem' && h.holes[h.me]?.length === 2 && h.actions.some((a) => a.playerId === h.me && !a.outOfTurn);
}

/** Every move you made in the hand, with its facts. Null if the hand can't be reviewed or won't rebuild. */
export function reviewHand(saved: ReviewHand): ReviewedMove[] | null {
  if (!canReview(saved)) return null;
  try {
    return review(saved);
  } catch {
    // A hand that doesn't rebuild the same way (a very old save) has no review rather than a wrong one.
    return null;
  }
}

function review(saved: ReviewHand): ReviewedMove[] {
  const n = saved.players.length;
  const rng = seededRng(7);
  const ctx = { now: 0, deviceId: 'review', rng };
  const house = saved.house ?? {};
  const game = createTable({
    hostDeviceId: 'review',
    name: 'You',
    emoji: '🙂',
    settings: {
      ...DEFAULT_SETTINGS,
      turnSeconds: 0,
      smallBlind: saved.smallBlind,
      bigBlind: saved.bigBlind,
      ...(house.ante ? { ante: house.ante } : {}),
      ...(house.straddle ? { straddle: true } : {}),
      // A bomb pot: every hand is one, so the rebuilt (first) hand is.
      ...(house.bomb ? { bombEvery: 1 } : {}),
    },
    bots: n - 1,
    code: null,
    now: 0,
    rng,
  });
  game.id = 'review';
  game.players = game.players.slice(0, n);
  saved.players.forEach((s, k) => {
    const p = game.players[k];
    p.id = s.id;
    p.stack = s.stack;
    p.bot = s.id !== saved.me;
    p.deviceId = s.id === saved.me ? 'review' : null;
    p.seat = k;
  });
  // The button moves on one seat as a hand is dealt, so start it one seat before the saved hand's.
  const button = saved.players.findIndex((p) => p.id === saved.buttonId);
  game.buttonSeat = (button - 1 + n) % n;
  startHand(game, ctx);
  const h = game.hand!;
  if (h.buttonId !== saved.buttonId || h.bbId !== saved.bbId) throw new Error('The rebuilt hand put the blinds in different seats.');
  const known = new Set([...saved.board, ...Object.values(saved.holes).flat()]);
  const spare = fullDeck().filter((c) => !known.has(c));
  for (const seat of h.seats) seat.cards = saved.holes[seat.playerId]?.length === 2 ? [...saved.holes[seat.playerId]] : spare.splice(0, 2);
  const [b1, b2, b3, ...rest] = spare;
  h.deck = [b1, ...saved.board.slice(0, 3), b2, ...saved.board.slice(3, 4), b3, ...saved.board.slice(4, 5), ...rest];

  const out: ReviewedMove[] = [];
  saved.actions.forEach((action, i) => {
    if (action.outOfTurn) return;
    while (h.street !== action.street && !h.result) {
      if (h.toAct) throw new Error('The rebuilt hand is waiting on a move the saved one skipped.');
      dealNextStreet(game, ctx);
    }
    if (h.toAct !== action.playerId) throw new Error('The rebuilt hand expected someone else to act.');
    if (action.playerId === saved.me) out.push(facts(i + 1, action.move));
    const error = makeMove(game, action.move, action.move === 'bet' || action.move === 'raise' ? action.to : undefined, ctx);
    if (error) throw new Error(error);
  });
  return out;

  /** Your move at this point of the rebuilt hand. */
  function facts(step: number, move: Move): ReviewedMove {
    const seat = h.seats.find((s) => s.playerId === saved.me)!;
    const stack = game.players.find((p) => p.id === saved.me)!.stack;
    const board = h.board.slice(0, { preflop: 0, flop: 3, turn: 4, river: 5 }[h.street]);
    const toCall = Math.min(Math.max(0, h.currentBet - seat.bet), stack);
    const pot = potTotal(h);
    const price = toCall > 0 ? toCall / (pot + toCall) : null;
    const holding = board.length >= 3 ? describeHand([...seat.cards, ...board]).detail : seat.cards.join(' ');
    // Exact only when every hand still in is known (all of them at a bots-only table; online, those shown).
    const others = h.seats.filter((s) => s.playerId !== saved.me && !s.folded).map((s) => saved.holes[s.playerId]);
    const exact = others.length > 0 && others.every((c) => c?.length === 2);
    let share: number | null = null;
    if (exact) {
      const e = equity([seat.cards, ...(others as Card[][])], board);
      share = e.win[0] + e.tie[0] / 2;
    }
    const callBb = share !== null && toCall > 0 ? (share * (pot + toCall) - toCall) / saved.bigBlind : null;
    const about = share !== null && board.length === 0 && others.length > 1 ? 'about ' : '';
    const size = `${n0(toCall)} into ${n0(pot - toCall)}`;
    let title: string;
    let line: string;
    if (share !== null && price !== null) {
      title = `${pct(share)} to win · needed ${pct(price)}`;
      const ev = callBb!;
      const evLine = Math.abs(ev) < 0.05 ? 'Calling broke even on average.' : `On average, calling ${ev > 0 ? 'won' : 'lost'} ${bbs(Math.abs(ev))} bb against those cards.`;
      line = `Against their cards you had ${about}${pct(share)} to win, and the call needed ${pct(price)} (${size}). ${evLine}`;
    } else if (share !== null) {
      title = `${pct(share)} to win`;
      line = `Against their cards you had ${about}${pct(share)} to win, with ${n0(pot)} in the pot.`;
    } else if (price !== null) {
      title = `Needed ${pct(price)} to call`;
      line = `The call was ${size}, so it needed ${pct(price)} of the pot to break even. You had ${lower(holding)}. Their cards weren't shown.`;
    } else {
      title = `Pot ${n0(pot)}`;
      line = `You had ${lower(holding)}, with ${n0(pot)} in the pot. Their cards weren't shown.`;
    }
    return { step, street: h.street, move, kind: exact ? 'exact' : 'facts', toCall, pot, price, equity: share, callBb, holding, title, line };
  }
}

/** The hand in numbers: moves with exact odds, and folds or calls where the cards said the other way (hindsight). */
export function reviewSummary(moves: ReviewedMove[]): { exact: number; total: number; foldedAhead: number; calledBehind: number } {
  const exact = moves.filter((m) => m.kind === 'exact');
  return {
    exact: exact.length,
    total: moves.length,
    foldedAhead: exact.filter((m) => m.move === 'fold' && (m.callBb ?? 0) > 0).length,
    calledBehind: exact.filter((m) => m.move === 'call' && (m.callBb ?? 0) < 0).length,
  };
}
