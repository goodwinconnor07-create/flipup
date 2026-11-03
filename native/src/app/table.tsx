import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ActionArea, RaisePanel, type PreAction } from '@/components/table/actions';
import { Confetti } from '@/components/table/confetti';
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
import { DealWipe } from '@/components/deal-wipe';
import { Discard, Vote } from '@/components/table/variant-steps';
import { ThemedText } from '@/components/themed-text';
import { equity, myPlayer, options, seatFor, showsOdds, variantInfo, variantOf, type Card, type Game, type Hand } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { joinLink } from '@/state/api';
import { forgetParty } from '@/state/party';
import { leaveTable, dispatch, me as myDevice, useTable } from '@/state/session';
import { RAILS } from '@design/tableLooks';
import { tableThemes } from '@design/tokens';
import { useTableLook } from '@/state/prefs';
import { gradient, radius, spacing, useColors, usePlainColors } from '@/theme';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

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
  const look = useTableLook();
  const variant = game ? variantOf(game) : 'holdem';
  const theme = variant === 'holdem' ? null : tableThemes[variant];
  const wipe = [theme?.felt ?? look.felt, (theme?.rail ?? RAILS.find((r) => r.id === look.rail)?.colors ?? [look.felt, look.felt])[1]] as const;
  const leave = () => {
    leaveTable();
    router.dismissAll();
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.sm) }}>
      <TableBar game={game} online={online} code={t.code} />
      {game && <BlindNews game={game} />}
      {online && t.conn === 'offline' && <Pill text="Reconnecting…" />}
      {game && <EmptyTablePopup game={game} onLeave={leave} />}
      <Notice notice={t.notice} />
      <DealWipe colors={wipe} />
      {!game ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          {t.mode ? <ActivityIndicator /> : null}
          <ThemedText tone="tertiaryLabel">{!t.mode ? 'No table open.' : t.conn === 'offline' ? 'No connection. Trying again…' : 'Finding your table…'}</ThemedText>
        </View>
      ) : (
        <>
          {game.status === 'lobby' && <Lobby game={game} online={online} />}
          {game.status === 'playing' && <Playing game={game} sending={t.sending} />}
          {game.status === 'ended' && (game.party ? <PartyEnded code={game.party.code} onLeave={leave} /> : <Ended game={game} onLeave={leave} />)}
        </>
      )}
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
    <View accessibilityRole="text" accessibilityLiveRegion="polite" style={{ alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.cellPressed }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.label }}>{text}</Text>
    </View>
  );
}

/** A refused move or a lost table, for four seconds, with the failure haptic. */
function Notice({ notice }: { notice: { id: number; text: string } | null }) {
  const [shown, setShown] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!notice) return;
    haptic.failure();
    setShown(notice);
    const t = setTimeout(() => setShown((s) => (s?.id === notice.id ? null : s)), 4000);
    return () => clearTimeout(t);
  }, [notice?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown) return null;
  return (
    <Animated.View key={shown.id} entering={FadeIn} exiting={FadeOut} style={{ position: 'absolute', top: 110, left: spacing.md, right: spacing.md, zIndex: 10, alignItems: 'center' }}>
      <Pill text={shown.text} />
    </Animated.View>
  );
}

/** " · blinds up in 4:32", counting down. When it hits zero the blinds go up as the next hand is dealt. */
function BlindClock({ at, fast }: { at: number; fast?: boolean }) {
  const now = useTableNow(fast, 1000);
  const left = Math.max(0, Math.ceil((at - now) / 1000));
  if (left === 0) return <> · blinds up next hand</>;
  return <> · blinds up in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</>;
}

function TableBar({ game, online, code }: { game: Game | null; online: boolean; code: string | null }) {
  const colors = useColors();
  const c = usePlainColors();
  const menu = () => {
    haptic.tap();
    router.push('/table-menu');
  };
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Menu" onPress={menu} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="line.3.horizontal" size={18} color={colors.label} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {game && (
          <>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 17, lineHeight: 20, fontWeight: '700', color: colors.label }}>
              Blinds {chips(game.settings.smallBlind)}/{chips(game.settings.bigBlind)}
            </Text>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, lineHeight: 15, fontWeight: '600', color: colors.tertiaryLabel }}>
              {game.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : online ? 'Online table' : 'You vs the bots'}
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
          style={{ height: 40, paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: c.blueBg, flexDirection: 'row', alignItems: 'center', gap: 4 }}
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
            void Share.share({ message: `Come play poker with me on FlipUp. Code ${code}: ${joinLink(code)}`, url: joinLink(code) });
          }}
          style={{ minWidth: 48, height: 40, paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: c.blueBg, alignItems: 'center', justifyContent: 'center' }}
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
      entering={reduce ? FadeIn : SlideInUp.duration(380)}
      exiting={reduce ? FadeOut : SlideOutUp.duration(320)}
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.4)', ...gradient(`linear-gradient(180deg, ${c.red}, #d70015)`) }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
        {news.text}
      </Text>
    </Animated.View>
  );
}

/** An online table with nobody left: a minute to add bots or leave, and it can't be dismissed without choosing. */
function EmptyTablePopup({ game, onLeave }: { game: Game; onLeave: () => void }) {
  const c = usePlainColors();
  const now = useTableNow(game.fast, 250);
  if (!game.emptyAt || game.status !== 'playing') return null;
  const host = game.hostDeviceId === myDevice;
  const secs = Math.max(0, Math.ceil((game.emptyAt - now) / 1000));
  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 360, gap: 12, padding: 24, borderRadius: 24, borderCurve: 'continuous', backgroundColor: c.surface }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: c.label, textAlign: 'center' }}>Nobody in the lobby</Text>
          <Text style={{ fontSize: 15, color: c.tertiaryLabel, textAlign: 'center' }}>
            Closing game in <Text style={{ fontWeight: '700', color: c.label, fontVariant: ['tabular-nums'] }}>{secs}s</Text>
          </Text>
          {game.code && (
            <View style={{ alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: c.cell }}>
              <Text style={{ fontSize: 13, color: c.tertiaryLabel }}>Game code</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: 2, color: c.label }}>{game.code}</Text>
            </View>
          )}
          <Text style={{ fontSize: 15, color: c.tertiaryLabel, textAlign: 'center' }}>Friends can still join with the code, or add bots to keep playing.</Text>
          {host && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                dispatch({ type: 'addBot' });
                dispatch({ type: 'addBot' });
              }}
              style={{ minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.green }}
            >
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#ffffff' }}>Add bots</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={onLeave} style={{ minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.separator }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.label }}>Leave</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Win and tie chances, only during an all-in run-out when every live hand is face up (plain Hold'em only). */
function useOdds(hand: Hand | null, ok: boolean): Map<string, { win: number; tie: number }> | null {
  const live = hand?.runout && ok ? hand.seats.filter((s) => !s.folded && s.cards.length === 2) : [];
  const key = hand?.runout ? `${live.map((s) => s.cards.join('')).join('|')}/${hand.board.join('')}` : '';
  return useMemo(() => {
    if (!hand?.runout || live.length < 2) return null;
    const e = equity(
      live.map((s) => s.cards),
      hand.board,
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
  const [raising, setRaising] = useState(false);
  const [pre, setPre] = useState<PreAction>(null);

  // A buzz when it's your turn; the raise panel closes when it isn't.
  const turnKey = myTurn ? `${hand!.number}-${hand!.seq}` : '';
  useEffect(() => {
    if (turnKey) haptic.turn();
    else setRaising(false);
  }, [turnKey]);
  // Pre-actions clear each street; Call current also clears the moment the bet changes.
  const streetKey = hand ? `${hand.number}-${hand.street}` : '';
  useEffect(() => setPre(null), [streetKey]);
  useEffect(() => {
    if (!pre || !hand || !mySeat) return;
    if (pre.kind === 'current' && hand.currentBet !== pre.bet) return setPre(null);
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

  // Table talk (only from players who can be seen), the seats in view, and the sounds.
  const speakerOk = useRef<(id: string) => boolean>(() => true);
  const { say, quiet } = useReactions(game, (id) => id === me?.id || speakerOk.current(id));
  const others = othersInOrder(game, me);
  const slots = usePodSlots(game, others, say);
  speakerOk.current = slots.canShow;
  useTableSounds(game, me?.id);
  const odds = useOdds(hand, showsOdds(variantOf(game)));
  // At a showdown the winning five lift and glow and the rest grey out. Never while the hand is being played.
  const highlight = useHighlight(game, me);
  const lit = new Set(highlight?.best ?? []);
  const showdown = !!hand?.result?.showdown && !!highlight;
  const dim = (card: Card) => showdown && !lit.has(card);
  const glow = (card: Card) => showdown && lit.has(card);

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <SeatRow game={game} shown={slots.shown} hidden={slots.hidden} say={say} quiet={quiet} dimCard={dim} glowCard={glow} odds={odds} />
      {/* The give on this screen: when cards turn up under the seats or on your box, this gap shrinks, not the felt. */}
      <View style={{ flex: 1, minHeight: 0 }} />
      <FeltOval game={game} me={me} />
      <View style={{ flex: 1, minHeight: 0 }} />
      <View style={{ gap: 4 }}>
        <View style={{ paddingHorizontal: spacing.md, minHeight: 112, justifyContent: 'flex-end' }}>
          {hand?.voting && mySeat && me ? (
            <Vote game={game} me={me} />
          ) : hand?.discarding && mySeat && !mySeat.folded ? (
            <Discard game={game} seat={mySeat} pack={me?.cardPack} />
          ) : (
            <ActionArea game={game} me={me} seat={mySeat} myTurn={myTurn} sending={sending} pre={pre} setPre={setPre} onRaise={() => setRaising(true)} />
          )}
        </View>
        <MyArea game={game} me={me} talk={me ? say[me.id] : undefined} quiet={me ? quiet[me.id] : undefined} dim={dim} glow={glow} odds={me ? odds?.get(me.id) : undefined} />
      </View>
      <Confetti burst={winKey} origin={{ x: width / 2, y: height * 0.7 }} />
      {raising && myTurn && hand && mySeat && (
        <>
          {/* A tap anywhere else closes the sizer, as on the web. */}
          <Pressable accessibilityLabel="Close the raise panel" onPress={() => setRaising(false)} style={{ position: 'absolute', top: -200, left: 0, right: 0, bottom: 0 }} />
          <RaisePanel game={game} hand={hand} seat={mySeat} onClose={() => setRaising(false)} />
        </>
      )}
    </View>
  );
}
