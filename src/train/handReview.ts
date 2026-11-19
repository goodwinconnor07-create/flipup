// Mistake review (FlipUp Premium, 19 Nov 2026): one finished Texas Hold'em hand, looked at decision by decision.
// The hand is rebuilt through the real engine (same seats, button, blinds, house rules, cards and moves), and before
// each of your moves your chance of winning is worked out against the hands each opponent's play so far points to:
// the same range model the bots think with (`botRange.ts`), from public moves only, never their real cards. That
// chance is held against the price of a call, or used to say whether a bet or a check left value behind.
//
// It's a coach's rule of thumb, not a solver: it can't see fold equity or what later streets will cost. So folds and
// calls are graded (the price is plain arithmetic), a missed river value bet is pointed out, and bets and raises
// are described rather than marked wrong. Pure: no clock, no phone, seeded dice.

import { boardCards, equityOf, imagine, opponentsOf, preflopRange, riverRange, type Card2 } from '../game/botRange';
import { toInt } from '../game/botEval';
import { hashString, seededRng, fullDeck, type Card } from '../game/cards';
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
  holes: Record<string, Card[]>;
  /** House rules the hand was dealt with. */
  house?: { ante?: number; straddle?: boolean; bomb?: boolean };
}

/** good: the right call. close: fine either way, or a small leak. mistake: it cost you. fine: nothing to grade. */
export type Verdict = 'good' | 'close' | 'mistake' | 'fine';

export interface ReviewedMove {
  /** Which move of the hand this is, counted from 1 (the replay's step). */
  step: number;
  street: Street;
  move: Move;
  /** Chips to call when you moved (0 if nobody had bet). */
  toCall: number;
  /** The pot before your move, bets on this street included. */
  pot: number;
  /** Share of the final pot a call costs (null with nothing to call). */
  price: number | null;
  /** Your chance of winning against their likely hands, 0 to 1. */
  equity: number;
  verdict: Verdict;
  /** A few words: "Fold was too tight". */
  title: string;
  /** One or two plain sentences with the numbers. */
  line: string;
  /** About how many big blinds the move gave up, on average (mistakes and close ones only). */
  costBb?: number;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const bbs = (x: number) => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10);

/** Which saved hands can be reviewed: Texas Hold'em, with your own two cards, where you made a move. */
export function canReview(h: Pick<ReviewHand, 'variant' | 'holes' | 'me' | 'actions'>): boolean {
  return h.variant === 'holdem' && h.holes[h.me]?.length === 2 && h.actions.some((a) => a.playerId === h.me && !a.outOfTurn);
}

/** Every move you made in the hand, graded. Null if the hand can't be reviewed (see `canReview`) or won't rebuild. */
export function reviewHand(saved: ReviewHand, samples = 2000): ReviewedMove[] | null {
  if (!canReview(saved)) return null;
  try {
    return review(saved, samples);
  } catch {
    // A hand that doesn't rebuild the same way (a very old save) has no review rather than a wrong one.
    return null;
  }
}

function review(saved: ReviewHand, samples: number): ReviewedMove[] {
  const n = saved.players.length;
  const rng = seededRng(hashString(`review:${saved.buttonId}:${saved.actions.length}:${saved.holes[saved.me].join('')}`));
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
  // Your cards, and anyone else's that were seen; the rest get unused cards (the review never looks at them).
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
    if (action.playerId === saved.me) out.push(grade(i + 1, action.move));
    const error = makeMove(game, action.move, action.move === 'bet' || action.move === 'raise' ? action.to : undefined, ctx);
    if (error) throw new Error(error);
  });
  return out;

  /** Your move at this point of the rebuilt hand, against the ranges their moves so far point to. */
  function grade(step: number, move: Move): ReviewedMove {
    const seat = h.seats.find((s) => s.playerId === saved.me)!;
    const stack = game.players.find((p) => p.id === saved.me)!.stack;
    const opps = opponentsOf(game, h, seat);
    const ranges = opps.map((o) => preflopRange(game, h, o.id, o.story, o.read));
    const hole = seat.cards.map(toInt) as Card2;
    const board = boardCards(h);
    // Heads-up on the river every hand they could hold is counted, weighted by how well it fits their moves (no
    // sampling, so no noise); anywhere else a few thousand deals are sampled (about ±1 to 2 points).
    const exact = h.street === 'river' && opps.length === 1;
    const im = exact ? riverRange(hole, board, opps[0], ranges[0]) : imagine(hole, board, h.street, opps, ranges, seededRng(hashString(`${step}:${h.board.join('')}`)), samples);
    const equity = equityOf(im);
    const toCall = Math.min(Math.max(0, h.currentBet - seat.bet), stack);
    const pot = potTotal(h);
    const price = toCall > 0 ? toCall / (pot + toCall) : null;
    const base = { step, street: h.street, move, toCall, pot, price, equity };
    // All in for no more than the call is a call.
    const judged = move === 'allin' && toCall > 0 && stack <= h.currentBet - seat.bet ? 'call' : move;
    // Their moves fit almost none of the hands the model expects (a very odd line): too little to grade on.
    if (!exact && im.quality < 0.05)
      return { ...base, verdict: 'fine', title: 'Hard to read', line: "Their betting doesn't fit a usual range, so this move isn't graded." };
    return { ...base, ...judge(judged, equity, price, toCall, pot, h.street, saved.bigBlind, opps.some((o) => o.allIn)) };
  }
}

/** The verdict and words for one move. Exported for the tests. */
export function judge(
  move: Move,
  equity: number,
  price: number | null,
  toCall: number,
  pot: number,
  street: Street,
  bigBlind: number,
  facingAllIn: boolean,
): Pick<ReviewedMove, 'verdict' | 'title' | 'line' | 'costBb'> {
  const E = pct(equity);
  const river = street === 'river';
  // Calling all in, or on the river, the price is all there is. Earlier a call also buys the next cards, so it gets
  // some room (draws are worth a little more than their equity when they hit and get paid).
  const plain = river || facingAllIn;
  // What a call wins or loses on average if nobody bets again: your share of the final pot less the call.
  const callEv = (equity * (pot + toCall) - toCall) / bigBlind;

  if (price !== null && (move === 'fold' || move === 'call')) {
    const P = pct(price);
    const edge = equity - price;
    if (move === 'fold') {
      if (edge > (plain ? 0.06 : 0.1))
        return { verdict: 'mistake', title: 'Fold was too tight', line: `You had about ${E} (our estimate), and the call needed ${P} (pot odds).`, costBb: bbs(callEv) };
      if (edge > 0.02) return { verdict: 'close', title: 'Close fold', line: `About ${E} (our estimate), and the call needed ${P} (pot odds). Calling was a little better.`, costBb: bbs(callEv) };
      if (preflopNoPressure(street, facingAllIn)) return { verdict: 'fine', title: 'Folded', line: `About ${E} to win (our estimate).` };
      return { verdict: 'good', title: 'Good fold', line: `About ${E} (our estimate), and the call needed ${P} (pot odds).` };
    }
    // A call.
    if (edge < (plain ? -0.08 : -0.15))
      return { verdict: 'mistake', title: 'Call was too loose', line: `You had about ${E} (our estimate), and the call needed ${P} (pot odds).`, costBb: bbs(-callEv) };
    if (edge < (plain ? -0.02 : -0.05))
      return { verdict: 'close', title: 'Thin call', line: `About ${E} (our estimate), and the call needed ${P} (pot odds).${plain ? '' : ' Your outs make up some of it.'}`, costBb: bbs(-callEv) };
    if (preflopNoPressure(street, facingAllIn)) return { verdict: 'fine', title: 'Called', line: `About ${E} to win (our estimate).` };
    if (river && equity > 0.75) return { verdict: 'good', title: 'Good call', line: `About ${E} (our estimate). A raise could have won more.` };
    return { verdict: 'good', title: 'Good call', line: `About ${E} (our estimate), and the call needed ${P} (pot odds).` };
  }

  if (move === 'check') {
    if (river && equity >= 0.72) return { verdict: 'close', title: 'Missed value', line: `You were ahead about ${E} of the time (our estimate). A bet would likely have been paid by worse.` };
    return { verdict: 'fine', title: 'Checked', line: `About ${E} to win (our estimate).` };
  }
  // Bets, raises and all ins: whether they were for value or a bluff. Folds they'd get aren't counted, so a bluff is
  // never marked wrong.
  const what = move === 'bet' ? 'bet' : move === 'raise' ? 'raise' : 'all in';
  if (equity >= 0.6) return { verdict: 'good', title: `Value ${what}`, line: `About ${E} to win (our estimate): worse hands can pay you.` };
  if (equity <= 0.3) return { verdict: 'fine', title: `A bluff`, line: `About ${E} to win (our estimate), so this ${what} needs them to fold.` };
  return { verdict: 'fine', title: `Thin ${what}`, line: `About ${E} to win (our estimate): about as often behind as ahead.` };
}

/** Before the flop, a fold or call of a normal raise isn't graded: ranges that early say little. */
const preflopNoPressure = (street: Street, facingAllIn: boolean) => street === 'preflop' && !facingAllIn;

/** The review in a line: how many mistakes, and what they cost. */
export function reviewSummary(moves: ReviewedMove[]): { mistakes: number; close: number; good: number; costBb: number; worst: ReviewedMove | null } {
  const mistakes = moves.filter((m) => m.verdict === 'mistake');
  const close = moves.filter((m) => m.verdict === 'close');
  const costBb = bbs([...mistakes, ...close].reduce((s, m) => s + (m.costBb ?? 0), 0));
  const worst = [...mistakes].sort((a, b) => (b.costBb ?? 0) - (a.costBb ?? 0))[0] ?? close[0] ?? null;
  return { mistakes: mistakes.length, close: close.length, good: moves.filter((m) => m.verdict === 'good').length, costBb, worst };
}
