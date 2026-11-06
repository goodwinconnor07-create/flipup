import { useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_OUT, knobStretch, SETTLE } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useColors } from '@/theme';

import { haptic } from '../haptics';

/** Haptic notches across the track: a tick every 5% of the way. */
const NOTCHES = 20;
const THUMB = 30;

/**
 * The bet slider: drag anywhere on it (or tap a spot) to set the amount. It ticks under your thumb like a ratchet,
 * a light tick every twentieth of the range and a firmer one at the minimum and at all in. While your finger is down
 * the thumb is exactly under it (never tweened: motion rule 14); the 12% stretch while held (rule 5) and the settle
 * onto the amount when you let go are the weight. Drawn in React Native (not the system slider) so the ticks are
 * possible.
 */
export function RaiseSlider({ value, min, max, step, tint, onChange }: { value: number; min: number; max: number; step: number; tint: string; onChange: (v: number) => void }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const track = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number) => void) => void } | null>(null);
  const [box, setBox] = useState({ left: 0, width: 0 });
  const span = Math.max(1, max - min);
  // When the smallest raise is already all in there's nothing to slide: the thumb sits at the all-in end.
  const frac = (v: number) => (max <= min ? 1 : Math.min(1, Math.max(0, (v - min) / span)));
  const pos = useSharedValue(frac(value));
  const held = useSharedValue(0);
  const down = useRef(false);
  const notch = useRef(Math.round(frac(value) * NOTCHES));

  useEffect(() => {
    // While the finger is down `at()` places the thumb itself; this only moves it for a change from outside.
    if (down.current) return;
    const f = frac(value);
    pos.set(reduce ? f : withSpring(f, SETTLE));
  }, [value, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const measure = () => track.current?.measureInWindow((x, _y, w) => setBox({ left: x, width: w }));

  const at = (e: GestureResponderEvent) => {
    if (!box.width) return;
    const f = Math.min(1, Math.max(0, (e.nativeEvent.pageX - box.left - THUMB / 2) / Math.max(1, box.width - THUMB)));
    let v = min + Math.round((f * span) / step) * step;
    if (v + step > max || f >= 0.995) v = max;
    v = Math.max(min, Math.min(max, v));
    if (down.current) pos.set(f);
    const n = Math.round(frac(v) * NOTCHES);
    if (n !== notch.current) {
      notch.current = n;
      if (v === max || v === min) haptic.turn();
      else haptic.select();
    }
    if (v !== value) onChange(v);
  };

  // Let go: the thumb settles onto the amount that's set, without overshooting.
  const letGo = () => {
    down.current = false;
    held.set(withTiming(0, { duration: 160, easing: EASE_OUT }));
    const f = frac(value);
    pos.set(reduce ? f : withSpring(f, SETTLE));
  };

  const fill = useAnimatedStyle(() => ({ width: THUMB / 2 + pos.get() * Math.max(0, box.width - THUMB) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: pos.get() * Math.max(0, box.width - THUMB) }, { scaleX: knobStretch(held.get()).x }, { scaleY: knobStretch(held.get()).y }] }));

  return (
    <View
      ref={track as never}
      onLayout={measure}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Bet amount"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        measure();
        down.current = true;
        held.set(withTiming(1, { duration: 100, easing: EASE_OUT }));
        at(e);
      }}
      onResponderMove={at}
      onResponderRelease={letGo}
      onResponderTerminate={letGo}
      style={{ height: 44, justifyContent: 'center' }}
    >
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.cellPressed, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: tint }, fill]} />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)' }, knob]}
      />
    </View>
  );
}
