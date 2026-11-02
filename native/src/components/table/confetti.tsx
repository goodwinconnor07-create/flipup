// A short confetti burst for a win, as on the web (src/ui/effects.ts): pieces fly out from a point, fall and
// spin, and are gone in under two seconds. Each piece runs on the UI thread. Nothing is drawn under Reduce Motion,
// and it never takes a tap.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { confettiColors } from '@design/tokens';
import { useReduceMotion } from '@/motion/use-reduce-motion';

const DURATION = 1800;

interface Piece {
  vx: number;
  vy: number;
  size: number;
  color: string;
  spin: number;
  round: boolean;
}

/** Bursts once for each new `burst` key (0 shows nothing), from `origin` in the screen's points. */
export function Confetti({ burst, origin, colors = confettiColors.win, amount = 60 }: { burst: number; origin: { x: number; y: number }; colors?: readonly string[]; amount?: number }) {
  const reduce = useReduceMotion();
  if (!burst || reduce) return null;
  return <Burst key={burst} origin={origin} colors={colors} amount={amount} />;
}

function Burst({ origin, colors, amount }: { origin: { x: number; y: number }; colors: readonly string[]; amount: number }) {
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: amount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 220 + Math.random() * 380;
      return {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 420,
        size: 7 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        spin: (Math.random() - 0.5) * 1440,
        round: Math.random() < 0.4,
      };
    }),
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Bit key={i} piece={p} origin={origin} />
      ))}
    </View>
  );
}

function Bit({ piece, origin }: { piece: Piece; origin: { x: number; y: number } }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: DURATION, easing: Easing.linear }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => {
    const s = t.get() * (DURATION / 1000);
    // Thrown out, slowed by the air, pulled down.
    const x = piece.vx * s * (1 - s * 0.35);
    const y = piece.vy * s + 900 * s * s;
    return {
      opacity: t.get() < 0.7 ? 1 : 1 - (t.get() - 0.7) / 0.3,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${piece.spin * s}deg` }, { scaleY: piece.round ? 1 : Math.cos(s * 9) }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: origin.x - piece.size / 2, top: origin.y - piece.size / 2, width: piece.size, height: piece.round ? piece.size : piece.size * 0.55, borderRadius: piece.round ? piece.size / 2 : 1.5, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}
