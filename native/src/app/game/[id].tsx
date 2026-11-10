import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { SheetScroll } from '@/components/sheet-scroll';
import { HowToPicture } from '@/components/how-to-picture';
import { StartTiles } from '@/components/home/start-tiles';
import { Bullets } from '@/components/bullets';
import { ThemedText } from '@/components/themed-text';
import { gameLook } from '@design/gameArt';
import { isVariant, variantInfo, variantNote, type Variant } from '@/engine';
import { spacing } from '@/theme';

/** A game's sheet from Home: its picture and mood, the two ways to start it, then how it plays. */
export default function GameSheet() {
  const { id, rules } = useLocalSearchParams<{ id: string; rules?: string }>();
  const variant: Variant = isVariant(id) ? id : 'holdem';
  const info = variantInfo(variant);
  const { width } = useWindowDimensions();
  const go = (mode: 'friends' | 'bots') => {
    router.back();
    router.push({ pathname: mode === 'friends' ? '/play-friends' : '/play-bots', params: { variant } });
  };
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: info.name, headerShown: false }} />
      {/* The game's picture, with How to Play on it: a real hand of this game, recorded at the table. */}
      <HowToPicture variant={variant} name={info.name} width={width - spacing.md * 2} />
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title1" accessibilityRole="header">
          {info.name}
        </ThemedText>
        <ThemedText variant="callout" tone="tertiaryLabel">
          {gameLook(variant).mood}
        </ThemedText>
      </View>
      {/* Opened from a table's game pill: only how it plays. */}
      {!rules && (
      <StartTiles onGo={go} height={150} />
      )}
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="headline">How it plays</ThemedText>
        <Bullets items={info.rules} />
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ marginTop: spacing.xs }}>
          {variantNote(variant)}
        </ThemedText>
      </View>
    </SheetScroll>
  );
}
