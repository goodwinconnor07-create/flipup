import { describe, expect, it } from 'vitest';
import { decide, updateReads } from './botPlay';
import { BOTS, STYLES, styleOf } from './botStyles';
import { botLineText } from './botTalk';
import { seededRng } from './cards';
import { makeMove } from './holdem';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { options } from './selectors';
import type { Game, Hand, HandAction } from './types';

/** Plays bots-only tables and checks every move the bots choose before the table sees it (the table would quietly turn a bad one into a fold). */
function playTable(n: number, stackBb: number, hands: number, seed: number, uneven: boolean): string[] {
  const rng = seededRng(seed);
  const bb = 10;
  let clock = 1_000_000;
  let game: Game = createTable({
    hostDeviceId: 'sim',
    name: 'Host',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, startingStack: bb * stackBb, smallBlind: bb / 2, bigBlind: bb, turnSeconds: 0, rebuys: true },
    bots: n - 1,
    code: null,
    now: clock,
  });
  const started = applyAction(game, { type: 'start' }, { deviceId: 'sim', now: clock, rng });
  if (!started.ok) throw new Error(started.error);
  game = started.game;
  const problems: string[] = [];
  let played = 0;
  let lastHand = 0;
  let adjusted = -1;
  let startTotal = 0;
  for (let guard = 0; played < hands && guard < hands * 600; guard++) {
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    const over = game.hand;
    if (over?.result && adjusted !== over.number) {
      adjusted = over.number;
      const sum = game.players.reduce((a, p) => a + p.stack, 0);
      if (sum !== startTotal) problems.push(`chips: ${sum} left of ${startTotal} (n=${n}, ${stackBb}bb)`);
      // Top up anyone who's out, and now and then give someone an odd stack, so the table has short and deep players.
      for (const p of game.players) {
        if (p.stack === 0) {
          p.stack = bb * stackBb;
          p.bought += bb * stackBb;
        } else if (uneven && rng() < 0.3) {
          const next = 1 + Math.floor(rng() * bb * stackBb * 2);
          p.bought += next - p.stack;
          p.stack = next;
        }
      }
    }
    const hand = game.hand;
    if (hand && !hand.result && !hand.runout && hand.toAct && hand.nextStreetAt == null) {
      const seat = hand.seats.find((s) => s.playerId === hand.toAct)!;
      const player = game.players.find((p) => p.id === hand.toAct)!;
      const o = options(game, hand, seat);
      const { move: m } = decide(game, hand, seat, rng);
      const why = `${JSON.stringify(m)} on ${hand.street} (n=${n}, ${stackBb}bb, bet ${hand.currentBet}, min raise ${hand.minRaise}, mine ${seat.bet} of ${seat.bet + player.stack}): ${JSON.stringify(o)}`;
      if (m.move === 'check' && !o.canCheck) problems.push(`checks into a bet: ${why}`);
      if (m.move === 'fold' && o.canCheck) problems.push(`folds for free: ${why}`);
      if (m.move === 'call' && (o.canCheck || o.callIsAllIn)) problems.push(`calls when it should check or be all in: ${why}`);
      if (m.move === 'bet' || m.move === 'raise') {
        if (!o.canRaise || m.to === undefined || !Number.isInteger(m.to) || m.to < o.minTo || m.to > o.maxTo) problems.push(`bad raise: ${why}`);
        if ((m.move === 'bet') !== (hand.currentBet === 0)) problems.push(`bet or raise mixed up: ${why}`);
      } else if (m.to !== undefined) problems.push(`amount on ${m.move}: ${why}`);
      const ctx = { deviceId: 'server', now: clock, rng };
      let err: string | null;
      if (player.bot) err = makeMove(game, m.move, m.to, ctx);
      else {
        const r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: m.move, to: m.to }, { ...ctx, deviceId: 'sim' });
        err = r.ok ? null : r.error;
        if (r.ok) game = r.game;
      }
      if (err) {
        problems.push(`table refused (${err}): ${why}`);
        break;
      }
    } else {
      const r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
      if (!r.ok) {
        problems.push(`tick: ${r.error}`);
        break;
      }
      game = r.game;
    }
    if (game.hand && game.hand.number !== lastHand) {
      lastHand = game.hand.number;
      played++;
      startTotal = game.players.reduce((a, p) => a + p.stack, 0) + (game.hand.result ? 0 : game.hand.seats.reduce((a, s) => a + s.total, 0));
    }
  }
  if (played < hands) problems.push(`stuck after ${played} hands (n=${n}, ${stackBb}bb)`);
  return problems;
}

describe('bot moves', () => {
  it('are always legal, at every table size and stack depth', () => {
    const problems: string[] = [];
    for (const n of [2, 3, 6, 9]) {
      for (const stackBb of [3, 15, 40, 150]) problems.push(...playTable(n, stackBb, 25, n * 100 + stackBb, stackBb % 2 === 1));
    }
    expect(problems.slice(0, 5)).toEqual([]);
  }, 120_000);
});

describe('bot reads', () => {
  const act = (street: HandAction['street'], playerId: string, move: HandAction['move'], to: number): HandAction => ({ street, playerId, move, to });
  const read = (actions: HandAction[]) => {
    const game = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 0, code: null, now: 0 });
    const hand = { seats: ['a', 'b', 'c'].map((playerId) => ({ playerId })), actions } as unknown as Hand;
    updateReads(game, hand);
    return game.reads!;
  };

  it("doesn't count a call that puts someone all in as a raise", () => {
    const reads = read([
      act('preflop', 'a', 'raise', 60),
      // Logged as 'allin' even though it only matches the raise, or falls short of it.
      act('preflop', 'b', 'allin', 60),
      act('preflop', 'c', 'allin', 40),
      act('flop', 'a', 'bet', 100),
      act('flop', 'b', 'allin', 50),
      act('flop', 'c', 'allin', 300),
    ]);
    expect(reads.a).toMatchObject({ vpip: 1, pfr: 1, aggr: 1, calls: 0 });
    expect(reads.b).toMatchObject({ vpip: 1, pfr: 0, aggr: 0, calls: 1 });
    expect(reads.c).toMatchObject({ vpip: 1, pfr: 0, aggr: 1, calls: 0 });
  });

  it('counts a raise all in, a plain call and a fold to a bet', () => {
    const reads = read([act('preflop', 'a', 'allin', 500), act('preflop', 'b', 'call', 500), act('preflop', 'c', 'fold', 0), act('flop', 'b', 'bet', 50), act('flop', 'a', 'fold', 0)]);
    expect(reads.a).toMatchObject({ vpip: 1, pfr: 1, foldsToBet: 1, betsFaced: 1 });
    expect(reads.b).toMatchObject({ vpip: 1, pfr: 0, aggr: 1 });
    expect(reads.c).toMatchObject({ vpip: 0, pfr: 0 });
  });
});

describe('bot styles and talk', () => {
  it('keeps every style setting in range', () => {
    for (const s of Object.values(STYLES)) {
      const { pre, post } = s;
      for (const v of [pre.tight, pre.loose, pre.limp, post.overbet, post.trap, post.chase, post.scared, s.adapt, post.sticky < 0 ? 0 : post.sticky]) {
        expect(v, s.id).toBeGreaterThanOrEqual(0);
        expect(v, s.id).toBeLessThanOrEqual(1);
      }
      for (const v of [pre.aggro, post.value, post.size, post.sticky]) expect(Math.abs(v), s.id).toBeLessThanOrEqual(1);
      for (const v of [post.bluff, post.raise]) expect(v, s.id).toBeGreaterThan(0);
      expect(s.talk.chatty, s.id).toBeGreaterThan(0);
      expect(s.talk.chatty, s.id).toBeLessThanOrEqual(1);
    }
    for (const b of BOTS) expect(STYLES[b.style], b.name).toBeDefined();
  });

  it('falls back to the default style for names that are not styles', () => {
    expect(styleOf(undefined).id).toBe('pro');
    expect(styleOf('constructor').id).toBe('pro');
    expect(styleOf('__proto__').id).toBe('pro');
    expect(styleOf('maniac').id).toBe('maniac');
  });

  it('has no blank or repeated lines, and reads nothing for ids it did not make', () => {
    const events = ['thinkHard', 'thinkEasy', 'allin', 'raise', 'foldBig', 'callLight', 'yourBigBet', 'sweat', 'sweatWatch', 'sweatWin', 'sweatLose', 'bluffWon', 'bigWin', 'win', 'badBeat', 'lostToYou', 'reply', 'tiltJab', 'bluffCaught', 'idle', 'tank'];
    for (const voice of ['trash', 'friendly', ...Object.keys(STYLES)]) {
      for (const event of events) {
        const lines: string[] = [];
        for (let i = 0; botLineText(`b:${voice}:${event}:${i}`); i++) lines.push(botLineText(`b:${voice}:${event}:${i}`));
        expect(lines.length, `${voice} ${event}`).toBeGreaterThan(0);
        expect(new Set(lines).size, `${voice} ${event}`).toBe(lines.length);
        for (const l of lines) expect(l.trim(), `${voice} ${event}`).toBe(l);
      }
    }
    for (const id of ['b:shark:nope:0', 'b:toString:idle:0', 'b:constructor:idle:0', 'b:__proto__:idle:0', 'b:trash:constructor:0', 'b:shark:idle:-1', 'b:shark:idle:x', 'b:shark', 'idle']) {
      expect(botLineText(id), id).toBe('');
    }
  });
});
