import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Path } from 'react-native-svg';

import { haptic } from '@/components/haptics';
import { GameCarousel } from '@/components/home/game-carousel';
import { LivelyBackground } from '@/components/home/lively-background';
import { Icon } from '@/components/icon';
import { MARK } from '@/components/launch-mark';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { challengeById, variantInfo, variantOf } from '@/engine';
import { usePartyRef } from '@/state/party';
import { useProfile } from '@/state/profile';
import { useRangeHistory } from '@/state/range-history';
import { usePokerRecord } from '@/state/record';
import { maybeAskForReview } from '@/state/review';
import { useTable } from '@/state/session';
import { brand, ForceScheme, ROUNDED, spacing } from '@/theme';

const INK = '#0b1533';
const SOFT = 'rgba(255, 255, 255, 0.7)';
/** The logo's height: the app icon's spade, in white. */
const LOGO = 40;
/** The tab bar's height over the bottom safe area. */
const TAB_BAR = 49;

/**
 * Home, a minimal test that fits one screen without scrolling (owner, 10 Nov 2026, after a reference with a big greeting): the moving deep blue page, the
 * FlipUp spade and your face, "Hi, <name>." as huge rounded type, one line, the games rolling past on a quiet card,
 * then Host a game (white) and Join with a code (see-through), and two quiet links under them. Your table, when
 * you're at one, sits on the same kind of card above the games.
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  // The greeting is as big as the screen allows (92pt on a big phone), and the page fits between the status bar and
  // the tab bar without scrolling. The insets are ours ("never"): with iOS's automatic ones, a page that fills its
  // frame is taller than the room it has and scrolls.
  const { height } = useWindowDimensions();
  const hi = Math.round(Math.max(56, Math.min(92, height * 0.1)));
  const name = useProfile().name.trim();
  const record = usePokerRecord();
  // After a good moment (three finished games or ten best plays) iOS may ask for a rating, once.
  const games = record.games.length;
  const bestPlays = useRangeHistory().filter((a) => a.grade === 'best').length;
  useEffect(() => {
    const t = setTimeout(() => void maybeAskForReview(games, bestPlays), 2500);
    return () => clearTimeout(t);
  }, [games, bestPlays]);

  const go = (path: '/play-friends' | '/join' | '/play-bots' | '/how-to-play/holdem') => () => {
    haptic.tap();
    router.push(path);
  };
  return (
    <ForceScheme scheme="dark">
      <Stack.Screen options={{ title: 'Play', headerShown: false }} />
      <LivelyBackground style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xxs, paddingBottom: insets.bottom + TAB_BAR + spacing.md, gap: spacing.lg }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View accessible accessibilityRole="header" accessibilityLabel="FlipUp">
              <Svg width={LOGO * (116 / 125)} height={LOGO} viewBox="-58 -60 116 125">
                <Path d={MARK} fillRule="evenodd" fill="#ffffff" />
              </Svg>
            </View>
            <ProfileMenu />
          </View>

          {/* The room left over goes above and below the greeting, so everything sits lower, down to the tab bar. */}
          <View style={{ flex: 1 }} />

          <View style={{ gap: spacing.sm }}>
            <Text maxFontSizeMultiplier={1} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5} style={{ fontFamily: ROUNDED, fontSize: hi, lineHeight: hi, fontWeight: '900', letterSpacing: -2, color: '#ffffff' }}>
              {`Hi,\n${name || 'there'}.`}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 21, lineHeight: 26, fontWeight: '700', color: '#ffffff' }}>
              Host a table, or join one with a friend’s code.
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ gap: spacing.sm }}>
            <LiveCard />
            <GameCarousel />
            <BigButton label="Host a game" solid onPress={go('/play-friends')} />
            <BigButton label="Join with a code" onPress={go('/join')} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, marginTop: -spacing.sm }}>
            <QuietLink label="Play with bots" onPress={go('/play-bots')} />
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.4)' }} />
            <QuietLink label="How it works" onPress={go('/how-to-play/holdem')} />
          </View>
        </ScrollView>
      </LivelyBackground>
    </ForceScheme>
  );
}

/** A big plain button: white with dark ink for the main way in, see-through white for the other. */
function BigButton({ label, solid, onPress }: { label: string; solid?: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptics={false}
      style={{
        minHeight: 56,
        borderRadius: 20,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: solid ? '#ffffff' : 'rgba(255, 255, 255, 0.14)',
        boxShadow: solid ? '0 8px 24px rgba(0, 0, 0, 0.28)' : undefined,
      }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 19, fontWeight: '800', color: solid ? INK : '#ffffff' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

function QuietLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={label} onPress={onPress} haptics={false} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '500', color: SOFT }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** The table or party you're in, on the same quiet card as the games: a green LIVE, what it is, and a chevron. */
function LiveCard() {
  const t = useTable();
  const game = t.game;
  const partyRef = usePartyRef();
  const atTable = !!t.mode && !(game && game.status === 'ended' && !game.party);
  if (!atTable && !partyRef) return null;
  const challenge = game?.challenge ? challengeById(game.challenge.id) : undefined;
  const what = !atTable ? 'Your party' : challenge ? challenge.name : game ? variantInfo(variantOf(game)).name : 'Your table';
  const where = !atTable
    ? `Code ${partyRef?.code}`
    : game?.party
      ? `Party · game ${game.party.round + 1} of ${game.party.total}`
      : `${t.mode === 'online' ? 'Online' : 'Bots'}${game?.hand && game.status === 'playing' ? ` · hand ${game.hand.number}` : game?.status === 'lobby' ? ' · in the lobby' : ''}`;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Back to ${what}. ${where}`}
      onPress={() => {
        haptic.tap();
        router.push(atTable ? '/table' : '/party-room');
      }}
      haptics={false}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 24, borderCurve: 'continuous', backgroundColor: 'rgba(255, 255, 255, 0.09)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}
    >
      <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 2, borderColor: brand.raise }}>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0.8, color: brand.raise }}>
          LIVE
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: 'rgba(255, 255, 255, 0.62)' }}>
          {where.toUpperCase()}
        </Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 17, fontWeight: '600', color: '#ffffff' }}>
          Back to {what}
        </Text>
      </View>
      <Icon name="chevron.right" size={15} color="rgba(255, 255, 255, 0.85)" />
    </PressableScale>
  );
}
