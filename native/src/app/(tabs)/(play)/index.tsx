import { router, Stack } from 'expo-router';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { FriendsStrip } from '@/components/home/friends-strip';
import { GameRow } from '@/components/home/game-row';
import { PassportCard } from '@/components/home/passport';
import { StartTiles } from '@/components/home/start-tiles';
import { FirstHand } from '@/components/home/your-poker';
import { Icon } from '@/components/icon';
import { InviteCard } from '@/components/invite-card';
import { PressableScale } from '@/components/pressable-scale';
import { RequestsPill } from '@/components/friend-requests';
import { ProfileMenu } from '@/components/profile-menu';
import { TabScreen } from '@/components/tab-screen';
import { EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { ThemedText } from '@/components/themed-text';
import { challengeById, FREE_VARIANTS, VARIANTS, variantInfo, variantOf } from '@/engine';
import { FRIENDS_ON } from '@/scope';
import { useFriendBox } from '@/state/pals';
import { usePartyRef } from '@/state/party';
import { usePokerRecord } from '@/state/record';
import { useRangeHistory } from '@/state/range-history';
import { maybeAskForReview } from '@/state/review';
import { useTable } from '@/state/session';
import { usePremium } from '@/state/premium';
import { radius, spacing, useColors, useShadows } from '@/theme';

/**
 * Home. Built the way game apps that feel native do it (Apple's Games app, Chess.com, Flighty): the big title with
 * your avatar menu beside it, then only what gets you playing. Your table or party if you're in one, a friend's
 * invite if one's waiting, else your last game to play again; the two ways to sit down as big tiles; your friends as
 * faces; your poker on one card (How to Play before your first hand); the games as a shelf you swipe; Premium.
 */
export default function Home() {
  const premium = usePremium();
  const record = usePokerRecord();
  const box = useFriendBox();
  const banner = useHasBanner();
  // After a good moment (three finished games or ten best plays) iOS may ask for a rating, once.
  const games = record.games.length;
  const bestPlays = useRangeHistory().filter((a) => a.grade === 'best').length;
  useEffect(() => {
    const t = setTimeout(() => void maybeAskForReview(games, bestPlays), 2500);
    return () => clearTimeout(t);
  }, [games, bestPlays]);
  const reduce = useReduceMotion();
  const slide = reduce ? undefined : LinearTransition.duration(320).easing(EASE_OUT);
  return (
    <>
      <Stack.Screen options={{ title: 'Play', headerShown: false }} />
      <TabScreen
        title="Play"
        accessory={
          <>
            {FRIENDS_ON && <RequestsPill />}
            <ProfileMenu />
          </>
        }
      >
        {(banner || (FRIENDS_ON && box.invites.length > 0)) && (
          <View style={{ gap: spacing.sm }}>
            <TableBanner />
            {FRIENDS_ON && box.invites.slice(0, 2).map((i) => (
              <InviteCard key={`${i.from}:${i.at}`} invite={i} />
            ))}
          </View>
        )}
        <StartTiles />
        <Animated.View layout={slide} style={{ gap: spacing.lg }}>
          <GameRow />
          {FRIENDS_ON && <FriendsStrip />}
          {record.hands > 0 ? <PassportCard /> : <FirstHand />}
          {!premium && <PremiumBanner />}

          <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
            Play chips only. They have no cash value and can&apos;t be bought or won.
          </ThemedText>
        </Animated.View>
      </TabScreen>
    </>
  );
}

/** How many games Premium adds (every game after the free ones). */
const PREMIUM_GAMES = VARIANTS.length - FREE_VARIANTS;

/** Whether Home has a table or party to get back to (the banner shows). */
function useHasBanner(): boolean {
  const t = useTable();
  const partyRef = usePartyRef();
  const atTable = !!t.mode && !(t.game && t.game.status === 'ended' && !t.game.party);
  return atTable || !!partyRef;
}

/** Premium, the way Flighty asks for Pro: a slim outlined banner, a badge, what it adds and a chevron. */
function PremiumBanner() {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`FlipUp Premium. ${PREMIUM_GAMES} more games and card packs`}
      onPress={() => {
        haptic.tap();
        router.push('/premium');
      }}
      style={{ gap: spacing.xxs, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.goldBg, boxShadow: shadows.card }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.gold }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0.8, color: '#3b2300' }}>
            PREMIUM
          </Text>
        </View>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.goldInk }}>
          {PREMIUM_GAMES} more games
        </Text>
        <Icon name="chevron.right" size={15} color={colors.goldInk} />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, color: colors.goldInk }}>
        Plus card packs. One payment, yours to keep.
      </Text>
    </PressableScale>
  );
}

/** The one clear next step, as on the web: a table you're still at (bots-only or online) with Rejoin, or your open party. */
function TableBanner() {
  const colors = useColors();
  const shadows = useShadows();
  const t = useTable();
  const game = t.game;
  const partyRef = usePartyRef();
  const atTable = !!t.mode && !(game && game.status === 'ended' && !game.party);
  if (!atTable && !partyRef) return null;
  const info = atTable && game ? variantInfo(variantOf(game)) : null;
  const challenge = game?.challenge ? challengeById(game.challenge.id) : undefined;
  const what = !atTable ? 'Your party' : challenge ? challenge.name : game?.party ? `Party · game ${game.party.round + 1} of ${game.party.total}` : t.mode === 'online' ? `Online table${t.code ? ` · ${t.code}` : ''}` : 'You vs the bots';
  const where = !atTable ? `Code ${partyRef?.code}` : game?.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : game?.status === 'lobby' ? 'In the lobby' : 'Your table';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${what}. ${where}. ${atTable ? 'Rejoin' : 'Open'}`}
      onPress={() => {
        haptic.tap();
        router.push(atTable ? '/table' : '/party-room');
      }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: pressed ? colors.cellPressed : colors.cell, boxShadow: shadows.card })}
    >
      <Text style={{ fontSize: 26 }} maxFontSizeMultiplier={1} accessible={false}>
        {info?.emoji ?? (atTable ? '🃏' : '🥳')}
      </Text>
      <View style={{ flex: 1 }}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 17, fontWeight: '700', color: colors.label }}>
          {what}
        </Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 15, color: colors.tertiaryLabel }}>
          {where}
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
          {atTable ? 'Rejoin' : 'Open'}
        </Text>
      </View>
    </Pressable>
  );
}
