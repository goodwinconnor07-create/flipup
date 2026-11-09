import { describe, expect, it, vi } from 'vitest';

import { SCENARIOS } from '@train/ranges/scenarios';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});
vi.mock('expo-sqlite/localStorage/install', () => ({}));

const { rangeStats, recordAnswer, readRangeHistory, runOf, roughPatch, longestRun } = await import('../src/state/range-history');
const { answerHand, nextHand } = await import('../src/state/ranges');

describe('range history', () => {
  it('keeps every answer, not just the best', () => {
    const s = SCENARIOS[0];
    const wrong = (['fold', 'call', 'raise', 'check', 'bet33', 'bet75', 'bet125'] as const).find((o) => o !== s.best && !s.alsoOk?.includes(o))!;
    answerHand(s, wrong);
    answerHand(s, s.best);
    const h = readRangeHistory();
    expect(h.map((a) => a.grade)).toEqual(['mistake', 'best']);
  });

  it('works out rates, a trend and your weakest spots', () => {
    const a = SCENARIOS[0];
    const b = SCENARIOS.find((s) => s.concept !== a.concept)!;
    const hist = [
      ...Array.from({ length: 6 }, (_, i) => ({ id: a.id, pick: a.best, grade: i < 2 ? ('best' as const) : ('mistake' as const), at: i })),
      ...Array.from({ length: 6 }, (_, i) => ({ id: b.id, pick: b.best, grade: 'best' as const, at: 10 + i })),
    ];
    const st = rangeStats(hist);
    expect(st.total).toBe(12);
    expect(st.best).toBe(8);
    expect(st.rate).toBeCloseTo(8 / 12);
    expect(st.byConcept[0].label).toBe(a.concept);
    expect(st.weakest.map((t) => t.label)).toEqual([a.concept]);
    expect(st.trend).toHaveLength(2);
    expect(st.recent).toBeCloseTo(8 / 12);
    expect(st.before).toBe(null);
  });

  it('can limit the next hand to the concepts you miss', () => {
    const concept = SCENARIOS[5].concept;
    for (let i = 0; i < 50; i++) expect(nextHand(null, Math.random, [concept]).concept).toBe(concept);
    recordAnswer(SCENARIOS[0], SCENARIOS[0].best, 'best', 1);
  });

  it('counts best plays in a row and spots a rough patch', () => {
    const a = (grade: 'best' | 'ok' | 'mistake') => ({ id: SCENARIOS[0].id, pick: 'fold' as const, grade, at: 1 });
    expect(runOf([a('mistake'), a('best'), a('best')])).toBe(2);
    expect(runOf([a('best'), a('ok')])).toBe(0);
    expect(roughPatch([a('best'), a('mistake'), a('mistake'), a('best'), a('mistake')])).toBe(true);
    expect(roughPatch([a('mistake'), a('mistake'), a('mistake'), a('mistake'), a('best')])).toBe(false);
    expect(roughPatch([a('mistake'), a('mistake')])).toBe(false);
    expect(longestRun([a('best'), a('best'), a('ok'), a('best'), a('best'), a('best')])).toBe(3);
  });

  it('ignores answers for hands that no longer exist', () => {
    expect(rangeStats([{ id: 'gone', pick: 'fold', grade: 'best', at: 1 }]).total).toBe(0);
  });
});
