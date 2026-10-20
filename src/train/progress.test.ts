import { describe, expect, it } from 'vitest';
import type { HandHistory } from '../gto/types';
import { formatClock, formatLeft, planSeconds, planSteps } from './progress';

const hand = (streets: string[], players = 3): HandHistory => ({
  id: 'x#1',
  small_blind: 5,
  big_blind: 10,
  button: 'a',
  players: Array.from({ length: players }, (_, i) => ({ id: 'abcdef'[i], name: `P${i}`, seat: i, stack: 1000, cards: null })),
  actions: [{ street: 'preflop', player: 'a', move: 'raise', to: 30 }, ...streets.map((street) => ({ street, player: 'b', move: 'bet', to: 20 }))],
  board: ['Ks', '8d', '3c', 'Tc', '2h'],
});

describe('review activity plan', () => {
  it('has a step for each street the hand reached, in order', () => {
    expect(planSteps(hand([])).map((s) => s.id)).toEqual(['read', 'preflop', 'ranges', 'grade', 'explain']);
    expect(planSteps(hand(['flop', 'turn'])).map((s) => s.id)).toEqual(['read', 'preflop', 'ranges', 'flop', 'turn', 'grade', 'explain']);
  });

  it('takes longer the more streets there are, and longer for a first solve at a big table', () => {
    expect(planSeconds(planSteps(hand(['flop', 'turn'])))).toBeGreaterThan(planSeconds(planSteps(hand(['flop']))));
    expect(planSeconds(planSteps(hand([], 6)))).toBeGreaterThan(planSeconds(planSteps(hand([], 2))));
  });

  it('describes the board it is solving', () => {
    const flop = planSteps(hand(['flop'])).find((s) => s.id === 'flop')!;
    expect(flop.detail).toContain('K♠ 8♦ 3♣');
  });

  it('formats the clock and the time left in plain words', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatLeft(3)).toBe('a few seconds');
    expect(formatLeft(30)).toBe('about 30 seconds');
    expect(formatLeft(100)).toBe('about 2 minutes');
  });
});
