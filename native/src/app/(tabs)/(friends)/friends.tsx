import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, Share, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

import { Avatar } from '@/components/avatar';
import { useFriendActions } from '@/components/friend-menu';
import { RequestList, RequestsPill } from '@/components/friend-requests';
import { FriendSkeleton } from '@/components/friend-skeleton';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { InviteCard } from '@/components/invite-card';
import { LivingCard } from '@/components/living-card';
import { Menu } from '@/components/menu';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { SectionTitle } from '@/components/home/section-title';
import { RoundButton, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { removePal, syncFriends, useFriendBox, useMyUsername, usePals, useSentRequests, type Pal } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { brand, cardColors, radius, spacing, useColors, useShadows } from '@/theme';


/** The skeleton stays up at least this long, so a quick refresh doesn't flash. */
const MIN_REFRESH_MS = 600;
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/**
 * Friends: your username (how friends add you), the friend requests and table invites waiting for you, and your
 * friends, big, each a tap from Apple's menu: invite them to a game, see their profile, or remove them. People
 * you've asked show under them as Pending until they answer. Pull down to refresh: only the friend boxes turn into
 * placeholders while it loads.
 */
export default function FriendsTab() {
  const colors = useColors();
  const shadows = useShadows();
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  const pals = usePals();
  const sent = useSentRequests();
  const box = useFriendBox();
  const [refreshing, setRefreshing] = useState(false);
  // The pull spinner lets go at once (so the page springs back and nothing else moves); the skeleton does the waiting.
  const [pulled, setPulled] = useState(false);
  const refresh = async () => {
    haptic.select();
    setPulled(true);
    setTimeout(() => setPulled(false), 0);
    setRefreshing(true);
    await Promise.all([syncFriends(), wait(MIN_REFRESH_MS)]);
    setRefreshing(false);
  };
  // Coming back to the tab fetches the list too, quietly.
  useFocusEffect(
    useCallback(() => {
      void syncFriends();
    }, []),
  );
  const { username } = useMyUsername();
  const actions = useFriendActions();

  const needName = (): boolean => {
    if (named) return false;
    Alert.alert('Add your name first', 'Friends see your name and picture.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Set up profile', onPress: () => router.push('/profile') },
    ]);
    return true;
  };
  const addFriend = () => {
    if (needName()) return;
    router.push(username ? '/add-friend' : '/username');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Friends', headerShown: false }} />
      <TabScreen
        title="Friends"
        refreshControl={<RefreshControl refreshing={pulled} onRefresh={() => void refresh()} tintColor={colors.secondaryLabel} />}
        accessory={
          <>
            <RequestsPill />
            <RoundButton icon="person.badge.plus" label="Add a friend" onPress={addFriend} />
            <ProfileMenu />
          </>
        }
      >
        {box.requests.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle eyebrow="Waiting for you" symbol="person.badge.plus" title="Friend requests" />
            <RequestList requests={box.requests} />
          </View>
        )}

        <UsernameCard username={username} onPress={() => !needName() && router.push('/username')} />

        {box.invites.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <SectionTitle eyebrow="Friends' tables" symbol="suit.spade.fill" title="Invites" />
            {box.invites.map((i) => (
              <InviteCard key={`${i.from}:${i.at}`} invite={i} />
            ))}
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          <SectionTitle eyebrow={pals.length ? `${pals.length} ${pals.length === 1 ? 'friend' : 'friends'}` : undefined} symbol="person.2.fill" title="Your friends" />
          {refreshing ? (
            <FriendSkeleton rows={Math.min(6, Math.max(2, pals.length + sent.length))} />
          ) : pals.length + sent.length > 0 ? (
            <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
            <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
              {pals.map((pal, i) => (
                <Menu key={pal.code} fill label={`${pal.name}. Invite, profile`} title={pal.username ? `${pal.name} · @${pal.username}` : pal.name} sections={actions.sections(pal)}>
                  <FriendRow pal={pal} first={i === 0} />
                </Menu>
              ))}
              {sent.map((pal, i) => (
                <PendingRow key={pal.code} pal={pal} first={pals.length + i === 0} />
              ))}
            </View>
            </View>
          ) : (
            <FriendsEmpty onAdd={addFriend} />
          )}
        </View>
      </TabScreen>
    </>
  );
}

/** One friend, big: their face, name and username, and a "…" that says a tap opens more. */
function FriendRow({ pal, first }: { pal: Pal; first: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84, paddingHorizontal: spacing.md }}>
      <Avatar emoji={pal.emoji} size={56} />
      <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: first ? 0 : 0.5, borderTopColor: colors.separator }}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="title3" numberOfLines={1}>
            {pal.name}
          </ThemedText>
          <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
            {pal.username ? `@${pal.username}` : 'Friend'}
          </ThemedText>
        </View>
        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cellPressed }}>
          <Icon name="ellipsis" size={16} color={colors.secondaryLabel} />
        </View>
      </View>
    </View>
  );
}

/**
 * No friends yet: one picture, one sentence, one button (Apple's Games app does the same). The picture is three faces
 * on a glowing orbit round yours.
 */
function FriendsEmpty({ onAdd }: { onAdd: () => void }) {
  const colors = useColors();
  const shadows = useShadows();
  const me = useProfile().emoji || '😎';
  const W = 280;
  const H = 150;
  const faces: [string, number, number, number][] = [
    ['🦊', 34, 58, 46],
    ['🐼', 206, 18, 50],
    ['🐸', 196, 102, 40],
  ];
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: W, height: H }}>
        <Svg width={W} height={H} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="orbit" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={brand.violet} stopOpacity={0.15} />
              <Stop offset="0.5" stopColor={brand.violet} stopOpacity={0.95} />
              <Stop offset="1" stopColor={brand.gold} stopOpacity={0.3} />
            </LinearGradient>
            <RadialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={brand.violet} stopOpacity={0.35} />
              <Stop offset="1" stopColor={brand.violet} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={W / 2} cy={H / 2} rx={W / 2} ry={H / 2} fill="url(#halo)" />
          {[0, 1, 2].map((k) => (
            <Ellipse key={k} cx={W / 2} cy={H / 2 + 6} rx={118 - k * 10} ry={34 - k * 4} fill="none" stroke="url(#orbit)" strokeWidth={4 - k} transform={`rotate(-14 ${W / 2} ${H / 2})`} opacity={1 - k * 0.3} />
          ))}
        </Svg>
        <View style={{ position: 'absolute', left: W / 2 - 38, top: H / 2 - 38 }}>
          <Avatar emoji={me} size={76} />
        </View>
        {faces.map(([e, x, y, size]) => (
          <View key={e} style={{ position: 'absolute', left: x, top: y }}>
            <Avatar emoji={e} size={size} />
          </View>
        ))}
      </View>
      <ThemedText variant="title3" style={{ textAlign: 'center' }}>
        Play with your friends
      </ThemedText>
      <ThemedText variant="subhead" tone="secondaryLabel" style={{ textAlign: 'center' }}>
        Add them by their username, then invite them straight to your table.
      </ThemedText>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Add friends"
        onPress={() => {
          haptic.tap();
          onAdd();
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: colors.cellPressed }}
      >
        <Icon name="plus" size={16} color={colors.label} />
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '700', color: colors.label }}>
          Add friends
        </Text>
      </PressableScale>
    </View>
  );
}

/** Your username on a loud card with Share, or the button to choose one. */
function UsernameCard({ username, onPress }: { username: string | null; onPress: () => void }) {
  return (
    <LivingCard colors={cardColors.violet} style={{ padding: spacing.lg, gap: spacing.sm }}>
      <ThemedText variant="footnote" tone="onColor" style={{ textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.6, opacity: 0.85 }}>
        {username ? 'Your username' : 'Get found by friends'}
      </ThemedText>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#ffffff' }}>
        {username ? `@${username}` : 'Choose a username'}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {username && (
          <Pill
            icon="square.and.arrow.up"
            label="Share"
            onPress={() => void Share.share({ message: `Add me on FlipUp: my username is @${username}` })}
          />
        )}
        <Pill icon={username ? 'pencil' : 'plus'} label={username ? 'Change' : 'Choose'} onPress={onPress} />
      </View>
    </LivingCard>
  );
}

function Pill({ icon, label, onPress }: { icon: 'square.and.arrow.up' | 'pencil' | 'plus'; label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: '#ffffff' }}
    >
      <Icon name={icon} size={16} color={brand.violet} />
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '800', color: brand.violet }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Someone you've asked who hasn't answered: their face, name and a Pending tag. A tap offers to take the request
 * back. If they deny it, the row just goes at the next check; nothing tells you.
 */
function PendingRow({ pal, first }: { pal: Pal; first: boolean }) {
  const colors = useColors();
  const takeBack = () =>
    Alert.alert(`Cancel your request to ${pal.name}?`, undefined, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Request', style: 'destructive', onPress: () => void removePal(pal.code).catch(() => Alert.alert("Couldn't cancel it", 'Check your connection and try again.')) },
    ]);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${pal.name}, pending`} accessibilityHint="Waiting for them to accept" onPress={takeBack}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84, paddingHorizontal: spacing.md }}>
        <View style={{ opacity: 0.6 }}>
          <Avatar emoji={pal.emoji} size={56} />
        </View>
        <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: first ? 0 : 0.5, borderTopColor: colors.separator }}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="title3" tone="secondaryLabel" numberOfLines={1}>
              {pal.name}
            </ThemedText>
            <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
              {pal.username ? `@${pal.username}` : 'Friend request sent'}
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 28, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: colors.cellPressed }}>
            <Icon name="clock.fill" size={12} color={colors.secondaryLabel} />
            <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '600' }}>
              Pending
            </ThemedText>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}
