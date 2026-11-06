import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import Animated, { FadeOut } from 'react-native-reanimated';
import { RefreshControl, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoardRowView } from '@/components/board-row';
import { Globe } from '@/components/global/globe';
import { cutLine, playButton, tickerLines } from '@/components/global/standing';
import { Ticker } from '@/components/global/ticker';
import { TypedText } from '@/components/global/typed-text';
import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { openPlayerMenu } from '@/components/player-menu';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { RoundButton } from '@/components/tab-screen';
import { BANKROLL } from '@/engine';
import { fetchBoard, useBankroll, type BoardRow, type BoardView } from '@/state/bankroll';
import { isBlocked } from '@/state/blocks';
import { withFiller } from '@/state/board-filler';
import { isPal, myPalCode, sendFriendRequest } from '@/state/pals';
import { read, save } from '@/state/storage';
import { brand, ForceScheme, radius, ROUNDED, spacing } from '@/theme';

const INTRO = 'flipup.bankrollintro';
const dim = 'rgba(255,255,255,0.55)';
/** The board from the last load this launch: once there is one, opening the tab shows it at once, with no cover. */
let lastBoard: BoardView | null = null;

/** Room the pinned row and the tab bar take at the bottom of the screen. */
const PINNED = 64 + 76;

/**
 * The Global tab: its own page on the moving blue field, always dark. A one-line ticker (the season, the next cut,
 * today's hands, the leader, how many are still in), "Climb the boards." and what it means, a small turning globe, then
 * your numbers in one pill with Play and where you stand against the next cut, World or Friends and the board. Your
 * row is pinned above the tab bar only while it's out of sight. The rules are the intro sheet (opened the first time,
 * and from the info button).
 */
export default function GlobalTab() {
  const insets = useSafeAreaInsets();
  const { view, refresh } = useBankroll();
  const [scope, setScope] = useState<'world' | 'friends'>('world');
  const [board, setBoard] = useState<BoardView | null>(lastBoard);
  const [pulling, setPulling] = useState(false);
  const now = Date.now();

  const load = useCallback(async () => {
    const next = await fetchBoard('bankroll').catch(() => null);
    if (next) lastBoard = next;
    setBoard(next ?? lastBoard);
  }, []);
  // The loading cover (a spinning globe, "Loading global stats") only plays the first time the board has to load in a
  // launch. After that the tab opens on the board it already has and refreshes it underneath.
  const [loading, setLoading] = useState(lastBoard === null);
  useFocusEffect(
    useCallback(() => {
      const first = lastBoard === null;
      const shown = Date.now();
      void load().finally(() => {
        if (first) setTimeout(() => setLoading(false), Math.max(0, 1100 - (Date.now() - shown)));
      });
      void refresh();
      if (!read<boolean>(INTRO, false)) {
        save(INTRO, true);
        router.push('/bankroll-intro');
      }
    }, [load, refresh]),
  );

  const mine = myPalCode();

  // Your row on the board: where it sits, so the pinned copy shows only while the real one is out of sight.
  const spot = useRef({ board: 0, row: -1, rowH: 0, page: 0, y: 0 });
  const [rowSeen, setRowSeen] = useState(false);
  const check = () => {
    const { board: top, row, rowH, page, y } = spot.current;
    const seen = row >= 0 && page > 0 && top + row >= y && top + row + rowH <= y + page - (insets.bottom + PINNED);
    setRowSeen((was) => (was === seen ? was : seen));
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    spot.current.y = e.nativeEvent.contentOffset.y;
    check();
  };
  const real = (scope === 'world' ? (board?.top ?? []) : (board?.friends ?? [])).filter((r) => !isBlocked(`f:${r.code}`));
  const rows = (scope === 'world' ? withFiller(real) : withFiller(real, undefined, 'friends')).slice(0, 100);
  const alone = rows.every((r) => r.code === mine);
  const mineInList = rows.some((r) => r.code === mine);
  const cut = cutLine(now, view);
  const chips = view?.bankroll ?? BANKROLL.start;
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

  return (
    <ForceScheme scheme="dark">
      <Stack.Screen options={{ title: 'Global', headerShown: false }} />
      <GrainBackground>
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={32}
          onLayout={(e) => {
            spot.current.page = e.nativeEvent.layout.height;
            check();
          }}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            paddingTop: insets.top + spacing.md,
            paddingHorizontal: spacing.md,
            paddingBottom: insets.bottom + 180,
            gap: spacing.lg,
            width: '100%',
            maxWidth: 560 + spacing.md * 2,
            alignSelf: 'center',
          }}
          refreshControl={
            <RefreshControl
              tintColor="#ffffff"
              refreshing={pulling}
              onRefresh={() => {
                haptic.select();
                setPulling(true);
                void Promise.all([load(), refresh()]).finally(() => setPulling(false));
              }}
            />
          }
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Ticker
                lines={tickerLines(now, view, board, mine)}
                style={{ fontSize: 13, lineHeight: 18, fontWeight: '800', letterSpacing: 1.4, color: dim, fontVariant: ['tabular-nums'] }}
              />
              <TypedText
                text="Climb the boards."
                delay={300}
                speed={55}
                style={{ fontFamily: ROUNDED, fontSize: 34, fontWeight: '800', color: '#ffffff' }}
              />
            </View>
            <RoundButton icon="info.circle" label="How Bankroll works" onPress={() => router.push('/bankroll-intro')} />
          </View>
          <Text
            maxFontSizeMultiplier={1.3}
            style={{ marginTop: -spacing.sm, fontSize: 16, lineHeight: 21, color: 'rgba(255,255,255,0.72)' }}
          >
            {BANKROLL.start.toLocaleString()} chips each month. Biggest stack wins.
          </Text>

          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Globe size={120} />
            <Text
              maxFontSizeMultiplier={1.3}
              accessibilityLabel={`Your bankroll ${chips.toLocaleString()} chips${board?.me?.pos ? `, number ${board.me.pos} in the world` : ''}`}
              style={{ fontSize: 15, color: dim, fontVariant: ['tabular-nums'] }}
            >
              <Text style={{ fontFamily: ROUNDED, fontSize: 28, fontWeight: '800', color: '#ffffff' }}>{chips.toLocaleString()}</Text> chips
              {board?.me?.pos ? ` · #${board.me.pos.toLocaleString()} in the world` : ''}
            </Text>
            <PlayButton {...playButton(view)} onPress={play} />
            {cut && (
              <Text
                maxFontSizeMultiplier={1.3}
                style={{ fontSize: 13, fontWeight: '600', color: cut.warn ? brand.gold : dim, textAlign: 'center' }}
              >
                {cut.text}
              </Text>
            )}
          </View>

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
            onLayout={(e) => {
              spot.current.board = e.nativeEvent.layout.y;
              check();
            }}
            style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
              {['POS', 'PLAYER', 'CHIPS'].map((h, i) => (
                <Text
                  key={h}
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: 1.2,
                    color: dim,
                    width: i === 0 ? 46 : undefined,
                    flex: i === 1 ? 1 : undefined,
                  }}
                >
                  {h}
                </Text>
              ))}
            </View>
            {rows.length
              ? rows.map((r, i) => (
                  <View
                    key={r.code}
                    onLayout={
                      r.code === mine
                        ? (e) => {
                            spot.current.row = e.nativeEvent.layout.y;
                            spot.current.rowH = e.nativeEvent.layout.height;
                            check();
                          }
                        : undefined
                    }
                    style={{ borderTopWidth: i ? 0.5 : 0, borderTopColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <BoardRowView row={r} you={r.code === mine} onPress={() => open(r)} />
                  </View>
                ))
              : null}
            {alone && (
              <View
                style={{
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.lg,
                  paddingHorizontal: spacing.md,
                  borderTopWidth: rows.length ? 0.5 : 0,
                  borderTopColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, color: dim, textAlign: 'center' }}>
                  {scope === 'world' ? 'You’re the first one here this month.' : 'None of your friends are playing yet.'}
                </Text>
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => {
                    haptic.tap();
                    router.push('/add-friend');
                  }}
                  style={{
                    paddingHorizontal: spacing.md,
                    minHeight: 36,
                    borderRadius: radius.full,
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                    Invite friends
                  </Text>
                </PressableScale>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Your row, pinned above the tab bar while the real one is out of sight (or off the top 100). */}
        {board?.me && (!mineInList || !rowSeen) && (
          <PressableScale
            accessibilityRole="button"
            onPress={play}
            style={{
              position: 'absolute',
              left: spacing.md,
              right: spacing.md,
              bottom: insets.bottom + 64,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              backgroundColor: brand.violet,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: brand.violetDeep, fontVariant: ['tabular-nums'] }}>
                {board?.me?.pos ?? '–'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: '#ffffff' }}>
                You{board?.me ? ` · @${board.me.username}` : ''}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                {board?.me ? `Peak ${board.me.peak.toLocaleString()}` : 'Not on this board yet'}
              </Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
              {(board?.me?.score ?? 0).toLocaleString()}
            </Text>
          </PressableScale>
        )}
        {loading && (
          <Animated.View
            exiting={FadeOut.duration(250)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.lg,
              backgroundColor: '#070f2a',
            }}
          >
            <Globe size={150} turnMs={6000} />
            <TypedText
              text="Loading global stats"
              speed={45}
              style={{ fontSize: 15, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.8)' }}
            />
          </Animated.View>
        )}
      </GrainBackground>
    </ForceScheme>
  );
}

/**
 * The page's one main action, drawn like Open table on Play with friends: full width, solid light with blue ink and
 * a soft shadow, the brightest thing on the night page. Quieter (see-through, white ink) when there's nothing
 * to play right now, though it still opens the sheet that says why.
 */
function PlayButton({ title, line, ready, onPress }: { title: string; line: string; ready: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={onPress}
      outerStyle={{ alignSelf: 'stretch' }}
      style={{
        borderRadius: radius.md,
        borderCurve: 'continuous',
        boxShadow: ready ? '0 8px 24px rgba(0,0,0,0.28)' : undefined,
      }}
    >
      <View
        style={{
          minHeight: 60,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.xs,
          backgroundColor: ready ? brand.paper : 'rgba(255,255,255,0.1)',
        }}
      >
        <Text
          maxFontSizeMultiplier={1.3}
          style={{ fontFamily: ROUNDED, fontSize: 21, lineHeight: 25, fontWeight: '800', color: ready ? brand.violet : '#ffffff' }}
        >
          {title}
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={{ fontSize: 13, lineHeight: 17, fontWeight: '600', color: ready ? brand.violetDeep : dim, fontVariant: ['tabular-nums'] }}
        >
          {line}
        </Text>
      </View>
    </PressableScale>
  );
}
