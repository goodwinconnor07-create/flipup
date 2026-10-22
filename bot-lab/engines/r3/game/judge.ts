// Grades one move of yours at the moment you make it, with the same eyes the bots use: what the other
// player could hold given what they've done, how often you win against that, how often a bet makes
// them fold, and what each option is worth in chips. Nothing here looks at the other player's real
// cards or the deck, and nothing calls a server, so a Scroll card can be graded on the phone for free.
//
// Before the flop it leans on the same GTO charts the bots do (and push/fold when short); after it, it
// compares the value of your move with the best one on the table. It says how sure it is only as
// Good / Close call / Costly, like the coach.

import { boardInfo, tierWith, toInt } from './botEval';
import { effectiveBb, handBucket, handClass, inPosition, preflopGto, type Bucket } from './botPlay';
import {
  betOutcome,
  boardCards,
  CLASS_INDEX,
  CLASSES,
  equityOf,
  imagine,
  jamOutcome,
  opponentsOf,
  preflopOrder,
  preflopRange,
  shoveWidth,
  STRENGTH,
  TOP,
  type Card2,
} from './botRange';
import { potTotal } from './holdem';
import { options } from './selectors';
import type { Game, Hand, Move, PlayerRead, Seat, Street } from './types';

export type Grade = 'green' | 'yellow' | 'red';
export type Kind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

/** What a verdict rests on, so the coach can word it: the GTO chart, a push-or-fold chart, a price, or the other player's habits. */
export type How = 'chart' | 'push' | 'price' | 'pressure';

export interface Judged {
  street: Street;
  grade: Grade;
  mine: Kind;
  best: Kind;
  /** The best bet or raise, as a share of the pot (when it is one). */
  bestSize?: number;
  /** Chips given up against the best move, as a share of the pot. 0 when yours was best. */
  loss: number;
  /** Nothing much to choose between the options, so the grade says little. */
  easy: boolean;
  how: How;
  bucket: Bucket;
  /** Your chance of winning against what they could hold. */
  eq?: number;
  /** The chance you need to break even on a call. */
  need?: number;
  /** How often they'd fold to your bet or raise. */
  folds?: number;
  /** Before the flop: how often GTO makes your move with this hand. */
  freq?: number;
  /** Before the flop: the raise was out of shape. */
  size?: 'big' | 'small';
  /** Opening or raising when it was the best thing, or folding when it was, and so on: whether your move is the aggressive kind. */
  mixed?: boolean;
}

type Rng = () => number;

/** Pot shares: within the first you gave up nothing worth naming; past the second it cost real chips. */
const GREEN = 0.07;
const YELLOW = 0.18;

const gradeOf = (loss: number): Grade => (loss <= GREEN ? 'green' : loss <= YELLOW ? 'yellow' : 'red');

/** A GTO frequency into a grade: a move GTO makes now and then is still fine. */
const gradeFreq = (freq: number): Grade => (freq >= 0.2 ? 'green' : freq >= 0.06 ? 'yellow' : 'red');

/** Your move as a plain kind, the way the table will read it. */
export function kindOf(hand: Hand, seat: Seat, move: Move, to: number | undefined, maxTo: number): { kind: Kind; to?: number } {
  const toCall = Math.max(0, hand.currentBet - seat.bet);
  if (move === 'allin') {
    if (maxTo <= hand.currentBet) return { kind: toCall > 0 ? 'call' : 'check' };
    return { kind: 'allin', to: maxTo };
  }
  if (move === 'bet' || move === 'raise') return { kind: move, to };
  return { kind: move };
}

const isRaise = (k: Kind) => k === 'bet' || k === 'raise' || k === 'allin';

/**
 * Grades `move` before it's played. `game` and `hand` are the table as it stands on your turn, with your
 * seat the one to act. Other players' real cards are never read.
 */
export function judgeMove(game: Game, hand: Hand, seat: Seat, move: Move, to: number | undefined, rng: Rng): Judged {
  return hand.street === 'preflop' ? judgePre(game, hand, seat, move, to, rng) : judgePost(game, hand, seat, move, to, rng);
}

// ── Before the flop ─────────────────────────────────────────────────────────

function judgePre(game: Game, hand: Hand, seat: Seat, move: Move, to: number | undefined, rng: Rng): Judged {
  const bb = game.settings.bigBlind;
  const o = options(game, hand, seat);
  const cls = handClass(seat.cards);
  const ci = CLASS_INDEX.get(cls) ?? 0;
  const mine = kindOf(hand, seat, move, to, o.maxTo);
  const g = preflopGto(game, hand, seat);
  const eff = effectiveBb(game, hand, seat);
  const order = preflopOrder(hand);
  const behind = order.length - 1 - order.indexOf(seat.playerId);
  const player = game.players.find((p) => p.id === seat.playerId);
  const stack = (player?.stack ?? 0) + seat.bet;
  const base = { street: 'preflop' as Street, mine: mine.kind, bucket: 'air' as Bucket, loss: 0, easy: false };

  // Short stack and nobody has raised: shove or fold.
  if ((g.spot === 'rfi' || g.spot === 'limp') && eff <= 13 && o.canRaise) {
    // Heads up the button shoves a lot more than the bots' own tables do (about half the hands at 12 big blinds).
    const width = (behind <= 1 ? Math.max(0.2, Math.min(1, 1.05 - 0.047 * eff)) : shoveWidth(eff, behind)) * (g.limpers ? 0.8 : 1);
    const shove = Math.max(0, Math.min(1, (width - TOP[ci]) / 0.04 + 0.5));
    const freq = isRaise(mine.kind) ? shove : 1 - shove;
    return {
      ...base,
      grade: gradeFreq(freq),
      best: shove >= 0.5 ? 'allin' : o.canCheck ? 'check' : 'fold',
      loss: (Math.max(shove, 1 - shove) - freq) * 0.3,
      how: 'push',
      freq,
    };
  }

  // A big decision: a shove or a raise that commits a lot. Price it against what they'd do that with.
  const commits = o.toCall >= Math.max(bb * 10, stack * 0.3);
  if (o.toCall > 0 && commits) {
    const opps = opponentsOf(game, hand, seat);
    const ranges = opps.map((x) => preflopRange(game, hand, x.id, x.story, x.read));
    const hole: Card2 = [toInt(seat.cards[0]), toInt(seat.cards[1])];
    const im = imagine(hole, [], 'preflop', opps, ranges, rng, 400);
    const eq = equityOf(im);
    const pot = potTotal(hand);
    const allInAlready = o.callIsAllIn || opps.every((x) => hand.seats.find((s) => s.playerId === x.id)?.allIn);
    const realise = allInAlready ? 1 : inPosition(hand, seat.playerId) ? 0.95 : 0.85;
    const vCall = eq * (pot + o.toCall) * realise - o.toCall;
    const values: [Kind, number][] = [
      ['fold', 0],
      ['call', vCall],
    ];
    if (!allInAlready && o.canRaise) {
      const most = Math.max(
        0,
        ...opps.map((x) => (game.players.find((p) => p.id === x.id)?.stack ?? 0) + (hand.seats.find((s) => s.playerId === x.id)?.bet ?? 0)),
      );
      const jam = Math.min(stack, most);
      const put = jam - seat.bet;
      const finalPot =
        pot +
        put +
        opps.reduce((a, x) => a + Math.max(0, jam - (hand.seats.find((s) => s.playerId === x.id)?.bet ?? 0)), 0) / Math.max(1, opps.length);
      const prices = opps.map((x) => Math.max(0, jam - (hand.seats.find((s) => s.playerId === x.id)?.bet ?? 0)) / Math.max(1, finalPot));
      const out = jamOutcome(im, opps, prices);
      values.push(['allin', out.fold * pot + (1 - out.fold) * (out.eqCalled * finalPot - put)]);
    }
    const best = values.reduce((a, b) => (b[1] > a[1] ? b : a));
    const mineValue = values.find(([k]) => k === (isRaise(mine.kind) ? 'allin' : mine.kind))?.[1] ?? 0;
    const loss = Math.max(0, (best[1] - mineValue) / Math.max(1, pot));
    const spread = Math.max(...values.map(([, v]) => v)) - Math.min(...values.map(([, v]) => v));
    return {
      ...base,
      grade: gradeOf(loss),
      best: best[0],
      loss,
      easy: spread / Math.max(1, pot) < 0.08,
      how: 'price',
      eq,
      need: o.toCall / (pot + o.toCall),
    };
  }

  // The ordinary case: the GTO chart's mix for your hand. The solved charts are close to all-or-nothing, so a
  // hand right on the edge of a range looks wrong either way. Blending in the hands of about the same strength
  // keeps a reasonable play from reading as a blunder.
  const near = CLASSES.filter((c) => Math.abs((STRENGTH.get(c) ?? 0) - (STRENGTH.get(cls) ?? 0)) <= 0.06 && c !== cls);
  const around = near.map((c) => preflopGto(game, hand, seat, c));
  const avg = (pick: (x: { call: number; raise: number }) => number) =>
    around.length ? around.reduce((a, x) => a + pick(x), 0) / around.length : 0;
  const call = 0.5 * g.call + 0.5 * (around.length ? avg((x) => x.call) : g.call);
  const raise = 0.5 * g.raise + 0.5 * (around.length ? avg((x) => x.raise) : g.raise);
  const mix: Record<'fold' | 'call' | 'raise', number> = { fold: Math.max(0, 1 - call - raise), call, raise };
  const group = isRaise(mine.kind) ? 'raise' : mine.kind === 'fold' ? 'fold' : 'call';
  const freq = mix[group];
  const top = (Object.entries(mix) as ['fold' | 'call' | 'raise', number][]).sort((a, b) => b[1] - a[1])[0];
  const bestKind: Kind =
    top[0] === 'raise'
      ? hand.currentBet > bb
        ? 'raise'
        : 'bet'
      : top[0] === 'call'
        ? o.canCheck
          ? 'check'
          : 'call'
        : o.canCheck
          ? 'check'
          : 'fold';
  let grade = gradeFreq(freq);
  // Playing the hand when GTO plays it most of the time (just not in this way) is a close call, never a blunder.
  if (group !== 'fold' && mix.call + mix.raise >= 0.5 && grade === 'red') grade = 'yellow';
  // A sensible raise size matters too: a big open or a huge re-raise gives chips away.
  let size: Judged['size'];
  if (isRaise(mine.kind) && mine.kind !== 'allin' && mine.to) {
    const open = hand.currentBet <= bb;
    const ratio = open ? mine.to / bb : mine.to / Math.max(1, hand.currentBet);
    const small = open ? 2 : 2;
    const large = open ? (eff <= 30 ? 4.5 : 4) : 5;
    if (ratio > large) size = 'big';
    else if (ratio < small && !(eff <= 20)) size = 'small';
    if (size && grade === 'green') grade = 'yellow';
  }
  return {
    ...base,
    grade,
    best: bestKind,
    loss: Math.max(0, top[1] - freq) * 0.25,
    easy: false,
    how: 'chart',
    freq,
    size,
    mixed: freq < top[1] - 0.15,
  };
}

// ── After the flop ──────────────────────────────────────────────────────────

function judgePost(game: Game, hand: Hand, seat: Seat, move: Move, to: number | undefined, rng: Rng): Judged {
  const o = options(game, hand, seat);
  const mine = kindOf(hand, seat, move, to, o.maxTo);
  const pot = potTotal(hand);
  const river = hand.street === 'river';
  const opps = opponentsOf(game, hand, seat);
  const ranges = opps.map((x) => preflopRange(game, hand, x.id, x.story, x.read));
  const hole: Card2 = [toInt(seat.cards[0]), toInt(seat.cards[1])];
  const board = boardCards(hand);
  const im = imagine(hole, board, hand.street, opps, ranges, rng, 520);
  const eq = equityOf(im);
  const ip = inPosition(hand, seat.playerId);
  const realise = river ? 1 : ip ? 1 : 0.88;
  const myTier = tierWith(hole[0], hole[1], boardInfo(board), []);
  const stackOf = (id: string) => game.players.find((p) => p.id === id)?.stack ?? 0;
  const behind = stackOf(seat.playerId);
  const theirBehind = Math.max(0, ...opps.map((x) => stackOf(x.id)));
  const effBehind = Math.min(behind, theirBehind + Math.max(0, hand.currentBet - seat.bet));
  const committed = opps.map((x) => {
    const st = hand.seats.find((q) => q.playerId === x.id)!;
    return st.total / Math.max(1, st.total + stackOf(x.id));
  });
  const bucket = handBucket(seat.cards, hand.board);

  // What a bet of `amount` chips (when nobody has bet) is worth.
  const betValue = (amount: number) => {
    const out = betOutcome(im, opps, amount / pot, river, false, committed);
    const v =
      out.fold * pot +
      (1 - out.fold) * (out.eqCalled * (pot + 2 * amount) * realise - amount) -
      out.raised * amount * (myTier >= 5 ? 0 : myTier === 4 ? 0.4 : 0.9);
    return { v, folds: out.fold };
  };
  // What a raise to `total` over a bet is worth.
  const bigPot = pot + o.toCall;
  const raiseValue = (total: number) => {
    const put = Math.min(behind, total - seat.bet);
    const out = betOutcome(im, opps, (total - hand.currentBet) / Math.max(1, bigPot), river, true, committed);
    const v =
      out.fold * pot + (1 - out.fold) * (out.eqCalled * (pot + put + (total - hand.currentBet)) * (put >= behind ? 1 : realise) - put);
    return { v, folds: out.fold };
  };

  interface Opt {
    kind: Kind;
    v: number;
    size?: number;
    folds?: number;
  }
  const opts: Opt[] = [];
  const vCheck = eq * pot * realise;
  const vCall = eq * (pot + o.toCall) * (o.callIsAllIn ? 1 : realise) - o.toCall;
  if (o.canCheck) {
    opts.push({ kind: 'check', v: vCheck });
    let sizes = [0.33, 0.66, 1];
    if (effBehind <= pot * 1.3) sizes = [...sizes.filter((f) => f * pot < effBehind * 0.8), effBehind / pot];
    for (const f of sizes) {
      const amount = Math.min(effBehind, f * pot);
      if (amount < game.settings.bigBlind || !o.canRaise) continue;
      const r = betValue(amount);
      opts.push({ kind: amount >= behind ? 'allin' : 'bet', v: r.v, size: f, folds: r.folds });
    }
  } else {
    opts.push({ kind: 'fold', v: 0 });
    opts.push({ kind: o.callIsAllIn ? 'allin' : 'call', v: vCall });
    if (o.canRaise && !o.callIsAllIn) {
      const most = Math.max(0, ...opps.map((x) => stackOf(x.id) + (hand.seats.find((q) => q.playerId === x.id)?.bet ?? 0)));
      const cap = Math.min(seat.bet + behind, most);
      const targets = [Math.min(cap, hand.currentBet + bigPot * 0.8)];
      if (cap - seat.bet <= bigPot * 2.5 && cap > targets[0]) targets.push(cap);
      for (const total of targets) {
        if (total <= hand.currentBet) continue;
        const r = raiseValue(total);
        opts.push({
          kind: total >= seat.bet + behind ? 'allin' : 'raise',
          v: r.v,
          size: (total - hand.currentBet) / bigPot,
          folds: r.folds,
        });
      }
    }
  }

  // Your own move, priced the same way (a size that isn't one of the standard ones is worked out as it is).
  let mineV: number;
  let mineFolds: number | undefined;
  if (mine.kind === 'fold') mineV = 0;
  else if (mine.kind === 'check') mineV = vCheck;
  else if (mine.kind === 'call') mineV = vCall;
  else {
    const total = Math.max(hand.currentBet + 1, Math.min(seat.bet + behind, mine.to ?? o.maxTo));
    const r = o.canCheck ? betValue(Math.min(behind, total - seat.bet)) : raiseValue(total);
    mineV = r.v;
    mineFolds = r.folds;
  }
  // How much a bet or raise gains over the best quiet move is the least certain part of the sums (it rests on how
  // often they fold), so only part of it counts. Calling a draw against a bet isn't a blunder because a raise looks better.
  const quiet = Math.max(
    ...opts.filter((x) => !isRaise(x.kind)).map((x) => x.v),
    mine.kind === 'fold' || mine.kind === 'check' || mine.kind === 'call' ? mineV : -Infinity,
  );
  const trim = (kind: Kind, v: number) => (isRaise(kind) && v > quiet ? quiet + 0.4 * (v - quiet) : v);
  for (const x of opts) x.v = trim(x.kind, x.v);
  mineV = trim(mine.kind, mineV);
  const best = opts.reduce((a, b) => (b.v > a.v ? b : a));
  const worst = opts.reduce((a, b) => (b.v < a.v ? b : a));
  const top = Math.max(best.v, mineV);
  const loss = Math.max(0, (top - mineV) / Math.max(1, pot));
  const easy = (best.v - worst.v) / Math.max(1, pot) < 0.08;
  return {
    street: hand.street,
    grade: gradeOf(loss),
    mine: mine.kind,
    best: best.kind,
    bestSize: best.size,
    loss,
    easy,
    how: isRaise(mine.kind) || isRaise(best.kind) ? 'pressure' : 'price',
    bucket,
    eq,
    need: o.toCall > 0 ? o.toCall / (pot + o.toCall) : undefined,
    folds: mineFolds ?? best.folds,
  };
}

// ── What we say about the other player ──────────────────────────────────────

/** How a card describes the other player's habits: the numbers a player is told, and the bots' notes are made from. */
export interface Habits {
  /** Share of hands they play. */
  vpip: number;
  /** Share of hands they raise before the flop. */
  pfr: number;
  /** How often they fold to a bet. */
  foldToBet: number;
  /** Bets and raises for each call. */
  aggression: number;
  /** Of the hands they bet that get shown, the share that were bluffs. */
  bluffy?: number;
  /** How often they bet when checked to. */
  betFreq?: number;
}

/** The same habits as the kind of note the bots keep on a player, from 40 imagined hands. */
export function readFromHabits(h: Habits): PlayerRead {
  const hands = 40;
  const faced = 30;
  const calls = 20;
  return {
    hands,
    vpip: Math.round(hands * h.vpip),
    pfr: Math.round(hands * h.pfr),
    betsFaced: faced,
    foldsToBet: Math.round(faced * h.foldToBet),
    aggr: Math.max(0, Math.round(h.aggression * (calls + 4) - 1.4 * 4)),
    calls,
    betOpps: 30,
    bets: Math.round(30 * (h.betFreq ?? 0.42)),
    shownBets: 10,
    shownBluffs: Math.round(10 * (h.bluffy ?? 0.25)),
  };
}
