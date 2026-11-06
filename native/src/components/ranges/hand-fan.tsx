import { useEffect, useRef } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_OUT, SETTLE } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { motion, spacing } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PlayingCard } from '../table/playing-card';

/** How far a swipe has to go to count. */
const THRESHOLD = 56;
const SPRING = SETTLE;

export type HandState = 'live' | 'mucked' | 'played';

/**
 * Your two cards, big and fanned, with a soft shadow. A tap lifts them (and drops them again), with a tick. While
 * it's your move they follow your thumb: swipe up to put chips in (call, or bet the size picked below), swipe down
 * to fold, or check when nobody has bet. The buttons do the same, for anyone who'd rather tap. After the answer a
 * fold mucks them (they slide down and dim); anything else leaves them where they are.
 */
export function HandFan({
  cards,
  width,
  state,
  canSwipe,
  facing,
  hint,
  onSwipe,
}: {
  cards: readonly string[];
  width: number;
  state: HandState;
  canSwipe: boolean;
  facing: boolean;
  /** Show "Swipe up to call · down to fold" under the cards. */
  hint: boolean;
  onSwipe: (dir: 'up' | 'down') => void;
}) {
  const reduce = useReduceMotion();
  const y = useSharedValue(0);
  const lift = useSharedValue(0);
  const gone = useSharedValue(0);
  const start = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (state === 'live') {
      gone.set(withTiming(0, { duration: motion.exit, easing: EASE_OUT }));
      y.set(withSpring(0, SPRING));
    } else if (state === 'mucked') {
      gone.set(withTiming(1, { duration: 420, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
      y.set(withTiming(0, { duration: motion.exit, easing: EASE_OUT }));
    } else y.set(withSpring(0, SPRING));
    lift.set(withSpring(0, SPRING));
  }, [state, gone, y, lift]);

  // The cards follow the finger up and down while it's your move; a touch that barely moves is a tap.
  const touch = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      if (!canSwipe) return;
      y.set(Math.max(-140, Math.min(90, e.nativeEvent.pageY - start.current.y)));
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      const dx = e.nativeEvent.pageX - start.current.x;
      const dy = e.nativeEvent.pageY - start.current.y;
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) {
        haptic.select();
        lift.set(withSpring(lift.get() > 0.5 ? 0 : 1, SPRING));
        return;
      }
      if (canSwipe && dy < -THRESHOLD) {
        y.set(withTiming(-110, { duration: motion.exit, easing: EASE_OUT }));
        onSwipe('up');
      } else if (canSwipe && dy > THRESHOLD) onSwipe('down');
      else y.set(withSpring(0, SPRING));
    },
    onResponderTerminate: () => y.set(withSpring(0, SPRING)),
  };

  const w = width;
  const fan = useAnimatedStyle(() => ({
    opacity: 1 - 0.55 * gone.get(),
    transform: [{ translateY: y.get() - 16 * lift.get() + 70 * gone.get() }, { scale: 1 + 0.04 * lift.get() - 0.12 * gone.get() }],
  }));
  const left = useAnimatedStyle(() => ({ transform: [{ rotate: `${-8 - 3 * lift.get() + y.get() * 0.03}deg` }, { translateX: -4 * lift.get() }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ rotate: `${8 + 3 * lift.get() - y.get() * 0.03}deg` }, { translateX: 4 * lift.get() }] }));
  const up = facing ? 'call' : 'bet';
  const down = facing ? 'fold' : 'check';
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Animated.View
        {...touch}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Your hand: ${cards.join(' and ')}`}
        accessibilityHint={canSwipe ? `Swipe up to ${up}, down to ${down}. Or use the buttons.` : undefined}
        style={[{ flexDirection: 'row', paddingVertical: spacing.xs, paddingHorizontal: spacing.xl }, reduce ? null : fan]}
      >
        <Animated.View style={[{ marginRight: -w * 0.22, boxShadow: '0 14px 28px -12px rgba(0,0,0,0.75)', borderRadius: w * 0.2 }, reduce ? null : left]}>
          <PlayingCard card={cards[0]} size="lg" width={w} />
        </Animated.View>
        <Animated.View style={[{ boxShadow: '0 14px 28px -12px rgba(0,0,0,0.75)', borderRadius: w * 0.2 }, reduce ? null : right]}>
          <PlayingCard card={cards[1]} size="lg" width={w} />
        </Animated.View>
      </Animated.View>
      {hint && canSwipe && (
        <Animated.View entering={FadeIn.delay(400).duration(motion.base).easing(EASE_OUT)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessible={false} importantForAccessibility="no-hide-descendants">
          <Icon name="arrow.up" size={12} color="rgba(255,255,255,0.55)" />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.55)' }}>
            Swipe up to {up} · down to {down}
          </Text>
          <Icon name="arrow.down" size={12} color="rgba(255,255,255,0.55)" />
        </Animated.View>
      )}
    </View>
  );
}
