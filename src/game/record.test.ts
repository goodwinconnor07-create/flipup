import { describe, expect, it } from 'vitest';
import { recordNet } from './record';
import type { HandRecord } from './types';

const base = (over: Partial<HandRecord>): HandRecord => ({
  tableId: 't',
  number: 1,
  at: 0,
  smallBlind: 1,
  bigBlind: 2,
  buttonId: 'a',
  players: [
    { id: 'a', name: 'A', emoji: '🙂', seat: 0, stack: 100 },
    { id: 'b', name: 'B', emoji: '🙂', seat: 1, stack: 100 },
  ],
  actions: [],
  board: [],
  holes: {},
  won: {},
  showdown: false,
  ...over,
});

describe('recordNet', () => {
  it('gives the unmatched part of a bet back', () => {
    // Heads-up: A is the button and small blind, raises to 6, B (big blind) folds.
    const r = base({
      actions: [
        { street: 'preflop', playerId: 'a', move: 'raise', to: 6 },
        { street: 'preflop', playerId: 'b', move: 'fold', to: 0 },
      ],
      won: { a: 4 },
    });
    expect(recordNet(r, 'a')).toBe(2);
    expect(recordNet(r, 'b')).toBe(-2);
  });

  it('handles an unmatched bet on a later street', () => {
    const r = base({
      actions: [
        { street: 'preflop', playerId: 'a', move: 'call', to: 2 },
        { street: 'preflop', playerId: 'b', move: 'check', to: 2 },
        { street: 'flop', playerId: 'b', move: 'bet', to: 10 },
        { street: 'flop', playerId: 'a', move: 'fold', to: 0 },
      ],
      won: { b: 4 },
    });
    expect(recordNet(r, 'b')).toBe(2);
    expect(recordNet(r, 'a')).toBe(-2);
  });

  it('sums to zero across the table', () => {
    const r = base({
      actions: [
        { street: 'preflop', playerId: 'a', move: 'raise', to: 6 },
        { street: 'preflop', playerId: 'b', move: 'call', to: 6 },
        { street: 'flop', playerId: 'b', move: 'bet', to: 8 },
        { street: 'flop', playerId: 'a', move: 'call', to: 8 },
      ],
      won: { a: 28 },
    });
    expect(recordNet(r, 'a') + recordNet(r, 'b')).toBe(0);
    expect(recordNet(r, 'a')).toBe(14);
  });
});
