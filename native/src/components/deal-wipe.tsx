import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_IN_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, motion, party, spacing } from '@/theme';

import { Icon, type IconName } from './icon';

const SUITS: IconName[] = ['suit.spade.fill', 'suit.heart.fill', 'suit.club.fill', 'suit.diamond.fill'];
const HOLD = 220;
const SWEEP = 420;

/**
 * The deal-in wipe over a screen that just opened (the lobby, the table): a felt panel where the four suits pop in
 * one after another, then the panel sweeps up off the screen. It never takes touches, so it can't block play.
 * With Reduce Motion it's a quick fade.
 */
export function DealWipe({ colors }: { colors: readonly [string, string] }) {
  const reduce = useReduceMotion();
  const { height } = useWindowDimensions();
  const lift = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    if (reduce) fade.set(withTiming(0, { duration: motion.fast }));
    else lift.set(withDelay(HOLD + SUITS.length * 50, withTiming(1, { duration: SWEEP, easing: EASE_IN_OUT })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const panel = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: -lift.get() * (height + 40) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 50 }, panel, gradient(`linear-gradient(180deg, ${colors[0]}, ${colors[1]})`)]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        {!reduce && SUITS.map((s, i) => <Suit key={s} name={s} delay={i * 50} red={i % 2 === 1} />)}
      </View>
      {/* The leading edge of the sweep: a soft lighter band at the bottom. */}
      <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 }, gradient('linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.18))')]} />
    </Animated.View>
  );
}

function Suit({ name, delay, red }: { name: IconName; delay: number; red: boolean }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.set(withDelay(delay, withSpring(1, { mass: 1, stiffness: 450, damping: 18 })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, s.get() * 1.5), transform: [{ scale: 0.4 + s.get() * 0.6 }] }));
  return (
    <Animated.View style={style}>
      <Icon name={name} size={40} color={red ? party.pink : 'white'} weight="bold" />
    </Animated.View>
  );
}
