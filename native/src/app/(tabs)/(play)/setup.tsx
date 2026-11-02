import { Stack, useLocalSearchParams } from 'expo-router';

import { ComingNext } from '@/components/coming-next';

export default function SetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: mode === 'friends' ? 'Play with friends' : 'Play with bots' }} />
      <ComingNext step={2} what="Chips, blinds, timers, rebuys and the game." />
    </>
  );
}
