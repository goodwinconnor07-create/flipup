// The daily streak: days with a hand played, kept on the phone as local dates ("2026-11-03", `flipup.days`).
// Pure, so the web and the iPhone app count it the same way. `now` is passed in.

export const dayKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The stored list, with anything that isn't a date dropped. */
export function cleanDays(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) : [];
}

/** The list with today added (unchanged if it's already there), keeping the last two years. */
export function withToday(days: string[], now: Date): string[] {
  const today = dayKey(now);
  return days.includes(today) ? days : [...days, today].slice(-730);
}

/** Days in a row with a hand played, counting back from today (or from yesterday, so the streak survives until tonight). */
export function streakOf(days: string[], now: Date): { days: number; today: boolean } {
  const have = new Set(days);
  const d = new Date(now);
  const today = have.has(dayKey(d));
  if (!today) d.setDate(d.getDate() - 1);
  let run = 0;
  while (have.has(dayKey(d))) {
    run++;
    d.setDate(d.getDate() - 1);
  }
  return { days: run, today };
}

export interface StreakInfo {
  days: number;
  today: boolean;
  /** The first day of the current streak, as a local date at midnight. */
  start: Date | null;
  best: number;
  total: number;
  /** The last seven days, oldest first. */
  week: { label: string; played: boolean; today: boolean }[];
}

/** Everything the streak sheet shows. */
export function streakInfo(all: string[], now: Date): StreakInfo {
  const have = new Set(all);
  const { days, today } = streakOf(all, now);
  let start: Date | null = null;
  if (days > 0) {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (today ? 0 : 1) - (days - 1));
  }
  // Longest run of consecutive days.
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of [...have].sort()) {
    const [y, m, d] = key.split('-').map(Number);
    const at = new Date(y, m - 1, d);
    const next = prev ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1) : null;
    run = next && dayKey(next) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = at;
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), played: have.has(dayKey(d)), today: i === 6 };
  });
  return { days, today, start, best: Math.max(best, days), total: have.size, week };
}
