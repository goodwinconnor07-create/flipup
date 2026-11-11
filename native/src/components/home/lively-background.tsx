import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { GRAIN_NIGHT } from '@/components/grain-background';
import { useDrift } from '@/motion/use-drift';
import { gradient } from '@/theme';

/**
 * Home's own moving field (the owner, 10 Nov 2026: "much more dynamic and moving"): the same dark base as
 * `GrainBackground`, with five brighter lights on quicker clocks (4.5 to 10s a leg) that travel most of the screen,
 * swell and shrink, cross and part. Transform only, on the UI thread; it stops off screen and in the background and
 * sits still under Reduce Motion (`useDrift`). The base stays dark, so white type reads wherever the lights are.
 */
export function LivelyBackground({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const [a, b, c] = GRAIN_NIGHT;
  const { t } = useDrift(4500);
  const { t: u } = useDrift(6000);
  const { t: v } = useDrift(7500);
  const { t: w } = useDrift(10000);
  const blue = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-55 + 110 * t.get()}%` }, { translateY: `${-35 + 70 * u.get()}%` }, { scale: 0.8 + 0.6 * v.get() }],
  }));
  const cyan = useAnimatedStyle(() => ({
    transform: [{ translateX: `${50 - 100 * u.get()}%` }, { translateY: `${40 - 80 * w.get()}%` }, { scale: 1.2 - 0.5 * t.get() }],
  }));
  const indigo = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-45 + 90 * v.get()}%` }, { translateY: `${45 - 90 * t.get()}%` }, { scale: 0.9 + 0.5 * w.get() }],
  }));
  const wash = useAnimatedStyle(() => ({
    transform: [{ translateX: `${30 - 60 * w.get()}%` }, { translateY: `${-30 + 60 * v.get()}%` }, { scale: 1 + 0.4 * u.get() }],
  }));
  const gold = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-40 + 80 * w.get()}%` }, { translateY: `${35 - 70 * u.get()}%` }],
  }));
  const light = (colour: string) => gradient(`radial-gradient(circle at center, ${colour} 0%, transparent 62%)`);
  return (
    <View style={[{ flex: 1, overflow: 'hidden', ...gradient(`linear-gradient(160deg, ${a} 0%, ${b} 50%, ${c} 100%)`) }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
        <Animated.View style={[{ position: 'absolute', left: '-20%', top: '30%', width: '140%', aspectRatio: 1, ...light('rgba(30, 70, 200, 0.42)') }, wash]} />
        <Animated.View style={[{ position: 'absolute', left: '-35%', top: '-15%', width: '120%', aspectRatio: 1, ...light('rgba(60, 120, 255, 0.5)') }, blue]} />
        <Animated.View style={[{ position: 'absolute', right: '-40%', top: '20%', width: '110%', aspectRatio: 1, ...light('rgba(40, 200, 255, 0.28)') }, cyan]} />
        <Animated.View style={[{ position: 'absolute', left: '-10%', bottom: '-25%', width: '115%', aspectRatio: 1, ...light('rgba(110, 90, 255, 0.32)') }, indigo]} />
        <Animated.View style={[{ position: 'absolute', left: '20%', bottom: '-30%', width: '80%', aspectRatio: 1, ...light('rgba(245, 183, 0, 0.1)') }, gold]} />
      </View>
      {children}
    </View>
  );
}
