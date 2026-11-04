import { router, Stack } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { ChallengePicture } from '@/components/challenge-picture';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { SCENARIOS, solvedCount, useRangeGrades } from '@/state/ranges';
import { radius, spacing, useColors } from '@/theme';

const RULES = [
  'You get a real hand, played up to the turn or the river, with every bet so far.',
  'Work out what they could be holding, then make one call: fold, call, raise, check or bet.',
  'Then see why: what each street told you, their hands in groups, and how often yours wins.',
];

/** Range training's sheet from Home, like a challenge's: what it is, how it goes, how you're doing, and Start. */
export default function RangeTrainingSheet() {
  const colors = useColors();
  const grades = useRangeGrades();
  const { width } = useWindowDimensions();
  const solved = solvedCount(grades);
  const w = width - spacing.md * 2;
  const go = () => {
    haptic.tap();
    router.back();
    router.push('/ranges');
  };
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Range training', headerShown: false }} />
      <ChallengePicture id="ranges" width={w} height={(w * 120) / 200} rounded={radius.lg} />
      <View style={{ gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
          <Icon name="person.fill" size={13} color={colors.secondaryLabel} />
          <ThemedText variant="subhead" tone="secondaryLabel" style={{ fontWeight: '600' }}>
            Solo training
          </ThemedText>
        </View>
        <ThemedText variant="largeTitle" accessibilityRole="header">
          Range training
        </ThemedText>
        <ThemedText variant="callout" tone="secondaryLabel">
          Read what they could have from how they bet, then make the call.
        </ThemedText>
      </View>
      <View style={{ gap: spacing.xs }}>
        {RULES.map((r) => (
          <View key={r} style={{ flexDirection: 'row', gap: spacing.xs }}>
            <ThemedText variant="body" tone="tertiaryLabel" accessible={false}>
              •
            </ThemedText>
            <ThemedText variant="body" style={{ flex: 1 }}>
              {r}
            </ThemedText>
          </View>
        ))}
      </View>
      {Object.keys(grades).length > 0 && (
        <ThemedText variant="headline" style={{ color: colors.gold }}>
          Best play on {solved} of {SCENARIOS.length} hands
        </ThemedText>
      )}
      <Button title={solved > 0 ? 'Keep going' : 'Start'} variant="party" size="lg" onPress={go} />
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
        Free, on this phone. Your stats and streak stay as they are.
      </ThemedText>
    </SheetScroll>
  );
}
