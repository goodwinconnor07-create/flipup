// Placeholders the shape of the Friends list's rows, shown only in place of the friend boxes while the list
// refreshes. A soft light band sweeps across them (a transform, nothing redrawn); under Reduce Motion they stay still.
import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, radius, spacing, useColors, useShadows } from '@/theme';

/** How long one sweep takes. Slow, so it reads as waiting rather than busy. */
const SWEEP_MS = 1400;

export function FriendSkeleton({ rows }: { rows: number }) {
  const colors = useColors();
  const shadows = useShadows();
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reduce) {
      cancelAnimation(x);
      x.set(-1);
      return;
    }
    x.set(withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(x);
  }, [reduce, x]);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * width }] }));
  return (
    <View accessible accessibilityLabel="Loading your friends" style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84, paddingHorizontal: spacing.md }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.cellPressed }} />
            <View style={{ flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: spacing.sm, borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: colors.separator }}>
              <View style={{ width: '55%', height: 16, borderRadius: radius.xs, backgroundColor: colors.cellPressed }} />
              <View style={{ width: '35%', height: 12, borderRadius: radius.xs, backgroundColor: colors.cellPressed }} />
            </View>
          </View>
        ))}
        {!reduce && (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100%' }, gradient('linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 100%)'), band]}
          />
        )}
      </View>
    </View>
  );
}
