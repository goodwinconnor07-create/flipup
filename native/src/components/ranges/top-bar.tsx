import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { SETTLE } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import type { Grade } from '@train/ranges/model';
import { brand, radius, ROUNDED, spacing } from '@/theme';

import { GlassSurface } from '../glass-surface';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { RoundButton } from '../tab-screen';
import { playSound } from '../table/sounds';
import { trickOf } from './words';

const DOT: Record<Grade, string> = { best: brand.gold, ok: brand.violetDark, mistake: 'rgba(255,255,255,0.28)' };

/**
 * The bar that floats over the room, in glass: close on the left, then how far through you are (a dot a hand,
 * coloured by how it went, or Blitz's clock and multiplier), and under it the hand's trick as a pill that opens
 * the word sheet.
 */
export function TopBar({
  total,
  index,
  done,
  label,
  concept,
  clock,
  onClose,
}: {
  total: number;
  index: number;
  done: Grade[];
  label: string;
  concept: string | null;
  /** Blitz: when the clock runs out, and the run's multiplier. */
  clock?: { endsAt: number; multiplier: number; score: number } | null;
  onClose: () => void;
}) {
  const trick = concept ? trickOf(concept) : null;
  return (
    <View style={{ gap: spacing.xs, paddingHorizontal: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <RoundButton icon="xmark" label="Close" onPress={onClose} />
        <GlassSurface style={{ flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {clock ? <BlitzClock {...clock} /> : <Dots total={total} index={index} done={done} />}
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)', fontVariant: ['tabular-nums'] }}>
            {label}
          </Text>
        </GlassSurface>
      </View>
      {trick && concept && (
        <View style={{ alignItems: 'center' }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${trick.nick}. What it means`}
            onPress={() => router.push({ pathname: '/range-glossary', params: { concept } })}
            style={{ borderRadius: radius.full, overflow: 'hidden' }}
          >
            <GlassSurface interactive style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, height: 30, borderRadius: radius.full }}>
              <Icon name={trick.icon} size={13} color={brand.gold} />
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                {trick.nick}
              </Text>
              <Icon name="questionmark.circle.fill" size={13} color="rgba(255,255,255,0.5)" />
            </GlassSurface>
          </PressableScale>
        </View>
      )}
    </View>
  );
}

/** A dot a hand: gold for best, violet for good, grey for a miss; the one you're on is a wider pill. */
function Dots({ total, index, done }: { total: number; index: number; done: Grade[] }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel={`Hand ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Dot key={i} colour={done[i] ? DOT[done[i]] : i === index ? '#ffffff' : 'rgba(255,255,255,0.18)'} current={i === index && !done[i]} />
      ))}
    </View>
  );
}

function Dot({ colour, current }: { colour: string; current: boolean }) {
  const reduce = useReduceMotion();
  const w = useSharedValue(current ? 22 : 8);
  useEffect(() => {
    w.set(reduce ? (current ? 22 : 8) : withSpring(current ? 22 : 8, SETTLE));
  }, [current, reduce, w]);
  const style = useAnimatedStyle(() => ({ width: w.get() }));
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: colour }, style]} />;
}

/** Blitz's clock: a bar that empties, the seconds, and the multiplier when there is one. The last five seconds tick. */
function BlitzClock({ endsAt, multiplier, score }: { endsAt: number; multiplier: number; score: number }) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, endsAt - now);
  const secs = Math.ceil(left / 1000);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (secs > 0 && secs <= 5) {
      haptic.select();
      playSound('tick');
    }
  }, [secs]);
  const width = useSharedValue(1);
  useEffect(() => {
    width.set(withTiming(left / 60_000, { duration: 100 }));
  }, [left, width]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.round(width.get() * 1000) / 10}%` }));
  const hot = secs <= 10;
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }} accessibilityLabel={`${secs} seconds left, ${score} points`}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ minWidth: 40, fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: hot ? brand.gold : '#ffffff', fontVariant: ['tabular-nums'] }}>
        {secs}s
      </Text>
      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
        <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: hot ? brand.gold : brand.violetDark }, bar]} />
      </View>
      {multiplier > 1 && (
        <View style={{ paddingHorizontal: 7, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: brand.gold }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '800', color: brand.goldInk }}>
            ×{multiplier}
          </Text>
        </View>
      )}
    </View>
  );
}
