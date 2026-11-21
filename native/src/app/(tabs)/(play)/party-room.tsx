import { router, Stack } from 'expo-router';
import { Alert, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DealWipe } from '@/components/deal-wipe';
import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { PartyPanel } from '@/components/party/panel';
import { NavRow } from '@/components/setup/setup-header';
import { ThemedText } from '@/components/themed-text';
import { forgetParty, leaveParty, usePartyRef } from '@/state/party';
import { leaveTable, useTable } from '@/state/session';
import { ForceScheme, spacing } from '@/theme';

/** The party screen: the lobby, the leaderboard between games and the podium. Opened from Play with friends, Join and Home. */
export default function PartyRoom() {
  const insets = useSafeAreaInsets();
  const ref = usePartyRef();
  const atTable = useTable().code;
  const code = ref?.code;
  const gone = () => {
    forgetParty();
    haptic.failure();
    Alert.alert('That party has closed');
    router.navigate('/');
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
          router.navigate('/');
        },
      },
    ]);
  };
  return (
    // The same dark blue page as the lobby it comes from, so a party never looks like a different app.
    <ForceScheme scheme="dark">
      <Stack.Screen options={{ title: 'Party', headerShown: false }} />
      <GrainBackground>
        <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: spacing.xxxl + insets.bottom, gap: spacing.lg }}>
          <NavRow
            title="Party"
            right={
              code ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Leave the party" onPress={leave} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                  <ThemedText tone="red" style={{ fontWeight: '600' }}>
                    Leave
                  </ThemedText>
                </Pressable>
              ) : undefined
            }
          />
          {code ? (
            <PartyPanel key={code} code={code} onGone={gone} place="screen" />
          ) : (
            <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center', paddingTop: spacing.xxl }}>
              You&apos;re not in a party.
            </ThemedText>
          )}
        </ScrollView>
        <DealWipe />
      </GrainBackground>
    </ForceScheme>
  );
}
