import { Stack } from 'expo-router';

import { ComingNext } from '@/components/coming-next';

export default function TableScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Table' }} />
      <ComingNext step={3} what="The table: felt, seats, cards and the action row." />
    </>
  );
}
