import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import type { Character, Pile } from '@/state/range-logic';
import type { HandNumbers } from '@/state/ranges';
import { bb, type Grade, type OptionId, type Pos } from '@train/ranges/model';
import { brand, gradient, radius, ROUNDED, spacing } from '@/theme';

import { Icon, type IconName } from '../icon';
import { LivingCard } from '../living-card';
import { PressableScale } from '../pressable-scale';
import { useCountTo } from './count-up';
import { OddsDial } from './dial';
import { GlossaryText } from './glossary-text';
import { Piles } from './piles';

const HEAD: Record<Grade, { title: string; icon: IconName; ink: string; colors: readonly [string, string, string]; glow: string }> = {
  best: { title: 'Best play!', icon: 'checkmark.seal.fill', ink: brand.gold, colors: ['#4a3508', '#101f4c', '#070e26'], glow: 'rgba(255, 201, 51, 0.38)' },
  ok: { title: 'Also good', icon: 'hand.thumbsup.fill', ink: '#a8bff5', colors: ['#152f86', '#0e1b42', '#070e26'], glow: 'rgba(90, 140, 255, 0.34)' },
  mistake: { title: 'Not this time', icon: 'arrow.uturn.backward', ink: 'rgba(255,255,255,0.88)', colors: ['#24242e', '#16161d', '#0c0c12'], glow: 'rgba(255, 255, 255, 0.06)' },
};

export interface RevealProps {
  grade: Grade;
  pick: OptionId;
  best: OptionId;
  labelOf: (id: OptionId) => string;
  why: string;
  numbers: HandNumbers;
  facing: boolean;
  piles: { pos: Pos; who: Character; piles: Pile[] }[];
  points: number;
  bonus: number;
  guess: number | null;
  pro: boolean;
  last: boolean;
  maxHeight: number;
  onNext: () => void;
  onWhy: () => void;
}

/**
 * The answer, rising over the bottom of the table so the hand stays in view. The verdict first, big: gold with a
 * burst of light for the best play, violet for a good one, quiet for a miss (never red). Then why in a line or two,
 * your chance to win as a ring against the price, what the best play earns on average counting up in gold, and
 * their range as piles of cards. Show me why opens the whole story; Next hand moves on.
 */
export function Reveal(p: RevealProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const head = HEAD[p.grade];
  const [tab, setTab] = useState(0);
  const edge = edgeOf(p.numbers, p.best, p.pick);
  const total = p.points + p.bonus;
  const pile = p.piles[Math.min(tab, p.piles.length - 1)];
  return (
    <Animated.View
      entering={reduce ? FadeIn.duration(200) : SlideInDown.springify().mass(0.9).damping(19).stiffness(170)}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xs, paddingBottom: Math.max(insets.bottom - spacing.xs, spacing.xs) }}
    >
      <LivingCard colors={head.colors} glow={head.glow} glow2="rgba(90, 140, 255, 0.22)" radius={radius.xl} style={{ maxHeight: p.maxHeight }}>
        {p.grade === 'best' && <Burst />}
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ flexShrink: 1, flexGrow: 0 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} accessible accessibilityLiveRegion="assertive" accessibilityLabel={`${head.title} ${p.pick === p.best ? '' : `Best: ${p.labelOf(p.best)}.`} ${total >= 0 ? 'plus' : 'minus'} ${Math.abs(total)} points`}>
            <Icon name={head.icon} size={34} color={head.ink} />
            <View style={{ flex: 1 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 30, lineHeight: 35, fontWeight: '800', color: head.ink }}>
                {head.title}
              </Text>
              <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                {p.pick === p.best ? `You picked ${p.labelOf(p.pick)}` : `Best: ${p.labelOf(p.best)} · You: ${p.labelOf(p.pick)}`}
              </Text>
            </View>
            <PointsBadge points={total} />
          </View>

          <GlossaryText style={{ fontSize: 17, lineHeight: 24, fontWeight: '600', color: '#ffffff' }}>{p.why}</GlossaryText>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <OddsDial equity={p.numbers.equity} price={p.facing ? p.numbers.price : null} size={104} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              {p.facing ? (
                <Fact big={p.numbers.equity >= p.numbers.price ? 'Calling pays' : 'Calling loses'} line={`You need ${Math.round(p.numbers.price * 100)}%, you have ${Math.round(p.numbers.equity * 100)}%`} gold={p.numbers.equity >= p.numbers.price} />
              ) : (
                <Fact big={`${Math.round(p.numbers.equity * 100)}% now`} line="How often you’d win if it all went to showdown" />
              )}
              {edge && <Edge value={edge.value} line={edge.line} />}
              {p.pro && p.guess != null && <Fact big={`You guessed ${p.guess}%`} line={p.bonus ? `+${p.bonus} for a close guess` : 'Not close enough for a bonus'} small />}
            </View>
          </View>

          {pile && pile.piles.length > 0 && (
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255,255,255,0.6)' }}>
                  WHAT {p.piles.length > 1 ? pile.who.name.toUpperCase() : 'THEY'} COULD HAVE
                </Text>
                {p.piles.length > 1 &&
                  p.piles.map((x, i) => (
                    <PressableScale key={x.pos} accessibilityRole="tab" accessibilityLabel={x.who.name} accessibilityState={{ selected: i === tab }} onPress={() => setTab(i)} style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: i === tab ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)' }}>
                      <Text maxFontSizeMultiplier={1}>{x.who.emoji}</Text>
                    </PressableScale>
                  ))}
              </View>
              <Piles key={pile.pos} piles={pile.piles} facing={p.facing} />
            </View>
          )}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.lg }}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Show me why" onPress={p.onWhy} outerStyle={{ flex: 1 }} style={{ minHeight: 54, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <Icon name="lightbulb.fill" size={15} color={brand.gold} />
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
              Show me why
            </Text>
          </PressableScale>
          <PressableScale accessibilityRole="button" accessibilityLabel={p.last ? 'See how you did' : 'Next hand'} onPress={p.onNext} outerStyle={{ flex: 1.3 }} style={{ borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: brand.paperEdge, paddingBottom: 4 }}>
            <View style={{ minHeight: 50, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 18, fontWeight: '800', color: brand.violet }}>
                {p.last ? 'See how you did' : 'Next hand'}
              </Text>
            </View>
          </PressableScale>
        </View>
      </LivingCard>
    </Animated.View>
  );
}

/** How much the pick gave up against the best play, or how far the best play was ahead of the next one. */
export function edgeOf(numbers: HandNumbers, best: OptionId, pick: OptionId): { value: number; line: string } | null {
  const ev = (id: OptionId) => numbers.rows.find((r) => r.id === id)?.ev;
  const evBest = ev(best);
  if (evBest === undefined) return null;
  if (pick !== best) {
    const evPick = ev(pick);
    if (evPick === undefined || evBest - evPick < 0.05) return null;
    return { value: evBest - evPick, line: 'left on the table, on average' };
  }
  const others = numbers.rows.filter((r) => r.id !== best).map((r) => r.ev);
  if (!others.length) return null;
  const gap = evBest - Math.max(...others);
  return gap >= 0.05 ? { value: gap, line: 'better than the next best play, on average' } : null;
}

function Fact({ big, line, gold, small }: { big: string; line: string; gold?: boolean; small?: boolean }) {
  return (
    <View>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: small ? 16 : 20, lineHeight: small ? 20 : 25, fontWeight: '800', color: gold ? brand.gold : '#ffffff' }}>
        {big}
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, lineHeight: 17, color: 'rgba(255,255,255,0.62)' }}>
        {line}
      </Text>
    </View>
  );
}

/** The gold number that counts up: big blinds won (or given up) on average. */
function Edge({ value, line }: { value: number; line: string }) {
  const shown = useCountTo(value, { delay: 500, ms: 1100 });
  return (
    <View>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 26, lineHeight: 31, fontWeight: '800', color: brand.gold, fontVariant: ['tabular-nums'] }}>
        {bb(Math.round(shown * 10) / 10)}
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, lineHeight: 17, color: 'rgba(255,255,255,0.62)' }}>
        {line}
      </Text>
    </View>
  );
}

function PointsBadge({ points }: { points: number }) {
  const shown = useCountTo(points, { delay: 300, ms: 700 });
  const plus = points >= 0;
  return (
    <View style={{ paddingHorizontal: 10, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: plus && points > 0 ? brand.gold : 'rgba(255,255,255,0.12)' }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 15, fontWeight: '800', color: plus && points > 0 ? brand.goldInk : '#ffffff', fontVariant: ['tabular-nums'] }}>
        {plus ? '+' : '−'}
        {Math.abs(Math.round(shown))}
      </Text>
    </View>
  );
}

/** The best play's burst: a ring of gold light that blooms out from the verdict and fades. */
function Burst() {
  const reduce = useReduceMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.set(withTiming(1, { duration: 1100, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [reduce, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.95 * (1 - t.get()), transform: [{ scale: 0.3 + 1.7 * t.get() }] }));
  if (reduce) return null;
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -60, top: -120, width: 320, height: 320, ...gradient('radial-gradient(circle at center, rgba(255,214,90,0.75) 0%, rgba(255,201,51,0.25) 35%, transparent 65%)') }, style]} />;
}

/**
 * Blitz's verdict: no time for the why, so a quick pill in the middle of the table (gold, violet or grey) with the
 * points, and the multiplier when the run is hot. The next hand comes up on its own.
 */
export function Flash({ grade, points, multiplier }: { grade: Grade; points: number; multiplier: number }) {
  const reduce = useReduceMotion();
  const head = HEAD[grade];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '38%', alignItems: 'center' }}>
      <Animated.View entering={reduce ? FadeIn.duration(120) : ZoomIn.springify().mass(0.5).damping(12)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, height: 56, borderRadius: 28, backgroundColor: grade === 'best' ? brand.gold : grade === 'ok' ? brand.violet : 'rgba(40,40,52,0.95)', boxShadow: '0 12px 30px -10px rgba(0,0,0,0.7)' }}>
        <Icon name={head.icon} size={22} color={grade === 'best' ? brand.goldInk : '#ffffff'} />
        <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 22, fontWeight: '800', color: grade === 'best' ? brand.goldInk : '#ffffff' }}>
          {grade === 'mistake' ? 'Miss' : `+${points}`}
          {grade !== 'mistake' && multiplier > 1 ? `  ×${multiplier}` : ''}
        </Text>
      </Animated.View>
    </View>
  );
}
