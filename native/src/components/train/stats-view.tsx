import { Text, View } from 'react-native';

import { brand, cardColors, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { Stat } from '../home/passport';
import { Row, Section } from '../grouped-list';
import type { IconName } from '../icon';
import { LivingCard } from '../living-card';
import { ThemedText } from '../themed-text';
import type { TrainStats } from './stats';

const n = (v: number) => v.toLocaleString('en-US');
const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);
const UNIT_ICON: Record<string, IconName> = { reads: 'eye.fill', calls: 'trophy.fill', value: 'crown.fill', bluffs: 'bolt.fill' };

/**
 * The Stats half of the Train tab, built from the same pieces as Your stats on Home: a night card in the Passport's
 * style (spaced capitals, big rounded numbers), a gradient card for the week like the streak card, then grouped
 * Settings-style rows for each unit and your records. Counted on this phone.
 */
export function StatsView({ stats }: { stats: TrainStats }) {
  const colors = useColors();
  const shadows = useShadows();
  if (stats.played === 0) {
    return (
      <View
        style={{
          padding: spacing.lg,
          gap: spacing.xs,
          borderRadius: 16,
          borderCurve: 'continuous',
          backgroundColor: colors.cell,
          boxShadow: shadows.card,
        }}
      >
        <ThemedText variant="title3">No numbers yet</ThemedText>
        <ThemedText tone="secondaryLabel">Play a few hands and how you’re going shows up here.</ThemedText>
      </View>
    );
  }
  const weekPoints = stats.week.reduce((sum, d) => sum + d.xp, 0);
  return (
    <>
      <LivingCard colors={cardColors.night} style={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: 2 }}>
          <Text
            maxFontSizeMultiplier={1.2}
            style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 1.5, color: '#ffffff' }}
          >
            YOUR TRAINING
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1.2, color: 'rgba(255,255,255,0.65)' }}
          >
            ALL-TIME · ON THIS PHONE
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat label="Best plays" value={pct(stats.accuracy)} note={`${n(stats.best)} of ${n(stats.played)}`} big />
          <Stat label="Hands" value={n(stats.played)} note={`${n(stats.ok)} also good`} big />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat label="Points" value={n(stats.points)} grow={1.6} />
          <Stat label="Missed" value={n(stats.mistake)} />
          <Stat label="Streak" value={`${stats.streak}d`} />
        </View>
      </LivingCard>

      <LivingCard colors={cardColors.violet} style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.75)' }}>
          THIS WEEK
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 30, fontWeight: '700', color: '#ffffff' }}
        >
          {n(weekPoints)} {weekPoints === 1 ? 'point' : 'points'}
        </Text>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs }}
          accessible
          accessibilityLabel={`Points the last seven days: ${stats.week.map((d) => d.xp).join(', ')}`}
        >
          {stats.week.map((d, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 4 }}>
              <Text
                maxFontSizeMultiplier={1.2}
                style={{ fontSize: 12, fontWeight: '700', color: d.today ? brand.gold : 'rgba(255,255,255,0.65)' }}
              >
                {d.letter}
              </Text>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: d.xp ? brand.gold : 'rgba(255,255,255,0.14)',
                  borderWidth: d.today && !d.xp ? 2 : 0,
                  borderColor: brand.gold,
                }}
              >
                {d.xp > 0 && (
                  <Text
                    maxFontSizeMultiplier={1.1}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ fontSize: 11, fontWeight: '800', color: brand.goldInk, paddingHorizontal: 2 }}
                  >
                    {d.xp}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </LivingCard>

      <Section header="By unit">
        {stats.units.map((u) => (
          <Row
            key={u.family}
            title={u.name}
            subtitle={u.played ? `${n(u.played)} ${u.played === 1 ? 'hand' : 'hands'}` : 'Not played yet'}
            detail={u.played ? pct(u.accuracy) : undefined}
            icon={{ symbol: UNIT_ICON[u.family] ?? 'star.fill', color: brand.violet }}
          />
        ))}
      </Section>

      <Section header="Records">
        <Row title="Best round" detail={n(stats.roundBest)} icon={{ symbol: 'play.fill', color: brand.violet }} />
        <Row title="Best Blitz" detail={n(stats.blitzBest)} icon={{ symbol: 'bolt.fill', color: brand.violet }} />
        <Row title="Sessions" detail={n(stats.rounds)} icon={{ symbol: 'calendar', color: brand.violet }} />
      </Section>
    </>
  );
}
