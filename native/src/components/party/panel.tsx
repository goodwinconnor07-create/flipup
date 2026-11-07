import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Text, View } from 'react-native';

import { PARTY_BREAK_SECONDS, partyStandings, variantInfo, type PartyView, type Variant } from '@/engine';
import { partyLink } from '@/state/api';
import { readParty, skipBreak, startParty, leaveParty } from '@/state/party';
import { useProfile } from '@/state/profile';
import { joinOnlineTable, leaveTable, useTable } from '@/state/session';
import { spacing, usePlainColors } from '@/theme';

import { Button } from '../button';
import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { InviteTicket } from '../invite-ticket';
import { ThemedText } from '../themed-text';
import { PartyBoard } from './board';

/**
 * Where the panel is shown, which decides how it follows the party to each round's table:
 * - `screen`: the party screen in the Party tab. When a round starts it seats you and opens the table.
 * - `table`: a party table's finish screen. The next round's table replaces this one in place.
 * - `sheet`: the standings sheet from the table's round pill. It only shows.
 */
export type PanelPlace = 'screen' | 'table' | 'sheet';

/** Tables this phone has already been sent to. Leaving one by hand doesn't send you straight back into it. */
const followed = new Set<string>();

/** Polls the party while it's on screen: every 2s while a round is on, 3.5s otherwise, never in the background. */
function usePartyView(code: string, onGone: () => void, active: boolean) {
  const [view, setView] = useState<PartyView | null>(null);
  const gone = useRef(onGone);
  useEffect(() => {
    gone.current = onGone;
  });
  useEffect(() => {
    if (!active) return;
    let live = true;
    let busy = false;
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (!live || busy) return;
      busy = true;
      let wait = 3000;
      try {
        const v = await readParty(code);
        if (!live) return;
        if (!v) return gone.current();
        setView(v);
        finished = v.status === 'done';
        wait = v.status === 'playing' ? 2000 : 3500;
      } catch {
        // Offline for a moment: try again.
      } finally {
        busy = false;
      }
      // Nothing changes once the party is over, and an app in the background doesn't need to ask.
      if (live && !finished && AppState.currentState === 'active') timer = setTimeout(poll, wait);
    };
    void poll();
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' || finished) return;
      clearTimeout(timer);
      void poll();
    });
    return () => {
      live = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, [code, active]);
  return [view, setView] as const;
}

/** Counts down to a time, in whole seconds. */
function useCountdown(at: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === null) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [at]);
  return at === null ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

/** When a round is on, everyone in the party goes to its table (the web's useFollowTable). */
function useFollowTable(view: PartyView | null, place: PanelPlace, focused: boolean) {
  const at = useTable().code;
  const profile = useProfile();
  const table = view?.status === 'playing' && view.you ? view.table : null;
  useEffect(() => {
    if (!table || place === 'sheet' || at === table) return;
    if (place === 'screen' && (!focused || followed.has(table))) return;
    followed.add(table);
    joinOnlineTable(table, profile.name, profile.emoji);
    if (place === 'screen') router.push('/table');
  }, [table, at, place, focused]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The party itself: the lobby, the live leaderboard, the break between games and the podium. */
export function PartyPanel({ code, onGone, place }: { code: string; onGone: () => void; place: PanelPlace }) {
  const focused = useIsFocused();
  const [view, setView] = usePartyView(code, onGone, place !== 'screen' || focused);
  useFollowTable(view, place, focused);
  const seconds = useCountdown(view?.status === 'between' ? view.nextAt : null);
  const profile = useProfile();
  const atTable = useTable().code;
  const [busy, setBusy] = useState(false);

  if (!view) {
    return (
      <View style={{ paddingVertical: spacing.xxxl, alignItems: 'center', gap: spacing.sm }}>
        <ActivityIndicator />
        <ThemedText tone="tertiaryLabel">Finding your party…</ThemedText>
      </View>
    );
  }
  const host = view.you === view.hostId;
  const total = view.settings.games.length;
  const next = view.settings.games[view.round + 1];
  const current = view.settings.games[view.round];
  const rows = partyStandings(view);
  const act = async (run: () => Promise<PartyView>) => {
    if (busy) return;
    setBusy(true);
    try {
      setView(await run());
      haptic.success();
    } catch (e) {
      haptic.failure();
      Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  const goToTable = () => {
    const table = view.table;
    if (!table) return;
    if (place === 'sheet') return router.back();
    followed.add(table);
    if (atTable !== table) joinOnlineTable(table, profile.name, profile.emoji);
    if (place === 'screen') router.push('/table');
  };
  const home = () => {
    haptic.success();
    void leaveParty(view.code);
    if (atTable) leaveTable();
    if (place !== 'screen' && router.canDismiss()) router.dismissAll();
    router.navigate('/');
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {view.status === 'lobby' && (
        <>
          <View style={{ gap: spacing.xxs }}>
            <ThemedText variant="largeTitle" accessibilityRole="header">
              {host ? 'Invite your friends' : "You're in!"}
            </ThemedText>
            <ThemedText tone="tertiaryLabel">{host ? `${total} games. Start when everyone's here.` : `Waiting for the host to start. ${total} games to play.`}</ThemedText>
          </View>
          <InviteTicket code={view.code} link={partyLink(view.code)} kind="party" message={`Join my FlipUp party. Code ${view.code}: ${partyLink(view.code)}`} />
          <PlaylistChips games={view.settings.games} round={-1} />
          <SectionTitle text={`In the party · ${view.members.length}`} />
          <PartyBoard rows={rows} you={view.you} running={false} code={code} />
          {host && <Button variant="party" tint="green" size="lg" title="Start the party" loading={busy} onPress={() => void act(() => startParty(view.code))} />}
        </>
      )}

      {view.status === 'playing' && (
        <>
          <GameHeader eyebrow={`Game ${view.round + 1} of ${total}`} variant={current} line="Standings update after every hand." />
          <PartyBoard rows={rows} you={view.you} running={!!view.live} code={code} />
          {view.table && view.you && <Button variant="party" tint="blue" size="lg" title={place === 'sheet' ? 'Back to the table' : 'Go to the table'} onPress={goToTable} />}
        </>
      )}

      {view.status === 'between' && (
        <>
          <GameHeader eyebrow={`Up next · game ${view.round + 2} of ${total}`} variant={next} line={`Game ${view.round + 1} is done. The next one starts in ${seconds ?? PARTY_BREAK_SECONDS}s.`} />
          <PartyBoard rows={rows} you={view.you} running={false} code={code} />
          {host && <Button variant="party" tint="blue" size="lg" title="Start next game now" loading={busy} onPress={() => void act(() => skipBreak(view.code))} />}
        </>
      )}

      {view.status === 'done' && (
        <>
          <View style={{ alignItems: 'center', gap: spacing.xxs }}>
            <Text maxFontSizeMultiplier={1} style={{ fontSize: 56, lineHeight: 68 }} accessible={false}>
              🏆
            </Text>
            <ThemedText variant="largeTitle" accessibilityRole="header" style={{ textAlign: 'center' }}>
              {rows[0]?.id === view.you ? 'You won the party!' : `${rows[0]?.name ?? 'Nobody'} won the party`}
            </ThemedText>
            <ThemedText tone="tertiaryLabel">After {total} games.</ThemedText>
          </View>
          <PartyBoard rows={rows} you={view.you} running={false} code={code} />
          <PlaylistChips games={view.settings.games} round={total} />
          <Button variant="party" tint="blue" size="lg" title="Back to the Party tab" onPress={home} />
        </>
      )}
      {place === 'screen' && view.status !== 'done' && view.status !== 'lobby' && (
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }}>
          Party code {view.code}
        </ThemedText>
      )}
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <ThemedText variant="footnote" tone="tertiaryLabel" accessibilityRole="header" style={{ textTransform: 'uppercase', paddingHorizontal: spacing.md, marginBottom: -spacing.sm }}>
      {text}
    </ThemedText>
  );
}

function GameHeader({ eyebrow, variant, line }: { eyebrow: string; variant: Variant | undefined; line: string }) {
  const info = variant ? variantInfo(variant) : null;
  return (
    <View style={{ gap: spacing.xxs }}>
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase', fontWeight: '600' }}>
        {eyebrow}
      </ThemedText>
      {info && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GameThumb variant={info.id} size={44} />
          <ThemedText variant="largeTitle" accessibilityRole="header" style={{ flex: 1 }}>
            {info.name}
          </ThemedText>
        </View>
      )}
      <ThemedText tone="tertiaryLabel">{line}</ThemedText>
    </View>
  );
}

/** The playlist as a row of emoji: done (full), the one on now (ringed in blue) and the ones to come (faded). */
function PlaylistChips({ games, round }: { games: readonly Variant[]; round: number }) {
  const c = usePlainColors();
  return (
    <View accessible accessibilityLabel={`Games in this party: ${games.map((g) => variantInfo(g).name).join(', ')}`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {games.map((g, i) => {
        const done = i < round;
        const now = i === round;
        return (
          <View
            key={i}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: now ? c.blueBg : c.cell,
              borderWidth: 2,
              borderColor: now ? c.accent : 'transparent',
              opacity: done || now ? 1 : 0.5,
            }}
          >
            <Text maxFontSizeMultiplier={1} style={{ fontSize: 18 }}>
              {variantInfo(g).emoji}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
