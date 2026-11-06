import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EASE_OUT, popIn, stagger } from '@/motion/presets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { scenarioById } from '@/state/ranges';
import type { Grade } from '@train/ranges/model';
import { brand, motion, radius, ROUNDED, spacing } from '@/theme';

import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';
import { RoundButton } from '../tab-screen';
import { playSound } from '../table/sounds';
import { useCountTo } from './count-up';
import { SQUARE_COLOUR, useRangeShare, type ShareSummary } from './share';
import { trickOf } from './words';

export interface HandResult {
  id: string;
  grade: Grade;
  points: number;
  bonus: number;
}

const GRADE_ICON: Record<Grade, IconName> = { best: 'checkmark.seal.fill', ok: 'hand.thumbsup.fill', mistake: 'arrow.uturn.backward' };

/**
 * How it went, on the room's own night: the mode, stars that pop in one by one (with a tick and a pop each),
 * the score counting up in gold (and New best), the hands as a row of coloured squares, the flame, then every
 * hand's trick (tap one to play it again), and Play again, Fix your misses, Share and Done.
 */
export function EndCard({
  summary,
  results,
  newBest,
  onAgain,
  onFix,
  onHand,
  onDone,
}: {
  summary: ShareSummary;
  results: HandResult[];
  newBest: boolean;
  onAgain: (() => void) | null;
  onFix: (() => void) | null;
  onHand: (id: string) => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const score = useCountTo(summary.score, { delay: 500, ms: 1200 });
  const { share, card, busy } = useRangeShare(summary);
  const stars = summary.stars;

  useEffect(() => {
    if (stars == null) return;
    const timers = Array.from({ length: stars }, (_, i) =>
      setTimeout(() => {
        haptic.tap();
        playSound('pop');
      }, 350 + i * 260),
    );
    if (stars === 3) timers.push(setTimeout(() => haptic.success(), 350 + 3 * 260));
    return () => timers.forEach(clearTimeout);
  }, [stars]);

  return (
    <View style={{ flex: 1 }}>
      {card}
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.md, gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <RoundButton icon="xmark" label="Done" onPress={onDone} />
          <RoundButton icon="square.and.arrow.up" label="Share" onPress={() => void share()} />
        </View>

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.4, color: brand.gold }}>
            {(summary.day ? `${summary.title} · ${summary.day}` : summary.title).toUpperCase()}
          </Text>
          {stars != null && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityLabel={`${stars} of 3 stars`}>
              {[0, 1, 2].map((i) => (
                <Animated.View key={i} entering={reduce ? undefined : popIn().delay(350 + i * 260)}>
                  <Icon name="star.fill" size={i === 1 ? 64 : 50} color={i < stars ? brand.gold : 'rgba(255,255,255,0.14)'} />
                </Animated.View>
              ))}
            </View>
          )}
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 76, lineHeight: 84, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }} accessibilityLabel={`${summary.score} points`}>
            {Math.round(score)}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
            {summary.blitz ? `points · ${summary.blitz.hands} hands · best run ${summary.blitz.run}` : 'points'}
          </Text>
          {newBest && (
            <Animated.View entering={FadeInDown.delay(1300).duration(motion.base).easing(EASE_OUT)} style={{ paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: brand.gold }}>
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 14, fontWeight: '800', color: brand.goldInk }}>
                New best
              </Text>
            </Animated.View>
          )}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }} accessibilityLabel={`${results.filter((r) => r.grade === 'best').length} best plays out of ${results.length}`}>
          {results.slice(0, 36).map((r, i) => (
            <Animated.View key={i} entering={reduce ? undefined : popIn().delay(700 + stagger(i))} style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: SQUARE_COLOUR[r.grade] }}>
              <Icon name={GRADE_ICON[r.grade]} size={15} color={r.grade === 'best' ? brand.goldInk : 'rgba(255,255,255,0.8)'} />
            </Animated.View>
          ))}
        </View>

        {summary.flame > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="flame.fill" size={18} color={brand.gold} />
            <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
              {summary.flame}-day streak
            </Text>
          </View>
        )}

        <View style={{ gap: spacing.xs }}>
          {onAgain && <Big title="Play again" onPress={onAgain} />}
          {onFix && <Soft icon="arrow.counterclockwise" title={`Fix your misses (${results.filter((r) => r.grade === 'mistake').length})`} onPress={onFix} />}
          <Soft icon="square.and.arrow.up" title={busy ? 'Getting it ready…' : 'Share'} onPress={() => void share()} />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255,255,255,0.55)' }}>
            THE HANDS
          </Text>
          {dedupe(results).map((r) => {
            const s = scenarioById(r.id);
            if (!s) return null;
            const t = trickOf(s.concept);
            return (
              <PressableScale key={r.id} accessibilityRole="button" accessibilityLabel={`${t.nick}: ${s.title}. Play it again`} onPress={() => onHand(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.07)' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: SQUARE_COLOUR[r.grade] }}>
                  <Icon name={t.icon} size={17} color={r.grade === 'best' ? brand.goldInk : '#ffffff'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                    {t.nick}
                  </Text>
                  <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                    {s.title}
                  </Text>
                </View>
                <Icon name="chevron.right" size={13} color="rgba(255,255,255,0.4)" />
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/** Each hand once, keeping its last answer (Blitz can deal a hand twice). */
const dedupe = (rs: HandResult[]) => [...new Map(rs.map((r) => [r.id, r])).values()];

function Big({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} outerStyle={{ alignSelf: 'stretch' }} style={{ borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: brand.paperEdge, paddingBottom: 4 }}>
      <View style={{ minHeight: 58, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 21, fontWeight: '800', color: brand.violet }}>
          {title}
        </Text>
      </View>
    </PressableScale>
  );
}

function Soft({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ minHeight: 52, borderRadius: radius.md, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: 'rgba(255,255,255,0.12)' }}>
      <Icon name={icon} size={15} color="#ffffff" />
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
        {title}
      </Text>
    </PressableScale>
  );
}
