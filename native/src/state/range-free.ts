// The free Range training quiz: without Premium you get one set of five hands a day. The day is marked used when you
// answer your first hand, so leaving a set and coming back doesn't get a second one. Premium ignores all of this.
import { dayKey } from '@/engine';

import { read, save, useStored } from './storage';

const KEY = 'flipup.rangefree';

const today = (): string => dayKey(new Date());

/** How many free sets today's date has used (0 or 1). */
export const freeSetsUsedToday = (): number => (read<string | null>(KEY, null) === today() ? 1 : 0);
export const useFreeSetsUsedToday = (): number => (useStored<string | null>(KEY, null) === today() ? 1 : 0);

/** Marks today's free quiz as used. */
export const noteFreeSet = (): void => save(KEY, today());
