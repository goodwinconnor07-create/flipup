import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { BlurView } from 'expo-blur';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { shade } from '@/components/home/game-backdrop';
import { PlayButton } from '@/components/home/play-button';
import { SmallButton } from '@/components/home/small-button';
import { SheetScroll } from '@/components/sheet-scroll';
import { HowToPicture } from '@/components/how-to-picture';
import { ThemedText } from '@/components/themed-text';
import { gameLook } from '@design/gameArt';
import { freeThisWeek, freeWeekEnds, isPremiumVariant, variantNeedsPremium, isVariant, variantInfo, variantNote, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { unlockToHost } from '@/state/unlock';
import { brand, radius, ROUNDED, spacing } from '@/theme';

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
  const look = gameLook(variant);
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
      {/* Opened from a table's game pill: only how it plays. Otherwise the same buttons as Home, on the game's own
          colour; without Premium a blur and a lock sit over them, and a tap anywhere on it opens the offer. */}
      {!rules && (
        <View style={{ borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: shade(look.card[0], 0.5) }}>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <PlayButton label={`Play ${info.name} with friends`} line="with friends · share a code" ink={shade(look.band, 0.35)} tint={`${look.card[0]}40`} onPress={() => go('friends')} />
            <View style={{ flexDirection: 'row' }}>
              <SmallButton icon="cpu.fill" label="Play bots" onPress={() => go('bots')} />
            </View>
          </View>
          {locked && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unlock Premium to play"
              onPress={() => {
                haptic.tap();
                unlock();
              }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <BlurView intensity={40} tint="dark" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
                <Icon name="lock.fill" size={30} color="#ffffff" />
                <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 20, fontWeight: '800', color: '#ffffff' }}>
                  Unlock Premium to play
                </Text>
                <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Friends who join play {info.name} free
                </Text>
              </BlurView>
            </Pressable>
          )}
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
    </SheetScroll>
  );
}
