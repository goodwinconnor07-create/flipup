import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/motion/use-reduce-motion';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const MERIDIANS = 6;
const PARALLELS = [-0.66, -0.33, 0, 0.33, 0.66];

/** One line of longitude: its width follows the turn, so the wireframe reads as a sphere spinning. */
function Meridian({ i, r, c, turn }: { i: number; r: number; c: number; turn: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const a = turn.get() + (i * Math.PI) / MERIDIANS;
    const cos = Math.cos(a);
    return { rx: Math.abs(cos) * r, strokeOpacity: 0.18 + 0.5 * Math.abs(Math.sin(a)) };
  });
  return <AnimatedEllipse cx={c} cy={c} ry={r} fill="none" stroke="#9cc0ff" strokeWidth={1} animatedProps={props} />;
}

/**
 * The Global tab's globe: a glowing wireframe sphere that turns slowly (one turn a minute), drawn with
 * react-native-svg. The meridians' widths move on the UI thread; still under Reduce Motion.
 */
export function Globe({ size = 220 }: { size?: number }) {
  const reduce = useReduceMotion();
  const turn = useSharedValue(0.4);
  useEffect(() => {
    if (reduce) return;
    turn.set(withRepeat(withTiming(0.4 + Math.PI, { duration: 30_000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(turn);
  }, [reduce, turn]);
  const c = size / 2;
  const r = size * 0.42;
  return (
    <Svg width={size} height={size} accessible={false}>
      <Defs>
        <RadialGradient id="glow" cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#5b8bff" stopOpacity="0.55" />
          <Stop offset="0.7" stopColor="#2557d6" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#081433" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={size / 2} fill="url(#glow)" />
      <Circle cx={c} cy={c} r={r} fill="none" stroke="#b9d2ff" strokeOpacity={0.7} strokeWidth={1.2} />
      {PARALLELS.map((y) => (
        <Ellipse key={y} cx={c} cy={c + y * r} rx={r * Math.sqrt(1 - y * y)} ry={r * 0.16 * Math.sqrt(1 - y * y)} fill="none" stroke="#9cc0ff" strokeOpacity={0.3} strokeWidth={1} />
      ))}
      {Array.from({ length: MERIDIANS }, (_, i) => (
        <Meridian key={i} i={i} r={r} c={c} turn={turn} />
      ))}
    </Svg>
  );
}
