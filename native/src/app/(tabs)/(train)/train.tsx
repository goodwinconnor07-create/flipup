import { Stack } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import type { ScrollView } from 'react-native';

import { ProfileMenu } from '@/components/profile-menu';
import { TrainBackground } from '@/components/range/train-background';
import { TrainHome } from '@/components/range/train-home';
import { TabScreen } from '@/components/tab-screen';
import { useDaily } from '@/state/range-daily';
import { useRangeHistory } from '@/state/range-history';
import { useRangeGrades } from '@/state/ranges';
import { ForceScheme } from '@/theme';

/**
 * The Train tab is Range training's start screen: Start plays a set of five hands full screen (app/range-session.tsx),
 * with the numbers that matter (streak, best plays, best run, how much of the library you've mastered) and what to
 * work on under it. There's no separate stats page. Always dark, on Range training's slow light field
 * (TrainBackground), which settles into a calm gold glow once today's quiz is done.
 */
export default function TrainTab() {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const history = useRangeHistory();
  const grades = useRangeGrades();
  const daily = useDaily();
  return (
    <ForceScheme scheme="dark">
      <TrainBackground mood={daily.finished ? 'done' : 'idle'}>
        <Stack.Screen options={{ title: 'Range training', headerShown: false }} />
        <TabScreen title="Range training" accessory={<ProfileMenu />} scrollRef={scroll}>
          <TrainHome history={history} grades={grades} />
        </TabScreen>
      </TrainBackground>
    </ForceScheme>
  );
}
