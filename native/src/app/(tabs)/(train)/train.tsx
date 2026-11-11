import { Stack } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import type { ScrollView } from 'react-native';

import { ProfileMenu } from '@/components/profile-menu';
import { StatsView } from '@/components/range/stats-view';
import { TrainBackground } from '@/components/range/train-background';
import { startSet, TrainHome } from '@/components/range/train-home';
import { RoundButton, TabScreen } from '@/components/tab-screen';
import { useDaily } from '@/state/range-daily';
import { useRangeHistory } from '@/state/range-history';
import { useRangeGrades } from '@/state/ranges';
import { ForceScheme } from '@/theme';

/**
 * The Train tab is Range training's start screen: Start plays a set of five hands full screen (app/range-session.tsx),
 * with how you're doing and what to work on under it. A round button in the title row opens Stats, which can start
 * a set of the spots you miss most. Always dark, on Range training's slow light field (TrainBackground), which settles
 * into a calm gold glow once today's quiz is done.
 */
export default function TrainTab() {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const history = useRangeHistory();
  const grades = useRangeGrades();
  const [stats, setStats] = useState(false);
  const daily = useDaily();
  const openStats = () => {
    setStats(true);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  return (
    <ForceScheme scheme="dark">
      <TrainBackground mood={daily.finished ? 'done' : 'idle'}>
        <Stack.Screen options={{ title: 'Range training', headerShown: false }} />
        <TabScreen
          title={stats ? 'Your stats' : 'Range training'}
          accessory={
            <>
              <RoundButton
                icon={stats ? 'xmark' : 'chart.bar.xaxis'}
                label={stats ? 'Back to training' : 'Your stats'}
                onPress={() => {
                  setStats(!stats);
                  scroll.current?.scrollTo({ y: 0, animated: false });
                }}
              />
              <ProfileMenu />
            </>
          }
          scrollRef={scroll}
        >
          {stats ? (
            <StatsView history={history} grades={grades} onPractice={(focus) => startSet(focus)} />
          ) : (
            <TrainHome history={history} grades={grades} onOpenStats={openStats} />
          )}
        </TabScreen>
      </TrainBackground>
    </ForceScheme>
  );
}
