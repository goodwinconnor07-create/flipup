import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_OUT, PRESS_SPRING } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { motion } from '@/theme';

import { haptic } from './haptics';

/**
 * Press feedback for everything you tap. Feedback on press-in, commit on press-out: it dips to 97% and dims in
 * 80ms as the finger lands, and springs back when it lifts (mass 1, stiffness 450, damping 30), so a quick
 * re-press picks up mid-spring. A light haptic on the tap. With Reduce Motion it only dims. Disabled, it sits at
 * 40%. The animation runs on the UI thread; press-in and press-out are the only JS work.
 */
export function PressableScale({
  children,
  style,
  onPress,
  disabled,
  haptics = true,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & { children: ReactNode; style?: StyleProp<ViewStyle>; haptics?: boolean }) {
  const reduce = useReduceMotion();
  const down = useSharedValue(0);
  const rest = disabled ? 0.4 : 1;
  const look = useAnimatedStyle(() => {
    const d = down.get();
    return {
      opacity: rest * (1 - d * (1 - motion.pressOpacity)),
      transform: reduce ? [] : [{ scale: 1 - d * (1 - motion.pressScale) }],
    };
  });
  return (
    <Pressable
      {...props}
      disabled={disabled}
      hitSlop={8}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        down.set(withTiming(1, { duration: motion.pressIn, easing: EASE_OUT }));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        down.set(withSpring(0, PRESS_SPRING));
        props.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics) haptic.tap();
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, look]}>{children}</Animated.View>
    </Pressable>
  );
}
