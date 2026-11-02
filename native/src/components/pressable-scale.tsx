import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme';

import { haptic } from './haptics';

/**
 * Press feedback for everything you tap: it dips to 97% and dims in 80ms as the finger lands, and springs back
 * when it lifts (mass 1, stiffness 450, damping 30). A light haptic on the tap. With Reduce Motion it only dims.
 * Runs on the UI thread; the two state changes per press are the only JS work. Disabled, it sits at 40%.
 */
export function PressableScale({
  children,
  style,
  onPress,
  disabled,
  haptics = true,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & { children: ReactNode; style?: StyleProp<ViewStyle>; haptics?: boolean }) {
  const reduce = useReducedMotion();
  const down = useSharedValue(0);
  const [, setPressed] = useState(false);
  const rest = disabled ? 0.4 : 1;
  const look = useAnimatedStyle(() => ({
    opacity: rest * (1 - down.value * (1 - motion.pressOpacity)),
    transform: reduce ? [] : [{ scale: 1 - down.value * (1 - motion.pressScale) }],
  }));
  return (
    <Pressable
      {...props}
      disabled={disabled}
      hitSlop={8}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        down.value = withTiming(1, { duration: motion.pressIn });
        setPressed(true);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        down.value = withSpring(0, motion.pressSpring);
        setPressed(false);
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
