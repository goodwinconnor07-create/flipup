import { useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_OUT, knobStretch, SETTLE } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useColors } from '@/theme';

import { haptic } from '../haptics';

/** Haptic notches across the track: a tick every 5% of the way (the bet); Bot Lab's 0 to 10 sliders tick once a step. */
const NOTCHES = 20;
const THUMB = 30;

/**
 * The bet slider: drag anywhere on it (or tap a spot) to set the amount. It ticks under your thumb like a ratchet,
 * a light tick every twentieth of the range and a firmer one at the minimum and at all in. While your finger is down
 * the thumb is exactly under it (never tweened: motion rule 14); the 12% stretch while held (rule 5) and the settle
 * onto the amount when you let go are the weight. Drawn in React Native (not the system slider) so the ticks are
 * possible. Bot Lab's sliders are the same control (`label`, `valueText`, `notches`, `onDrag`).
 */
export function RaiseSlider({
  value,
  min,
  max,
  step,
  tint,
  onChange,
  label = 'Bet amount',
  valueText,
  notches = NOTCHES,
  onDrag,
  reach = 0,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  tint: string;
  onChange: (v: number) => void;
  /** What VoiceOver calls it. */
  label?: string;
  /** What VoiceOver says for the value, when the number alone isn't enough ("7, aggressive"). */
  valueText?: string;
  /** Haptic ticks across the whole track. */
  notches?: number;
  /** A finger went down on it (true) or came off (false): a scrolling page holds still meanwhile. */
  onDrag?: (dragging: boolean) => void;
  /** Extra touch room above and below the track, in points (the track is drawn the same). A touch that just misses a slider on a page of sliders still moves it, instead of starting a swipe or a scroll. */
  reach?: number;
}) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const track = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number) => void) => void } | null>(null);
  // `width` is the track's own width, for drawing; `left` and `scale` map a finger's page position onto it (the
  // Premium page shows a scaled-down copy, where the window width and the layout width differ).
  const [box, setBox] = useState({ left: 0, width: 0, scale: 1 });
  const span = Math.max(1, max - min);
  // When the smallest raise is already all in there's nothing to slide: the thumb sits at the all-in end.
  const frac = (v: number) => (max <= min ? 1 : Math.min(1, Math.max(0, (v - min) / span)));
  const pos = useSharedValue(frac(value));
  const held = useSharedValue(0);
  const down = useRef(false);
  const notch = useRef(Math.round(frac(value) * notches));

  useEffect(() => {
    // While the finger is down `at()` places the thumb itself; this only moves it for a change from outside.
    if (down.current) return;
    const f = frac(value);
    pos.set(reduce ? f : withSpring(f, SETTLE));
  }, [value, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const measure = () => track.current?.measureInWindow((x, _y, w) => setBox((b) => ({ left: x, width: b.width || w, scale: b.width ? w / b.width : 1 })));

  const at = (e: GestureResponderEvent) => {
    if (!box.width) return;
    const f = Math.min(1, Math.max(0, ((e.nativeEvent.pageX - box.left) / box.scale - THUMB / 2) / Math.max(1, box.width - THUMB)));
    let v = min + Math.round((f * span) / step) * step;
    if (v + step > max || f >= 0.995) v = max;
    v = Math.max(min, Math.min(max, v));
    if (down.current) pos.set(f);
    const n = Math.round(frac(v) * notches);
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
    onDrag?.(false);
    held.set(withTiming(0, { duration: 160, easing: EASE_OUT }));
    const f = frac(value);
    pos.set(reduce ? f : withSpring(f, SETTLE));
  };

  const fill = useAnimatedStyle(() => ({ width: THUMB / 2 + pos.get() * Math.max(0, box.width - THUMB) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: pos.get() * Math.max(0, box.width - THUMB) }, { scaleX: knobStretch(held.get()).x }, { scaleY: knobStretch(held.get()).y }] }));

  return (
    <View
      ref={track as never}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setBox((b) => ({ ...b, width: w }));
        measure();
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, ...(valueText ? { text: valueText } : {}) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        measure();
        down.current = true;
        onDrag?.(true);
        held.set(withTiming(1, { duration: 100, easing: EASE_OUT }));
        at(e);
      }}
      onResponderMove={at}
      onResponderRelease={letGo}
      onResponderTerminate={letGo}
      style={reach ? { height: 44 + reach * 2, marginVertical: -reach, justifyContent: 'center', zIndex: 1 } : { height: 44, justifyContent: 'center' }}
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
