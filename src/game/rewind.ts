// Rewind: the challenge where you can play a hand again from one of your decisions, with the same cards.
//
// The table is a bots-only table on the phone, and applyAction() is pure, so a decision point is just the table as
// it was before your move. Replaying it means making a different move on that copy and letting the hand play on.
// A challenge table seeds its random numbers from the table's own state (challengeRng), so the same spot always
// gets the same bot decisions and the same cards.
//
// "How it usually goes" plays each line many more times from the same spot, with the cards you can't see dealt
// again each time, and averages what you'd win or lose. Once everyone's all in it stops and uses the odds.

import { decide } from './botPlay';
import { seededRng, shuffle, type Card } from './cards';
import { equity } from './equity';
import { potTotal } from './holdem';
import { applyAction } from './reducer';
import { options } from './selectors';
import type { Game, HandLog, Move, Street } from './types';

/** You, just before one of your moves: the table as it was, and what you did. */
export interface DecisionPoint {
  hand: number;
  street: Street;
  /** The table before your move. Its hand log is left out (it's put back on a replay). */
  snapshot: Game;
  did: { move: Move; to?: number };
  /** The pot and what it cost you to stay in, for the timeline. */
  pot: number;
  toCall: number;
}

export type ChoiceKey = 'fold' | 'check' | 'call' | 'half' | 'pot' | 'allin';

export interface Choice {
  key: ChoiceKey;
  label: string;
  move: Move;
  to?: number;
}

const heroSeat = (game: Game, heroId: string) => game.hand?.seats.find((s) => s.playerId === heroId);

/** The table before a move of yours, for the Rewind list. */
export function decisionPoint(game: Game, heroId: string, did: { move: Move; to?: number }): DecisionPoint | null {
  const hand = game.hand;
  const seat = heroSeat(game, heroId);
  if (!hand || hand.result || hand.toAct !== heroId || !seat) return null;
  const o = options(game, hand, seat);
  return { hand: hand.number, street: hand.street, snapshot: { ...game, logs: [] }, did: { ...did }, pot: potTotal(hand), toCall: o.toCall };
}

/** What a move does, so two ways of saying the same thing count as one (all in for a call is a call). */
function effect(game: Game, heroId: string, move: Move, to?: number): string {
  const hand = game.hand!;
  const seat = heroSeat(game, heroId)!;
  const o = options(game, hand, seat);
  if (move === 'fold') return o.canCheck ? 'check' : 'fold';
  if (move === 'check' || (move === 'call' && o.canCheck)) return 'check';
  if (move === 'call') return 'call';
  if (move === 'allin') return o.canRaise ? `to:${o.maxTo}` : o.canCheck ? 'check' : 'call';
  return `to:${Math.max(o.minTo, Math.min(o.maxTo, to ?? o.minTo))}`;
}

/**
 * The other things you could have done at a decision point, from the engine's options: Fold, Check or Call, half
 * the pot, the pot, All in. What you actually did is left out, and two that come to the same thing are shown once.
 */
export function rewindChoices(point: DecisionPoint, heroId: string): Choice[] {
  const game = point.snapshot;
  const hand = game.hand!;
  const seat = heroSeat(game, heroId)!;
  const o = options(game, hand, seat);
  const word = o.word === 'Bet' ? 'Bet' : 'Raise to';
  const pot = potTotal(hand);
  const sized = (f: number) => Math.max(o.minTo, Math.min(o.maxTo, hand.currentBet + Math.round((pot + o.toCall) * f)));
  const all: Choice[] = [];
  if (o.canFold && !o.canCheck) all.push({ key: 'fold', label: 'Fold', move: 'fold' });
  all.push(o.canCheck ? { key: 'check', label: 'Check', move: 'check' } : { key: 'call', label: o.callIsAllIn ? `Call all in (${o.toCall.toLocaleString('en-US')})` : `Call ${o.toCall.toLocaleString('en-US')}`, move: 'call' });
  if (o.canRaise) {
    const raise = (f: number, key: ChoiceKey, name: string): Choice => {
      const to = sized(f);
      return to >= o.maxTo ? { key: 'allin', label: 'All in', move: 'allin' } : { key, label: `${name}: ${word.toLowerCase()} ${to.toLocaleString('en-US')}`, move: o.word === 'Bet' ? 'bet' : 'raise', to };
    };
    all.push(raise(0.5, 'half', 'Half pot'), raise(1, 'pot', 'Pot'), { key: 'allin', label: 'All in', move: 'allin' });
  }
  const did = effect(game, heroId, point.did.move, point.did.to);
  const seen = new Set([did]);
  return all.filter((c) => {
    const e = effect(game, heroId, c.move, c.to);
    if (seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}

/**
 * Plays a different move at a decision point. The table goes back to how it was before your move (with the hand
 * log up to that hand), and the hand carries on from the new move with the same deck. `rng` should be the
 * table's own seeded one (challengeRng), so a replay always goes the same way.
 */
export function replayFrom(point: DecisionPoint, logs: HandLog[], choice: { move: Move; to?: number }, ctx: { deviceId: string; now: number; rng: () => number }): Game | string {
  const table: Game = { ...structuredClone(point.snapshot), logs: logs.filter((l) => l.number < point.hand) };
  const hand = table.hand!;
  const r = applyAction(table, { type: 'act', hand: hand.number, seq: hand.seq, move: choice.move, ...(choice.to !== undefined ? { to: choice.to } : {}) }, ctx);
  return r.ok ? r.game : r.error;
}

// ── How it usually goes ────────────────────────────────────────────────────

/** Deals the cards you can't see again: the other players' hole cards and the rest of the deck. */
function redeal(game: Game, heroId: string, rng: () => number): void {
  const hand = game.hand!;
  const others = hand.seats.filter((s) => s.playerId !== heroId && !s.shown);
  const pool = shuffle([...others.flatMap((s) => s.cards), ...hand.deck], rng);
  for (const s of others) s.cards = pool.splice(0, s.cards.length);
  hand.deck = pool;
}

/** Your chips at the end of the hand on average, once everyone left is all in: the pots split by the odds. */
function expectedStack(game: Game, heroId: string): number {
  const hand = game.hand!;
  const me = game.players.find((p) => p.id === heroId)!;
  const live = hand.seats.filter((s) => !s.folded);
  if (!live.some((s) => s.playerId === heroId)) return me.stack;
  const levels = [...new Set(live.map((s) => s.total))].sort((a, b) => a - b);
  let prev = 0;
  let mine = me.stack;
  for (const level of levels) {
    const amount = hand.seats.reduce((sum, s) => sum + Math.max(0, Math.min(s.total, level) - Math.min(s.total, prev)), 0);
    const eligible = live.filter((s) => s.total >= level);
    prev = level;
    const at = eligible.findIndex((s) => s.playerId === heroId);
    if (at < 0 || amount === 0) continue;
    if (eligible.length === 1) {
      mine += amount;
      continue;
    }
    const e = equity(
      eligible.map((s) => s.cards as Card[]),
      hand.board,
      400,
    );
    mine += amount * (e.win[at] + e.tie[at] / 2);
  }
  return mine;
}

/**
 * One run of a line: the hidden cards dealt again, your move, then the hand played out (the bots as themselves, your
 * later decisions by the bots' own brain playing a steady regular). Returns your change over the hand in chips.
 */
function playLine(point: DecisionPoint, heroId: string, heroDevice: string, line: { move: Move; to?: number }, dealSeed: number, playSeed: number): number {
  let game: Game = structuredClone(point.snapshot);
  // Quiet, so nobody waits on table talk.
  game.challenge = { ...(game.challenge ?? { id: 'rewind' }), quiet: true };
  const hand0 = game.hand!;
  const start = hand0.startStacks?.[heroId] ?? 0;
  redeal(game, heroId, seededRng(dealSeed));
  const rng = seededRng(playSeed);
  let now = Math.max(game.createdAt, game.wakeAt ?? 0, hand0.actAt ?? 0) + 1;
  const first = applyAction(game, { type: 'act', hand: hand0.number, seq: hand0.seq, move: line.move, ...(line.to !== undefined ? { to: line.to } : {}) }, { deviceId: heroDevice, now, rng });
  if (!first.ok) return 0;
  game = first.game;
  for (let guard = 0; guard < 400; guard++) {
    const hand = game.hand;
    if (!hand || hand.number !== point.hand || hand.result) break;
    if (hand.runout) return expectedStack(game, heroId) - start;
    const me = game.players.find((p) => p.id === heroId);
    if (hand.toAct === heroId && me) {
      const seat = heroSeat(game, heroId)!;
      const m = decide(game, hand, seat, rng).move;
      let r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: m.move, ...(m.to !== undefined ? { to: m.to } : {}) }, { deviceId: heroDevice, now, rng });
      if (!r.ok) r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: options(game, hand, seat).canCheck ? 'check' : 'fold' }, { deviceId: heroDevice, now, rng });
      if (r.ok) game = r.game;
      now += 1;
      continue;
    }
    now = Math.max(now + 1, game.wakeAt ?? now + 1);
    const r = applyAction(game, { type: 'tick' }, { deviceId: 'clock', now, rng });
    if (r.ok) game = r.game;
  }
  const me = game.players.find((p) => p.id === heroId);
  return (me?.stack ?? 0) - start;
}

export interface Usually {
  /** Runs done for each line so far. */
  done: number;
  /** Runs each line gets in all. */
  total: number;
  /** Average change over the hand for each line, in big blinds (NaN before the first run). */
  avg: number[];
}

/**
 * "How it usually goes" for some lines from one decision point, run a few at a time so the screen can show
 * progress and stop when asked. Each round deals the hidden cards once and plays every line with that deal, so the
 * lines are compared on the same cards. Seeded: the same spot gives the same numbers.
 */
export function usuallyGoes(point: DecisionPoint, heroId: string, heroDevice: string, lines: { move: Move; to?: number }[], runs: number, seed = 1) {
  const bb = point.snapshot.settings.bigBlind;
  const sums = lines.map(() => 0);
  let done = 0;
  const next = seededRng(seed);
  return {
    /** Plays up to `n` more rounds. Returns where it's got to. */
    step(n: number): Usually {
      for (let i = 0; i < n && done < runs; i++, done++) {
        const deal = Math.floor(next() * 2 ** 32);
        const play = Math.floor(next() * 2 ** 32);
        lines.forEach((line, k) => (sums[k] += playLine(point, heroId, heroDevice, line, deal, play)));
      }
      return this.now();
    },
    now(): Usually {
      return { done, total: runs, avg: sums.map((s) => (done ? s / done / bb : NaN)) };
    },
  };
}
