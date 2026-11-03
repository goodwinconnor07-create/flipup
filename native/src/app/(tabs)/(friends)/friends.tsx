import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, ScrollView, Share, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { isVariant, variantInfo, type BjInvite } from '@/engine';
import { fetchTableInfo } from '@/state/api';
import { answerRequest, dismissInvite, inviteFriends, removePal, useFriendBox, useMyUsername, usePals, type Pal } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { joinOnlineTable, useTable } from '@/state/session';
import { gradient, party, radius, spacing, useColors, useShadows } from '@/theme';

const CARD = `linear-gradient(150deg, ${party.pink} 0%, #a23cf0 100%)`;

/**
 * Friends: your username (how friends add you), the table invites and friend requests waiting for you, and your
 * friends. Tap a friend to invite them to a game: straight to the online table you're at, or a new one.
 */
export default function FriendsTab() {
  const colors = useColors();
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  const pals = usePals();
  const box = useFriendBox();
  const { username } = useMyUsername();
  const table = useTable();
  // An online table you're at that's still open: invites go straight to it.
  const openTable = table.mode === 'online' && table.code && table.game && table.game.status !== 'ended' ? table.code : null;

  const needName = (): boolean => {
    if (named) return false;
    Alert.alert('Add your name first', 'Friends see your name and picture.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Set up profile', onPress: () => router.push('/profile') },
    ]);
    return true;
  };
  const needUsername = (): boolean => {
    if (needName()) return true;
    if (username) return false;
    router.push('/username');
    return true;
  };

  const invite = async (pal: Pal) => {
    if (openTable) {
      const sent = await inviteFriends([pal.code], openTable).catch(() => 0);
      haptic[sent ? 'success' : 'failure']();
      Alert.alert(sent ? `${pal.name} is invited` : "Couldn't send the invite", sent ? `They can join table ${openTable} from their Friends tab.` : 'Check your connection and try again.');
      return;
    }
    router.push({ pathname: '/setup', params: { mode: 'friends', invite: pal.code } });
  };
  const remove = (pal: Pal) =>
    Alert.alert(`Remove ${pal.name}?`, 'You’ll both drop off each other’s list. You can send a new request any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removePal(pal.code).catch(() => undefined) },
    ]);
  const open = (pal: Pal) => {
    haptic.tap();
    const inviteLabel = openTable ? `Invite to table ${openTable}` : 'Invite to a game';
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: pal.name, message: pal.username ? `@${pal.username}` : undefined, options: [inviteLabel, 'Remove friend', 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 }, (i) => {
        if (i === 0) void invite(pal);
        if (i === 1) remove(pal);
      });
      return;
    }
    Alert.alert(pal.name, pal.username ? `@${pal.username}` : undefined, [
      { text: inviteLabel, onPress: () => void invite(pal) },
      { text: 'Remove friend', style: 'destructive', onPress: () => remove(pal) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Friends', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
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
          <Heading text="Your friends" />
          <Section inset={spacing.md + 40 + spacing.sm}>
            <Row title="Add a friend" subtitle="By their username" icon={{ symbol: 'person.badge.plus', color: colors.accent as string }} onPress={() => !needUsername() && router.push('/add-friend')} />
            {pals.map((pal) => (
              <Row key={pal.code} title={pal.name} subtitle={pal.username ? `@${pal.username}` : undefined} leading={<Avatar emoji={pal.emoji} size={40} />} onPress={() => open(pal)} />
            ))}
          </Section>
          {pals.length === 0 && (
            <ThemedText variant="subhead" tone="tertiaryLabel" style={{ textAlign: 'center', paddingHorizontal: spacing.lg }}>
              No friends yet. Add one by their username, or tap + Friend on a party leaderboard.
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function Heading({ text }: { text: string }) {
  return (
    <ThemedText variant="title2" accessibilityRole="header" style={{ fontWeight: '800' }}>
      {text}
    </ThemedText>
  );
}

/** Your username on a loud card with Share, or the button to choose one. */
function UsernameCard({ username, onPress }: { username: string | null; onPress: () => void }) {
  const shadow = useShadows();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl, borderCurve: 'continuous', boxShadow: shadow.soft, ...gradient(CARD) }}>
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
    </View>
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
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: '#ffffff', borderBottomWidth: 3, borderBottomColor: party.edge }}
    >
      <Icon name={icon} size={16} color="#a23cf0" />
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '800', color: '#a23cf0' }}>
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

/** "Sam invited you to Crazy Pineapple", with Join (sits you down at their table) and a way to say no. */
function InviteCard({ invite }: { invite: BjInvite }) {
  const colors = useColors();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  const game = variantInfo(isVariant(invite.game) ? invite.game : 'holdem');
  const join = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const info = await fetchTableInfo(invite.table);
      if (!info || info.status === 'ended') {
        dismissInvite(invite);
        Alert.alert('That table has closed', `Ask ${invite.name} to invite you to a new one.`);
        return;
      }
      if (info.seatsLeft <= 0) {
        Alert.alert('The table is full', `Every seat at ${invite.name}'s table is taken.`);
        return;
      }
      dismissInvite(invite);
      joinOnlineTable(invite.table, profile.name, profile.emoji);
      router.push('/table');
    } catch (e) {
      Alert.alert("Couldn't reach the table", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <Avatar emoji={invite.emoji} size={44} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="headline" numberOfLines={1}>
          {invite.name} invited you
        </ThemedText>
        <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
          {game.emoji} {game.name}
        </ThemedText>
      </View>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Not now, ${invite.name}`} onPress={() => dismissInvite(invite)} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cellPressed }}>
        <Icon name="xmark" size={14} color={colors.secondaryLabel} />
      </PressableScale>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Join ${invite.name}'s table`} onPress={() => void join()} style={{ minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: party.green }}>
        {busy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
            Join
          </Text>
        )}
      </PressableScale>
    </View>
  );
}
