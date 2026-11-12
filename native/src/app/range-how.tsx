import { Stack } from 'expo-router';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { brand, radius, ROUNDED, spacing, useColors } from '@/theme';

/** Range training in four short steps, for someone who has never heard of a range. Opened from the Train tab. */
const STEPS: { icon: IconName; title: string; line: string }[] = [
  {
    icon: 'eye.fill',
    title: 'Read the hand',
    line: 'You get a real spot: your two cards, where everyone sits, the board, and what each player did to get here.',
  },
  {
    icon: 'hand.tap.fill',
    title: 'Make your call',
    line: 'Fold, call, check, bet or raise. Pick the play you think wins the most chips over time.',
  },
  {
    icon: 'lightbulb.fill',
    title: 'See why',
    line: 'Their range is every hand they could hold after playing this way. We show it, how often you win against it, and what each play is worth.',
  },
  {
    icon: 'book.fill',
    title: 'Learn from the pros',
    line: 'Every hand comes from a published breakdown by a pro or coach, with a link to read it in full.',
  },
];

export default function RangeHow() {
  const colors = useColors();
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'How it works' }} />
      <ThemedText variant="body" tone="secondaryLabel">
        Range training teaches you to think about what the other players could have, not just your own cards.
      </ThemedText>
      {STEPS.map((s, i) => (
        <View
          key={s.title}
          accessible
          accessibilityLabel={`Step ${i + 1}, ${s.title}. ${s.line}`}
          style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,183,0,0.16)' }}>
            <Icon name={s.icon} size={19} color={brand.gold} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="headline" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
              {i + 1}. {s.title}
            </ThemedText>
            <ThemedText variant="subhead" tone="secondaryLabel">
              {s.line}
            </ThemedText>
          </View>
        </View>
      ))}
      <ThemedText variant="footnote" tone="tertiaryLabel">
        Free players get one new hand a day. Premium opens Endless, Sets and Gaps, which builds practice from the spots you miss.
      </ThemedText>
    </SheetScroll>
  );
}
