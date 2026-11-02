import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { RANKINGS } from '@design/handRankings';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { spacing, useColors } from '@/theme';

/** Best at the top, each with an example hand, as on the web. */
export default function HandRankings() {
  const colors = useColors();
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Hand rankings' }} />
      <ThemedText variant="subhead" tone="tertiaryLabel" style={{ marginBottom: spacing.xs }}>
        Best at the top. You make the best five-card hand from your two cards and the five on the board.
      </ThemedText>
      {RANKINGS.map((r, i) => (
        <View key={r.name} accessible accessibilityLabel={`${i + 1}. ${r.name}: ${r.note}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: 16, borderCurve: 'continuous', backgroundColor: colors.cell }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" style={{ fontWeight: '700' }}>
              {i + 1}. {r.name}
            </ThemedText>
            <ThemedText variant="footnote" tone="tertiaryLabel">
              {r.note}
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {r.cards.split(' ').map((c) => (
              <PlayingCard key={c} card={c} size="sm" />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
