import { describe, expect, it } from 'vitest';

import { cleanDays, dayKey, streakInfo, streakOf, withToday } from './streak';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 15, 0);

describe('daily streak', () => {
  it('counts days in a row back from today', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03'];
    expect(streakOf(days, at(2026, 11, 3))).toEqual({ days: 3, today: true });
  });

  it('keeps yesterday’s streak alive until tonight', () => {
    expect(streakOf(['2026-11-01', '2026-11-02'], at(2026, 11, 3))).toEqual({ days: 2, today: false });
    expect(streakOf(['2026-11-01'], at(2026, 11, 3))).toEqual({ days: 0, today: false });
  });

  it('counts across a month end', () => {
    expect(streakOf(['2026-10-31', '2026-11-01'], at(2026, 11, 1)).days).toBe(2);
  });

  it('adds today once', () => {
    const now = at(2026, 11, 3);
    const once = withToday([], now);
    expect(once).toEqual([dayKey(now)]);
    expect(withToday(once, now)).toBe(once);
  });

  it('finds the longest run, the start and the total', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-11-02', '2026-11-03'];
    const info = streakInfo(days, at(2026, 11, 3));
    expect(info.days).toBe(2);
    expect(info.best).toBe(4);
    expect(info.total).toBe(6);
    expect(info.start && dayKey(info.start)).toBe('2026-11-02');
    expect(info.week.map((d) => d.played)).toEqual([false, false, false, false, false, true, true]);
    expect(info.week[6].today).toBe(true);
  });

  it('drops anything that isn’t a date', () => {
    expect(cleanDays(['2026-11-03', 'x', 4, null])).toEqual(['2026-11-03']);
    expect(cleanDays('nope')).toEqual([]);
  });
});
