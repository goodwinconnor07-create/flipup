// The daily hand, as pure functions (no storage, no screen): which hand a day deals (one, since 12 Nov 2026: free
// players get a single hand a day), the same on every phone,
// how long until the next one, and the result as text to share. The stored state is state/range-daily.ts.
import { hash, seeded } from '@train/ranges/daily';
import type { Grade } from '@train/ranges/model';

/** How many hands the daily quiz deals: one, the daily hand (the owner's call, 12 Nov 2026; it was five). */
export const DAILY_HANDS = 1;

/** The day's hand ids, the same on every phone for that date ("2026-11-11"): a seeded shuffle of every hand. */
export function dailySetIds(day: string, ids: readonly string[], n = DAILY_HANDS): string[] {
  const out = [...ids];
  const rng = seeded(hash(`quiz:${day}`));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, Math.min(n, out.length));
}

/** Milliseconds from `now` until the next local midnight, when a new quiz opens. */
export function msUntilTomorrow(now: Date): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** "6h 12m", "12m", or "under a minute". */
export function countdown(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'under a minute';
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

/** A square for each answer: gold for the best play, blue for also good, black for a miss. */
export const SQUARE: Record<Grade, string> = { best: '🟨', ok: '🟦', mistake: '⬛' };

/** The day's result as text to share, Wordle style: no hands given away, only how it went. */
export function shareText(date: Date, grades: readonly Grade[]): string {
  const best = grades.filter((g) => g === 'best').length;
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const squares = grades.map((g) => SQUARE[g]).join('');
  if (grades.length === 1) return `FlipUp daily hand · ${day}\n${squares}\n${GRADE_WORDS[grades[0]]}`;
  return `FlipUp daily quiz · ${day}\n${squares}\n${best}/${grades.length} best plays`;
}

/** How a single answer went, in words. */
export const GRADE_WORDS: Record<Grade, string> = { best: 'Best play', ok: 'Also good', mistake: 'Missed it' };
