import { Stack } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import type { ScrollView } from 'react-native';

import { ProfileMenu } from '@/components/profile-menu';
import { RangeTrainer } from '@/components/range-trainer';
import { StatsView } from '@/components/range/stats-view';
import { RoundButton, TabScreen } from '@/components/tab-screen';
import { useRangeHistory } from '@/state/range-history';
import { useRangeGrades } from '@/state/ranges';

/**
 * The Train tab is Range training: a hand, your answer, then why. A round button in the title row opens Stats (how
 * you're doing, from every answer you've given), and Stats can send you back to practise the spots you miss most.
 */
export default function TrainTab() {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const history = useRangeHistory();
  const grades = useRangeGrades();
  const [stats, setStats] = useState(false);
  const [focus, setFocus] = useState<string[] | null>(null);
  const top = () => scroll.current?.scrollTo({ y: 0, animated: false });
  return (
    <>
      <Stack.Screen options={{ title: 'Range training', headerShown: false }} />
      <TabScreen
        title={stats ? 'Your stats' : 'Range training'}
        accessory={
          <>
            <RoundButton
              icon={stats ? 'xmark' : 'chart.bar.xaxis'}
              label={stats ? 'Back to practice' : 'Your stats'}
              onPress={() => {
                setStats(!stats);
                top();
              }}
            />
            <ProfileMenu />
          </>
        }
        scrollRef={scroll}
      >
        {stats ? (
          <StatsView
            history={history}
            grades={grades}
            onPractice={(focus) => {
              setFocus(focus);
              setStats(false);
              top();
            }}
          />
        ) : (
          <RangeTrainer key={focus?.join('|') ?? 'all'} focus={focus ?? undefined} onStopFocus={() => setFocus(null)} onNext={top} onTop={top} onScrollTo={(y) => scroll.current?.scrollTo({ y, animated: true })} />
        )}
      </TabScreen>
    </>
  );
}
