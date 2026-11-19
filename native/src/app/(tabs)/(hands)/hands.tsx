import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { PassportCard } from '@/components/home/passport';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { SavedHandRow } from '@/components/saved-hand-row';
import { SegmentedControl } from '@/components/segmented-control';
import { Panel } from '@/components/stats/stat-parts';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { recordFor, usePokerRecord, type StatsMode } from '@/state/record';
import { useReplays, useStars } from '@/state/replays';
import { brand, ForceScheme, ROUNDED, spacing } from '@/theme';

/** How many saved hands the tab shows before See all. */
const SHOWN = 3;

/**
 * The Hands tab (owner, 19 Nov 2026): what you've played, in one place. Your poker as the passport card (All, Hold'em
 * or Mini games, with All stats under it, pushed onto this tab's stack), then your first few Saved hands, starred ones
 * first, with See all. Always dark on the moving blue field. Both halves say what will show up before there's anything.
 */
export default function HandsTab() {
  const all = usePokerRecord();
  const [mode, setMode] = useState<StatsMode>('all');
  const record = recordFor(all, mode);
  const replays = useReplays();
  const stars = useStars();
  const list = [...replays.filter((r) => stars.includes(r.id)), ...replays.filter((r) => !stars.includes(r.id))];
  const open = (path: string) => () => {
    haptic.tap();
    router.push(path as never);
  };
  return (
    <ForceScheme scheme="dark">
      {/* Always dark, so the clock and battery are white whatever the phone's own look. */}
      <Stack.Screen options={{ title: 'Hands', headerShown: false, statusBarStyle: 'light' }} />
      <View style={{ flex: 1 }}>
        <GrainBackground style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <TabScreen title="Hands" accessory={<ProfileMenu />}>
          <View style={{ gap: spacing.sm }}>
            <SegmentedControl
              label="Show stats for"
              value={mode}
              onChange={(m) => (haptic.select(), setMode(m))}
              options={[
                { value: 'all', label: 'All' },
                { value: 'holdem', label: "Hold'em" },
                { value: 'variants', label: 'Mini games' },
              ]}
            />
            {record.hands > 0 ? (
              <PassportCard record={record} scope={mode === 'holdem' ? "TEXAS HOLD'EM" : mode === 'variants' ? 'MINI GAMES' : 'ALL-TIME'} />
            ) : (
              <Empty icon="chart.bar.xaxis" title="No hands yet" line={mode === 'all' ? 'Play a hand at any table and your stats start here.' : mode === 'holdem' ? "Play a hand of Texas Hold'em and it counts here." : 'Play a hand of any mini game and it counts here.'} />
            )}
          </View>

          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xxs }}>
              <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
                Saved hands
              </ThemedText>
              {list.length > 0 && (
                <PressableScale accessibilityRole="button" accessibilityLabel={`See all ${list.length} saved hands`} onPress={open('/replays')} haptics={false} style={{ minHeight: 36, justifyContent: 'center', paddingLeft: spacing.md }}>
                  <ThemedText variant="headline" style={{ color: brand.violetDark }}>
                    See all
                  </ThemedText>
                </PressableScale>
              )}
            </View>
            {list.length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                {list.slice(0, SHOWN).map((r) => (
                  <SavedHandRow key={r.id} replay={r} starred={stars.includes(r.id)} onPress={() => (haptic.tap(), router.push({ pathname: '/replay/[id]', params: { id: r.id } }))} />
                ))}
              </View>
            ) : (
              <Empty icon="film.stack.fill" title="No saved hands yet" line="After a hand at any table, tap the bookmark in the table bar to keep it here and watch it back." />
            )}
          </View>
        </TabScreen>
      </View>
    </ForceScheme>
  );
}

/** What a half of the tab says before there's anything in it. */
function Empty({ icon, title, line }: { icon: 'chart.bar.xaxis' | 'film.stack.fill'; title: string; line: string }) {
  return (
    <Panel>
      <View style={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm }}>
        <Icon name={icon} size={26} color={brand.violetDark} />
        <ThemedText variant="headline" style={{ textAlign: 'center' }}>
          {title}
        </ThemedText>
        <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center' }}>
          {line}
        </ThemedText>
      </View>
    </Panel>
  );
}
