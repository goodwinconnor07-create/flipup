import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { useAppActive } from './use-drift';
import { useReduceMotion } from './use-reduce-motion';

/**
 * Seconds on the UI thread, for scenes that loop for ever (the lobby's game card: snow falling, a chip's ring
 * turning). Unlike `useDrift`, which swings between two ends, this only counts up, so every loop runs at its own
 * period and nothing jumps when a cycle ends. It counts only while the screen is focused, the app is in the
 * foreground and Reduce Motion is off, and stands still otherwise (each scene then rests where it was). Nothing
 * re-renders per frame: readers use `.get()` inside `useAnimatedStyle`, transform and opacity only.
 */
export function useAmbientClock(enabled = true): SharedValue<number> {
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const active = useAppActive();
  const moving = enabled && !reduce && focused && active;
  const clock = useSharedValue(0);
  const frame = useFrameCallback((f) => {
    // A long gap (the phone was busy) is counted as one ordinary frame, so nothing leaps.
    clock.set(clock.get() + Math.min(f.timeSincePreviousFrame ?? 16, 50) / 1000);
  }, false);
  useEffect(() => {
    frame.setActive(moving);
    return () => frame.setActive(false);
  }, [moving, frame]);
  return clock;
}
