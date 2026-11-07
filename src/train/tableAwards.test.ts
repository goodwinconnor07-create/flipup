import { expect, it } from 'vitest';
import { tableAwards } from './tableAwards';
import type { HandRecord } from '../game';

const base = (number: number): HandRecord => ({
  tableId: 't',
  number,
  at: 0,
  smallBlind: 5,
  bigBlind: 10,
  buttonId: 'a',
  players: [
    { id: 'a', name: 'Ann', emoji: '🙂', seat: 0, stack: 1000 },
    { id: 'b', name: 'Ben', emoji: '🤖', seat: 1, stack: 1000 },
  ],
  actions: [],
  board: [],
  holes: {},
  won: {},
  showdown: false,
});

// Ann raises and wins three small pots; Ben wins one big showdown with a flush and calls twice.
const raise = (id: string) => ({ street: 'preflop' as const, playerId: id, move: 'raise' as const, to: 30 });
const fold = (id: string) => ({ street: 'preflop' as const, playerId: id, move: 'fold' as const, to: 0 });
const hands: HandRecord[] = [
  { ...base(1), actions: [raise('a'), fold('b')], won: { a: 20 } },
  { ...base(2), actions: [raise('a'), fold('b')], won: { a: 20 } },
  { ...base(3), actions: [raise('a'), raise('a'), fold('b')], won: { a: 20 } },
  {
    ...base(4),
    actions: [
      { street: 'preflop', playerId: 'a', move: 'call', to: 10 },
      { street: 'preflop', playerId: 'b', move: 'check', to: 10 },
    ],
    board: ['2h', '7h', '9h', 'Js', '3h'],
    holes: { a: ['As', 'Ad'], b: ['Kh', 'Qh'] },
    won: { b: 500 },
    showdown: true,
  },
];

it('gives each award to whoever earned it, using only what everyone could see', () => {
  const awards = tableAwards(hands, ['a', 'b']);
  const by = Object.fromEntries(awards.map((a) => [a.id, a]));
  expect(by.wins.ids).toEqual(['a']);
  expect(by.pot.ids).toEqual(['b']);
  expect(by.hand.ids).toEqual(['b']);
  expect(by.hand.detail).toBe('Flush');
  expect(by.raiser.ids).toEqual(['a']);
});

it('leaves out an award nobody reached, and does nothing for one player or no hands', () => {
  expect(tableAwards(hands.slice(0, 1), ['a', 'b']).some((a) => a.id === 'wins')).toBe(false);
  expect(tableAwards(hands, ['a'])).toEqual([]);
  expect(tableAwards([], ['a', 'b'])).toEqual([]);
});
