// The daily streak on this phone (`flipup.days`, as on the web). A day counts once you're dealt into a hand that
// finishes. The counting is shared with the web: src/game/streak.ts.
import { cleanDays, streakInfo, streakOf, withToday, type StreakInfo } from '@/engine';

import { read, save, useStored } from './storage';

const KEY = 'flipup.days';
const EMPTY: string[] = [];

export function markPlayedToday(): void {
  const days = cleanDays(read<unknown>(KEY, EMPTY));
  const next = withToday(days, new Date());
  if (next !== days) save(KEY, next);
}

export function useStreak(): { days: number; today: boolean } {
  return streakOf(cleanDays(useStored<unknown>(KEY, EMPTY)), new Date());
}

export function useStreakInfo(): StreakInfo {
  return streakInfo(cleanDays(useStored<unknown>(KEY, EMPTY)), new Date());
}
