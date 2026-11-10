import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useStatsShare } from '@/components/home/share-card';
import { ProfileMenu } from '@/components/profile-menu';
import { StatsView } from '@/components/range/stats-view';
import { startSet } from '@/components/range/train-home';
import { PokerStats } from '@/components/stats/passport-cards';
import { PillTabs } from '@/components/tab-list';
import { RoundButton, TabScreen } from '@/components/tab-screen';
import { useRangeHistory } from '@/state/range-history';
import { useRangeGrades } from '@/state/ranges';
import { spacing } from '@/theme';

type Tab = 'poker' | 'training';
const TABS: { id: Tab; label: string }[] = [
  { id: 'poker', label: 'Poker' },
  { id: 'training', label: 'Training' },
];

/**
 * Stats, after Flighty's Passport: pill tabs for your poker and your Range training. Poker is the passport card and
 * the cards under it (what was Your stats on the profile); Training is Range training's dashboard.
 */
export default function StatsTab() {
  // A link can open Training (`/stats?tab=training`).
  const asked = useLocalSearchParams<{ tab?: string }>().tab;
  const [tab, setTab] = useState<Tab>(asked === 'training' ? 'training' : 'poker');
  // A new link while the tab is open switches to it (set during render, not in an effect).
  const [linked, setLinked] = useState(asked);
  if (asked !== linked) {
    setLinked(asked);
    if (asked === 'training' || asked === 'poker') setTab(asked);
  }
  const history = useRangeHistory();
  const grades = useRangeGrades();
  const { share, card } = useStatsShare();
  return (
    <>
      <Stack.Screen options={{ title: 'Stats', headerShown: false }} />
      <TabScreen
        title="Stats"
        contentStyle={{ gap: spacing.md }}
        accessory={
          <>
            <RoundButton icon="square.and.arrow.up" label="Share your stats" onPress={() => void share()} />
            <ProfileMenu />
          </>
        }
      >
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'poker' ? <PokerStats shareCard={card} onShare={() => void share()} /> : <StatsView history={history} grades={grades} onPractice={(focus) => startSet(focus)} />}
      </TabScreen>
    </>
  );
}
