import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { GamePicture } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { gameLook } from '@design/gameArt';
import { isVariant, variantInfo, variantNote, type Variant } from '@/engine';
import { radius, spacing } from '@/theme';

/** A game's sheet from Home: its picture and mood, the two ways to start it, then how it plays. */
export default function GameSheet() {
  const { id, rules } = useLocalSearchParams<{ id: string; rules?: string }>();
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
      {/* The game's picture, with How to Play on it: a real hand of this game, recorded at the table. */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`How to play ${info.name}`}
        onPress={() => {
          haptic.tap();
          router.push({ pathname: '/how-to-play/[id]', params: { id: variant, from: 'game' } });
        }}
        style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' }}
      >
        <GamePicture variant={variant} width={width - spacing.md * 2} height={((width - spacing.md * 2) * 120) / 200} rounded={radius.lg} />
        <View style={{ position: 'absolute', left: spacing.sm, bottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 40, paddingLeft: spacing.xxs, paddingRight: spacing.md, borderRadius: radius.full, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
            <Icon name="play.fill" size={14} color="#000000" />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
            How to play
          </Text>
        </View>
      </PressableScale>
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
      <View style={{ gap: spacing.sm }}>
        <Button variant="party" tint="blue" size="lg" title="Play with friends" onPress={() => go('friends')} />
        <Button variant="party" tint="green" size="lg" title="Play with bots" onPress={() => go('bots')} />
      </View>
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
    </ScrollView>
  );
}
