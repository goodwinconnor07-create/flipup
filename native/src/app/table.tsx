import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ActionArea, RaisePanel, type PreAction } from '@/components/table/actions';
import { Confetti } from '@/components/table/confetti';
import { Ended } from '@/components/table/ended';
import { FeltOval } from '@/components/table/felt';
import { Lobby } from '@/components/table/lobby';
import { MyArea } from '@/components/table/my-area';
import { SeatRow } from '@/components/table/seats';
import { useReactions } from '@/components/table/use-reactions';
import { useTableSounds } from '@/components/table/use-table-sounds';
import { Discard, Vote } from '@/components/table/variant-steps';
import { ThemedText } from '@/components/themed-text';
import { myPlayer, options, seatFor, type Game } from '@/engine';
import { joinLink } from '@/state/api';
import { leaveTable, dispatch, me as myDevice, useTable } from '@/state/session';
import { radius, spacing, useColors } from '@/theme';

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
  const leave = () => {
    leaveTable();
    router.dismissAll();
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.sm) }}>
      <TableBar game={game} online={online} code={t.code} />
      {online && t.conn === 'offline' && <Pill text="Reconnecting…" />}
      <Notice notice={t.notice} />
      {!game ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          {t.mode ? <ActivityIndicator /> : null}
          <ThemedText tone="tertiaryLabel">{!t.mode ? 'No table open.' : t.conn === 'offline' ? 'No connection. Trying again…' : 'Finding your table…'}</ThemedText>
        </View>
      ) : (
        <>
          {game.status === 'lobby' && <Lobby game={game} online={online} />}
          {game.status === 'playing' && <Playing game={game} sending={t.sending} />}
          {game.status === 'ended' && <Ended game={game} onLeave={leave} />}
        </>
      )}
    </View>
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

function TableBar({ game, online, code }: { game: Game | null; online: boolean; code: string | null }) {
  const colors = useColors();
  const menu = () => {
    haptic.tap();
    router.push('/table-menu');
  };
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Menu" onPress={menu} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="line.3.horizontal" size={18} color={colors.label} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {game && (
          <>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 17, fontWeight: '700', color: colors.label }}>
              Blinds {chips(game.settings.smallBlind)}/{chips(game.settings.bigBlind)}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, color: colors.tertiaryLabel }}>
              {game.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : online ? 'Online table' : 'You vs the bots'}
            </Text>
          </>
        )}
      </View>
      {online && code ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Invite: code ${code}`}
          onPress={() => {
            haptic.tap();
            void Share.share({ message: `Come play poker with me on FlipUp. Code ${code}: ${joinLink(code)}`, url: joinLink(code) });
          }}
          style={{ minWidth: 40, height: 32, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '800', letterSpacing: 1, color: colors.label }}>{code}</Text>
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
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
    if (turnKey) haptic.tap();
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

  // Table talk, and the sounds.
  const shownRef = useRef<Set<string>>(new Set());
  const { say, quiet } = useReactions(game, (id) => id === me?.id || shownRef.current.has(id));
  useTableSounds(game, me?.id);

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <SeatRow game={game} me={me} say={say} quiet={quiet} shownRef={shownRef} />
      <FeltOval game={game} me={me} />
      <View style={{ gap: spacing.md }}>
        <View style={{ paddingHorizontal: spacing.md, minHeight: 100, justifyContent: 'flex-end' }}>
          {hand?.voting && mySeat && me ? (
            <Vote game={game} me={me} />
          ) : hand?.discarding && mySeat && !mySeat.folded ? (
            <Discard game={game} seat={mySeat} pack={me?.cardPack} />
          ) : (
            <ActionArea game={game} me={me} seat={mySeat} myTurn={myTurn} sending={sending} pre={pre} setPre={setPre} onRaise={() => setRaising(true)} />
          )}
        </View>
        <MyArea game={game} me={me} talk={me ? say[me.id] : undefined} />
      </View>
      <Confetti burst={winKey} origin={{ x: width / 2, y: height * 0.7 }} />
      {raising && myTurn && hand && mySeat && <RaisePanel game={game} hand={hand} seat={mySeat} onClose={() => setRaising(false)} />}
    </View>
  );
}
