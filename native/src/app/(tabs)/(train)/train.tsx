import { Stack } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import type { ScrollView } from 'react-native';

import { TrainBackground } from '@/components/range/train-background';
import { TrainHome } from '@/components/range/train-home';
import { TabScreen } from '@/components/tab-screen';
import { useDaily } from '@/state/range-daily';
import { useRangeHistory } from '@/state/range-history';
import { useRangeGrades } from '@/state/ranges';
import { ForceScheme } from '@/theme';

/**
 * The Train tab, titled Train like its tab, is Range training's start screen (`TrainHome`): today's hand first, then
 * the other ways to train, your numbers and the library. Hands play full screen (app/range-session.tsx). Always dark, on Range training's slow light field
 * (TrainBackground), which settles into a calm gold glow once today's hand is played.
 */
export default function TrainTab() {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const history = useRangeHistory();
  const grades = useRangeGrades();
  const daily = useDaily();
  return (
    <ForceScheme scheme="dark">
      <TrainBackground mood={daily.finished ? 'done' : 'idle'}>
        {/* Always dark: the status bar is white here (`barStyleFor()`), whatever the phone's own look. */}
        <Stack.Screen options={{ title: 'Train', headerShown: false }} />
        <TabScreen title="Train" scrollRef={scroll}>
          <TrainHome history={history} grades={grades} />
        </TabScreen>
      </TrainBackground>
    </ForceScheme>
  );
}
