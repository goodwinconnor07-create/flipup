import { describe, expect, it } from 'vitest';
import { LIFT, dullness, emptyDirector, noteHand, pulseOf, type HandPulse } from './director';
import { noteEverydayHand, updateEverydayMemory } from './everydayLive';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { seededRng } from '../game/cards';
import { makeMove, startHand } from '../game/holdem';

const dull: HandPulse = { flop: false, showdown: false, potBb: 2, dead: false };
const lively: HandPulse = { flop: true, showdown: true, potBb: 20, dead: false };
const checked: HandPulse = { flop: true, showdown: false, potBb: 3, dead: true };
const run = (pulses: HandPulse[]) => {
  const d = emptyDirector();
  for (const p of pulses) noteHand(d, p);
  return d;
};

describe('table director', () => {
  it('says nothing before it has seen a few hands', () => {
    expect(dullness([dull, dull, dull])).toBe(0);
    expect(run([dull, dull, dull]).lift).toBeGreaterThanOrEqual(0);
  });
  it('lifts a table where nothing happens and leaves a lively one alone', () => {
    expect(run(Array(8).fill(dull)).lift).toBeGreaterThan(0.6);
    expect(run(Array(8).fill(checked)).lift).toBeGreaterThan(0.3);
    expect(run(Array(8).fill(lively)).lift).toBe(0);
  });
  it('rises and fades over a few hands, and never leaves 0 to 1', () => {
    const d = emptyDirector();
    const lifts: number[] = [];
    for (const p of [...Array(10).fill(dull), ...Array(10).fill(lively)]) {
      noteHand(d, p);
      lifts.push(d.lift);
    }
    expect(Math.max(...lifts)).toBeLessThanOrEqual(1);
    expect(Math.min(...lifts)).toBeGreaterThanOrEqual(0);
    expect(lifts[9]).toBeGreaterThan(lifts[3]);
    expect(lifts[19]).toBeLessThan(lifts[9] * 0.2);
    // No jump: one hand moves it by well under half.
    for (let k = 1; k < lifts.length; k++) expect(Math.abs(lifts[k] - lifts[k - 1])).toBeLessThan(0.5);
  });
  it('keeps only the last few hands', () => {
    expect(run(Array(30).fill(dull)).recent).toHaveLength(8);
  });
  it('keeps every nudge small enough to be a nudge', () => {
    expect(LIFT.bet).toBeLessThanOrEqual(0.3);
    expect(LIFT.fold).toBeLessThanOrEqual(0.35);
    expect(LIFT.preflopWidth).toBeLessThanOrEqual(0.1);
  });
  it('reads a finished hand from public moves only', () => {
    const hand = {
      board: ['Ah', '7d', '2c'],
      actions: [
        { playerId: 'a', street: 'preflop', move: 'call', to: 10 },
        { playerId: 'b', street: 'flop', move: 'check', to: 0 },
        { playerId: 'a', street: 'flop', move: 'check', to: 0 },
      ],
      result: { pots: [{ amount: 40, eligible: ['a', 'b'], winners: ['a'] }], won: { a: 40 }, names: {}, showdown: false },
    } as unknown as Parameters<typeof pulseOf>[0];
    expect(pulseOf(hand, 10)).toEqual({ flop: true, showdown: false, potBb: 4, dead: true });
  });
  it('is told about a hand once, by the table, and gives the next hand its lift', () => {
    const game = createTable({ hostDeviceId: 'host', name: 'Human', emoji: '🙂', bots: 3, settings: DEFAULT_SETTINGS, code: null, now: 0, rng: seededRng(5) });
    const ctx = { deviceId: 'host', now: 0, rng: seededRng(6) };
    game.status = 'playing';
    for (let n = 0; n < 6; n++) {
      startHand(game, ctx);
      updateEverydayMemory(game);
      // Every hand: the first player to act raises, everyone else folds. No flop.
      let steps = 0;
      while (!game.hand!.result && steps++ < 20) {
        makeMove(game, steps === 1 ? 'raise' : 'fold', steps === 1 ? game.settings.bigBlind * 3 : undefined, ctx);
        if (!game.hand!.toAct) break;
      }
      expect(game.hand!.result).toBeTruthy();
      noteEverydayHand(game);
      noteEverydayHand(game);
    }
    expect(game.botTable!.director!.recent).toHaveLength(6);
    expect(game.botTable!.director!.lift).toBeGreaterThan(0.3);
    startHand(game, ctx);
    updateEverydayMemory(game);
    const lifts = Object.values(game.botTable!.players).map((p) => p.profile.everyday!.lift);
    expect(lifts.every((l) => l === game.botTable!.director!.lift)).toBe(true);
  });
});
