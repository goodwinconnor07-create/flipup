import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { SheetScroll } from '@/components/sheet-scroll';
import { SheetHeader } from '@/components/sheet-header';
import { StartTiles } from '@/components/home/start-tiles';
import { ThemedText } from '@/components/themed-text';
import { gameLook } from '@design/gameArt';
import { isVariant, variantInfo, variantNote, type Variant } from '@/engine';
import { spacing } from '@/theme';

/** A game's sheet from Home: its icon on its own art and its mood, the two ways to start it, then how it plays. */
export default function GameSheet() {
  const { id, rules } = useLocalSearchParams<{ id: string; rules?: string }>();
  const variant: Variant = isVariant(id) ? id : 'holdem';
  const info = variantInfo(variant);
  const go = (mode: 'friends' | 'bots') => {
    router.back();
    router.push({ pathname: mode === 'friends' ? '/play-friends' : '/play-bots', params: { variant } });
  };
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingTop: 0, gap: spacing.lg }}>
      <Stack.Screen options={{ title: info.name, headerShown: false }} />
      {/* The game's icon on its own art, with How to Play under it: a real hand of this game, recorded at the table. */}
      <SheetHeader id={variant} title={info.name} line={gameLook(variant).mood} howTo={variant} />
      {/* Opened from a table's game pill: only how it plays. */}
      {!rules && (
      <StartTiles onGo={go} height={150} />
      )}
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="headline">How it plays</ThemedText>
        {info.rules.map((r) => (
          <ThemedText key={r} variant="body">
            {'•  '}
            {r}
          </ThemedText>
        ))}
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ marginTop: spacing.xs }}>
          {variantNote(variant)}
        </ThemedText>
      </View>
    </SheetScroll>
  );
}
