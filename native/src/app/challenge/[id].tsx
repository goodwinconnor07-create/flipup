import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { SheetHeader } from '@/components/sheet-header';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { challengeById, isChallengeId } from '@/engine';
import { useChallengeBests } from '@/state/challenges';
import { useProfile } from '@/state/profile';
import { openChallengeTable, useTable } from '@/state/session';
import { spacing, useColors } from '@/theme';

/** A challenge's sheet from Home: what it is in a few plain lines, your best, and Start. There's no setup. */
export default function ChallengeSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const profile = useProfile();
  const bests = useChallengeBests();
  const t = useTable();
  if (!isChallengeId(id)) return null;
  const c = challengeById(id)!;
  const best = bests[id];
  const unit = c.unit === 'bb' ? 'big blinds' : c.unit;
  const go = () => {
    haptic.tap();
    router.back();
    openChallengeTable(id, profile.name, profile.emoji);
    router.push('/table');
  };
  // Starting a challenge closes any table you're still at.
  const atTable = !!t.mode && !(t.game && t.game.status === 'ended');
  const start = () =>
    atTable
      ? Alert.alert('Leave your table?', 'Starting this challenge leaves the table you’re at.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start', onPress: go },
        ])
      : go();
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: c.name, headerShown: false }} />
      <SheetHeader id={id} title={c.name} line={c.line} eyebrow="Solo challenge" />
      <View style={{ gap: spacing.xs }}>
        {c.rules.map((r) => (
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
      {best && best.plays > 0 && (
        <ThemedText variant="headline" style={{ color: colors.gold }}>
          Your best: {best.best} {unit}
        </ThemedText>
      )}
      <Button title="Start" variant="party" size="lg" onPress={start} />
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
        Pretend chips. Your stats and Play again stay as they are.
      </ThemedText>
    </SheetScroll>
  );
}
