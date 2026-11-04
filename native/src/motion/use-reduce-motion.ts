import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useCalm } from '@/state/prefs';

// One question to the phone and one listener for the whole app, however many buttons and cards ask: every
// PressableScale reads this, and asking the phone once per button made screens slower to open.
let reduceOn = false;
let started = false;
const listeners = new Set<() => void>();
const setReduce = (on: boolean) => {
  if (on === reduceOn) return;
  reduceOn = on;
  listeners.forEach((f) => f());
};
function subscribe(f: () => void): () => void {
  listeners.add(f);
  if (!started) {
    started = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => undefined);
    AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
  }
  return () => listeners.delete(f);
}
const current = () => reduceOn;

/**
 * True while the phone's Reduce Motion setting is on. Follows the setting live, so turning it on in Settings
 * while the app is open takes effect at once. With it on, springs and slides become fades. Turning Animations off
 * in FlipUp's own Settings does the same.
 */
export function useReduceMotion(): boolean {
  const calm = useCalm();
  const reduce = useSyncExternalStore(subscribe, current, current);
  return reduce || calm;
}
