// The pieces of the Stats page (`(play)/stats.tsx`): a heading for each group, equal tiles two to a row (an icon in
// a coloured square, the label, one big number and a line under it), the chips line, the trainer bars, a meter and
// the week of days. Every surface is the page's one panel (`usePanel()`), so the page reads as one even grid.
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { PANEL_RADIUS, usePanel } from '@/components/grouped-list';
import { Icon, type IconName } from '@/components/icon';
import { SwapIcon } from '@/components/swap';
import { ThemedText } from '@/components/themed-text';
import { brand, radius, ROUNDED, spacing, useColors, usePlainColors, useScheme, useShadows } from '@/theme';

export const n = (v: number) => Math.round(v).toLocaleString('en-US');
export const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n(Math.abs(v))}`;
export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** A group's heading, with a quiet line under it. */
export function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <View style={{ gap: 2, paddingHorizontal: spacing.xxs, paddingTop: spacing.md }}>
      <ThemedText variant="title3" style={{ fontFamily: ROUNDED, fontWeight: '800' }} accessibilityRole="header">
        {title}
      </ThemedText>
      {note && (
        <ThemedText variant="footnote" tone="tertiaryLabel">
          {note}
        </ThemedText>
      )}
    </View>
  );
}

/** The page's one surface: see-through on dark, the soft grey cell with a shadow on light. */
export function Panel({ children, padded = true, label, grow }: { children: ReactNode; padded?: boolean; label?: string; /** Fill its share of a row (tiles in a `Pair`). */ grow?: boolean }) {
  const panel = usePanel();
  const shadows = useShadows();
  const dark = useScheme() === 'dark';
  return (
    <View accessible={!!label} accessibilityLabel={label} style={{ flex: grow ? 1 : undefined, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', boxShadow: dark ? undefined : shadows.card }}>
      <View style={{ flexGrow: 1, padding: padded ? spacing.md : 0, gap: spacing.xs, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

/** Two equal tiles side by side, the same height. */
export function Pair({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' }}>{children}</View>;
}

export type Tint = 'blue' | 'gold' | 'grey';

/** A small rounded square in the tile's colour with a white symbol, like a Settings row. */
export function Badge({ icon, tint }: { icon: IconName; tint: Tint }) {
  const colors = useColors();
  const bg = tint === 'gold' ? brand.gold : tint === 'grey' ? '#8e8e93' : colors.violet;
  return (
    <View style={{ width: 28, height: 28, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Icon name={icon} size={15} color={tint === 'gold' ? brand.goldInk : '#ffffff'} />
    </View>
  );
}

/** The label row at the top of a tile or card. */
export function TileHead({ icon, tint, label }: { icon: IconName; tint: Tint; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Badge icon={icon} tint={tint} />
      <ThemedText variant="subhead" tone="secondaryLabel" numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </View>
  );
}

/** The big number in a tile. */
export function BigNumber({ children, size = 30, color }: { children: ReactNode; size?: number; color?: string }) {
  const colors = useColors();
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ fontFamily: ROUNDED, fontSize: size, lineHeight: Math.round(size * 1.18), fontWeight: '800', color: color ?? colors.label, fontVariant: ['tabular-nums'] }}
    >
      {children}
    </Text>
  );
}

/**
 * One stat: its icon, then the label, the number and a line about it, all from the same top edge so the numbers in a
 * row line up. Waits with a dash until there's something to show.
 */
export function Tile({ icon, tint = 'blue', label, value, note, children }: { icon: IconName; tint?: Tint; label: string; value?: string | null; note?: string; children?: ReactNode }) {
  return (
    <Panel grow label={`${label}: ${value ?? 'not yet'}${note ? `, ${note}` : ''}`}>
      <Badge icon={icon} tint={tint} />
      <ThemedText variant="subhead" tone="secondaryLabel" numberOfLines={1} style={{ fontWeight: '600', paddingTop: spacing.xxs }}>
        {label}
      </ThemedText>
      <View style={{ gap: 2 }}>
        {children}
        <BigNumber>{value ?? '–'}</BigNumber>
        {note && (
          <ThemedText variant="footnote" tone="tertiaryLabel" numberOfLines={2}>
            {note}
          </ThemedText>
        )}
      </View>
    </Panel>
  );
}

/** A bar from one word to another with your spot filled in ("Tight" to "Loose"). */
export function Meter({ label, value, shown, left, right }: { label: string; value: number; shown: string; left: string; right: string }) {
  const at = Math.max(0, Math.min(1, value));
  return (
    <View accessible accessibilityLabel={`${label}: ${shown}, from ${left} to ${right}`} style={{ gap: spacing.xxs }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text maxFontSizeMultiplier={1.2} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
          {shown}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(4, at * 100)}%`, height: 8, borderRadius: 4, backgroundColor: '#ffffff' }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          {left}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          {right}
        </Text>
      </View>
    </View>
  );
}

/** Running total of chips won or lost over the hands given, as a line over a soft fill, gold when up and red when down. */
export function ChipsLine({ nets }: { nets: number[] }) {
  const c = usePlainColors();
  const panel = usePanel();
  const [w, setW] = useState(0);
  const h = 132;
  const series = nets.reduce<number[]>((out, v) => [...out, (out[out.length - 1] ?? 0) + v], [0]);
  const total = series[series.length - 1];
  const up = total >= 0;
  const ink = up ? c.green : c.red;
  const lo = Math.min(0, ...series);
  const hi = Math.max(0, ...series);
  const span = hi - lo || 1;
  const pad = 6;
  const x = (i: number) => (series.length > 1 ? (i / (series.length - 1)) * (w - pad * 2) + pad : w / 2);
  const y = (v: number) => pad + (h - pad * 2) * (1 - (v - lo) / span);
  const line = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const fill = `${line} L${x(series.length - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
  return (
    <Panel label={`Chips over your last ${nets.length} hands: ${signed(total)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <TileHead icon="chart.line.uptrend.xyaxis" tint="blue" label={`Your last ${nets.length} ${nets.length === 1 ? 'hand' : 'hands'}`} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <BigNumber size={34}>{signed(total)}</BigNumber>
        <ThemedText variant="subhead" tone="tertiaryLabel">
          chips
        </ThemedText>
      </View>
      <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))} style={{ height: h, marginTop: spacing.xxs }}>
        {w > 0 && (
          <Svg width={w} height={h}>
            <Defs>
              <LinearGradient id="chipsFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={ink} stopOpacity={up ? 0.35 : 0.05} />
                <Stop offset="1" stopColor={ink} stopOpacity={up ? 0.02 : 0.3} />
              </LinearGradient>
            </Defs>
            <Line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={panel.hairline} strokeWidth={1} strokeDasharray="4 4" />
            {series.length > 1 && <Path d={fill} fill="url(#chipsFill)" />}
            {series.length > 1 && <Path d={line} stroke={ink} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
            <Circle cx={x(series.length - 1)} cy={y(total)} r={4.5} fill={ink} />
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <ThemedText variant="caption1" tone="tertiaryLabel">
          {nets.length} {nets.length === 1 ? 'hand' : 'hands'} ago
        </ThemedText>
        <ThemedText variant="caption1" tone="tertiaryLabel">
          Now
        </ThemedText>
      </View>
    </Panel>
  );
}

/** Best-play rate in each run of ten answers, as bars with the rate over each. */
export function AccuracyBars({ trend }: { trend: number[] }) {
  const colors = useColors();
  const panel = usePanel();
  const h = 96;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, height: h + 22 }}>
      {trend.map((r, i) => {
        const last = i === trend.length - 1;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: spacing.xxs }}>
            <ThemedText variant="caption1" tone={last ? 'label' : 'tertiaryLabel'} style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {Math.round(r * 100)}
            </ThemedText>
            <View style={{ width: '100%', height: h, justifyContent: 'flex-end', borderRadius: radius.xs, backgroundColor: panel.hairline }}>
              <View style={{ height: Math.max(4, r * h), borderRadius: radius.xs, backgroundColor: last ? brand.gold : colors.violet }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The last seven days as dots under their letters, filled on days you played. */
export function WeekDots({ week }: { week: { label: string; played: boolean; today: boolean }[] }) {
  const panel = usePanel();
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {week.map((d, i) => (
        <View key={i} style={{ alignItems: 'center', gap: spacing.xxs, width: 32 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: d.played ? brand.gold : panel.hairline,
              borderWidth: d.today ? 2 : 0,
              borderColor: d.played ? brand.goldDeep : (colors.violet as string),
            }}
          >
            <SwapIcon name={d.played ? 'checkmark' : null} size={13} color={brand.goldInk} />
          </View>
          <ThemedText variant="caption1" tone={d.today ? 'label' : 'tertiaryLabel'} style={{ fontWeight: d.today ? '700' : '400' }}>
            {d.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}
