import { router, Stack, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { PARTY_MAX_GAMES, PARTY_MIN_GAMES, seededRng, shuffle, VARIANTS, type Variant } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePartyRef } from '@/state/party';
import { useProfile } from '@/state/profile';
import { brand, cardColors, gradient, radius, ROUNDED, spacing, useColors, usePlainColors, useShadows } from '@/theme';

const GAP = 12;

/** The belts' tile size for a screen this tall: bigger on taller phones, so the belts fill the poster. */
const partyTile = (height: number, gap = GAP) => Math.round(Math.max(76, Math.min(112, (height * 0.4 - gap * 2) / 3)));
/** Points a second each belt moves. */
const SPEED = 22;

/** The three belts: every game, each belt shuffled its own way (fixed seeds), so no two run in the same order. */
const ALL = VARIANTS.map((v) => v.id);
const BELTS: Variant[][] = [11, 29, 47].map((seed) => shuffle(ALL, seededRng(seed)));

/**
 * The Party tab is one big game-night poster on the app's own page colour: three
 * belts of game tiles (each in its own order) filling the space between the title and the words (tilted a little, alternating directions, still under Reduce
 * Motion and while another tab is showing), the pitch in big rounded type, your open party if you have one, then two
 * buttons: Host a party, big, in the brand violet with grain, and Join a party, smaller, in night violet with a little code field.
 */
export default function PartyTab() {
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  const partyRef = usePartyRef();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const colors = useColors();
  const page = usePlainColors().background;
  const clear = `${page}00`;
  const shadows = useShadows();
  // Bigger tiles on taller phones, so the three belts fill the poster instead of leaving a band of empty page.
  const { height } = useWindowDimensions();
  const tile = partyTile(height, GAP);

  // Hosting and joining need a name first.
  const needName = (): boolean => {
    if (named) return false;
    Alert.alert('Add your name first', 'Friends see your name and picture at the table.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Set up profile', onPress: () => router.push('/profile') },
    ]);
    return true;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, overflow: 'hidden' }}>
      <Stack.Screen options={{ title: 'Party', headerShown: false }} />
      <View style={{ flex: 1, paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + 84 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md }}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ flex: 1, fontFamily: ROUNDED, fontSize: 34, lineHeight: 41, fontWeight: '700', color: colors.label }}>
            Party
          </Text>
          <ProfileMenu />
        </View>

        {/* The belts take whatever room there is between the title and the words, edge to edge, and fade into the
            page at the top and bottom, so they never run under the text and leave no gap below it. */}
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flex: 1, minHeight: tile * 2 + GAP, overflow: 'hidden', justifyContent: 'center' }}>
          <View style={{ gap: GAP, transform: [{ rotate: '-7deg' }, { scale: 1.12 }] }}>
            {BELTS.map((games, i) => (
              <Belt key={i} games={games} reverse={i % 2 === 1} running={focused} offset={i * 37} tile={tile} />
            ))}
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 36, ...gradient(`linear-gradient(180deg, ${page} 0%, ${clear} 100%)`) }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 36, ...gradient(`linear-gradient(180deg, ${clear} 0%, ${page} 100%)`) }} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.lg }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 2, color: colors.accent }}>
            GAME NIGHT
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 36, lineHeight: 40, fontWeight: '800', color: colors.label }}>
            {PARTY_MIN_GAMES} to {PARTY_MAX_GAMES} games.{'\n'}One winner.
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, lineHeight: 23, color: colors.secondaryLabel }}>
            Every game is a round. Points for where you finish, and bots fill the empty seats.
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {partyRef && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Back to your party, code ${partyRef.code}`}
              onPress={() => router.push('/party-room')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}
            >
              <Icon name="person.3.fill" size={18} color={brand.gold} />
              <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.label }}>
                Your party · {partyRef.code}
              </Text>
              <Icon name="chevron.right" size={14} color={colors.tertiaryLabel} />
            </PressableScale>
          )}
          <HostButton onPress={() => !needName() && router.push('/party-setup')} />
          <JoinButton onPress={() => !needName() && router.push({ pathname: '/code-entry', params: { kind: 'party' } })} />
        </View>
      </View>
    </View>
  );
}

/** One belt of game tiles, twice over so it can loop without a seam, moving left (or right) for ever. */
function Belt({ games, reverse, running, offset, tile }: { games: Variant[]; reverse: boolean; running: boolean; offset: number; tile: number }) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const span = games.length * (tile + GAP);
  // Only as many tiles as the loop needs: one full belt plus enough to cover the (tilted, enlarged) screen behind it.
  const count = games.length + Math.ceil((width * 1.3 + offset) / (tile + GAP)) + 1;
  const tiles = Array.from({ length: count }, (_, i) => games[i % games.length]);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduce || !running) {
      cancelAnimation(x);
      return;
    }
    const from = x.get() % 1;
    x.set(from);
    x.set(withRepeat(withTiming(from + 1, { duration: (span / SPEED) * 1000, easing: Easing.linear }), -1, false));
  }, [reduce, running, span, x]);
  const move = useAnimatedStyle(() => {
    const t = x.get() % 1;
    return { transform: [{ translateX: reverse ? -span + t * span : -t * span }] };
  });
  return (
    <Animated.View style={[{ flexDirection: 'row', gap: GAP, marginLeft: -offset, width: count * (tile + GAP) }, move]}>
      {tiles.map((v, i) => (
        <View key={`${v}-${i}`} style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: '0 8px 18px -8px rgba(0, 0, 0, 0.6)' }}>
          <GameThumb variant={v} size={tile} />
        </View>
      ))}
    </Animated.View>
  );
}

const press = (go: () => void) => () => {
  haptic.tap();
  go();
};

/** Host a party: the big one, the brand violet as a living card with grain, a party popper and a line on what you do. */
function HostButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="Host a party. Pick the games, invite friends" haptics={false} onPress={press(onPress)}>
      <LivingCard colors={cardColors.violet} radius={radius.xl} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 104, paddingHorizontal: spacing.lg }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
          <Icon name="party.popper.fill" size={26} color="#ffffff" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 26, lineHeight: 30, fontWeight: '800', color: '#ffffff' }}>
            Host a party
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255, 255, 255, 0.82)' }}>
            Pick games, invite friends
          </Text>
        </View>
        <Icon name="chevron.right" size={18} color="#ffffff" />
      </LivingCard>
    </PressableScale>
  );
}

/**
 * Join a party: smaller and darker than Host (the night violet, with grain), "Got a code?" over the title and a
 * chevron. No decorative code boxes: they read as a field you can type in, and you can't.
 */
function JoinButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="Join a party. Type the code from your host" haptics={false} onPress={press(onPress)}>
      <LivingCard colors={cardColors.night} radius={radius.lg} shadow="soft" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64, paddingHorizontal: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: brand.gold }}>
            GOT A CODE?
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 18, lineHeight: 22, fontWeight: '700', color: '#ffffff' }}>
            Join a party
          </Text>
        </View>
        <Icon name="chevron.right" size={16} color="#ffffff" />
      </LivingCard>
    </PressableScale>
  );
}
