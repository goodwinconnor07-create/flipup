import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_OUT, rubber, SETTLE } from '@/motion/presets';
import { motion, radius as radii, useColors } from '@/theme';

import { haptic } from './haptics';
import { Icon } from './icon';
import { ThemedText } from './themed-text';


/**
 * A row you can swipe away, either way, like a notification: past a third of its width it slides off and
 * `onDismiss` runs; short of that it springs back. Red Remove shows underneath as it goes. Taps still reach the row
 * (the swipe only takes over once the finger moves sideways).
 */
export function SwipeAway({ onDismiss, label, radius = radii.md, children }: { onDismiss: () => void; label: string; radius?: number; children: ReactNode }) {
  const colors = useColors();
  const x = useSharedValue(0);
  const [width, setWidth] = useState(0);
  const start = useRef({ x: 0, y: 0 });
  const armed = useRef(false);
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const under = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(x.get()) / 60) }));
  const limit = width / 3;
  const dismiss = (dir: number) => {
    haptic.tap();
    x.set(withTiming(dir * (width + 40), { duration: motion.exit, easing: EASE_OUT }));
    setTimeout(onDismiss, motion.exit + 10);
  };
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityActions={[{ name: 'delete', label }]} onAccessibilityAction={() => onDismiss()}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, borderRadius: radius, borderCurve: 'continuous', backgroundColor: colors.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, under]}>
        <Icon name="trash.fill" size={18} color="#ffffff" />
        <ThemedText variant="headline" tone="onColor">
          Remove
        </ThemedText>
      </Animated.View>
      <Animated.View
        style={row}
        onMoveShouldSetResponderCapture={(e) => {
          const dx = e.nativeEvent.pageX - start.current.x;
          const dy = e.nativeEvent.pageY - start.current.y;
          return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
        }}
        onTouchStart={(e) => (start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
        onResponderMove={(e) => {
          const dx = e.nativeEvent.pageX - start.current.x;
          // Follows the finger exactly to the commit point, then meets resistance (rule 19).
          x.set(rubber(dx, limit, limit * 0.5));
          const past = Math.abs(dx) > limit;
          if (past !== armed.current) {
            armed.current = past;
            haptic.select();
          }
        }}
        onResponderRelease={(e) => {
          const dx = e.nativeEvent.pageX - start.current.x;
          armed.current = false;
          if (Math.abs(dx) > limit) dismiss(Math.sign(dx));
          else x.set(withSpring(0, SETTLE));
        }}
        onResponderTerminate={() => x.set(withSpring(0, SETTLE))}
      >
        {children}
      </Animated.View>
    </View>
  );
}
