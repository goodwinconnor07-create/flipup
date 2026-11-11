import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { SheetScroll } from '@/components/sheet-scroll';
import { HowToPicture } from '@/components/how-to-picture';
import { StartTiles } from '@/components/home/start-tiles';
import { ThemedText } from '@/components/themed-text';
import { gameLook } from '@design/gameArt';
import { freeThisWeek, freeWeekEnds, isPremiumVariant, variantNeedsPremium, isVariant, variantInfo, variantNote, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { unlockToHost } from '@/state/unlock';
import { brand, spacing } from '@/theme';

/**
 * A game's sheet from Home: its picture and mood, the two ways to start it, then how it plays. A Premium game
 * without Premium says so before any setup: the sheet explains the game and Continue opens the offer with that
 * game's picture first (PLAY, Play bots and the lobby's game list all come here for a locked game).
 */
export default function GameSheet() {
  const { id, rules } = useLocalSearchParams<{ id: string; rules?: string }>();
  const variant: Variant = isVariant(id) ? id : 'holdem';
  const info = variantInfo(variant);
  const { width } = useWindowDimensions();
  const premium = usePremium();
  const locked = !premium && variantNeedsPremium(variant);
  const unlock = () => {
    router.back();
    unlockToHost([variant], premium);
  };
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
        {!premium && isPremiumVariant(variant) && variant === freeThisWeek() && (
          <ThemedText variant="subhead" style={{ color: brand.gold, fontWeight: '700', marginTop: spacing.xs }}>
            Free this week: host it without Premium until {new Date(freeWeekEnds()).toLocaleDateString(undefined, { weekday: 'long' })}.
          </ThemedText>
        )}
        {locked && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
            <Icon name="crown.fill" size={15} color={brand.gold} />
            <ThemedText variant="subhead" style={{ color: brand.gold, fontWeight: '700' }}>
              Premium game
            </ThemedText>
          </View>
        )}
      </View>
      {/* Opened from a table's game pill: only how it plays. */}
      {!rules &&
        (locked ? (
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="body" tone="secondaryLabel">
              Hosting {info.name} needs FlipUp Premium. Friends who join your table play it free.
            </ThemedText>
            <Button title="Continue" onPress={unlock} />
          </View>
        ) : (
          <StartTiles onGo={go} height={150} />
        ))}
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
