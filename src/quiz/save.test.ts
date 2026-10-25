import { beforeEach, describe, expect, it } from 'vitest';
import { KEEP_MS, loadBank, loadRecent, recordPlayed, removeBanked, renameBanked, saveToBank, type PlayedQuiz } from './save';

// A tiny localStorage for the node test environment.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const hand = (id: string, at: number): PlayedQuiz => ({ id, at, title: `Hand ${id}`, cards: ['As', 'Kd'], picks: [0, 1], grades: ['green', 'red'] });

describe('study bank', () => {
  beforeEach(() => store.clear());

  it('forgets played hands after 24 hours', () => {
    const now = 10 * KEEP_MS;
    recordPlayed(hand('old', now - KEEP_MS - 1), now - KEEP_MS - 1);
    recordPlayed(hand('new', now - 1000), now - 1000);
    expect(loadRecent(now).map((h) => h.id)).toEqual(['new']);
  });

  it('keeps one entry per hand, newest first', () => {
    recordPlayed(hand('a', 1), 1);
    recordPlayed(hand('b', 2), 2);
    recordPlayed(hand('a', 3), 3);
    expect(loadRecent(4).map((h) => h.id)).toEqual(['a', 'b']);
  });

  it('keeps saved hands past 24 hours, with their name', () => {
    saveToBank(hand('a', 1), '  Big river fold ', 1);
    loadRecent(5 * KEEP_MS);
    expect(loadBank()).toMatchObject([{ id: 'a', name: 'Big river fold', saved: 1, picks: [0, 1] }]);
  });

  it('renames and deletes', () => {
    saveToBank(hand('a', 1), 'One', 1);
    saveToBank(hand('b', 2), 'Two', 2);
    expect(loadBank().map((h) => h.name)).toEqual(['Two', 'One']);
    renameBanked('a', 'Uno');
    renameBanked('b', '   ');
    expect(loadBank().map((h) => h.name)).toEqual(['Two', 'Uno']);
    removeBanked('b');
    expect(loadBank().map((h) => h.id)).toEqual(['a']);
  });

  it('saving again replaces the old entry', () => {
    saveToBank(hand('a', 1), 'One', 1);
    saveToBank(hand('a', 2), 'Again', 2);
    expect(loadBank().map((h) => h.name)).toEqual(['Again']);
  });
});

it('does not keep malformed or future recent timestamps', () => {
  store.clear();
  store.set('flipup.quizrecent', JSON.stringify([hand('future', 5000), hand('valid', 900), { ...hand('bad', 1), at: null }]));
  expect(loadRecent(1000).map(h => h.id)).toEqual(['valid']);
});
