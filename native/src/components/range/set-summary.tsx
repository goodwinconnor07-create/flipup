// The end of a Range training set: how many of the five were the best play, then each hand with its grade (a tap
// opens its breakdown), with Another 5 and Done pinned under it by the set screen.
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { detail, popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { setVerdict, VERDICT } from '@/state/range-result';
import { brand, radius, spacing, useColors } from '@/theme';
import type { Grade, OptionId, Scenario } from '@train/ranges/model';

export interface SetAnswer {
  scenario: Scenario;
  pick: OptionId;
  grade: Grade;
}

const ICON: Record<Grade, IconName> = { best: 'checkmark.circle.fill', ok: 'checkmark.circle.fill', mistake: 'xmark.circle.fill' };

/** A grade's colour: gold for a best play, blue for also good, grey for a miss (as on the result card). */
export function useGradeInk(): Record<Grade, string> {
  const colors = useColors();
  return { best: brand.gold, ok: colors.accent as string, mistake: colors.quaternaryLabel as string };
}

export function SetSummary({ answers, still, onShare }: { answers: SetAnswer[]; /** No entrance (a finished daily quiz opened again to see your answers). */ still?: boolean; /** The daily quiz: Share sits right by the result, while the pride is fresh. */ onShare?: () => void }) {
  const colors = useColors();
  const reduce = useReduceMotion() || !!still;
  const ink = useGradeInk();
  const best = answers.filter((a) => a.grade === 'best').length;
  return (
    <View style={{ gap: spacing.lg }}>
      <Animated.View entering={reduce ? undefined : popIn()} accessible accessibilityLabel={`${setVerdict(best, answers.length)}. ${best} of ${answers.length} best plays.`} style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {answers.map((a, i) => (
            <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: ink[a.grade] }} />
          ))}
        </View>
        <ThemedText variant="largeTitle" style={{ fontWeight: '800', marginTop: spacing.xs }}>
          {best} of {answers.length}
        </ThemedText>
        <ThemedText variant="title3" tone="secondaryLabel">
          {setVerdict(best, answers.length)}
        </ThemedText>
      </Animated.View>
      {onShare && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Share your result"
          onPress={onShare}
          outerStyle={{ alignSelf: 'center' }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: colors.accent as string, marginTop: -spacing.sm }}
        >
          <Icon name="square.and.arrow.up" size={17} color="#ffffff" />
          <ThemedText variant="headline" style={{ color: '#ffffff' }}>
            Share your result
          </ThemedText>
        </PressableScale>
      )}

      <View style={{ gap: spacing.xs }}>
        {answers.map((a, i) => (
          <Animated.View key={a.scenario.id + i} entering={detail(i + 1, reduce)}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${a.scenario.title}: ${VERDICT[a.grade]}. Open the breakdown.`}
              onPress={() => router.push({ pathname: '/range-breakdown', params: { id: a.scenario.id, pick: a.pick } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}
            >
              <Icon name={ICON[a.grade]} size={24} color={ink[a.grade]} />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="headline" numberOfLines={2}>
                  {a.scenario.title}
                </ThemedText>
                <ThemedText variant="footnote" tone="secondaryLabel">
                  {VERDICT[a.grade]} · {a.scenario.concept}
                </ThemedText>
              </View>
              <Icon name="chevron.right" size={15} color={colors.tertiaryLabel as string} />
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
