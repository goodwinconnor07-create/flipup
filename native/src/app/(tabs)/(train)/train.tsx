import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share } from 'react-native';

import { haptic } from '@/components/haptics';
import { ProfileMenu } from '@/components/profile-menu';
import { startSet } from '@/components/range/train-home';
import { HistoryList, PracticeList } from '@/components/range/train-list';
import { PillTabs, PlusButton } from '@/components/tab-list';
import { RoundButton, TabScreen } from '@/components/tab-screen';
import { libraryProgress, useRangeHistory } from '@/state/range-history';
import { useRangeGrades } from '@/state/ranges';
import { spacing } from '@/theme';

import { APP_INFO } from '../../../../appInfo';

type Tab = 'practice' | 'history';
const TABS: { id: Tab; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'history', label: 'History' },
];

/**
 * Range training in My Games' style: pill tabs for Practice and History with "+ Start a Set" beside them. Practice is
 * what to work on, then every kind of spot; History is every hand you've answered. Each set is five real hands from
 * published breakdowns, played full screen (app/range-session.tsx). Your training stats are on the Stats tab.
 */
export default function TrainTab() {
  const history = useRangeHistory();
  const grades = useRangeGrades();
  // A link can open History (`/train?tab=history`).
  const asked = useLocalSearchParams<{ tab?: string }>().tab;
  const [tab, setTab] = useState<Tab>(asked === 'history' ? 'history' : 'practice');
  // A new link while the tab is open switches to it (set during render, not in an effect).
  const [linked, setLinked] = useState(asked);
  if (asked !== linked) {
    setLinked(asked);
    if (asked === 'history' || asked === 'practice') setTab(asked);
  }
  const share = () => {
    haptic.tap();
    const lib = libraryProgress(grades);
    const url = `https://apps.apple.com/app/id${APP_INFO.appStoreId}`;
    const message = lib.best > 0 ? `I've mastered ${lib.best} of ${lib.total} pro poker spots in FlipUp's Range training: ${url}` : `Real poker hands from pro breakdowns, in FlipUp's Range training: ${url}`;
    void Share.share({ message, url }).catch(() => undefined);
  };
  return (
    <>
      <Stack.Screen options={{ title: 'Training', headerShown: false }} />
      <TabScreen
        title="Training"
        contentStyle={{ gap: spacing.md }}
        accessory={
          <>
            <RoundButton icon="square.and.arrow.up" label="Share Range training" onPress={share} />
            <ProfileMenu />
          </>
        }
      >
        <PillTabs tabs={TABS} value={tab} onChange={setTab} action={<PlusButton label="Start a Set" onPress={() => startSet()} />} />
        {tab === 'practice' ? <PracticeList history={history} grades={grades} /> : <HistoryList history={history} />}
      </TabScreen>
    </>
  );
}
