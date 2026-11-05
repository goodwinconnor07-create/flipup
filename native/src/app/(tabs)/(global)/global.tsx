import { Stack } from 'expo-router';

import { ProfileMenu } from '@/components/profile-menu';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';

/** The Global tab: this month's Bankroll, today's challenge and the boards (Stage 3 in docs/TODO.md). */
export default function GlobalTab() {
  return (
    <>
      <Stack.Screen options={{ title: 'Global', headerShown: false }} />
      <TabScreen title="Global" accessory={<ProfileMenu />}>
        <ThemedText tone="tertiaryLabel">The boards are coming.</ThemedText>
      </TabScreen>
    </>
  );
}
