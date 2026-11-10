import { describe, expect, it } from 'vitest';
import { calibrationContexts } from './calibration';
import { publicRangeLikelihood, summarizeRange } from './rangeAnalysis';
import { inferRanges } from './ranges';

const fixture = () => {
  const i = structuredClone(calibrationContexts().find((i) => i.street === 'turn')!);
  i.hole = ['Ts', '9s'];
  i.board = ['7s', '7h', '2c', '4d'];
  i.actions = [];
  return { i, opponent: i.players.find((p) => p.id !== i.heroId)!.id };
};

describe('Internal public-action range analysis', () => {
  it('recognizes private improvements to a made river board only in the new range revision', () => {
    const { i, opponent } = fixture();
    i.street = 'river';
    i.hole = ['2c', '3c'];
    i.board = ['Kh', 'Jh', '9h', '7h', '4h'];
    i.actions = [{ playerId: opponent, street: 'river', move: 'bet', to: 30 }];
    const old = inferRanges(i, 'public-range')[0],
      current = inferRanges(i, 'public-range-v2')[0];
    const weight = (r: typeof current) => r.holdings.find((h) => h.cards.includes('Ah') && h.cards.includes('5c'))!.weight;
    expect(weight(current)).toBeGreaterThan(weight(old));
    expect(summarizeRange(i, current).groups.some((g) => g.label === 'Flushes')).toBe(true);
    expect(current.source).toBe('public-action-range-model-2');
  });
  it('removes visible blockers and partitions all posterior mass using Range training hand groups', () => {
    const { i } = fixture();
    const range = inferRanges(i, 'public-range')[0],
      read = summarizeRange(i, range);
    const visible = new Set([...i.hole, ...i.board]);
    expect(range.holdings).toHaveLength(1035);
    expect(range.holdings.every((h) => h.cards.every((c) => !visible.has(c)))).toBe(true);
    expect(read.groups.reduce((s, g) => s + g.probability, 0)).toBeCloseTo(1, 10);
    expect(read.groups.reduce((s, g) => s + g.combinations, 0)).toBe(1035);
    expect(read.effectiveCombinations).toBeCloseTo(1035, 6);
    expect(read.groups.some((g) => g.label === 'Trips')).toBe(true);
    expect(read.topClasses).toHaveLength(8);
  });

  it('narrows raises more than calls and retains possible bluffs', () => {
    const { i, opponent } = fixture();
    const odds = () => publicRangeLikelihood(i, opponent, ['As', 'Ah']) / publicRangeLikelihood(i, opponent, ['8d', '3c']);
    i.actions = [{ playerId: opponent, street: 'preflop', move: 'call', to: i.bigBlind }];
    const callOdds = odds();
    i.actions = [{ playerId: opponent, street: 'preflop', move: 'raise', to: i.bigBlind * 3 }];
    expect(odds()).toBeGreaterThan(callOdds);
    const range = inferRanges(i, 'public-range')[0];
    expect(summarizeRange(i, range).effectiveCombinations).toBeLessThan(range.holdings.length);
    expect(range.holdings.every((h) => h.weight > 0)).toBe(true);
  });

  it('does not reinterpret a short all-in call as a raise', () => {
    const { i, opponent } = fixture();
    i.actions = [
      { playerId: i.heroId, street: 'flop', move: 'bet', to: 100 },
      { playerId: opponent, street: 'flop', move: 'call', to: 70 },
    ];
    const called = publicRangeLikelihood(i, opponent, ['7c', 'Ac']);
    i.actions[1].move = 'allin';
    expect(publicRangeLikelihood(i, opponent, ['7c', 'Ac'])).toBe(called);
  });

  it('uses only the board visible when an action happened and ignores out-of-turn actions', () => {
    const { i, opponent } = fixture();
    i.actions = [{ playerId: opponent, street: 'flop', move: 'bet', to: 20 }];
    const before = publicRangeLikelihood(i, opponent, ['As', 'Ah']);
    i.board[3] = 'Ac';
    expect(publicRangeLikelihood(i, opponent, ['As', 'Ah'])).toBe(before);
    i.actions.push({ playerId: opponent, street: 'turn', move: 'raise', to: 100, outOfTurn: true });
    expect(publicRangeLikelihood(i, opponent, ['As', 'Ah'])).toBe(before);
    const set = publicRangeLikelihood(i, opponent, ['7c', '7d']);
    expect(set).toBeGreaterThan(before);
  });
});
