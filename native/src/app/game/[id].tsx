import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { GamePicture } from '@/components/game-picture';
import { ThemedText } from '@/components/themed-text';
import { gameLook } from '@design/gameArt';
import { isVariant, variantInfo, variantNote, type Variant } from '@/engine';
import { radius, spacing } from '@/theme';

/** A game's sheet from Home: its picture and mood, the two ways to start it, then how it plays. */
export default function GameSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const variant: Variant = isVariant(id) ? id : 'holdem';
  const info = variantInfo(variant);
  const { width } = useWindowDimensions();
  const go = (mode: 'friends' | 'bots') => {
    router.back();
    router.push({ pathname: '/setup', params: { mode, variant } });
  };
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: info.name, headerShown: false }} />
      <GamePicture variant={variant} width={width - spacing.md * 2} height={((width - spacing.md * 2) * 120) / 200} rounded={radius.lg} />
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title1" accessibilityRole="header" style={{ fontWeight: '800' }}>
          {info.name}
        </ThemedText>
        <ThemedText variant="callout" tone="tertiaryLabel">
          {gameLook(variant).mood}
        </ThemedText>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button variant="party" tint="blue" size="lg" title="Play with friends" onPress={() => go('friends')} />
        <Button variant="party" tint="green" size="lg" title="Play with bots" onPress={() => go('bots')} />
      </View>
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
    </ScrollView>
  );
}
