// How you're doing in Range training, from every answer you've given: your best-play rate, how it's moving, which
// kinds of spot you miss and which seats and formats, and a button that practises the weakest ones.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { rangeStats, type Answer, type Tally } from '@/state/range-history';
import { brand, radius, spacing, useColors } from '@/theme';

const NUM = { fontVariant: ['tabular-nums' as const] };
const pct = (x: number) => `${Math.round(x * 100)}%`;

function Card({ title, children }: { title?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      {title && (
        <ThemedText variant="title3" accessibilityRole="header">
          {title}
        </ThemedText>
      )}
      {children}
    </View>
  );
}

/** A label, how many were best plays, and a bar. */
function RateRow({ t, needs }: { t: Tally; /** A spot to work on: drawn in gold. */ needs?: boolean }) {
  const colors = useColors();
  return (
    <View accessibilityLabel={`${t.label}: ${t.best} of ${t.total} best plays`} style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <ThemedText variant="subhead" numberOfLines={1} style={{ flex: 1 }}>
          {t.label === 'UTG1' ? 'UTG+1' : t.label}
        </ThemedText>
        <ThemedText variant="footnote" tone="tertiaryLabel" style={NUM}>
          {t.best} of {t.total}
        </ThemedText>
        <ThemedText variant="subhead" style={[{ width: 44, textAlign: 'right', fontWeight: '700' }, NUM]}>
          {pct(t.rate)}
        </ThemedText>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.cellPressed, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(t.rate * 100)}%`, height: '100%', backgroundColor: needs ? brand.gold : brand.violet }} />
      </View>
    </View>
  );
}

export function StatsView({ history, onPractice }: { history: Answer[]; onPractice: (concepts: string[]) => void }) {
  const colors = useColors();
  const st = rangeStats(history);
  if (st.total === 0) {
    return (
      <Card>
        <ThemedText variant="title3">No answers yet</ThemedText>
        <ThemedText variant="body" tone="secondaryLabel">
          Answer a few hands and this page shows how you’re doing: your best-play rate, how it’s moving and which kinds of spot you miss.
        </ThemedText>
      </Card>
    );
  }
  const move = st.recent !== null && st.before !== null ? Math.round((st.recent - st.before) * 100) : null;
  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <ThemedText variant="caption1" tone="tertiaryLabel" style={{ letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' }}>
          Best plays
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
          <ThemedText variant="largeTitle" style={[{ fontWeight: '800' }, NUM]}>
            {pct(st.rate)}
          </ThemedText>
          <ThemedText variant="callout" tone="secondaryLabel">
            of {st.total} answer{st.total === 1 ? '' : 's'}
          </ThemedText>
        </View>
        {move !== null && (
          <ThemedText variant="subhead" tone="secondaryLabel">
            {move === 0 ? 'Level with the 20 before.' : `${move > 0 ? 'Up' : 'Down'} ${Math.abs(move)} point${Math.abs(move) === 1 ? '' : 's'} on the 20 before.`} Last 20: {pct(st.recent!)}.
          </ThemedText>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {[
            { label: 'Best play', n: st.best, bg: colors.goldBg as string, ink: colors.goldInk as string },
            { label: 'Also good', n: st.ok, bg: colors.blueBg as string, ink: colors.blueInk as string },
            { label: 'Missed', n: st.mistake, bg: colors.cellPressed as string, ink: colors.secondaryLabel as string },
          ].map((x) => (
            <View key={x.label} style={{ flex: 1, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: x.bg, gap: 2 }}>
              <ThemedText variant="title3" style={[{ fontWeight: '800', color: x.ink }, NUM]}>
                {x.n}
              </ThemedText>
              <ThemedText variant="caption1" style={{ color: x.ink }}>
                {x.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </Card>

      {st.trend.length > 1 && (
        <Card title="Your trend">
          <View accessibilityLabel={`Best-play rate in each run of 10 answers: ${st.trend.map(pct).join(', ')}`} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, height: 88 }}>
            {st.trend.map((r, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 3 }}>
                <ThemedText variant="caption2" tone="tertiaryLabel" style={NUM}>
                  {Math.round(r * 100)}
                </ThemedText>
                <View style={{ width: '100%', height: Math.max(4, Math.round(r * 66)), borderRadius: 4, backgroundColor: brand.violet, opacity: i === st.trend.length - 1 ? 1 : 0.55 }} />
              </View>
            ))}
          </View>
          <ThemedText variant="caption1" tone="tertiaryLabel">
            Best-play rate (%) in each run of 10 answers, oldest to newest.
          </ThemedText>
        </Card>
      )}

      {st.weakest.length > 0 && (
        <Card title="Where you miss most">
          {st.weakest.map((t) => (
            <RateRow key={t.label} t={t} needs />
          ))}
          <Button title="Practise these" onPress={() => onPractice(st.weakest.map((t) => t.label))} />
        </Card>
      )}

      {st.byConcept.length > 0 && (
        <Card title="By kind of spot">
          {st.byConcept.map((t) => (
            <RateRow key={t.label} t={t} />
          ))}
        </Card>
      )}
      {st.byPosition.length > 0 && (
        <Card title="By your seat">
          {st.byPosition.map((t) => (
            <RateRow key={t.label} t={t} />
          ))}
        </Card>
      )}
      {st.byFormat.length > 1 && (
        <Card title="Cash or tournament">
          {st.byFormat.map((t) => (
            <RateRow key={t.label} t={t} />
          ))}
        </Card>
      )}
    </View>
  );
}
