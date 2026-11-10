import { Stack, useLocalSearchParams } from 'expo-router';

import { Breakdown } from '@/components/range/breakdown';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { allHands } from '@/state/ranges';
import { spacing, useColors } from '@/theme';
import type { OptionId } from '@train/ranges/model';

/** Range training's full breakdown of one hand, opened from the result card's Breakdown (`?id=<hand>&pick=<answer>`). */
export default function RangeBreakdown() {
  const colors = useColors();
  const { id, pick } = useLocalSearchParams<{ id: string; pick?: string }>();
  const scenario = allHands().find((s) => s.id === id);
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: scenario?.concept ?? 'Breakdown' }} />
      {scenario ? (
        <Breakdown scenario={scenario} pick={(pick as OptionId | undefined) ?? null} />
      ) : (
        <ThemedText variant="body" tone="secondaryLabel">
          This hand isn’t in the set any more.
        </ThemedText>
      )}
    </SheetScroll>
  );
}
