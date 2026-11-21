import { describe, expect, it } from 'vitest';

import { countdown, dailySetIds, msUntilTomorrow, shareText } from '../src/state/daily-quiz';

const ids = Array.from({ length: 40 }, (_, i) => `h${i}`);

describe('daily quiz', () => {
  it('deals one hand a day, the same for a date on every phone', () => {
    const a = dailySetIds('2026-11-11', ids);
    expect(a).toHaveLength(1);
    expect(dailySetIds('2026-11-11', ids)).toEqual(a);
    const week = ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'].map((d) => dailySetIds(d, ids)[0]);
    expect(new Set([a[0], ...week]).size).toBeGreaterThan(1);
  });

  it('deals the same order for a longer set, and never more hands than there are', () => {
    const five = dailySetIds('2026-11-11', ids, 5);
    expect(new Set(five).size).toBe(5);
    expect(five[0]).toBe(dailySetIds('2026-11-11', ids)[0]);
    expect(dailySetIds('2026-11-11', ['x', 'y'], 5)).toHaveLength(2);
  });

  it('counts down to local midnight', () => {
    const now = new Date(2026, 10, 11, 17, 48, 0);
    expect(msUntilTomorrow(now)).toBe((6 * 60 + 12) * 60_000);
    expect(countdown(msUntilTomorrow(now))).toBe('6h 12m');
    expect(countdown(12 * 60_000)).toBe('12m');
    expect(countdown(30_000)).toBe('under a minute');
  });

  it('shares a daily hand without the hand', () => {
    expect(shareText(new Date(2026, 10, 11), ['ok'])).toBe('FlipUp daily hand · Nov 11\n🟦\nAlso good');
  });

  it('shares a longer result without the hands', () => {
    const text = shareText(new Date(2026, 10, 11), ['best', 'best', 'ok', 'mistake', 'best']);
    expect(text).toBe('FlipUp daily quiz · Nov 11\n🟨🟨🟦⬛🟨\n3/5 best plays');
  });
});
