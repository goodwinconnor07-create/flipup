import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, Share, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { useFriendActions } from '@/components/friend-menu';
import { RequestList, RequestsPill } from '@/components/friend-requests';
import { FriendSkeleton } from '@/components/friend-skeleton';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { InviteCard } from '@/components/invite-card';
import { LivingCard } from '@/components/living-card';
import { Menu } from '@/components/menu';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { RoundButton, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { removePal, syncFriends, useFriendBox, useMyUsername, usePals, useSentRequests, type Pal } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { brand, cardColors, radius, spacing, useColors, useShadows, ROUNDED } from '@/theme';

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
            <Heading text="Incoming Friend Requests" />
            <RequestList requests={box.requests} />
          </View>
        )}

        <UsernameCard username={username} onPress={() => !needName() && router.push('/username')} />

        {box.invites.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Heading text="Invites" />
            {box.invites.map((i) => (
              <InviteCard key={`${i.from}:${i.at}`} invite={i} />
            ))}
          </View>
        )}

        <Section footer="Text someone a note from you with a link to FlipUp. Your contacts stay on your phone.">
          <Row
            title="Invite from contacts"
            icon={{ symbol: 'person.crop.circle.badge.plus', color: brand.violet }}
            onPress={() => router.push('/invite-contacts')}
          />
        </Section>

        <View style={{ gap: spacing.sm }}>
          <Heading text={pals.length ? `Your friends · ${pals.length}` : 'Your friends'} />
          {refreshing ? (
            <FriendSkeleton rows={Math.min(6, Math.max(2, pals.length + sent.length))} />
          ) : pals.length + sent.length > 0 ? (
            <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
              <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
                {pals.map((pal, i) => (
                  <Menu
                    key={pal.code}
                    fill
                    label={`${pal.name}. Invite, profile`}
                    title={pal.username ? `${pal.name} · @${pal.username}` : pal.name}
                    sections={actions.sections(pal)}
                  >
                    <FriendRow pal={pal} first={i === 0} />
                  </Menu>
                ))}
                {sent.map((pal, i) => (
                  <PendingRow key={pal.code} pal={pal} first={pals.length + i === 0} />
                ))}
              </View>
            </View>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Add a friend by their username"
              onPress={addFriend}
              style={{
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.xl,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                backgroundColor: colors.cell,
                boxShadow: shadows.card,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.accent,
                }}
              >
                <Icon name="person.badge.plus" size={28} color="#ffffff" />
              </View>
              <ThemedText variant="title3" style={{ textAlign: 'center' }}>
                Add your first friend
              </ThemedText>
              <ThemedText variant="subhead" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
                Type their username, or tap + Friend on a party leaderboard. Friends can invite each other to a table.
              </ThemedText>
            </PressableScale>
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
      <View
        style={{
          flex: 1,
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderTopWidth: first ? 0 : 0.5,
          borderTopColor: colors.separator,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="title3" numberOfLines={1}>
            {pal.name}
          </ThemedText>
          <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
            {pal.username ? `@${pal.username}` : 'Friend'}
          </ThemedText>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.cellPressed,
          }}
        >
          <Icon name="ellipsis" size={16} color={colors.secondaryLabel} />
        </View>
      </View>
    </View>
  );
}

function Heading({ text }: { text: string }) {
  return (
    <ThemedText variant="title2" accessibilityRole="header">
      {text}
    </ThemedText>
  );
}

/** Your username on a loud card with Share, or the button to choose one. */
function UsernameCard({ username, onPress }: { username: string | null; onPress: () => void }) {
  return (
    <LivingCard colors={cardColors.violet} style={{ padding: spacing.lg, gap: spacing.sm }}>
      <ThemedText
        variant="footnote"
        tone="onColor"
        style={{ textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.6, opacity: 0.85 }}
      >
        {username ? 'Your username' : 'Get found by friends'}
      </ThemedText>
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#ffffff' }}
      >
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
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: '#ffffff',
      }}
    >
      <Icon name={icon} size={16} color={brand.violet} />
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: brand.violet }}>
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
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: () => void removePal(pal.code).catch(() => Alert.alert("Couldn't cancel it", 'Check your connection and try again.')),
      },
    ]);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${pal.name}, pending`}
      accessibilityHint="Waiting for them to accept"
      onPress={takeBack}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 84, paddingHorizontal: spacing.md }}>
        <View style={{ opacity: 0.6 }}>
          <Avatar emoji={pal.emoji} size={56} />
        </View>
        <View
          style={{
            flex: 1,
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderTopWidth: first ? 0 : 0.5,
            borderTopColor: colors.separator,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="title3" tone="secondaryLabel" numberOfLines={1}>
              {pal.name}
            </ThemedText>
            <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
              {pal.username ? `@${pal.username}` : 'Friend request sent'}
            </ThemedText>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              minHeight: 28,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.full,
              backgroundColor: colors.cellPressed,
            }}
          >
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
