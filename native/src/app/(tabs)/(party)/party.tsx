import { router, Stack, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { PARTY_MAX_GAMES, PARTY_MIN_GAMES, VARIANTS, type Variant } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePartyRef } from '@/state/party';
import { useProfile } from '@/state/profile';
import { brand, cardColors, radius, ROUNDED, spacing } from '@/theme';

const TILE = 76;
const GAP = 12;
/** Points a second each belt moves. */
const SPEED = 22;

/** The three belts: every game, in a different order on each, so no column lines up. */
const ALL = VARIANTS.map((v) => v.id);
const BELTS: Variant[][] = [ALL, [...ALL.slice(4), ...ALL.slice(0, 4)], [...ALL.slice(8), ...ALL.slice(0, 8)]];

/**
 * The Party tab is one big game-night poster, always night violet with grain whatever the phone's appearance: three
 * belts of game tiles drifting across the top in turn (tilted a little, alternating directions, still under Reduce
 * Motion and while another tab is showing), the pitch in big rounded type, your open party if you have one, then two
 * big buttons: Host a party in gold and Join with a code in violet with its five empty code boxes.
 */
export default function PartyTab() {
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  const partyRef = usePartyRef();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();

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
    <View style={{ flex: 1, backgroundColor: brand.violetNight }}>
      <Stack.Screen options={{ title: 'Party', headerShown: false }} />
      {focused && <StatusBar style="light" />}
      <LivingCard colors={cardColors.night} radius={0} shadow={false} outerStyle={{ position: 'absolute', inset: 0 }} style={{ flex: 1 }} />

      <View style={{ flex: 1, paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + 84 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md }}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ flex: 1, fontFamily: ROUNDED, fontSize: 34, lineHeight: 41, fontWeight: '700', color: '#ffffff' }}>
            Party
          </Text>
          <ProfileMenu />
        </View>

        {/* The belts take whatever room is left, and fade out at both sides. */}
        <View style={{ flex: 1, minHeight: TILE * 2 + GAP, justifyContent: 'center', overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={{ gap: GAP, transform: [{ rotate: '-7deg' }, { scale: 1.12 }] }}>
            {BELTS.map((games, i) => (
              <Belt key={i} games={games} reverse={i % 2 === 1} running={focused} offset={i * 37} />
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs, paddingBottom: spacing.lg }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 2, color: brand.gold }}>
            GAME NIGHT
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 36, lineHeight: 40, fontWeight: '800', color: '#ffffff' }}>
            {PARTY_MIN_GAMES} to {PARTY_MAX_GAMES} games.{'\n'}One winner.
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, lineHeight: 23, color: 'rgba(255, 255, 255, 0.72)' }}>
            Every game is a round. Points for where you finish, and bots fill the empty seats.
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {partyRef && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Back to your party, code ${partyRef.code}`}
              onPress={() => router.push('/party-room')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <Icon name="person.3.fill" size={18} color={brand.gold} />
              <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
                Your party · {partyRef.code}
              </Text>
              <Icon name="chevron.right" size={14} color="rgba(255, 255, 255, 0.7)" />
            </PressableScale>
          )}
          <BigButton
            label="Host a party"
            line="Pick the games, invite friends"
            icon="party.popper.fill"
            colors={cardColors.gold}
            ink={brand.goldInk}
            onPress={() => !needName() && router.push('/party-setup')}
          />
          <BigButton
            label="Join a party"
            line="Type the code from your host"
            icon="circle.grid.3x3.fill"
            colors={cardColors.violet}
            ink="#ffffff"
            boxes
            onPress={() => !needName() && router.push({ pathname: '/code-entry', params: { kind: 'party' } })}
          />
        </View>
      </View>
    </View>
  );
}

/** One belt of game tiles, twice over so it can loop without a seam, moving left (or right) for ever. */
function Belt({ games, reverse, running, offset }: { games: Variant[]; reverse: boolean; running: boolean; offset: number }) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const span = games.length * (TILE + GAP);
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
    <Animated.View style={[{ flexDirection: 'row', gap: GAP, marginLeft: -offset, width: Math.max(span * 2, width * 2) }, move]}>
      {[...games, ...games].map((v, i) => (
        <View key={`${v}-${i}`} style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: '0 8px 18px -8px rgba(0, 0, 0, 0.6)' }}>
          <GameThumb variant={v} size={TILE} rounded={radius.lg} />
        </View>
      ))}
    </Animated.View>
  );
}

/** A big decorated button: a living gradient, an icon in a round badge, a bold label and a line. Join adds five empty code boxes. */
function BigButton({ label, line, icon, colors, ink, boxes, onPress }: { label: string; line: string; icon: IconName; colors: readonly [string, string, string]; ink: string; boxes?: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${line}`}
      haptics={false}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
    >
      <LivingCard colors={colors} radius={radius.xl} grain={0.1} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: ink === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.45)' }}>
          <Icon name={icon} size={22} color={ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 26, fontWeight: '800', color: ink }}>
            {label}
          </Text>
          {boxes ? (
            <View style={{ flexDirection: 'row', gap: 5, paddingTop: 4 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <View key={i} style={{ width: 22, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.55)', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
              ))}
            </View>
          ) : (
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: ink, opacity: 0.8 }}>
              {line}
            </Text>
          )}
        </View>
        <Icon name="chevron.right" size={16} color={ink} />
      </LivingCard>
    </PressableScale>
  );
}
