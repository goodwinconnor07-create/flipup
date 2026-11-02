import { Stack } from 'expo-router';
import { ScrollView, Text, useColorScheme } from 'react-native';

import { describeHand } from '@/engine';

// Phase 0 shell. It proves the shared engine in ../src/game loads on the phone; Phase 5 replaces it with Home.
const sample = describeHand(['As', 'Ks', 'Qs', 'Js', 'Ts']);

export default function Home() {
  const dark = useColorScheme() === 'dark';
  return (
    <>
      <Stack.Screen options={{ title: 'FlipUp' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: dark ? '#ffffff' : '#000000', fontSize: 17 }}>Engine check: {sample.name}</Text>
      </ScrollView>
    </>
  );
}
