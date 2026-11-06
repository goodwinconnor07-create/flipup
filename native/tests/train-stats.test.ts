import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('../src/components/icon', () => ({}));

const { trainStats } = await import('../src/components/train/stats');
const { allHands } = await import('../src/state/ranges');
const { trickOf } = await import('../src/components/ranges/words');

const play = { level: 'easy' as const, days: [], daily: {}, blitzBest: 7, roundBest: 400, rounds: 3, points: 900, swipes: 0, xp: {} };
const hands = () => allHands().map((s) => ({ id: s.id, concept: s.concept }));

describe('Train stats', () => {
  it('is empty before any hand', () => {
    const s = trainStats({}, hands(), play);
    expect(s.played).toBe(0);
    expect(s.accuracy).toBeNull();
    expect(s.units.every((u) => u.accuracy === null)).toBe(true);
    expect(s.week).toHaveLength(7);
  });

  it('counts grades, accuracy and each unit', () => {
    const [a, b, c] = hands();
    const s = trainStats({ [a.id]: 'best', [b.id]: 'ok', [c.id]: 'mistake', nope: 'best' }, hands(), play);
    expect(s.played).toBe(3);
    expect([s.best, s.ok, s.mistake]).toEqual([1, 1, 1]);
    expect(s.accuracy).toBeCloseTo(1 / 3);
    expect(s.points).toBe(900);
    expect(s.units.reduce((n, u) => n + u.played, 0)).toBe(3);
    expect(s.units.find((u) => u.family === trickOf(a.concept).family)!.best).toBeGreaterThanOrEqual(1);
  });

  it('puts today last in the week with its points', () => {
    const now = new Date(2026, 10, 6, 12);
    const s = trainStats({}, hands(), { ...play, xp: { '2026-11-06': 120, '2026-11-05': 40 } }, now);
    expect(s.week[6]).toMatchObject({ xp: 120, today: true });
    expect(s.week[5].xp).toBe(40);
  });
});
