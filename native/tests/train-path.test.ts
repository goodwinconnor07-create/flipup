import { describe, expect, it, vi } from 'vitest';

import type { Grade } from '@train/ranges/model';

// The Train tab: the lesson path (src/components/train/path.ts), lessons in the trainer, and when a trick counts
// as collected (src/state/ranges.ts).
vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('../src/components/icon', () => ({}));

const { buildPath, lastWeek, UNITS } = await import('../src/components/train/path');
const { allHands, LESSON_GOAL, trickProgress } = await import('../src/state/ranges');
const { lessonIds, ROUND_SIZE } = await import('../src/state/range-logic');
const { trickOf } = await import('../src/components/ranges/words');

const concepts = () => allHands().map((s) => s.concept);
const idsOf = (concept: string) => allHands().filter((s) => s.concept === concept).map((s) => s.id);

describe('Train path', () => {
  it('puts every trick on the path once, unit by unit, with only the first lesson open at the start', () => {
    const path = buildPath(concepts(), trickProgress({}));
    const all = path.units.flatMap((u) => u.lessons);
    expect(all.length).toBe(new Set(concepts()).size);
    expect(path.total).toBe(all.length);
    expect(path.units.map((u) => u.family)).toEqual(UNITS.filter((f) => all.some((l) => l.unit === f)));
    for (const u of path.units) for (const l of u.lessons) expect(trickOf(l.concept).family).toBe(u.family);
    expect(all[0].state).toBe('current');
    expect(all.slice(1).every((l) => l.state === 'locked')).toBe(true);
    expect(path.current?.concept).toBe(all[0].concept);
  });

  it('collects a trick after LESSON_GOAL best plays (or all its hands), and opens the next lesson', () => {
    const first = buildPath(concepts(), trickProgress({})).units[0].lessons[0];
    const ids = idsOf(first.concept);
    const need = Math.min(LESSON_GOAL, ids.length);
    const almost: Record<string, Grade> = Object.fromEntries(ids.slice(0, need - 1).map((id) => [id, 'best' as Grade]));
    expect(trickProgress(almost)[first.concept].best).toBe(false);
    const grades: Record<string, Grade> = Object.fromEntries(ids.slice(0, need).map((id) => [id, 'best' as Grade]));
    const path = buildPath(concepts(), trickProgress(grades));
    const all = path.units.flatMap((u) => u.lessons);
    expect(all[0].state).toBe('done');
    expect(all[1].state).toBe('current');
    expect(all[2].state).toBe('locked');
    expect(path.collected).toBe(1);
  });

  it('keeps a lesson you had already played open, even further down the path', () => {
    const all = buildPath(concepts(), trickProgress({})).units.flatMap((u) => u.lessons);
    const later = all[5];
    const path = buildPath(concepts(), trickProgress({ [idsOf(later.concept)[0]]: 'mistake' }));
    const again = path.units.flatMap((u) => u.lessons);
    expect(again[5].state).toBe('open');
    expect(again[6].state).toBe('locked');
  });

  it('deals a lesson from one trick, ones you have not got yet first', () => {
    const concept = 'Value betting';
    const ids = idsOf(concept);
    const grades: Record<string, Grade> = Object.fromEntries(ids.slice(0, ids.length - 2).map((id) => [id, 'best' as Grade]));
    const dealt = lessonIds(concept, grades, allHands(), () => 0.5);
    expect(dealt).toHaveLength(Math.min(ROUND_SIZE, ids.length));
    expect(dealt.every((id) => ids.includes(id))).toBe(true);
    expect(new Set(dealt.slice(0, 2))).toEqual(new Set(ids.slice(-2)));
  });

  it('lists the last seven days, ending today', () => {
    const week = lastWeek(new Date(2026, 10, 5, 9));
    expect(week).toHaveLength(7);
    expect(week[6]).toEqual({ key: '2026-11-05', letter: 'T', today: true });
    expect(week[0].key).toBe('2026-10-30');
  });
});
