import { router, type ErrorBoundaryProps } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CrashScreen } from '@/components/crash-screen';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ActionArea, RaisePanel, type PreAction } from '@/components/table/actions';
import { ChallengeEnded, ChallengeStrip, useChallengeSheets } from '@/components/table/challenge';
import { Confetti } from '@/components/table/confetti';
import { ConnectionLost, useOfflineFor } from '@/components/table/connection-lost';
import { PartyPanel } from '@/components/party/panel';
import { Ended } from '@/components/table/ended';
import { FeltOval, useHighlight } from '@/components/table/felt';
import { Lobby } from '@/components/table/lobby';
import { MyArea } from '@/components/table/my-area';
import { othersInOrder, SeatRow, usePodSlots } from '@/components/table/seats';
import { playSound } from '@/components/table/sounds';
import { useTableNow } from '@/components/table/use-now';
import { useReactions } from '@/components/table/use-reactions';
import { useTableSounds } from '@/components/table/use-table-sounds';
import { Discard, Discuss, SuspectBar, Tally, Vote } from '@/components/table/variant-steps';
import { ThemedText } from '@/components/themed-text';
import { DiceRoll } from '@/components/table/dice-roll';
import { WildDeuces } from '@/components/table/playing-card';
import { challengeById, myPlayer, runoutOdds, options, seatFor, showsOdds, variantInfo, variantOf, type Card, type Game, type Hand, type Variant } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { tableShare } from '@/state/table-share';
import { read, save } from '@/state/storage';
import { forgetParty } from '@/state/party';
import { leaveTable, dispatch, me as myDevice, retryConnection, useTable } from '@/state/session';
import { EASE_OUT, exitMs } from '@/motion/presets';
import { gradient, motion, radius, spacing, useColors, usePlainColors } from '@/theme';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * The table hit an error while drawing: Try again redraws it (a bots-only table's clock keeps going underneath), and
 * Leave the table puts it away and goes Home, so a broken table can't keep failing.
 */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <CrashScreen
      {...props}
      title="The table hit a snag"
      line="Sorry about that. Try again, or leave this table and start a new one."
      leaveTitle="Leave the table"
      onLeave={leaveTable}
    />
  );
}

/**
 * The table, laid out as on the web: the bar (menu, blinds, hand number), the other players along the top, the
 * felt with the pot and board, whose turn it is and your buttons, then your cards and your box at the bottom.
 */
export default function TableScreen() {
  const t = useTable();
  const game = t.game;
  const online = t.mode === 'online';
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const leave = () => {
    leaveTable();
    router.dismissTo('/');
  };
  // A connection down for 20 seconds is said in words, with Try again and Leave (see connection-lost.tsx).
  // Every automatic retry passes through 'connecting', so that counts as down too or the 20 seconds would restart each time.
  const down = online && (t.conn === 'offline' || t.conn === 'connecting');
  const lost = useOfflineFor(down);
  // A challenge's own sheets (Detective's check, Rewind's result) open by themselves when they're due.
  useChallengeSheets(t.challenge);
  // Before the first deal the lobby is the whole screen, on the same grain page as Play with friends.
  if (game?.status === 'lobby') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Lobby game={game} online={online} conn={t.conn} />
        {t.notice && <Notice key={t.notice.id} notice={t.notice} />}
      </View>
    );
  }
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.sm) }}
    >
      <TableBar game={game} online={online} code={t.code} />
      {game && <BlindNews game={game} />}
      {game && t.challenge && <ChallengeStrip game={game} view={t.challenge} />}
      {down && (game && lost ? <ConnectionLost variant="card" onRetry={retryConnection} onLeave={leave} /> : t.conn === 'offline' && !lost ? <Pill text="Reconnecting…" /> : null)}
      {game && <EmptyTablePopup game={game} onLeave={leave} />}
      {t.notice && <Notice key={t.notice.id} notice={t.notice} />}
      {!game && lost ? (
        <ConnectionLost variant="page" onRetry={retryConnection} onLeave={leave} />
      ) : !game ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          {t.mode ? <ActivityIndicator /> : null}
          <ThemedText tone="tertiaryLabel">
            {!t.mode ? (t.notice?.text ?? 'No table open.') : t.conn === 'offline' ? 'No connection. Trying again…' : 'Finding your table…'}
          </ThemedText>
          <Button title="Back to Home" onPress={leave} />
          {!t.mode && (
            <Button
              title="Join another table"
              variant="secondary"
              onPress={() => {
                router.dismissTo('/');
                router.push('/join');
              }}
            />
          )}
        </View>
      ) : (
        <>
          {game.status === 'playing' && <Playing game={game} sending={t.sending} />}
          {game.status === 'ended' && (game.party ? <PartyEnded code={game.party.code} onLeave={leave} /> : game.challenge ? <ChallengeEnded game={game} onLeave={leave} /> : <Ended game={game} onLeave={leave} />)}
        </>
      )}
      {/* Die on the River's roll covers the whole screen, the bar and the notch included. */}
      {game?.status === 'playing' && <DiceRoll game={game} />}
    </View>
  );
}

/** A party table's finish screen is the party's leaderboard, which follows the party to the next round's table. */
function PartyEnded({ code, onLeave }: { code: string; onLeave: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }}>
      <PartyPanel
        code={code}
        place="table"
        onGone={() => {
          forgetParty();
          onLeave();
        }}
      />
    </ScrollView>
  );
}

/** A small status capsule under the bar. */
function Pill({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={{
        alignSelf: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
        backgroundColor: colors.cellPressed,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.label }}>{text}</Text>
    </View>
  );
}

/** A refused move or a lost table, for four seconds, with the failure haptic. */
function Notice({ notice }: { notice: { id: number; text: string } }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    haptic.failure();
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [notice.id]);
  if (!visible) return null;
  return (
    <Animated.View
      key={notice.id}
      entering={FadeIn.duration(motion.base).easing(EASE_OUT)}
      exiting={FadeOut.duration(motion.exit).easing(EASE_OUT)}
      style={{ position: 'absolute', top: 110, left: spacing.md, right: spacing.md, zIndex: 10, alignItems: 'center' }}
    >
      <Pill text={notice.text} />
    </Animated.View>
  );
}

/** " · blinds up in 4:32", counting down. When it hits zero the blinds go up as the next hand is dealt. */
function BlindClock({ at, fast }: { at: number; fast?: boolean }) {
  const now = useTableNow(fast, 1000);
  const left = Math.max(0, Math.ceil((at - now) / 1000));
  if (left === 0) return <> · blinds up next hand</>;
  return (
    <>
      {' '}
      · blinds up in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </>
  );
}

function TableBar({ game, online, code }: { game: Game | null; online: boolean; code: string | null }) {
  const colors = useColors();
  const c = usePlainColors();
  const menu = () => {
    haptic.tap();
    router.push(game ? '/table-menu' : '/');
  };
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menu"
        onPress={menu}
        hitSlop={6}
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="line.3.horizontal" size={18} color={colors.label} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {game && (
          <>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 17, lineHeight: 20, fontWeight: '700', color: colors.label }}>
              Blinds {chips(game.settings.smallBlind)}/{chips(game.settings.bigBlind)}
            </Text>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, lineHeight: 15, fontWeight: '600', color: colors.tertiaryLabel }}>
              {game.challenge ? challengeById(game.challenge.id)?.name : game.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : online ? 'Online table' : 'You vs the bots'}
              {game.status === 'playing' && !!game.settings.blindMinutes && game.blindsRaiseAt != null && <BlindClock at={game.blindsRaiseAt} fast={game.fast} />}
            </Text>
          </>
        )}
      </View>
      {game?.party ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Party standings. Game ${game.party.round + 1} of ${game.party.total}`}
          onPress={() => {
            haptic.tap();
            router.push('/party-sheet');
          }}
          style={{
            height: 40,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: c.blueBg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text maxFontSizeMultiplier={1} style={{ fontSize: 17 }}>
            {variantInfo(game.settings.variant ?? 'holdem').emoji}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'], color: c.blueInk }}>
            {game.party.round + 1}/{game.party.total}
          </Text>
        </Pressable>
      ) : online && code ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Invite: code ${code}`}
          onPress={() => {
            haptic.tap();
            void Share.share(tableShare(game, code));
          }}
          style={{
            minWidth: 48,
            height: 40,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: c.blueBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', letterSpacing: 1.4, color: c.blueInk }}>{code}</Text>
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}

/** When the blinds go up, a red banner slides down from the top for five seconds, as on the web. */
function BlindNews({ game }: { game: Game }) {
  const c = usePlainColors();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const bigBlind = game.settings.bigBlind;
  const last = useRef(bigBlind);
  const [news, setNews] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (bigBlind > last.current && game.status === 'playing') {
      setNews({ id: Date.now(), text: `Blinds are now ${chips(game.settings.smallBlind)}/${chips(bigBlind)} 🚨` });
      playSound('chips');
      haptic.tap();
    }
    last.current = bigBlind;
  }, [bigBlind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!news) return;
    const t = setTimeout(() => setNews(null), 5000);
    return () => clearTimeout(t);
  }, [news]);
  if (!news) return null;
  return (
    <Animated.View
      key={news.id}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      entering={reduce ? FadeIn : SlideInUp.duration(380).easing(EASE_OUT)}
      exiting={reduce ? FadeOut : SlideOutUp.duration(exitMs(380)).easing(EASE_OUT)}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.4)',
        ...gradient(`linear-gradient(180deg, ${c.red}, #d70015)`),
      }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
        {news.text}
      </Text>
    </Animated.View>
  );
}

/** An online table with nobody left: a minute to add bots or leave, and it can't be dismissed without choosing. */
function EmptyTablePopup({ game, onLeave }: { game: Game; onLeave: () => void }) {
  // The clock only ticks while the popup shows: a table with people at it never re-draws for it.
  if (!game.emptyAt || game.status !== 'playing') return null;
  return <EmptyTableCountdown game={game} emptyAt={game.emptyAt} onLeave={onLeave} />;
}

function EmptyTableCountdown({ game, emptyAt, onLeave }: { game: Game; emptyAt: number; onLeave: () => void }) {
  const c = usePlainColors();
  const now = useTableNow(game.fast, 250);
  const host = game.hostDeviceId === myDevice;
  const secs = Math.max(0, Math.ceil((emptyAt - now) / 1000));
  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <View
          accessibilityRole="alert"
          style={{
            width: '100%',
            maxWidth: 360,
            gap: 12,
            padding: 24,
            borderRadius: 24,
            borderCurve: 'continuous',
            backgroundColor: c.surface,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: c.label, textAlign: 'center' }}>Everyone else left</Text>
          <Text style={{ fontSize: 15, color: c.tertiaryLabel, textAlign: 'center' }}>
            Closing game in <Text style={{ fontWeight: '700', color: c.label, fontVariant: ['tabular-nums'] }}>{secs}s</Text>
          </Text>
          {game.code && (
            <View style={{ alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: c.cell }}>
              <Text style={{ fontSize: 13, color: c.tertiaryLabel }}>Game code</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: 2, color: c.label }}>{game.code}</Text>
            </View>
          )}
          <Text style={{ fontSize: 15, color: c.tertiaryLabel, textAlign: 'center' }}>
            Friends can still join with the code, or add bots to keep playing.
          </Text>
          {host && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                dispatch({ type: 'addBot' });
                dispatch({ type: 'addBot' });
              }}
              style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent }}
            >
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#ffffff' }}>Add bots</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={onLeave}
            style={{
              minHeight: 50,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: c.separator,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.label }}>Leave</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Win and tie chances, only during an all-in run-out when every live hand is face up, played out by the game's own
 * rules (`runoutOdds()`). Ghost Hold'em leaves the ghost out until it's turned over at the showdown.
 */
function useOdds(hand: Hand | null, ok: boolean, variant: Variant): Map<string, { win: number; tie: number }> | null {
  const live = hand?.runout && ok ? hand.seats.filter((s) => !s.folded && s.cards.length >= 2) : [];
  const ghost = hand?.ghost?.length ? hand.ghost : undefined;
  const key = hand?.runout ? `${variant}/${live.map((s) => s.cards.join('')).join('|')}/${hand.board.join('')}/${ghost?.join('') ?? ''}` : '';
  return useMemo(() => {
    if (!hand?.runout || live.length < 2) return null;
    const e = runoutOdds(
      variant,
      live.map((s) => s.cards),
      hand.board,
      ghost,
    );
    return new Map(live.map((s, i) => [s.playerId, { win: e.win[i], tie: e.tie[i] }]));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** A hand in play: seats, felt, actions and your cards, with pre-actions that play themselves when your turn comes. */
function Playing({ game, sending }: { game: Game; sending: boolean }) {
  const me = myPlayer(game, myDevice);
  const hand = game.hand;
  const mySeat = seatFor(hand, me?.id);
  const myTurn = !!hand && !hand.result && !!me && hand.toAct === me.id;
  const [raiseTurn, setRaiseTurn] = useState('');
  const [selection, setSelection] = useState<{ street: string; action: PreAction } | null>(null);

  // The first time you sit at a mini game, how it plays opens by itself (once per game, never again).
  const variant = variantOf(game);
  useEffect(() => {
    if (variant === 'holdem' || game.challenge || game.bankroll) return;
    const seen = read<string[]>('flipup.rulesseen', []);
    if (seen.includes(variant)) return;
    save('flipup.rulesseen', [...seen, variant]);
    router.push({ pathname: '/game/[id]', params: { id: variant, rules: '1' } });
  }, [variant]); // eslint-disable-line react-hooks/exhaustive-deps
  // Imposter: your role, announced as each hand is dealt.
  const role = hand?.variant === 'imposter' && mySeat && me ? (hand.imposter === me.id ? 'imposter' : 'innocent') : null;
  const roleKey = role && hand ? `${game.id}:${hand.number}:${role}` : '';
  const [dismissedRole, setDismissedRole] = useState('');
  const flash = roleKey && roleKey !== dismissedRole ? role : null;
  useEffect(() => {
    if (!roleKey) return;
    if (role === 'imposter') haptic.turn();
    const t = setTimeout(() => setDismissedRole(roleKey), 2800);
    return () => clearTimeout(t);
  }, [roleKey, role]);

  // A buzz when it's your turn; the raise panel closes when it isn't.
  const turnKey = myTurn ? `${game.id}-${hand!.number}-${hand!.seq}` : '';
  const raising = !!turnKey && raiseTurn === turnKey;
  useEffect(() => {
    if (turnKey) haptic.turn();
  }, [turnKey]);
  // Pre-actions clear each street; Call current also clears the moment the bet changes.
  const streetKey = hand ? `${game.id}-${hand.number}-${hand.street}` : '';
  const pre =
    selection?.street === streetKey && !(selection.action?.kind === 'current' && selection.action.bet !== hand?.currentBet)
      ? selection.action
      : null;
  const setPre = (action: PreAction) => setSelection(action ? { street: streetKey, action } : null);
  useEffect(() => {
    if (!pre || !hand || !mySeat) return;
    if (!myTurn) return;
    const o = options(game, hand, mySeat);
    const move = o.canCheck ? 'check' : pre.kind === 'checkfold' ? 'fold' : 'call';
    const t = setTimeout(() => {
      setPre(null);
      dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move });
    }, 400);
    return () => clearTimeout(t);
  }, [pre, myTurn, hand?.number, hand?.seq, hand?.currentBet]); // eslint-disable-line react-hooks/exhaustive-deps
  // A win worth celebrating gets the success haptic and confetti. Getting your own blind back when everyone folds
  // isn't worth a party; a real win is.
  const won = hand?.result && me ? (hand.result.won[me.id] ?? 0) : 0;
  const gained = won - (mySeat?.total ?? 0);
  const winKey = won > 0 && (hand?.result?.showdown ? gained > 0 : gained >= game.settings.bigBlind) ? hand!.number : 0;
  useEffect(() => {
    if (winKey) haptic.success();
  }, [winKey]);
  const { width, height } = useWindowDimensions();
  // The screen's own bottom padding (see TableScreen), which the raise panel covers to reach the edge.
  const bottomInset = Math.max(useSafeAreaInsets().bottom, spacing.sm);

  const [available, setAvailable] = useState(0);
  const compact = available > 0 && available < 700;
  // Reserve the action area and hole cards before sizing the felt; a board that can't fit shrinks to the room left.
  const pointing = variantOf(game) === 'imposter';
  const feltBudget = available > 0 ? available - (compact ? 260 : 310) - 180 - (pointing ? 44 : 0) : undefined;

  // Table talk (only from players who can be seen), the seats in view, and the sounds.
  const speakerOk = useRef<(id: string) => boolean>(() => true);
  const { say, quiet } = useReactions(game, (id) => id === me?.id || speakerOk.current(id), me?.id);
  const others = othersInOrder(game, me);
  const slots = usePodSlots(game, others, say);
  useEffect(() => {
    speakerOk.current = slots.canShow;
  }, [slots.canShow]);
  useTableSounds(game, me?.id);
  const odds = useOdds(hand, showsOdds(variantOf(game)), variantOf(game));
  // At a showdown the winning five lift and glow and the rest grey out. Never while the hand is being played.
  const showPointing = pointing && !!hand && !hand.result && !hand.voting && !hand.tally && !hand.discussing && !!mySeat;
  const highlight = useHighlight(game, me);
  const lit = new Set(highlight?.best ?? []);
  const showdown = !!hand?.result?.showdown && !!highlight;
  const dim = (card: Card) => showdown && !lit.has(card);
  const glow = (card: Card) => showdown && lit.has(card);

  return (
    <WildDeuces.Provider value={variantOf(game) === 'deuces'}>
    <View style={{ flex: 1 }} onLayout={(e) => setAvailable(e.nativeEvent.layout.height)}>
      {flash && (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn}
          exiting={FadeOut}
          style={{ position: 'absolute', top: '30%', left: 0, right: 0, zIndex: 20, alignItems: 'center' }}
        >
          <View style={{ paddingHorizontal: 22, paddingVertical: 14, borderRadius: 22, borderCurve: 'continuous', backgroundColor: flash === 'imposter' ? 'rgba(180,30,30,0.94)' : 'rgba(20,90,50,0.94)', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 34 }}>{flash === 'imposter' ? '🕵️' : '😇'}</Text>
            <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '800' }}>{flash === 'imposter' ? "You're the imposter" : "You're innocent"}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
              {flash === 'imposter' ? 'Your cards are different. Blend in.' : 'You hold what the other innocents hold. Find the odd one out.'}
            </Text>
          </View>
        </Animated.View>
      )}
      {/* The table is locked: it never scrolls or bounces (the felt shrinks to fit instead, see FeltOval). */}
      <View style={{ flex: 1, minHeight: 0, overflow: 'hidden', gap: compact ? 4 : 12, justifyContent: 'space-evenly', paddingBottom: 20 }}>
        <SeatRow compact={compact} game={game} shown={slots.shown} hidden={slots.hidden} say={say} quiet={quiet} dimCard={dim} glowCard={glow} odds={odds} />
        <FeltOval game={game} me={me} heightLimit={feltBudget} />
      </View>
      <View style={{ gap: 4, paddingTop: 4 }}>
        <View style={{ paddingHorizontal: spacing.md, minHeight: 112, justifyContent: 'flex-end' }}>
          {/* Imposter: point a finger at someone while the betting goes on. */}
          {showPointing && me && <SuspectBar game={game} me={me} />}
          {hand?.tally ? (
            <Tally game={game} />
          ) : hand?.discussing && mySeat && me ? (
            <Discuss game={game} me={me} />
          ) : hand?.voting && mySeat && me ? (
            <Vote game={game} me={me} />
          ) : hand?.discarding && mySeat && !mySeat.folded ? (
            <Discard game={game} seat={mySeat} pack={me?.cardPack} />
          ) : (
            <ActionArea
              game={game}
              me={me}
              seat={mySeat}
              myTurn={myTurn}
              sending={sending}
              pre={pre}
              setPre={setPre}
              onRaise={() => setRaiseTurn(turnKey)}
            />
          )}
        </View>
        <MyArea
          compact={compact}
          game={game}
          me={me}
          talk={me ? say[me.id] : undefined}
          quiet={me ? quiet[me.id] : undefined}
          dim={dim}
          glow={glow}
          odds={me ? odds?.get(me.id) : undefined}
        />
      </View>
      <Confetti burst={winKey} origin={{ x: width / 2, y: height * 0.7 }} />
      {raising && myTurn && hand && mySeat && (
        <>
          {/* A tap anywhere else closes the sizer, as on the web. */}
          <Pressable
            accessibilityLabel="Close the raise panel"
            onPress={() => setRaiseTurn('')}
            style={{ position: 'absolute', top: -200, left: 0, right: 0, bottom: 0 }}
          />
          <RaisePanel game={game} hand={hand} seat={mySeat} inset={bottomInset} onClose={() => setRaiseTurn('')} />
        </>
      )}
    </View>
    </WildDeuces.Provider>
  );
}
