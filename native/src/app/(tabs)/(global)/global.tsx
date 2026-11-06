import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { BoardRowView } from '@/components/board-row';
import { haptic } from '@/components/haptics';
import { openPlayerMenu } from '@/components/player-menu';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { RoundButton, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { BANKROLL, daysLeftInSeason, seasonName, seasonOf } from '@/engine';
import { fetchBoard, useBankroll, type BoardRow, type BoardView } from '@/state/bankroll';
import { isBlocked } from '@/state/blocks';
import { withFiller } from '@/state/board-filler';
import { isPal, myPalCode, sendFriendRequest } from '@/state/pals';
import { read, save } from '@/state/storage';
import { brand, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

const INTRO = 'flipup.bankrollintro';

/**
 * The Global tab, drawn like the other tabs: a large title on the app's own background, the season line, one card
 * with your chips, rank and peak and a Play button, then the board (World or Friends). The rules are the intro sheet
 * (opened the first time, and from the info button).
 */
export default function GlobalTab() {
  const colors = useColors();
  const shadows = useShadows();
  const { view, refresh } = useBankroll();
  const [scope, setScope] = useState<'world' | 'friends'>('world');
  const [board, setBoard] = useState<BoardView | null>(null);
  const [pulling, setPulling] = useState(false);
  const season = seasonOf(Date.now());

  const load = useCallback(async () => setBoard(await fetchBoard('bankroll').catch(() => null)), []);
  useFocusEffect(
    useCallback(() => {
      void load();
      void refresh();
      if (!read<boolean>(INTRO, false)) {
        save(INTRO, true);
        router.push('/bankroll-intro');
      }
    }, [load, refresh]),
  );

  const mine = myPalCode();
  const chips = view?.bankroll ?? BANKROLL.start;
  const real = (scope === 'world' ? (board?.top ?? []) : (board?.friends ?? [])).filter((r) => !isBlocked(`f:${r.code}`));
  const rows = (scope === 'world' ? withFiller(real) : withFiller(real, undefined, 'friends')).slice(0, 100);
  const open = (r: BoardRow) => {
    if (r.filler || r.code === mine) return;
    const extra = isPal(r.code)
      ? []
      : [
          {
            text: 'Add friend',
            onPress: () =>
              void sendFriendRequest(r.code, { name: r.username, emoji: r.emoji, username: r.username }).catch(() => undefined),
          },
        ];
    openPlayerMenu(
      { key: `f:${r.code}`, name: r.username, emoji: r.emoji, where: 'board', code: r.code, playerId: r.code },
      `${r.emoji} @${r.username}`,
      `${r.score.toLocaleString()} chips · peak ${r.peak.toLocaleString()}`,
      extra,
    );
  };
  const play = () => {
    haptic.tap();
    router.push('/bankroll');
  };
  const label = view?.status === 'busted' ? 'Busted · see options' : view?.status === 'cut' ? 'Cut · see why' : 'Play today’s hands';

  return (
    <>
      <Stack.Screen options={{ title: 'Global', headerShown: false }} />
      <TabScreen
        title="Global"
        accessory={<RoundButton icon="info.circle" label="How Bankroll works" onPress={() => router.push('/bankroll-intro')} />}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => {
              haptic.select();
              setPulling(true);
              void Promise.all([load(), refresh()]).finally(() => setPulling(false));
            }}
          />
        }
      >
        <View style={{ gap: spacing.xxs }}>
          <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase' }}>
            {seasonName(season)} season ends in {daysLeftInSeason(Date.now())} days
          </ThemedText>
          <ThemedText tone="secondaryLabel">
            Everyone starts the month with {BANKROLL.start.toLocaleString()} chips. Biggest stack at the end wins.
          </ThemedText>
        </View>

        <View
          style={{
            padding: spacing.md,
            gap: spacing.md,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.cell,
            boxShadow: shadows.card,
          }}
        >
          <View
            style={{ flexDirection: 'row' }}
            accessible
            accessibilityLabel={`Your bankroll ${chips.toLocaleString()} chips${board?.me?.pos ? `, number ${board.me.pos} in the world` : ''}${board?.me ? `, peak ${board.me.peak.toLocaleString()}` : ''}`}
          >
            <Stat label="Your chips" value={chips.toLocaleString()} />
            <Stat label="World rank" value={board?.me?.pos ? `#${board.me.pos.toLocaleString()}` : '–'} />
            <Stat label="Month's peak" value={(board?.me?.peak ?? chips).toLocaleString()} />
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={play}
            style={{
              minHeight: 50,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: brand.violet,
            }}
          >
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
              {label}
            </Text>
          </PressableScale>
          <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
            Up to {BANKROLL.handsADay} hands a day against bots. Every Sunday the bottom {Math.round(BANKROLL.cutShare * 100)}% are cut.
          </ThemedText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="title3" accessibilityRole="header">
            Biggest stacks
          </ThemedText>
          <SegmentedControl
            label="Who"
            options={[
              { value: 'world', label: 'World' },
              { value: 'friends', label: 'Friends' },
            ]}
            value={scope}
            onChange={(v) => setScope(v)}
          />
          <View
            style={{
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              overflow: 'hidden',
              backgroundColor: colors.cell,
              boxShadow: shadows.card,
            }}
          >
            <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
              {['POS', 'PLAYER', 'CHIPS'].map((h, i) => (
                <Text
                  key={h}
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: 1.2,
                    color: colors.tertiaryLabel as string,
                    width: i === 0 ? 46 : undefined,
                    flex: i === 1 ? 1 : undefined,
                  }}
                >
                  {h}
                </Text>
              ))}
            </View>
            {rows.length ? (
              rows.map((r, i) => (
                <View key={r.code} style={{ borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator as string }}>
                  <BoardRowView row={r} you={r.code === mine} onPress={() => open(r)} />
                </View>
              ))
            ) : (
              <ThemedText tone="secondaryLabel" style={{ textAlign: 'center', paddingVertical: spacing.xl }}>
                Nobody here yet.
              </ThemedText>
            )}
          </View>
        </View>
      </TabScreen>
    </>
  );
}

/** One of the three numbers in the card: a big number over a small label. */
function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontFamily: ROUNDED, fontSize: 26, lineHeight: 31, fontWeight: '800', color: colors.label, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.tertiaryLabel as string }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
