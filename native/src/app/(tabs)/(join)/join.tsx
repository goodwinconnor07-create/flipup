import { Stack } from 'expo-router';

import { ComingNext } from '@/components/coming-next';

export default function JoinTab() {
  return (
    <>
      <Stack.Screen options={{ title: 'Join', headerLargeTitleEnabled: true }} />
      <ComingNext step={7} what="Five-letter code entry and the QR scanner." />
    </>
  );
}
