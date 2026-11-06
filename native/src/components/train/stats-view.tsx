import { Text, View } from 'react-native';

import { brand, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { ThemedText } from '../themed-text';
import type { TrainStats } from './stats';

const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`);

/**
 * The Stats half of the Train tab: how you're going. Best plays as a share of the hands you've played (with the
 * best / also good / missed split as one bar), three totals, the last seven days' points, and how you do in each
 * of the four units.
 */
export function StatsView({ stats }: { stats: TrainStats }) {
  const colors = useColors();
  const shadows = useShadows();
  const card = { borderRadius: radius.lg, borderCurve: 'continuous' as const, backgroundColor: colors.cell, boxShadow: shadows.card };
  if (stats.played === 0) {
    return (
      <View style={[card, { padding: spacing.lg, gap: spacing.xs }]}>
        <ThemedText variant="title3">No numbers yet</ThemedText>
        <ThemedText tone="secondaryLabel">Play a few hands and how you’re going shows up here.</ThemedText>
      </View>
    );
  }
  const top = Math.max(1, ...stats.week.map((d) => d.xp));
  const share = (n: number) => `${(n / stats.played) * 100}%` as const;
  return (
    <>
      <View
        style={[card, { padding: spacing.md, gap: spacing.sm }]}
        accessible
        accessibilityLabel={`Best plays: ${pct(stats.accuracy)} of ${stats.played} hands. ${stats.best} best, ${stats.ok} also good, ${stats.mistake} missed.`}
      >
        <Text
          maxFontSizeMultiplier={1.2}
          style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: colors.tertiaryLabel as string }}
        >
          BEST PLAYS
        </Text>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{
            fontFamily: ROUNDED,
            fontSize: 52,
            lineHeight: 58,
            fontWeight: '800',
            color: colors.label,
            fontVariant: ['tabular-nums'],
          }}
        >
          {pct(stats.accuracy)}
        </Text>
        <View
          style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.cellPressed as string }}
        >
          <View style={{ width: share(stats.best), backgroundColor: brand.gold }} />
          <View style={{ width: share(stats.ok), backgroundColor: brand.violet }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Legend colour={brand.gold} text={`${stats.best} best`} />
          <Legend colour={brand.violet} text={`${stats.ok} also good`} />
          <Legend colour={colors.tertiaryLabel as string} text={`${stats.mistake} missed`} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile value={stats.played.toLocaleString('en-US')} line="hands played" />
        <Tile value={stats.points.toLocaleString('en-US')} line="points" />
        <Tile value={String(stats.streak)} line="day streak" />
      </View>

      <View style={[card, { padding: spacing.md, gap: spacing.sm }]}>
        <ThemedText variant="headline" accessibilityRole="header">
          This week
        </ThemedText>
        <View
          style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 96 }}
          accessible
          accessibilityLabel={`Points the last seven days: ${stats.week.map((d) => d.xp).join(', ')}`}
        >
          {stats.week.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 22,
                  height: Math.max(4, (d.xp / top) * 70),
                  borderRadius: 6,
                  backgroundColor: d.xp ? (d.today ? brand.gold : brand.violet) : (colors.cellPressed as string),
                }}
              />
              <Text
                maxFontSizeMultiplier={1.2}
                style={{ fontSize: 12, fontWeight: '700', color: d.today ? brand.gold : (colors.tertiaryLabel as string) }}
              >
                {d.letter}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[card, { padding: spacing.md, gap: spacing.md }]}>
        <ThemedText variant="headline" accessibilityRole="header">
          By unit
        </ThemedText>
        {stats.units.map((u) => (
          <View
            key={u.family}
            style={{ gap: 6 }}
            accessible
            accessibilityLabel={`${u.name}: ${pct(u.accuracy)} best plays over ${u.played} hands`}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
                {u.name}
              </ThemedText>
              <ThemedText tone="secondaryLabel" style={{ fontVariant: ['tabular-nums'] }}>
                {u.played ? `${pct(u.accuracy)} · ${u.played} hands` : 'Not played'}
              </ThemedText>
            </View>
            <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.cellPressed as string }}>
              <View style={{ width: `${(u.accuracy ?? 0) * 100}%`, height: 8, backgroundColor: brand.violet }} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile value={String(stats.roundBest)} line="best round" />
        <Tile value={String(stats.blitzBest)} line="best Blitz" />
        <Tile value={String(stats.rounds)} line="sessions" />
      </View>
    </>
  );
}

function Legend({ colour, text }: { colour: string; text: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colour }} />
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '600', color: colors.secondaryLabel as string }}>
        {text}
      </Text>
    </View>
  );
}

function Tile({ value, line }: { value: string; line: string }) {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <View
      style={{
        flex: 1,
        padding: spacing.sm,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: colors.cell,
        boxShadow: shadows.card,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 29, fontWeight: '800', color: colors.gold, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '600', color: colors.secondaryLabel as string }}>
        {line}
      </Text>
    </View>
  );
}
