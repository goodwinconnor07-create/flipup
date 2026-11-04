import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { cancelAnimation, Easing, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import { useReduceMotion } from './use-reduce-motion';

/** True while the app is in the foreground. */
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/**
 * The slow clock behind every drifting gradient: a shared value that eases between 0 and 1 on the UI thread, one
 * `duration` each way (use 20s or more; nothing here should ever be noticed as movement, only as life). It runs
 * only while the screen is focused, the app is in the foreground and Reduce Motion is off (`enabled` lets a
 * caller opt out too), and is cancelled otherwise, so a hidden card costs nothing. Nothing re-renders per frame:
 * the caller reads `.get()` inside `useAnimatedStyle` and animates transform or opacity only.
 */
export function useDrift(duration: number, enabled = true): { t: SharedValue<number>; moving: boolean } {
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const active = useAppActive();
  const moving = enabled && !reduce && focused && active;
  // Rests at the middle, so a card that isn't moving (Reduce Motion, off screen) sits where the drift is centred.
  const t = useSharedValue(0.5);
  useEffect(() => {
    if (!moving) return;
    const ease = Easing.inOut(Easing.sin);
    // Wherever it stopped, glide to one end first, then swing end to end for good.
    t.set(withSequence(withTiming(0, { duration: duration / 2, easing: ease }), withRepeat(withTiming(1, { duration, easing: ease }), -1, true)));
    return () => cancelAnimation(t);
  }, [moving, duration, t]);
  return { t, moving };
}
