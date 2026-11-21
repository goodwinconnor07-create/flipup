import { describe, expect, it } from 'vitest';
import { seededRng } from '../game/cards';
import { estimateActionValues, showdownReturn, continuationProbability } from './actionValues';
import type { InformationSet } from './information';
import type { OpponentRange } from './ranges';

function river(): InformationSet {
  return {
    version: 1,
    variant: 'holdem',
    tableId: 'side-pots',
    hand: 1,
    sequence: 3,
    heroId: 'hero',
    buttonId: 'hero',
    street: 'river',
    bigBlind: 10,
    smallBlind: 5,
    currentBet: 100,
    hole: ['As', 'Ah'],
    board: ['Ad', 'Kc', '7s', '5d', '2c'],
    players: [
      { id: 'hero', seat: 0, stack: 10, bet: 20, total: 20, folded: false, allIn: false },
      { id: 'one', seat: 1, stack: 0, bet: 100, total: 100, folded: false, allIn: true },
      { id: 'two', seat: 2, stack: 0, bet: 100, total: 100, folded: false, allIn: true },
    ],
    actions: [],
    legal: {
      toCall: 10,
      canCheck: false,
      callIsAllIn: true,
      canRaise: false,
      minTo: 30,
      maxTo: 30,
      word: 'Raise',
      canFold: true,
      canHit: false,
    },
  };
}
const fixedRanges: OpponentRange[] = [
  { playerId: 'one', source: 'smoothed-action-heuristic', holdings: [{ cards: ['Ks', 'Kh'], weight: 1 }] },
  { playerId: 'two', source: 'smoothed-action-heuristic', holdings: [{ cards: ['Qs', 'Qh'], weight: 1 }] },
];
describe('Stack-capped action values', () => {
  it('awards only the eligible main pot to a short all-in caller', () => {
    const i = river();
    const result = estimateActionValues(i, fixedRanges, [{ move: 'fold' }, { move: 'call' }], seededRng(1), 16);
    // Hero adds 10, can win 3*30, and cannot win the 140-chip side pot.
    expect(result.values).toEqual([0, 80]);
    expect(result.standardErrors).toEqual([0, 0]);
    expect(showdownReturn(i, [30, 100, 100], [false, false, false], [3, 2, 1])).toBe(90);
  });
  it('includes folded chips but excludes folded players from winning', () => {
    const i = river();
    expect(showdownReturn(i, [30, 100, 100], [false, true, false], [2, 100, 1])).toBe(90);
    expect(showdownReturn(i, [30, 100, 100], [false, false, false], [1, 2, 3])).toBe(0);
  });
  it('splits each eligible pot, without splitting inaccessible side pots with hero', () => {
    const i = river();
    expect(showdownReturn(i, [30, 100, 100], [false, false, false], [5, 5, 5])).toBe(30);
  });
  it('returns an uncalled raise and never invents opponent chips', () => {
    const i = river();
    i.players = i.players.slice(0, 2);
    i.players[0].stack = 1000;
    i.players[1].stack = 10;
    i.players[1].allIn = false;
    const result = estimateActionValues(i, fixedRanges.slice(0, 1), [{ move: 'raise', to: 1000 }], seededRng(3), 100);
    // Existing 120-chip pot plus at most 10 new opponent chips; own uncalled chips are returned.
    expect(result.values[0]).toBeGreaterThanOrEqual(120);
    expect(result.values[0]).toBeLessThanOrEqual(130);
  });
  it('never folds an already all-in opponent out of a hypothetical pot', () => {
    const i = river();
    i.hole = ['Js', 'Jh'];
    i.players[0].stack = 1000;
    const result = estimateActionValues(i, fixedRanges, [{ move: 'raise', to: 1000 }], seededRng(5), 8);
    // Hypothetical action only tests settlement: extra hero investment is uncalled and returned.
    expect(result.values[0]).toBe(-80);
  });
  it('makes response estimates depend on current strength and price, never future board', () => {
    expect(continuationProbability(['As', 'Ah'], [], 10, 100)).toBeGreaterThan(continuationProbability(['7s', '2h'], [], 10, 100));
    expect(continuationProbability(['Ks', 'Kh'], ['Ad', '7s', '2c'], 100, 100)).toBeLessThan(
      continuationProbability(['Ks', 'Kh'], ['Ad', '7s', '2c'], 10, 100),
    );
  });
});
