import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Share, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { useFriendActions } from '@/components/friend-menu';
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
import { answerRequest, useFriendBox, useMyUsername, usePals, type Pal } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { brand, cardColors, radius, spacing, useColors, useShadows } from '@/theme';


/**
 * Friends: your username (how friends add you), the table invites and friend requests waiting for you, and your
 * friends, big, each a tap from Apple's menu: invite them to a game, see their profile, or remove them.
 */
export default function FriendsTab() {
  const colors = useColors();
  const shadows = useShadows();
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  const pals = usePals();
  const box = useFriendBox();
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
        accessory={
          <>
            <RoundButton icon="person.badge.plus" label="Add a friend" onPress={addFriend} />
            <ProfileMenu />
          </>
        }
      >
        <UsernameCard username={username} onPress={() => !needName() && router.push('/username')} />

        {box.invites.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Heading text="Invites" />
            {box.invites.map((i) => (
              <InviteCard key={`${i.from}:${i.at}`} invite={i} />
            ))}
          </View>
        )}

        {box.requests.length > 0 && (
          <Section header="Friend requests" inset={spacing.md + 40 + spacing.sm}>
            {box.requests.map((r) => (
              <Row
                key={r.from}
                title={r.name}
                subtitle={r.username ? `@${r.username}` : 'Wants to be friends'}
                leading={<Avatar emoji={r.emoji} size={40} />}
                chevron={false}
                accessory={<Answer name={r.name} onAnswer={(yes) => answerRequest(r.from, yes)} />}
              />
            ))}
          </Section>
        )}

        <View style={{ gap: spacing.sm }}>
          <Heading text={pals.length ? `Your friends · ${pals.length}` : 'Your friends'} />
          {pals.length > 0 ? (
            <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
            <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
              {pals.map((pal, i) => (
                <Menu key={pal.code} fill label={`${pal.name}. Invite, profile`} title={pal.username ? `${pal.name} · @${pal.username}` : pal.name} sections={actions.sections(pal)}>
                  <FriendRow pal={pal} first={i === 0} />
                </Menu>
              ))}
            </View>
            </View>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Add a friend by their username"
              onPress={addFriend}
              style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}
            >
              <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
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

/** Accept or decline, with a spinner while it's sent. */
function Answer({ name, onAnswer }: { name: string; onAnswer: (yes: boolean) => Promise<void> }) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const go = async (yes: boolean) => {
    if (busy) return;
    setBusy(true);
    haptic[yes ? 'success' : 'tap']();
    await onAnswer(yes).catch(() => Alert.alert("Couldn't answer", 'Check your connection and try again.'));
    setBusy(false);
  };
  if (busy) return <ActivityIndicator />;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Decline ${name}`} onPress={() => void go(false)} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cellPressed }}>
        <Icon name="xmark" size={15} color={colors.secondaryLabel} />
      </PressableScale>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Accept ${name}`} onPress={() => void go(true)} style={{ minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
          Accept
        </Text>
      </PressableScale>
    </View>
  );
}
