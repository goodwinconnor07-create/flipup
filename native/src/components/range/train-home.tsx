// Range training's start screen, the Train tab: a big card that starts a set of five hands (full screen, see
// app/range-session.tsx), three numbers on how you're doing, and the spots worth working on. Nothing is dealt here.
import { router } from 'expo-router';
import { View } from 'react-native';

import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { hasPremium, usePremium } from '@/state/premium';
import { useFreeSetsUsedToday } from '@/state/range-free';
import { unlockToTrain } from '@/state/unlock';
import { libraryProgress, longestRun, missedHands, rangeStats, type Answer } from '@/state/range-history';
import { SET_SIZE } from '@/state/range-result';
import { brand, cardColors, radius, ROUNDED, spacing, useColors } from '@/theme';
import type { Grade } from '@train/ranges/model';

const NUM = { fontVariant: ['tabular-nums' as const] };

/** Opens a set of five hands, full screen; `focus` limits it to some kinds of spot or single hands. */
export function startSet(focus?: string[]) {
  haptic.select();
  // Free is one set a day; practising chosen spots is Premium.
  if (!unlockToTrain(!!focus?.length, hasPremium())) return;
  router.push(focus?.length ? { pathname: '/range-session', params: { focus: JSON.stringify(focus) } } : '/range-session');
}

function Stat({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, gap: 2, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <ThemedText variant="title2" style={[{ fontFamily: ROUNDED, fontWeight: '800' }, NUM]}>
        {value}
      </ThemedText>
      <ThemedText variant="footnote" tone="secondaryLabel">
        {label}
      </ThemedText>
    </View>
  );
}

export function TrainHome({ history, grades }: { history: Answer[]; grades: Record<string, Grade> }) {
  const st = rangeStats(history);
  const lib = libraryProgress(grades);
  const missed = missedHands(history);
  const first = history.length === 0;
  const premium = usePremium();
  const spent = !premium && useFreeSetsUsedToday() >= 1;
  return (
    <View style={{ gap: spacing.xl }}>
      {/* The one thing to do here: play a set. */}
      <LivingCard colors={cardColors.violet} radius={radius.xl} style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="caption1" tone="onColor" style={{ fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 }}>
            {SET_SIZE} hands
          </ThemedText>
          <ThemedText variant="title1" tone="onColor" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
            {spent ? 'Today’s quiz is done' : first ? 'Play your first set' : 'Play a set'}
          </ThemedText>
          <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.9 }}>
            {premium
              ? 'Real hands from pro breakdowns. Read the table, make your call, then see why.'
              : spent
                ? 'You’ve played today’s free quiz. Premium opens every hand, any time.'
                : 'Today’s free quiz: five real hands from pro breakdowns. Premium opens every hand.'}
          </ThemedText>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Start ${SET_SIZE} hands`}
          onPress={() => startSet()}
          style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.full, backgroundColor: brand.paper, boxShadow: '0 6px 16px rgba(8,20,51,0.28)' }}
        >
          <Icon name="play.fill" size={18} color={brand.violet} />
          <ThemedText variant="headline" style={{ color: brand.violet, fontWeight: '800' }}>
            {spent ? 'Get Premium' : 'Start'}
          </ThemedText>
        </PressableScale>
      </LivingCard>

      {!first && (
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Stat value={`${Math.round(st.rate * 100)}%`} label="Best plays" />
          <Stat value={`${lib.best}/${lib.total}`} label="Mastered" />
          <Stat value={`${longestRun(history)}`} label="Best run" />
        </View>
      )}

      {(st.weakest.length > 0 || missed.length > 0) && (
        <Section header="Work on">
          {st.weakest.map((t) => (
            <Row key={t.label} title={t.label} detail={`${t.best} of ${t.total} best plays so far`} icon={{ symbol: 'lightbulb.fill', color: brand.violet }} trailing={premium ? undefined : <Icon name="crown.fill" size={15} color={brand.gold} />} onPress={() => startSet([t.label])} />
          ))}
          {missed.length > 0 && (
            <Row title="Retry your misses" detail={`${missed.length} hand${missed.length === 1 ? '' : 's'} to try again`} icon={{ symbol: 'arrow.counterclockwise', color: brand.violet }} trailing={premium ? undefined : <Icon name="crown.fill" size={15} color={brand.gold} />} onPress={() => startSet(missed.map((m) => `id:${m.id}`))} />
          )}
        </Section>
      )}

      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
        Every hand comes from a published breakdown by a pro or coach. Breakdown on each answer links to it.
      </ThemedText>
    </View>
  );
}
