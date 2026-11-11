// Hosting a Premium game. Only Texas Hold'em is free for everyone. The other games need FlipUp Premium on the
// phone that hosts; people who join by code never need it, and anyone can pick any game while setting one up.
// The server checks this too (worker/index.ts), so this is the polite version: it asks before trying.
import { router } from 'expo-router';

import { gamesNeedPremium, isPremiumVariant, rangeSetNeedsPremium, type Variant } from '@/engine';

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
 * The gate before a Range training set. The daily quiz is free for everyone; any other set (a plain set of five, or
 * practice on chosen spots and misses) opens the Premium offer without Premium, and this returns false.
 */
export function unlockToTrain(daily: boolean, premium: boolean): boolean {
  if (premium || !rangeSetNeedsPremium(daily)) return true;
  router.push({ pathname: '/premium', params: { reason: 'training' } });
  return false;
}
