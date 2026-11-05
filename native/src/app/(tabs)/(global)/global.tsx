import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import Animated, { FadeOut } from 'react-native-reanimated';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoardRowView } from '@/components/board-row';
import { Globe } from '@/components/global/globe';
import { TypedText } from '@/components/global/typed-text';
import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { openPlayerMenu } from '@/components/player-menu';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { RoundButton } from '@/components/tab-screen';
import { BANKROLL, daysLeftInSeason, seasonName, seasonOf } from '@/engine';
import { fetchBoard, useBankroll, type BoardRow, type BoardView } from '@/state/bankroll';
import { isBlocked } from '@/state/blocks';
import { withFiller } from '@/state/board-filler';
import { isPal, myPalCode, sendFriendRequest } from '@/state/pals';
import { read, save } from '@/state/storage';
import { brand, ForceScheme, radius, ROUNDED, spacing } from '@/theme';

const INTRO = 'flipup.bankrollintro';
const dim = 'rgba(255,255,255,0.55)';

/**
 * The Global tab: its own page on the moving blue field, always dark. The season line and "Climb the boards." type
 * themselves in, a globe turns behind your bankroll, then World or Friends and the board, with your row pinned above
 * the tab bar. The rules are the intro sheet (opened the first time, and from the info button).
 */
export default function GlobalTab() {
  const insets = useSafeAreaInsets();
  const { view, refresh } = useBankroll();
  const [scope, setScope] = useState<'world' | 'friends'>('world');
  const [board, setBoard] = useState<BoardView | null>(null);
  const [pulling, setPulling] = useState(false);
  const season = seasonOf(Date.now());

  const load = useCallback(async () => setBoard(await fetchBoard('bankroll').catch(() => null)), []);
  // Opening the tab: the loading cover (a spinning globe, "Loading global stats") until the board is in, a second at least.
  const [loading, setLoading] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      const shown = Date.now();
      void load().finally(() => setTimeout(() => setLoading(false), Math.max(0, 1100 - (Date.now() - shown))));
      void refresh();
      if (!read<boolean>(INTRO, false)) {
        save(INTRO, true);
        router.push('/bankroll-intro');
      }
    }, [load, refresh]),
  );

  const mine = myPalCode();
  const real = (scope === 'world' ? (board?.top ?? []) : (board?.friends ?? [])).filter((r) => !isBlocked(`f:${r.code}`));
  const rows = (scope === 'world' ? withFiller(real) : withFiller(real, undefined, 'friends')).slice(0, 100);
  const open = (r: BoardRow) => {
    if (r.filler || r.code === mine) return;
    const extra = isPal(r.code) ? [] : [{ text: 'Add friend', onPress: () => void sendFriendRequest(r.code, { name: r.username, emoji: r.emoji, username: r.username }).catch(() => undefined) }];
    openPlayerMenu({ key: `f:${r.code}`, name: r.username, emoji: r.emoji, where: 'board', code: r.code, playerId: r.code }, `${r.emoji} @${r.username}`, `${r.score.toLocaleString()} chips · peak ${r.peak.toLocaleString()}`, extra);
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
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 180, gap: spacing.lg, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center' }}
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
              <TypedText text={`${seasonName(season)} season ends in ${daysLeftInSeason(Date.now())} days`.toUpperCase()} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.4, color: dim, fontVariant: ['tabular-nums'] }} />
              <TypedText text="Climb the boards." delay={500} speed={55} style={{ fontFamily: ROUNDED, fontSize: 34, fontWeight: '800', color: '#ffffff' }} />
            </View>
            <RoundButton icon="info.circle" label="How Bankroll works" onPress={() => router.push('/bankroll-intro')} />
          </View>

          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Globe size={200} />
            <PressableScale accessibilityRole="button" accessibilityLabel={`Your bankroll ${(view?.bankroll ?? BANKROLL.start).toLocaleString()} chips${board?.me?.pos ? `, number ${board.me.pos} in the world` : ''}. Play`} onPress={play} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.xxs, minHeight: 44, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
                {(view?.bankroll ?? BANKROLL.start).toLocaleString()} chips{board?.me?.pos ? ` · #${board.me.pos.toLocaleString()}` : ''}
              </Text>
              <View style={{ paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.full, justifyContent: 'center', backgroundColor: '#ffffff' }}>
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '800', color: brand.violetDeep }}>
                  {view?.status === 'busted' ? 'Busted' : view?.status === 'cut' ? 'Cut' : 'Play'}
                </Text>
              </View>
            </PressableScale>
          </View>

          <SegmentedControl label="Who" options={[{ value: 'world', label: 'World' }, { value: 'friends', label: 'Friends' }]} value={scope} onChange={(v) => setScope(v)} />

          <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
              {['POS', 'PLAYER', 'CHIPS'].map((h, i) => (
                <Text key={h} style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: dim, width: i === 0 ? 46 : undefined, flex: i === 1 ? 1 : undefined }}>
                  {h}
                </Text>
              ))}
            </View>
            {rows.length ? (
              rows.map((r, i) => (
                <View key={r.code} style={{ borderTopWidth: i ? 0.5 : 0, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                  <BoardRowView row={r} you={r.code === mine} onPress={() => open(r)} />
                </View>
              ))
            ) : (
              <Text style={{ color: dim, textAlign: 'center', paddingVertical: spacing.xl }}>Nobody here yet.</Text>
            )}
          </View>
        </ScrollView>

        {/* Your row, pinned above the tab bar. */}
        <PressableScale accessibilityRole="button" onPress={play} style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: insets.bottom + 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: brand.violet, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: brand.violetDeep, fontVariant: ['tabular-nums'] }}>{board?.me?.pos ?? '–'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: '#ffffff' }}>
              You{board?.me ? ` · @${board.me.username}` : ''}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
              {board?.me ? `Peak ${board.me.peak.toLocaleString()}` : 'Not on this board yet'}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>{(board?.me?.score ?? 0).toLocaleString()}</Text>
        </PressableScale>
        {loading && (
          <Animated.View exiting={FadeOut.duration(250)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: '#070f2a' }}>
            <Globe size={150} turnMs={6000} />
            <TypedText text="Loading global stats" speed={45} style={{ fontSize: 15, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.8)' }} />
          </Animated.View>
        )}
      </GrainBackground>
    </ForceScheme>
  );
}
