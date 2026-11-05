// The only ad in the app: watching one buys Bankroll's monthly rebuy. No ad network is connected yet; this opens a
// placeholder sheet (`app/ad.tsx`) with a 5-second countdown. Premium changes nothing here (yet).
import { router } from 'expo-router';

export type AdResult = 'rewarded' | 'skipped' | 'unavailable';

let waiting: ((r: AdResult) => void) | null = null;

/** Shows a rewarded ad and says how it went. */
export function showRewardedAd(reason: 'rebuy'): Promise<AdResult> {
  // TODO: call the ad network's rewarded ad here (and answer 'unavailable' when it has none to show).
  // Before shipping one: App Tracking Transparency and the privacy label (docs/APP_STORE.md).
  waiting?.('skipped');
  return new Promise((resolve) => {
    waiting = resolve;
    router.push({ pathname: '/ad', params: { reason } });
  });
}

/** The placeholder sheet reports back: the countdown finished, or it was closed early. */
export function finishAd(result: AdResult): void {
  waiting?.(result);
  waiting = null;
}
