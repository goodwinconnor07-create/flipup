// Asks for an App Store rating once, after a good moment, using Apple's own prompt (iOS decides whether to show it
// and shows it at most a few times a year). We only ever ask once: after you've finished three games or given ten
// best plays in Range training. Nothing is sent anywhere.
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

import { read, save } from './storage';

const KEY = 'flipup.reviewasked';

/** Whether this is a good moment (enough played, and never asked before). */
export function reviewDue(games: number, bestPlays: number, asked = read<boolean>(KEY, false)): boolean {
  return !asked && (games >= 3 || bestPlays >= 10);
}

export async function maybeAskForReview(games: number, bestPlays: number): Promise<void> {
  if (Platform.OS !== 'ios' || !reviewDue(games, bestPlays)) return;
  try {
    if (!(await StoreReview.hasAction())) return;
    save(KEY, true);
    await StoreReview.requestReview();
  } catch {
    // Never worth interrupting anyone for.
  }
}
