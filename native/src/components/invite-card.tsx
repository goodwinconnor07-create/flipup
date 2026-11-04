import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { isVariant, variantInfo, type BjInvite } from '@/engine';
import { fetchTableInfo } from '@/state/api';
import { declineInvite, dismissInvite } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { joinOnlineTable } from '@/state/session';
import { party, radius, spacing, useColors, useShadows } from '@/theme';

import { Avatar } from './avatar';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/**
 * Join for a friend's table invite: checks the table is still there (and, for an invite sent from their lobby, that
 * it hasn't dealt yet) and has a seat, then sits you down and opens the table.
 */
export function useJoinInvite(invite: BjInvite, after?: () => void) {
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
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
      if (invite.lobby && info.status !== 'lobby') {
        dismissInvite(invite);
        Alert.alert('That game has started', `${invite.name}'s table has dealt already. Ask them for the next one.`);
        return;
      }
      if (info.seatsLeft <= 0) {
        Alert.alert('The table is full', `Every seat at ${invite.name}'s table is taken.`);
        return;
      }
      dismissInvite(invite);
      joinOnlineTable(invite.table, profile.name, profile.emoji);
      after?.();
      router.push('/table');
    } catch (e) {
      Alert.alert("Couldn't reach the table", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return { join, busy };
}

/** "Sam invited you to Crazy Pineapple", with Join (sits you down at their table) and a way to say no. */
export function InviteCard({ invite }: { invite: BjInvite }) {
  const colors = useColors();
  const shadows = useShadows();
  const { join, busy } = useJoinInvite(invite);
  const game = variantInfo(isVariant(invite.game) ? invite.game : 'holdem');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}>
      <Avatar emoji={invite.emoji} size={44} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="headline" numberOfLines={1}>
          {invite.name} invited you
        </ThemedText>
        <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
          {game.emoji} {game.name}
        </ThemedText>
      </View>
      <InviteButtons invite={invite} join={join} busy={busy} />
    </View>
  );
}

/** Decline (an X: tells the host no) and Join, shared by the card and the banner. */
export function InviteButtons({ invite, join, busy, onDecline }: { invite: BjInvite; join: () => Promise<void>; busy: boolean; onDecline?: () => void }) {
  const colors = useColors();
  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Decline ${invite.name}'s invite`}
        onPress={() => {
          declineInvite(invite);
          onDecline?.();
        }}
        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cellPressed }}
      >
        <Icon name="xmark" size={14} color={colors.secondaryLabel} />
      </PressableScale>
      <PressableScale accessibilityRole="button" accessibilityLabel={`Join ${invite.name}'s table`} onPress={() => void join()} style={{ minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: party.green }}>
        {busy ? (
          <ActivityIndicator color={colors.onColor} />
        ) : (
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '800', color: colors.onColor }}>
            Join
          </Text>
        )}
      </PressableScale>
    </>
  );
}
