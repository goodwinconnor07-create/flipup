import { describe, expect, it } from 'vitest';
import type { BotMove } from '../game/botPlay';
import { applyHabits } from './habits';
import type { InformationSet } from './information';
import type { Street } from '../game/types';

const ctx = { strength: 1, inPosition: true };
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);

/** Heads-up, a 200 pot, the other player checked (or bet 66, 33% of the pot). */
function spot(hole: string[], board: string[], opts: { bet?: number; street?: Street; stack?: number; heroActed?: boolean } = {}) {
  const street = opts.street ?? 'flop';
  const bet = opts.bet ?? 0;
  const stack = opts.stack ?? 900;
  const info: InformationSet = {
    version: 1,
    variant: 'holdem',
    tableId: 't',
    hand: 1,
    sequence: 1,
    heroId: 'h',
    buttonId: 'h',
    street,
    bigBlind: 10,
    smallBlind: 5,
    currentBet: bet,
    hole,
    board,
    players: [
      { id: 'h', seat: 0, stack, bet: 0, total: 100, folded: false, allIn: false },
      { id: 'v', seat: 1, stack: 900, bet, total: 100 + bet, folded: false, allIn: false },
    ],
    actions: [
      { playerId: 'h', street: 'preflop', move: 'call', to: 10 },
      { playerId: 'v', street: 'preflop', move: 'check', to: 10 },
      bet ? { playerId: 'v', street, move: 'bet', to: bet } : { playerId: 'v', street, move: 'check', to: 0 },
    ],
    legal: { toCall: bet, canCheck: !bet, callIsAllIn: false, canRaise: true, minTo: 20, maxTo: stack, word: bet ? 'Raise' : 'Bet', canFold: true, canHit: false },
  };
  if (opts.heroActed) info.actions.push({ playerId: 'h', street, move: 'bet', to: 40 });
  const actions: BotMove[] = bet
    ? [{ move: 'fold' }, { move: 'call' }, { move: 'raise', to: 2 * bet }, { move: 'raise', to: 4 * bet }, { move: 'raise', to: stack }]
    : [{ move: 'check' }, { move: 'bet', to: 10 }, { move: 'bet', to: 66 }, { move: 'bet', to: 150 }, { move: 'bet', to: 250 }, { move: 'bet', to: stack }];
  return { info, actions };
}
const TOP = ['Ks', '7d'];
const MID = ['9s', '7d'];
const AIR = ['7s', '3d'];
const BOARD = ['Kh', '9c', '2d'];

describe('everyday habits', () => {
  it('bets a big hand that was checked to, almost every time', () => {
    const { info, actions } = spot(TOP, BOARD);
    const r = applyHabits(info, actions, [1, 0, 0, 0, 0, 0], ctx);
    expect(1 - r.distribution[0]).toBeGreaterThan(0.8);
    expect(sum(r.distribution)).toBeCloseTo(1, 9);
    expect(r.note).toContain('checked-to');
  });
  it('bets sensible sizes: never the minimum, never an overbet, never the shove with a deep stack', () => {
    const { info, actions } = spot(TOP, BOARD);
    const r = applyHabits(info, actions, [1, 0, 0, 0, 0, 0], ctx);
    expect(r.distribution[1]).toBe(0);
    expect(r.distribution[4]).toBe(0);
    expect(r.distribution[5]).toBe(0);
  });
  it('leaves a stab alone when the model says it would cost a lot, and takes it when it would not', () => {
    const { info, actions } = spot(AIR, BOARD);
    const bad = applyHabits(info, actions, [1, 0, 0, 0, 0, 0], { ...ctx, values: [0, -90, -90, -150, -200, -300] });
    expect(bad.distribution[0]).toBe(1);
    const ok = applyHabits(info, actions, [1, 0, 0, 0, 0, 0], { ...ctx, values: [0, -5, -2, -20, -40, -300] });
    expect(ok.distribution[0]).toBeLessThan(1);
  });
  it('bluffs less into several players and not at all into a player who calls everything', () => {
    const { info, actions } = spot(AIR, BOARD);
    const values = [0, -5, -2, -20, -40, -300];
    const heads = applyHabits(info, actions, [1, 0, 0, 0, 0, 0], { ...ctx, values });
    const caller = applyHabits(info, actions, [1, 0, 0, 0, 0, 0], { ...ctx, values, foldRead: { mean: 0.05, confidence: 0.9 } });
    expect(1 - caller.distribution[0]).toBeLessThan(1 - heads.distribution[0]);
  });
  it('never takes probability away from a bet', () => {
    const { info, actions } = spot(MID, BOARD);
    const start = [0.2, 0, 0.5, 0.2, 0, 0.1];
    const r = applyHabits(info, actions, start, ctx);
    for (let k = 1; k < start.length; k++) expect(r.distribution[k]).toBeGreaterThanOrEqual(start[k] - 1e-12);
  });
  it('keeps a pair in against a small bet', () => {
    const { info, actions } = spot(MID, BOARD, { bet: 66 });
    const r = applyHabits(info, actions, [0.9, 0.1, 0, 0, 0], ctx);
    expect(r.distribution[0]).toBeLessThan(0.3);
    expect(sum(r.distribution)).toBeCloseTo(1, 9);
  });
  it('still folds nothing hands, and respects a raise, a big river bet and a big part of the stack', () => {
    const air = spot(AIR, BOARD, { bet: 66 });
    expect(applyHabits(air.info, air.actions, [0.9, 0.1, 0, 0, 0], ctx).distribution[0]).toBe(0.9);
    const raised = spot(MID, BOARD, { bet: 66, heroActed: true });
    expect(applyHabits(raised.info, raised.actions, [0.9, 0.1, 0, 0, 0], ctx).distribution[0]).toBe(0.9);
    const deep = spot(MID, BOARD, { bet: 66, stack: 120 });
    expect(applyHabits(deep.info, deep.actions, [0.9, 0.1, 0, 0, 0], ctx).distribution[0]).toBe(0.9);
    const river = spot(MID, ['Kh', '9c', '2d', '4s', 'Jc'], { bet: 190, street: 'river' });
    expect(applyHabits(river.info, river.actions, [0.9, 0.1, 0, 0, 0], ctx).distribution[0]).toBeGreaterThan(0.45);
  });
  it('does nothing before the flop, on a board that is a shared best hand, or at half strength twice as little', () => {
    const pre = spot(TOP, []);
    pre.info.street = 'preflop';
    expect(applyHabits(pre.info, pre.actions, [1, 0, 0, 0, 0, 0], ctx).note).toBeNull();
    const shared = spot(TOP, ['Ts', 'Js', 'Qs', 'Ks', 'As'], { street: 'river' });
    expect(applyHabits(shared.info, shared.actions, [1, 0, 0, 0, 0, 0], ctx).note).toBeNull();
    const { info, actions } = spot(TOP, BOARD);
    const full = 1 - applyHabits(info, actions, [1, 0, 0, 0, 0, 0], ctx).distribution[0];
    const half = 1 - applyHabits(info, actions, [1, 0, 0, 0, 0, 0], { ...ctx, strength: 0.5 }).distribution[0];
    expect(half).toBeCloseTo(full / 2, 6);
  });
});
