import { beforeEach, expect, it } from 'vitest';
import { loadTwin, recordTwinHand, resetTwin, twinStatus } from './twin';
import type { HandRecord } from '../game';

const storage = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) };
beforeEach(() => storage.clear());

const hand = (number: number): HandRecord => ({
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
  actions: [{ street: 'preflop', playerId: 'me', move: 'fold', to: 0 }],
  board: [],
  holes: { me: ['7s', '2d'] },
  won: { me: 0, foe: 15 },
  showdown: false,
});

it('keeps the twin across visits, counts a hand once, and resets', () => {
  expect(twinStatus()).toEqual({ hands: 0, confidence: 0, ready: false });
  recordTwinHand('t#1', hand(1), 'me');
  recordTwinHand('t#1', hand(1), 'me');
  recordTwinHand('t#2', hand(2), 'me');
  expect(loadTwin().hands).toBe(2);
  resetTwin();
  expect(loadTwin().hands).toBe(0);
});

it('starts fresh when the saved twin is damaged', () => {
  storage.set('flipup.twin', '{"v":1,"hands":"lots"}');
  expect(loadTwin().hands).toBe(0);
  storage.set('flipup.twin', 'not json');
  expect(loadTwin().hands).toBe(0);
});

it('is ready to play at 50 hands', () => {
  for (let i = 1; i <= 50; i++) recordTwinHand(`t#${i}`, hand(i), 'me');
  expect(twinStatus().ready).toBe(true);
  expect(twinStatus().confidence).toBeCloseTo(50 / 300);
});
