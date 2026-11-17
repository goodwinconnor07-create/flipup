// A Bot Lab dial: a round gauge from 0 to 10 you turn by dragging (up or right turns it up, down or left turns it
// down), like a knob on a mixing desk. It ticks under the finger at each step and a little firmer at the ends.
//
// Motion (docs/MOTION.md): while the finger is down the dial shows exactly where the finger has put it, never a
// tween (rule 14); the press feedback is the panel's 0.97 (rule 5). Nothing moves on its own, so it's the same under
// Reduce Motion. VoiceOver reads it as an adjustable control: swipe up or down to change it.
import { useRef, useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { dialWord, type LabDial } from '@/engine';
import { brand, ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { ThemedText } from '../themed-text';

/** The arc runs from 7:30 round the top to 4:30, like a knob's travel. */
const FROM = -135;
const TO = 135;
/** How far the finger travels for one step. */
const STEP_PT = 14;
const STROKE = 7;

const rad = (deg: number) => (deg * Math.PI) / 180;
const point = (c: number, r: number, deg: number) => ({ x: c + r * Math.sin(rad(deg)), y: c - r * Math.cos(rad(deg)) });
function arc(c: number, r: number, a: number, b: number): string {
  const s = point(c, r, a);
  const e = point(c, r, b);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

export function Dial({ dial, value, onChange, onDrag, size = 92 }: { dial: LabDial; value: number; onChange: (v: number) => void; onDrag?: (dragging: boolean) => void; size?: number }) {
  const [held, setHeld] = useState(false);
  const start = useRef({ x: 0, y: 0, v: value });
  const last = useRef(value);
  const c = size / 2;
  const r = c - STROKE;
  const at = FROM + ((TO - FROM) * value) / 10;
  const knob = point(c, r, at);

  const set = (v: number) => {
    const next = Math.max(0, Math.min(10, v));
    if (next === last.current) return;
    last.current = next;
    if (next === 0 || next === 10) haptic.turn();
    else haptic.select();
    onChange(next);
  };
  const begin = (e: GestureResponderEvent) => {
    start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, v: value };
    last.current = value;
    setHeld(true);
    onDrag?.(true);
  };
  const move = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - start.current.x;
    const dy = e.nativeEvent.pageY - start.current.y;
    set(start.current.v + Math.round((dx - dy) / STEP_PT));
  };
  const end = () => {
    setHeld(false);
    onDrag?.(false);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={dial.name}
      accessibilityValue={{ min: 0, max: 10, now: value, text: `${value}, ${dialWord(dial, value)}` }}
      accessibilityHint={`From ${dial.low} at 0 to ${dial.high} at 10.`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={begin}
      onResponderMove={move}
      onResponderRelease={end}
      onResponderTerminate={end}
      style={{ alignItems: 'center', gap: 6, transform: [{ scale: held ? 0.97 : 1 }] }}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Path d={arc(c, r, FROM, TO)} stroke="rgba(255,255,255,0.14)" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          {value > 0 && <Path d={arc(c, r, FROM, at)} stroke={brand.violetDark} strokeWidth={STROKE} strokeLinecap="round" fill="none" />}
          <Circle cx={knob.x} cy={knob.y} r={STROKE * 0.95} fill="#ffffff" />
        </Svg>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: size * 0.33, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
            {value}
          </Text>
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
          <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.55)' }}>0</Text>
          <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.55)' }}>10</Text>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <ThemedText variant="headline" numberOfLines={1}>
          {dial.name}
        </ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={1}>
          {dialWord(dial, value)}
        </ThemedText>
      </View>
    </View>
  );
}
