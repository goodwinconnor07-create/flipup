import { describe, expect, it, vi } from 'vitest';

import { SCENARIOS } from '@train/ranges/scenarios';

// Range training on the phone (src/state/ranges.ts): the same hands as the web's RangeTrainer.tsx, and its way of
// picking the next one.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});
vi.mock('expo-sqlite/localStorage/install', () => ({}));

const { allHands, answerHand, nextHand, readRangeGrades } = await import('../src/state/ranges');

describe('Range training', () => {
  it('has every hand the web has, in the same order', () => {
    const all = allHands();
    expect(all.map((s) => s.id)).toEqual(SCENARIOS.map((s) => s.id));
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
  });

  it('never deals the same kind of spot twice running', () => {
    let s = nextHand(null);
    for (let i = 0; i < 200; i++) {
      const n = nextHand(s);
      expect(n).not.toBe(s);
      expect(n.concept !== s.concept || n.hero.pos !== s.hero.pos).toBe(true);
      s = n;
    }
  });

  it('keeps your best grade on each hand and skips hands you got right', () => {
    const s = allHands()[0];
    const wrong = (['fold', 'call', 'raise', 'check', 'bet33', 'bet75', 'bet125'] as const).find((o) => o !== s.best && !s.alsoOk?.includes(o))!;
    expect(answerHand(s, s.best)).toBe('best');
    expect(answerHand(s, wrong)).toBe('mistake');
    expect(readRangeGrades()[s.id]).toBe('best');
    for (let i = 0; i < 300; i++) expect(nextHand(null).id).not.toBe(s.id);
  });
});
