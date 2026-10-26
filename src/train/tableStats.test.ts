import { expect, it } from 'vitest';
import { styleWord, tableStats } from './tableStats';
import type { HandRecord } from '../game';

const base = (number: number): HandRecord => ({
  tableId: 't',
  number,
  at: 0,
  smallBlind: 5,
  bigBlind: 10,
  buttonId: 'me',
  players: [
    { id: 'me', name: 'Me', emoji: '🙂', seat: 0, stack: 1000 },
    { id: 'foe', name: 'Foe', emoji: '🤖', seat: 1, stack: 1000 },
  ],
  actions: [],
  board: [],
  holes: {},
  won: {},
  showdown: false,
});

// 1: you raise and they fold. 2: you bet the flop with nothing and they fold. 3: you lose a showdown with aces.
const hands: HandRecord[] = [
  { ...base(1), actions: [{ street: 'preflop', playerId: 'me', move: 'raise', to: 30 }, { street: 'preflop', playerId: 'foe', move: 'fold', to: 0 }], won: { me: 20 } },
  {
    ...base(2),
    actions: [
      { street: 'preflop', playerId: 'me', move: 'raise', to: 20 },
      { street: 'preflop', playerId: 'foe', move: 'call', to: 20 },
      { street: 'flop', playerId: 'me', move: 'bet', to: 20 },
      { street: 'flop', playerId: 'foe', move: 'fold', to: 0 },
    ],
    board: ['Ah', 'Kd', '9s', '4c', '5h'],
    holes: { me: ['7c', '2d'] },
    won: { me: 40 },
  },
  {
    ...base(3),
    actions: [
      { street: 'preflop', playerId: 'me', move: 'call', to: 10 },
      { street: 'preflop', playerId: 'foe', move: 'check', to: 10 },
    ],
    board: ['2h', '7c', '9d', 'Js', '3c'],
    holes: { me: ['As', 'Ad'] },
    won: { foe: 20 },
    showdown: true,
  },
];

it('counts a table from the hands you saved', () => {
  const s = tableStats(hands, 'me');
  expect(s.hands).toBe(3);
  expect(s.won).toBe(2);
  expect(s.series).toEqual([0, 10, 30, 20]);
  expect(s.net).toBe(20);
  expect(s.bigWin).toEqual({ number: 2, net: 20 });
  expect(s.bigLoss).toEqual({ number: 3, net: -10 });
  expect(s.streak).toBe(2);
  expect(s.uncontested).toBe(2);
});

it('calls a won pot with nothing a bluff, and only then', () => {
  const s = tableStats(hands, 'me');
  expect(s.bluffsWon).toBe(1);
  // The first hand had no board and no cards on file: not counted.
  expect(tableStats(hands.slice(0, 1), 'me').bluffsWon).toBe(0);
});

it('tracks showdowns and the best hand you made', () => {
  const s = tableStats(hands, 'me');
  expect(s.showdowns).toBe(1);
  expect(s.showdownsWon).toBe(0);
  expect(s.bestMade?.name).toBe('Pair');
  expect(s.bestMade?.number).toBe(3);
});

it('measures how you played', () => {
  const s = tableStats(hands, 'me');
  expect(s.vpip).toBe(1);
  expect(s.pfr).toBeCloseTo(2 / 3);
  expect(s.style).toBe('Not enough hands');
  expect(styleWord(0.5, 0.6, 20)).toBe('Loose and aggressive');
  expect(styleWord(0.15, 0.2, 20)).toBe('Tight and patient');
});

it('copes with no hands', () => {
  const s = tableStats([], 'me');
  expect(s.hands).toBe(0);
  expect(s.series).toEqual([0]);
});
