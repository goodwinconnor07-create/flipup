import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { isVariant, variantInfo, type BjInvite } from '@/engine';
import { fetchTableInfo } from '@/state/api';
import { dismissInvite } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { joinOnlineTable } from '@/state/session';
import { party, radius, spacing, useColors, useShadows } from '@/theme';

import { Avatar } from './avatar';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/** "Sam invited you to Crazy Pineapple", with Join (sits you down at their table) and a way to say no. */
export function InviteCard({ invite }: { invite: BjInvite }) {
  const colors = useColors();
  const shadows = useShadows();
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
