import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { DemoPicture } from '@/components/demo/demo-picture';
import { Icon } from '@/components/icon';
import { GameBackdrop } from '@/components/home/game-backdrop';
import { PlayButton } from '@/components/home/play-button';
import { SmallButton } from '@/components/home/small-button';
import { SheetScroll } from '@/components/sheet-scroll';
import { LockVeil } from '@/components/premium/lock-veil';
import { ThemedText } from '@/components/themed-text';
import { gameLook } from '@design/gameArt';
import { variantNeedsPremium, isVariant, variantInfo, variantNote, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { unlockToHost } from '@/state/unlock';
import { brand, ForceScheme, radius, spacing } from '@/theme';

/**
 * A game's sheet: its picture (a tap opens its Demo) and mood, the two ways to start it, then its rules. It's about one game, so it wears
 * that game's colour (the rule in docs/DESIGN.md): Home's `GameBackdrop` as a layer inside the scroll content (a sheet's
 * scroll view must be its root, see CLAUDE.md), always dark.
 * A Premium game
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
    <ForceScheme scheme="dark">
    <SheetScroll contentContainerStyle={{ flexGrow: 1, padding: spacing.md, paddingTop: spacing.xl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: info.name, headerShown: false }} />
      {/* Reaches well past the top and bottom so a pull past either end still shows the game's colour. */}
      <GameBackdrop variant={variant} focus={730} style={{ position: 'absolute', top: -600, bottom: -600, left: 0, right: 0, flex: 0 }} />
      {/* The game's picture, with its Demo on it: a hand of this game on the real table, with a coach. */}
      <DemoPicture variant={variant} name={info.name} width={width - spacing.md * 2} />
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title1" accessibilityRole="header">
          {info.name}
        </ThemedText>
        <ThemedText variant="callout" tone="tertiaryLabel">
          {gameLook(variant).mood}
        </ThemedText>
        {locked && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
            <Icon name="crown.fill" size={15} color={brand.gold} />
            <ThemedText variant="subhead" style={{ color: brand.gold, fontWeight: '700' }}>
              Premium game
            </ThemedText>
          </View>
        )}
      </View>
      {/* Opened from a table's game pill: only the rules. Otherwise the same buttons as Home, on the game's own
          colour; without Premium a blur and a lock sit over them, and a tap anywhere on it opens the offer. */}
      {!rules && (
        <View style={{ borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <PlayButton label="Play with friends" icon="person.2.fill" line="Host a table · share the code" onPress={() => go('friends')} />
            <View style={{ flexDirection: 'row' }}>
              <SmallButton icon="cpu.fill" label="Play bots" onPress={() => go('bots')} />
            </View>
          </View>
          {locked && <LockVeil game={info.name} onPress={unlock} />}
        </View>
      )}
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="headline">The rules</ThemedText>
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
    </ForceScheme>
  );
}
