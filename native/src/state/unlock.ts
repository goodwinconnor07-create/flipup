// Hosting a Premium game mode (docs/APP_STORE.md, "Rewarded ads"). The first five games are free. The other seven
// need Premium or one rewarded ad, and only the host needs it: people who join by code never do. A party needs one
// ad from the host however many Premium games its rounds use, and anyone can pick any game while setting one up.
import { isPremiumVariant, type Variant } from '@/engine';

/** Whether hosting these games needs an unlock on this phone. */
export const needsUnlock = (games: readonly Variant[], premium: boolean): boolean => !premium && games.some(isPremiumVariant);

/**
 * The one gate before a host opens a table or a party with Premium games. Resolves true when hosting may go ahead.
 *
 * TODO(ads): AdMob rewarded ads aren't built yet, so this lets everyone through. When they are: show the ad here,
 * and have the server mark the table or party unlocked from AdMob's server-side verification call, never from the
 * phone. Premium itself comes from StoreKit (Phase 5, step 6).
 */
export async function unlockToHost(games: readonly Variant[], premium: boolean): Promise<boolean> {
  if (!needsUnlock(games, premium)) return true;
  return true;
}
