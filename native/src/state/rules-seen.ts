// Which mini games this phone has seen the first-time rules card for (`flipup.rulesseen`). Texas Hold'em never needs it.
import type { Variant } from '@/engine';

import { read, save } from './storage';

const KEY = 'flipup.rulesseen';

/** True once the rules card has been shown for this game here (or it's Texas Hold'em). */
export const rulesSeen = (v: Variant): boolean => v === 'holdem' || read<string[]>(KEY, []).includes(v);

export function markRulesSeen(v: Variant): void {
  const seen = read<string[]>(KEY, []);
  if (!seen.includes(v)) save(KEY, [...seen, v]);
}
