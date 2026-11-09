// How you're doing in Range training, as a dashboard of tiles (a gauge, a donut, rings, bars), from every answer you've
// given. Green is good, blue is neutral, gold is where to work. Tap a kind of spot to practise it.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { PressableScale } from '@/components/pressable-scale';
import { Donut, Gauge, RateRing } from '@/components/range/charts';
import { ThemedText } from '@/components/themed-text';
import { rangeStats, type Answer, type Tally } from '@/state/range-history';
import { seatName } from '@/state/range-view';
import { brand, radius, spacing, useColors } from '@/theme';

const NUM = { fontVariant: ['tabular-nums' as const] };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const GOOD = brand.raise;
const WORK = brand.gold;
const BLUE = '#0a84ff';
const tone = (rate: number) => (rate >= 0.6 ? GOOD : WORK);

function Tile({ title, children, style }: { title?: string; children: ReactNode; style?: object }) {
  const colors = useColors();
  return (
    <View style={[{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }, style]}>
      {title && (
        <ThemedText variant="caption1" tone="tertiaryLabel" accessibilityRole="header" style={{ letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700' }}>
          {title}
        </ThemedText>
      )}
      {children}
    </View>
  );
}

/** A label, how many were best plays, and a bar, green when you're doing well and gold when it needs work. */
function RateRow({ t, onPress }: { t: Tally; onPress?: () => void }) {
  const colors = useColors();
  const row = (
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
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.cellPressed, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(t.rate * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: tone(t.rate) }} />
      </View>
    </View>
  );
  return onPress ? (
    <PressableScale accessibilityRole="button" accessibilityHint="Practise this kind of spot" onPress={onPress}>
      {row}
    </PressableScale>
  ) : (
    row
  );
}

export function StatsView({ history, onPractice }: { history: Answer[]; onPractice: (concepts: string[]) => void }) {
  const colors = useColors();
  const st = rangeStats(history);
  if (st.total === 0) {
    return (
      <Tile>
        <ThemedText variant="title3">No answers yet</ThemedText>
        <ThemedText variant="body" tone="secondaryLabel">
          Answer a few hands and this page shows how you’re doing: your best-play rate, how it’s moving and which kinds of spot you miss.
        </ThemedText>
      </Tile>
    );
  }
  const move = st.recent !== null && st.before !== null ? Math.round((st.recent - st.before) * 100) : null;
  return (
    <View style={{ gap: spacing.sm }}>
      {/* The headline numbers, side by side. */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile title="Best plays" style={{ flex: 1.15, alignItems: 'center', justifyContent: 'center' }}>
          <Gauge value={st.rate} color={tone(st.rate)} width={140}>
            <ThemedText variant="title1" style={[{ fontWeight: '800' }, NUM]}>
              {pct(st.rate)}
            </ThemedText>
          </Gauge>
          <ThemedText variant="footnote" tone="secondaryLabel" style={NUM}>
            {st.best} of {st.total} answers
          </ThemedText>
        </Tile>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Tile title="Last 20" style={{ flex: 1, justifyContent: 'center' }}>
            <ThemedText variant="title1" style={[{ fontWeight: '800' }, NUM]}>
              {st.recent !== null ? pct(st.recent) : '–'}
            </ThemedText>
            {move !== null ? (
              <View style={{ alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: spacing.xs, borderRadius: radius.full, backgroundColor: move >= 0 ? 'rgba(34,179,94,0.2)' : colors.cellPressed }}>
                <ThemedText variant="caption1" style={[{ fontWeight: '800', color: move >= 0 ? GOOD : (colors.secondaryLabel as string) }, NUM]}>
                  {move === 0 ? 'Level' : `${move > 0 ? '▲' : '▼'} ${Math.abs(move)} pts`}
                </ThemedText>
              </View>
            ) : (
              <ThemedText variant="caption1" tone="tertiaryLabel">
                Needs 10 answers
              </ThemedText>
            )}
          </Tile>
          <Tile title="Longest run" style={{ flex: 1, justifyContent: 'center' }}>
            <ThemedText variant="title1" style={[{ fontWeight: '800' }, NUM]}>
              {st.longest}
            </ThemedText>
            <ThemedText variant="caption1" tone="tertiaryLabel">
              best plays in a row
            </ThemedText>
          </Tile>
        </View>
      </View>

      {/* How your answers split. */}
      <Tile title="Your answers">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <Donut
            size={112}
            parts={[
              { value: st.best, color: GOOD },
              { value: st.ok, color: BLUE },
              { value: st.mistake, color: colors.quaternaryLabel as string },
            ]}
          >
            <ThemedText variant="title2" style={[{ fontWeight: '800' }, NUM]}>
              {st.total}
            </ThemedText>
            <ThemedText variant="caption2" tone="tertiaryLabel">
              answers
            </ThemedText>
          </Donut>
          <View style={{ flex: 1, gap: spacing.xs }}>
            {[
              { label: 'Best play', n: st.best, color: GOOD },
              { label: 'Also good', n: st.ok, color: BLUE },
              { label: 'Missed', n: st.mistake, color: colors.quaternaryLabel as string },
            ].map((x) => (
              <View key={x.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: x.color }} />
                <ThemedText variant="subhead" style={{ flex: 1 }}>
                  {x.label}
                </ThemedText>
                <ThemedText variant="subhead" style={[{ fontWeight: '700' }, NUM]}>
                  {x.n}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </Tile>

      {st.trend.length > 1 && (
        <Tile title="Your trend">
          <View accessibilityLabel={`Best-play rate in each run of 10 answers: ${st.trend.map(pct).join(', ')}`} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, height: 96 }}>
            {st.trend.map((r, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 3 }}>
                <ThemedText variant="caption2" tone="tertiaryLabel" style={NUM}>
                  {Math.round(r * 100)}
                </ThemedText>
                <View style={{ width: '100%', height: Math.max(4, Math.round(r * 70)), borderRadius: 5, backgroundColor: BLUE, opacity: i === st.trend.length - 1 ? 1 : 0.5 }} />
              </View>
            ))}
          </View>
          <ThemedText variant="caption1" tone="tertiaryLabel">
            Best-play rate (%) in each run of 10 answers, oldest to newest.
          </ThemedText>
        </Tile>
      )}

      {st.weakest.length > 0 && (
        <Tile title="Where you miss most">
          {st.weakest.map((t) => (
            <RateRow key={t.label} t={t} onPress={() => onPractice([t.label])} />
          ))}
          <Button title="Practise these" onPress={() => onPractice(st.weakest.map((t) => t.label))} />
        </Tile>
      )}

      {st.byPosition.length > 0 && (
        <Tile title="By your seat">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, justifyContent: 'space-between' }}>
            {st.byPosition.map((t) => (
              <View key={t.label} style={{ width: '30%', alignItems: 'center' }}>
                <RateRing value={t.rate} color={tone(t.rate)} label={`${seatName(t.label as never)} · ${t.total}`} />
              </View>
            ))}
          </View>
        </Tile>
      )}

      {st.byFormat.length > 1 && (
        <Tile title="Cash or tournament">
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {st.byFormat.map((t) => (
              <RateRing key={t.label} value={t.rate} color={tone(t.rate)} label={`${t.label} · ${t.total}`} size={84} />
            ))}
          </View>
        </Tile>
      )}

      {st.byConcept.length > 0 && (
        <Tile title="By kind of spot">
          {st.byConcept.map((t) => (
            <RateRow key={t.label} t={t} onPress={() => onPractice([t.label])} />
          ))}
          <ThemedText variant="caption1" tone="tertiaryLabel">
            Tap a kind of spot to practise it.
          </ThemedText>
        </Tile>
      )}
    </View>
  );
}
