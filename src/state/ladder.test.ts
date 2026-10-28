import { beforeEach, expect, it } from 'vitest';
import { legendOpen, loadProgress, settleTable, BADGES } from './progress';
import { LEGENDS, type Game } from '../game';

const storage = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) };
beforeEach(() => storage.clear());

/** A finished heads-up table against a legend: you have all the chips (or they do). */
function table(id: string, legend: string, youWon: boolean): Game {
  return {
    id,
    hands: 8,
    legendGame: legend,
    players: [
      { id: 'me', deviceId: 'dev', stack: youWon ? 2000 : 0, bought: 1000 },
      { id: 'bot', deviceId: '', stack: youWon ? 0 : 2000, bought: 1000 },
    ],
  } as unknown as Game;
}

it('opens the ladder one legend at a time', () => {
  const p = loadProgress();
  expect(LEGENDS.filter((l) => legendOpen(p, l.id)).map((l) => l.id)).toEqual(['brunson']);
  const report = settleTable(table('g1', 'brunson', true), 'dev', []);
  expect(report?.beat).toBe('brunson');
  expect(report?.firstBeat).toBe(true);
  expect(report?.unlocked).toBe('hellmuth');
  expect(report?.newBadges).toContain('beat-brunson');
  expect(report?.newBadges).toContain('first-win');
  const after = loadProgress();
  expect(legendOpen(after, 'hellmuth')).toBe(true);
  expect(legendOpen(after, 'negreanu')).toBe(false);
});

it('counts a table once, and gives the same report back', () => {
  const first = settleTable(table('g2', 'brunson', true), 'dev', []);
  const again = settleTable(table('g2', 'brunson', true), 'dev', []);
  expect(again).toEqual(first);
  expect(loadProgress().beaten.brunson.wins).toBe(1);
});

it('does not open anything for a loss, but keeps the record', () => {
  const report = settleTable(table('g3', 'brunson', false), 'dev', []);
  expect(report?.beat).toBeNull();
  expect(report?.rival?.record).toEqual({ w: 0, l: 1 });
  expect(legendOpen(loadProgress(), 'hellmuth')).toBe(false);
});

it('does not announce a legend read from old table history as a new badge', () => {
  // A saved game against Rampage from before the ladder: no progress is saved yet, so it's read from the history.
  storage.set('flipup.stats', JSON.stringify({ net: 0, tables: 1, hands: 8, counted: ['old'], games: [{ at: 1, net: 500, hands: 8, players: 2, place: 1, legend: 'rampage' }] }));
  expect(loadProgress().beaten.rampage).toBeDefined();
  const report = settleTable(table('g4', 'brunson', false), 'dev', []);
  expect(report?.newBadges).not.toContain('beat-rampage');
});

it('has a badge for every legend and no two with the same id', () => {
  for (const l of LEGENDS) expect(BADGES.some((b) => b.id === `beat-${l.id}`)).toBe(true);
  expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
});
