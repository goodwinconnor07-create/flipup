// Hosting a Premium game. The first five games are free for everyone. The other seven need FlipUp Premium on the
// phone that hosts; people who join by code never need it, and anyone can pick any game while setting one up.
// The server checks this too (worker/index.ts), so this is the polite version: it asks before trying.
import { router } from 'expo-router';

import { gamesNeedPremium, isPremiumVariant, type Variant } from '@/engine';

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
