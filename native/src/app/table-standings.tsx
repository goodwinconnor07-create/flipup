import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { net, standings } from '@/engine';
import { me as myDevice, useTable } from '@/state/session';
import { radius, spacing, useColors } from '@/theme';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');
const signed = (n: number) => (n > 0 ? `+${chips(n)}` : n < 0 ? `−${chips(-n)}` : '0');

/** Everyone at the table, by chips now minus everything they bought in for. */
export default function TableStandings() {
  const colors = useColors();
  const game = useTable().game;
  if (!game) return null;
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Standings' }} />
      <ThemedText variant="subhead" tone="tertiaryLabel" style={{ marginBottom: spacing.xs }}>
        Chips now, minus everything bought in for.
      </ThemedText>
      {standings(game).map((p, i) => {
        const n = net(p);
        const you = p.deviceId === myDevice;
        return (
          <View
            key={p.id}
            accessible
            accessibilityLabel={`${i + 1}. ${p.name}${you ? ', you' : ''}, ${chips(p.stack)} chips, ${signed(n)}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: you ? colors.cellPressed : colors.cell }}
          >
            <ThemedText variant="headline" tone="tertiaryLabel" style={{ width: 22, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
              {i + 1}
            </ThemedText>
            <Avatar emoji={p.emoji} size={36} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>
                {p.name}
                {p.bot ? ' · bot' : ''}
              </ThemedText>
              <ThemedText variant="footnote" tone="tertiaryLabel">
                {chips(p.stack)} chips
              </ThemedText>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], color: n > 0 ? colors.green : n < 0 ? colors.red : colors.tertiaryLabel }}>
              {signed(n)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
