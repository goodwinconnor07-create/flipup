// Hosting a Premium game. Only Texas Hold'em is free for everyone. The other games need FlipUp Premium on the
// phone that hosts; people who join by code never need it, and anyone can pick any game while setting one up.
// The server checks this too (worker/index.ts), so this is the polite version: it asks before trying.
import { router } from 'expo-router';

import { gamesNeedPremium, isPremiumVariant, rangeSetNeedsPremium, type Variant } from '@/engine';

import { freeSetsUsedToday } from './range-free';

/** Whether hosting these games needs Premium that this phone doesn't have. */
export const needsUnlock = (games: readonly Variant[], premium: boolean): boolean => !premium && gamesNeedPremium(games);

/**
 * The one gate before a host opens a table or a party. Returns true when hosting may go ahead. Otherwise it opens
 * the Premium offer with the first Premium game in the list, and returns false.
 */
export function unlockToHost(games: readonly Variant[], premium: boolean): boolean {
  if (!needsUnlock(games, premium)) return true;
  const game = games.find(isPremiumVariant);
  router.push({ pathname: '/premium', params: { reason: 'game', ...(game ? { game } : {}) } });
  return false;
}

/**
 * The gate before a Range training set. Free is one set of five a day; practice on chosen spots and every set after
 * the day's free one open the Premium offer instead, and this returns false.
 */
export function unlockToTrain(focused: boolean, premium: boolean): boolean {
  if (premium || !rangeSetNeedsPremium(focused, freeSetsUsedToday())) return true;
  router.push({ pathname: '/premium', params: { reason: 'training' } });
  return false;
}
