import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoardRowView } from '@/components/board-row';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { LivingCard } from '@/components/living-card';
import { openPlayerMenu } from '@/components/player-menu';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { SegmentedControl } from '@/components/segmented-control';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { BANKROLL, daysLeftInSeason, daysToNextCut, previousSeason, seasonName, seasonOf } from '@/engine';
import { fetchBoard, useBankroll, type BankrollView, type BoardRow, type BoardView } from '@/state/bankroll';
import { isBlocked } from '@/state/blocks';
import { withFiller } from '@/state/board-filler';
import { isPal, myPalCode, sendFriendRequest } from '@/state/pals';
import { dailyToday, useRangePlay } from '@/state/ranges';
import { radius, ROUNDED, spacing, useColors, useShadows, cardColors } from '@/theme';

type Board = 'bankroll' | 'daily';
type Scope = 'world' | 'friends';

/**
 * The Global tab: this month's Bankroll as a big card, today's three, then the boards (Bankroll or Today; World or
 * Friends) as one grouped list, and your own row pinned above the tab bar. Everything is the server's.
 */
export default function GlobalTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { view, refresh } = useBankroll();
  const [board, setBoard] = useState<Board>('bankroll');
  const [scope, setScope] = useState<Scope>('world');
  const [data, setData] = useState<Partial<Record<Board, BoardView>>>({});
  const [last, setLast] = useState<BoardRow[]>([]);
  const [pulling, setPulling] = useState(false);
  const now = Date.now();
  const season = seasonOf(now);

  const load = useCallback(async () => {
    const [b, d] = await Promise.all([fetchBoard('bankroll').catch(() => null), fetchBoard('daily').catch(() => null)]);
    setData({ ...(b ? { bankroll: b } : {}), ...(d ? { daily: d } : {}) });
    // The first few days of a season, last month's top three stay up as a small podium.
    if (new Date().getUTCDate() <= 5) setLast((await fetchBoard(`bankroll:${previousSeason(season)}`).catch(() => null))?.top.slice(0, 3) ?? []);
  }, [season]);
  useFocusEffect(
    useCallback(() => {
      void load();
      void refresh();
    }, [load, refresh]),
  );

  const shown = data[board];
  const mine = myPalCode();
  const real = (scope === 'world' ? (shown?.top ?? []) : (shown?.friends ?? [])).filter((r) => !isBlocked(`f:${r.code}`));
  const rows = (scope === 'world' ? withFiller(real) : real).slice(0, 100);
  const me = shown?.me ?? null;

  const open = (r: BoardRow) => {
    if (r.filler || r.code === mine) return;
    const extra = isPal(r.code) ? [] : [{ text: 'Add friend', onPress: () => void sendFriendRequest(r.code, { name: r.username, emoji: r.emoji, username: r.username }).catch(() => undefined) }];
    openPlayerMenu({ key: `f:${r.code}`, name: r.username, emoji: r.emoji, where: 'board', code: r.code, playerId: r.code }, `${r.emoji} @${r.username}`, `Bankroll ${r.score.toLocaleString()} · peak ${r.peak.toLocaleString()}`, extra);
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Global', headerShown: false }} />
      <TabScreen
        title="Global"
        accessory={<ProfileMenu />}
        contentStyle={{ paddingBottom: 140 }}
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
        <View style={{ gap: spacing.xxs, marginTop: -spacing.md }}>
          <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '700', letterSpacing: 1 }}>
            {`${seasonName(season)} season ends in ${daysLeftInSeason(now)} days`.toUpperCase()}
          </ThemedText>
          <ThemedText variant="title2">Climb the boards.</ThemedText>
        </View>

        <BankrollCard view={view} />

        {last.length > 0 && <Podium rows={last} month={seasonName(previousSeason(season))} />}

        <TodayRow />

        <View style={{ gap: spacing.sm }}>
          <SegmentedControl label="Board" options={[{ value: 'bankroll', label: 'Bankroll' }, { value: 'daily', label: 'Today' }]} value={board} onChange={(v) => setBoard(v)} />
          <SegmentedControl label="Who" options={[{ value: 'world', label: 'World' }, { value: 'friends', label: 'Friends' }]} value={scope} onChange={(v) => setScope(v)} />
          <BoardList rows={rows} mine={mine} daily={board === 'daily'} onPress={open} />
        </View>
      </TabScreen>
      {/* Your row, pinned over the list above the tab bar. */}
      <View style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: insets.bottom + 64 }}>
        <Pinned row={me} daily={board === 'daily'} colors={colors} />
      </View>
    </View>
  );
}

/** This month's Bankroll: your bankroll, place, hands left, who's still alive, the next cut, and Play. */
function BankrollCard({ view }: { view: BankrollView | null }) {
  const now = Date.now();
  const left = view ? Math.max(0, BANKROLL.handsADay - view.handsToday) : BANKROLL.handsADay;
  const cut = daysToNextCut(now);
  const play = () => {
    haptic.tap();
    router.push('/bankroll');
  };
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="Bankroll. Open" onPress={play}>
      <LivingCard colors={cardColors.night} style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255,255,255,0.7)' }}>
          {`BANKROLL · ${seasonName(seasonOf(now)).toUpperCase()}`}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 44, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
          {(view?.bankroll ?? BANKROLL.start).toLocaleString()}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>
          {view?.status === 'busted' ? 'Busted' : view?.status === 'cut' ? `Cut in week ${view.cutWeek ?? ''}` : view?.rank ? `#${view.rank.toLocaleString()} · ` : ''}
          {view?.status === 'alive' || !view ? `${left} of ${BANKROLL.handsADay} hands left today` : ''}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)' }}>
          {view ? `${view.alive.toLocaleString()} of ${view.players.toLocaleString()} still alive` : '1,000 chips. One month. Don’t go broke.'}
          {cut ? ` · next cut in ${cut} ${cut === 1 ? 'day' : 'days'}` : ''}
        </Text>
        <View style={{ alignSelf: 'flex-start', marginTop: spacing.xs, paddingHorizontal: spacing.lg, minHeight: 40, borderRadius: radius.full, justifyContent: 'center', backgroundColor: '#ffffff' }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '700', color: cardColors.night[2] }}>
            Play
          </Text>
        </View>
      </LivingCard>
    </PressableScale>
  );
}

/** Today's three from Range training: your score once played, and Play. */
function TodayRow() {
  const play = useRangePlay();
  const today = dailyToday(play);
  const points = today.grades.reduce((s, g) => s + (g === 'best' ? 100 : g === 'ok' ? 60 : 0), 0);
  return (
    <Section header="Today’s challenge">
      <Row
        title="Today’s three"
        subtitle={today.done ? 'Done. Back tomorrow' : 'The same three hands for everyone'}
        detail={today.grades.length ? `${points} pts` : 'Play'}
        icon={{ symbol: 'calendar', color: cardColors.gold[1] }}
        onPress={() => router.push({ pathname: '/ranges', params: { mode: 'daily' } })}
      />
    </Section>
  );
}

/** Last season's top three, for the first few days of a new one. */
function Podium({ rows, month }: { rows: BoardRow[]; month: string }) {
  return (
    <Section header={`Last season · ${month}`}>
      {rows.map((r) => (
        <BoardRowView key={r.code} row={r} />
      ))}
    </Section>
  );
}

/** The board as one grouped list. */
function BoardList({ rows, mine, daily, onPress }: { rows: BoardRow[]; mine?: string; daily: boolean; onPress: (r: BoardRow) => void }) {
  const colors = useColors();
  const shadows = useShadows();
  if (!rows.length)
    return (
      <ThemedText tone="secondaryLabel" style={{ textAlign: 'center', paddingVertical: spacing.xl }}>
        Nobody on this board yet.
      </ThemedText>
    );
  return (
    <View style={{ borderRadius: radius.lg, boxShadow: shadows.card }}>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
        {rows.map((r) => (
          <BoardRowView key={r.code} row={r} you={r.code === mine} daily={daily} onPress={() => onPress(r)} />
        ))}
      </View>
    </View>
  );
}

/** Your row, or how to get on the board. */
function Pinned({ row, daily, colors }: { row: BoardRow | null; daily: boolean; colors: ReturnType<typeof useColors> }) {
  const shadows = useShadows();
  return (
    <View style={{ borderRadius: radius.lg, boxShadow: shadows.card }}>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
        {row ? (
          <BoardRowView row={row} you daily={daily} />
        ) : (
          <PressableScale accessibilityRole="button" onPress={() => router.push(daily ? { pathname: '/ranges', params: { mode: 'daily' } } : '/bankroll')} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: spacing.md }}>
            <ThemedText tone="secondaryLabel" style={{ flex: 1 }}>
              Not on this board yet
            </ThemedText>
            <ThemedText tone="accent" style={{ fontWeight: '700' }}>
              Play
            </ThemedText>
          </PressableScale>
        )}
      </View>
    </View>
  );
}
