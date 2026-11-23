import { Stack } from 'expo-router';
import { View } from 'react-native';

import { RANKINGS } from '@design/handRankings';
import { SheetScroll } from '@/components/sheet-scroll';
import { PlayingCard } from '@/components/table/playing-card';
import { useTableNow } from '@/components/table/use-now';
import { ThemedText } from '@/components/themed-text';
import { myHandNow } from '@/state/my-hand';
import { me as myDevice, useTable } from '@/state/session';
import { brand, cardColors, gradient, spacing, useColors } from '@/theme';

/**
 * Best at the top, each with an example hand. At a table it opens on the hand you have now (its name and its five
 * cards on a blue card) and lights your row with a YOU tag, so the chart answers "what have I got?" mid-hand.
 */
export default function HandRankings() {
  const colors = useColors();
  const t = useTable();
  const now = useTableNow(t.game?.fast, 1000);
  const mine = myHandNow(t.game, myDevice, now);
  const [a, b, c] = cardColors.violet;
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}>
      <Stack.Screen options={{ title: 'Hand rankings' }} />
      {mine ? (
        <View
          accessible
          accessibilityLabel={`You have ${mine.detail}`}
          style={{ borderRadius: 22, borderCurve: 'continuous', padding: spacing.md, gap: spacing.sm, marginBottom: spacing.xs, ...gradient(`linear-gradient(150deg, ${a} 0%, ${b} 55%, ${c} 100%)`) }}
        >
          <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '800', letterSpacing: 0.6 }}>
            YOU HAVE NOW
          </ThemedText>
          <ThemedText variant="title2" style={{ color: '#fff' }}>
            {mine.detail}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {mine.best.map((card) => (
              <PlayingCard key={card} card={card} size="md" />
            ))}
          </View>
          {mine.row !== null && mine.row > 0 && (
            <ThemedText variant="subhead" style={{ color: 'rgba(255,255,255,0.88)', fontWeight: '600' }}>
              {mine.row === 1 ? 'Only a royal flush beats it.' : `${RANKINGS[mine.row - 1].name} or better beats it.`}
            </ThemedText>
          )}
        </View>
      ) : (
        <ThemedText variant="subhead" tone="tertiaryLabel" style={{ marginBottom: spacing.xs }}>
          Best at the top. You make the best five-card hand from your two cards and the five on the board.
        </ThemedText>
      )}
      {RANKINGS.map((r, i) => {
        const you = mine?.row === i;
        return (
          <View
            key={r.name}
            accessible
            accessibilityLabel={`${i + 1}. ${r.name}: ${r.note}${you ? '. Your hand' : ''}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: you ? 'rgba(37, 87, 214, 0.22)' : colors.cell,
              borderWidth: you ? 2 : 0,
              borderColor: brand.violetDark,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ThemedText variant="body" style={{ fontWeight: you ? '800' : '700', flexShrink: 1 }}>
                  {i + 1}. {r.name}
                </ThemedText>
                {you && (
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: brand.gold }}>
                    <ThemedText variant="caption2" style={{ color: brand.goldInk, fontWeight: '800' }}>
                      YOU
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText variant="footnote" tone="tertiaryLabel">
                {r.note}
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {r.cards.split(' ').map((card) => (
                <PlayingCard key={card} card={card} size="sm" />
              ))}
            </View>
          </View>
        );
      })}
    </SheetScroll>
  );
}
