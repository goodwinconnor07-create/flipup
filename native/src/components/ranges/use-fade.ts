import { useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';

/**
 * A line that fades up into place each time `key` changes (8pt, 250ms; only a fade under Reduce Motion). Done
 * with a shared value instead of a layout animation, so the element never leaves the layout while it animates
 * (the web build lifts a keyed `entering` view out of the flow).
 */
export function useFadeIn(key: string | number | null) {
  const reduce = useReduceMotion();
  const t = useSharedValue(1);
  useEffect(() => {
    if (key === null) return;
    t.set(0);
    t.set(withTiming(1, { duration: 250, easing: EASE_OUT }));
  }, [key, t]);
  return useAnimatedStyle(() => ({ opacity: t.get(), transform: reduce ? [] : [{ translateY: 8 * (1 - t.get()) }] }));
}
