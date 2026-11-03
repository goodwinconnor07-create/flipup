import { useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useColors } from '@/theme';

import { haptic } from '../haptics';

/** Haptic notches across the track: a tick every 5% of the way. */
const NOTCHES = 20;
const THUMB = 30;
/** The thumb trails the finger a touch, which is what gives the slider its weight. */
const FOLLOW = { mass: 0.7, stiffness: 320, damping: 26 };

/**
 * The bet slider: drag anywhere on it (or tap a spot) to set the amount. It ticks under your thumb like a ratchet,
 * a light tick every twentieth of the range and a firmer one at the minimum and at all in, and the thumb follows on
 * a spring instead of sticking to the finger, so it feels like it has some drag. Drawn in React Native (not the
 * system slider) so both of those are possible.
 */
export function RaiseSlider({ value, min, max, step, tint, onChange }: { value: number; min: number; max: number; step: number; tint: string; onChange: (v: number) => void }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const track = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number) => void) => void } | null>(null);
  const [box, setBox] = useState({ left: 0, width: 0 });
  const span = Math.max(1, max - min);
  const frac = (v: number) => Math.min(1, Math.max(0, (v - min) / span));
  const pos = useSharedValue(frac(value));
  const held = useSharedValue(0);
  const notch = useRef(Math.round(frac(value) * NOTCHES));

  useEffect(() => {
    const f = frac(value);
    pos.set(reduce ? f : withSpring(f, FOLLOW));
  }, [value, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const measure = () => track.current?.measureInWindow((x, _y, w) => setBox({ left: x, width: w }));

  const at = (e: GestureResponderEvent) => {
    if (!box.width) return;
    const f = Math.min(1, Math.max(0, (e.nativeEvent.pageX - box.left - THUMB / 2) / Math.max(1, box.width - THUMB)));
    let v = min + Math.round((f * span) / step) * step;
    if (v + step > max || f >= 0.995) v = max;
    v = Math.max(min, Math.min(max, v));
    const n = Math.round(frac(v) * NOTCHES);
    if (n !== notch.current) {
      notch.current = n;
      if (v === max || v === min) haptic.turn();
      else haptic.select();
    }
    if (v !== value) onChange(v);
  };

  const fill = useAnimatedStyle(() => ({ width: THUMB / 2 + pos.get() * Math.max(0, box.width - THUMB) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: pos.get() * Math.max(0, box.width - THUMB) }, { scale: 1 + held.get() * 0.12 }] }));

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
        held.set(withSpring(1, FOLLOW));
        at(e);
      }}
      onResponderMove={at}
      onResponderRelease={() => held.set(withSpring(0, FOLLOW))}
      onResponderTerminate={() => held.set(withSpring(0, FOLLOW))}
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
