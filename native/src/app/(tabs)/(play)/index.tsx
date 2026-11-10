import { router, Stack } from 'expo-router';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { FriendsStrip } from '@/components/home/friends-strip';
import { GameRow } from '@/components/home/game-row';
import { StartTiles } from '@/components/home/start-tiles';
import { InviteCard } from '@/components/invite-card';
import { RequestsPill } from '@/components/friend-requests';
import { ProfileMenu } from '@/components/profile-menu';
import { TabScreen } from '@/components/tab-screen';
import { EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { challengeById, variantInfo, variantOf } from '@/engine';
import { FRIENDS_ON } from '@/scope';
import { useFriendBox } from '@/state/pals';
import { usePartyRef } from '@/state/party';
import { usePokerRecord } from '@/state/record';
import { useRangeHistory } from '@/state/range-history';
import { maybeAskForReview } from '@/state/review';
import { useTable } from '@/state/session';
import { radius, spacing, useColors, useShadows } from '@/theme';

/**
 * Home, kept to one screen (owner, 10 Nov 2026): the big title with your avatar, your table or party if you're in
 * one, then the three ways in (Play with friends, Play with bots, Join a game) and the game modes as big cards you
 * swipe. Nothing else: your poker lives on Profile, and Premium asks through the gold tags on the locked games.
 */
export default function Home() {
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
        </Animated.View>
      </TabScreen>
    </>
  );
}

/** Whether Home has a table or party to get back to (the banner shows). */
function useHasBanner(): boolean {
  const t = useTable();
  const partyRef = usePartyRef();
  const atTable = !!t.mode && !(t.game && t.game.status === 'ended' && !t.game.party);
  return atTable || !!partyRef;
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
