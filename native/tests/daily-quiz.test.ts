import { describe, expect, it } from 'vitest';

import { countdown, dailySetIds, msUntilTomorrow, shareText } from '../src/state/daily-quiz';

const ids = Array.from({ length: 40 }, (_, i) => `h${i}`);

describe('daily quiz', () => {
  it('deals the same five hands for a date on every phone, and different ones the next day', () => {
    const a = dailySetIds('2026-11-11', ids);
    expect(a).toHaveLength(5);
    expect(new Set(a).size).toBe(5);
    expect(dailySetIds('2026-11-11', ids)).toEqual(a);
    expect(dailySetIds('2026-11-12', ids)).not.toEqual(a);
  });

  it('never asks for more hands than there are', () => {
    expect(dailySetIds('2026-11-11', ['x', 'y'])).toHaveLength(2);
  });

  it('counts down to local midnight', () => {
    const now = new Date(2026, 10, 11, 17, 48, 0);
    expect(msUntilTomorrow(now)).toBe((6 * 60 + 12) * 60_000);
    expect(countdown(msUntilTomorrow(now))).toBe('6h 12m');
    expect(countdown(12 * 60_000)).toBe('12m');
    expect(countdown(30_000)).toBe('under a minute');
  });

  it('shares the result without the hands', () => {
    const text = shareText(new Date(2026, 10, 11), ['best', 'best', 'ok', 'mistake', 'best']);
    expect(text).toBe('FlipUp daily quiz · Nov 11\n🟨🟨🟦⬛🟨\n3/5 best plays');
  });
});
