import { Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import type { BoardRow } from '@/state/bankroll';
import { brand, radius, spacing, useColors } from '@/theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/** A country code as its flag (the regional-indicator pair): "US" → 🇺🇸. */
export function flagOf(country?: string): string {
  if (!country || !/^[A-Z]{2}$/.test(country)) return '';
  return String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Gold, silver and bronze squares for the top three; plain numbers after. */
const MEDAL = [brand.gold, '#b8bec8', '#c98a4a'];

/**
 * One row of a board, the way the reference draws it: position, flag, @username, a badge, the number on the right.
 * Busted and cut players are greyed with their peak. Rows slide to their rank (0.7s, the party board's curve).
 */
export function BoardRowView({ row, you, onPress, daily }: { row: BoardRow; you?: boolean; onPress?: () => void; daily?: boolean }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const out = row.status !== 'alive';
  const medal = row.pos !== null && row.pos <= 3 ? MEDAL[row.pos - 1] : null;
  const label = `${row.pos ?? 'Out'}. @${row.username}. ${out ? `Peak ${row.peak.toLocaleString()}` : `${row.score.toLocaleString()}${daily ? ' points' : ' chips'}`}`;
  return (
    <Animated.View layout={reduce ? undefined : LinearTransition.duration(700)}>
      <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 48, opacity: out ? 0.45 : 1, backgroundColor: you ? `${brand.violet}26` : undefined }}>
        <View style={{ width: 30, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: medal ?? 'transparent' }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'], color: medal ? '#2b1d00' : colors.secondaryLabel }}>
            {row.pos ?? '–'}
          </Text>
        </View>
        {row.country ? (
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 18 }} accessible={false}>
            {flagOf(row.country)}
          </Text>
        ) : null}
        <ThemedText numberOfLines={1} style={{ flexShrink: 1, fontWeight: you ? '700' : '500' }}>
          @{row.username}
        </ThemedText>
        {row.badge ? <Pill text={row.badge.split(' ')[1] ?? row.badge} gold={row.badge.startsWith('TOP10 ')} /> : null}
        {row.rebuy ? <Pill text="R" /> : null}
        <View style={{ flex: 1 }} />
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.label }}>
          {(out ? row.peak : row.score).toLocaleString()}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

/** A small outlined pill: a season badge (gold for the top 10) or the rebuy's R. */
function Pill({ text, gold }: { text: string; gold?: boolean }) {
  const colors = useColors();
  const ink = gold ? brand.gold : colors.secondaryLabel;
  return (
    <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: radius.sm, borderWidth: 1, borderColor: ink }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, fontWeight: '800', color: ink }}>
        {text}
      </Text>
    </View>
  );
}
