// The chip beside the Pot pill: a stack that grows with the pot, in five steps (the web's PotChips, same bands).
// Bigger pots show the next step, never a bigger picture, so the pill keeps its size. A new step pops in (a short
// scale spring); under Reduce Motion it swaps at once.
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Ellipse, G, Rect } from 'react-native-svg';

import { useReduceMotion } from '@/motion/use-reduce-motion';

/** Big blinds in the pot where each step ends: under 5, 15, 40, 100, then over. */
const BANDS_BB = [5, 15, 40, 100];

export function potTier(pot: number, bigBlind: number): number {
  const i = BANDS_BB.findIndex((b) => pot / Math.max(bigBlind, 1) < b);
  return i === -1 ? BANDS_BB.length : i;
}

/** Each stack: centre x, half width and number of chips, in a 24 × 20 box with chips 3 tall. */
const STACKS: { x: number; rx: number; n: number }[][] = [
  [{ x: 12, rx: 8, n: 1 }],
  [{ x: 12, rx: 7, n: 3 }],
  [{ x: 12, rx: 7, n: 5 }],
  [
    { x: 7, rx: 5.5, n: 4 },
    { x: 17, rx: 5.5, n: 3 },
  ],
  [
    { x: 5.5, rx: 4.5, n: 4 },
    { x: 18.5, rx: 4.5, n: 3 },
    { x: 12, rx: 6, n: 6 },
  ],
];

const TOP = '#e5322d';
const SIDE = '#a02320';

export function PotChips({ pot, bigBlind }: { pot: number; bigBlind: number }) {
  const tier = potTier(pot, bigBlind);
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduce) {
      scale.set(1);
      return;
    }
    scale.set(0.6);
    scale.set(withSpring(1, { mass: 1, stiffness: 420, damping: 14 }));
  }, [tier, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={[{ width: 24, height: 20 }, pop]}>
      <Svg width={24} height={20} viewBox="0 0 24 20" style={{ overflow: 'visible' }}>
        {STACKS[tier].flatMap((s) =>
          Array.from({ length: s.n }, (_, i) => {
            const cy = 16 - i * 3;
            return (
              <G key={`${s.x}:${i}`}>
                <Rect x={s.x - s.rx} y={cy} width={s.rx * 2} height={2.4} fill={SIDE} />
                <Ellipse cx={s.x} cy={cy} rx={s.rx} ry={2.4} fill={TOP} />
                <Ellipse cx={s.x} cy={cy} rx={s.rx * 0.6} ry={1.3} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={0.9} strokeDasharray="2 1.4" />
              </G>
            );
          }),
        )}
      </Svg>
    </Animated.View>
  );
}
