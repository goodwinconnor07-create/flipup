import { Stack } from 'expo-router';

import { ComingNext } from '@/components/coming-next';

export default function ProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ComingNext step={5} what="Your name, emoji, streak and Settings." />
    </>
  );
}
