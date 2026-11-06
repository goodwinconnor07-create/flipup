import { Stack } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import type { ScrollView } from 'react-native';

import { ProfileMenu } from '@/components/profile-menu';
import { RangeTrainer } from '@/components/range-trainer';
import { TabScreen } from '@/components/tab-screen';

/** The Train tab is Range training, the web's trainer one to one: a hand, your answer, then why. */
export default function TrainTab() {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  return (
    <>
      <Stack.Screen options={{ title: 'Range training', headerShown: false }} />
      <TabScreen title="Range training" accessory={<ProfileMenu />} scrollRef={scroll}>
        <RangeTrainer onNext={() => scroll.current?.scrollTo({ y: 0, animated: false })} />
      </TabScreen>
    </>
  );
}
