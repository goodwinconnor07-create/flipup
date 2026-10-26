import { beforeEach, describe, expect, it } from 'vitest';
import type { HandRecord } from '../game';
import { addHand, KEEP_MS, loadHistory, loadSaved, renameSaved, saveHand, unsaveHand } from './training';

// A tiny localStorage for the node test environment.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const hand = (key: string, at: number) => ({ key, heroId: 'p1', record: { at, number: 1, players: [], holes: {} } as unknown as HandRecord });

describe('played hands', () => {
  beforeEach(() => store.clear());

  it('keeps the last 24 hours and the saved ones, and deletes the rest', () => {
    const now = Date.now();
    saveHand('kept', 'Big bluff', now);
    addHand(hand('kept', now - KEEP_MS - 5));
    addHand(hand('old', now - KEEP_MS - 1));
    addHand(hand('new', now - 1000));
    expect(loadHistory(now).map((h) => h.key)).toEqual(['kept', 'new']);
    // Deleted from storage, not just hidden.
    expect(JSON.parse(store.get('flipup.history')!).length).toBe(2);
  });

  it('names, renames and removes saved hands', () => {
    saveHand('a', '  First ', 1);
    saveHand('b', 'Second', 2);
    expect(loadSaved().map((h) => h.name)).toEqual(['Second', 'First']);
    renameSaved('a', 'Uno');
    unsaveHand('b');
    expect(loadSaved()).toMatchObject([{ key: 'a', name: 'Uno' }]);
  });
});
