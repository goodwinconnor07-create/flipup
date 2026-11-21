import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';

import { GameShelf } from '@/components/home/game-shelf';
import { spacing } from '@/theme';

/** Every game as a big card (Home's Variants "See all"). */
export default function AllGames() {
  return (
    <>
      <Stack.Screen options={{ title: 'Variants' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center' }}>
        <GameShelf />
      </ScrollView>
    </>
  );
}
