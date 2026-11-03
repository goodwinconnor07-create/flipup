import { router, Stack } from 'expo-router';
import { Alert, Pressable, ScrollView } from 'react-native';

import { DealWipe } from '@/components/deal-wipe';
import { haptic } from '@/components/haptics';
import { PartyPanel } from '@/components/party/panel';
import { ThemedText } from '@/components/themed-text';
import { forgetParty, leaveParty, usePartyRef } from '@/state/party';
import { leaveTable, useTable } from '@/state/session';
import { gradients, spacing } from '@/theme';

/** The party screen: the lobby, the leaderboard between games and the podium. Opened from the Party tab and Home. */
export default function PartyRoom() {
  const ref = usePartyRef();
  const atTable = useTable().code;
  const code = ref?.code;
  const gone = () => {
    forgetParty();
    haptic.failure();
    Alert.alert('That party has closed');
    router.navigate('/party');
  };
  const leave = () => {
    if (!code) return;
    Alert.alert('Leave the party?', "You'll keep your place on the board, but you can't come back once it has started.", [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          void leaveParty(code);
          if (atTable) leaveTable();
          router.navigate('/party');
        },
      },
    ]);
  };
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Party',
          headerRight: code
            ? () => (
                <Pressable accessibilityRole="button" onPress={leave} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: spacing.xs })}>
                  <ThemedText tone="red">Leave</ThemedText>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }}>
        {code ? (
          <PartyPanel key={code} code={code} onGone={gone} place="screen" />
        ) : (
          <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center', paddingTop: spacing.xxl }}>
            You&apos;re not in a party.
          </ThemedText>
        )}
      </ScrollView>
      <DealWipe colors={gradients.pink} />
    </>
  );
}
