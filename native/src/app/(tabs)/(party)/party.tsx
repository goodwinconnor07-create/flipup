import { Stack } from 'expo-router';

import { ComingNext } from '@/components/coming-next';

export default function PartyTab() {
  return (
    <>
      <Stack.Screen options={{ title: 'Party', headerLargeTitleEnabled: true }} />
      <ComingNext step={4} what="Host a party, join one, and the leaderboard." />
    </>
  );
}
