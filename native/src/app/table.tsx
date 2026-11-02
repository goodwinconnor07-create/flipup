import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ActionArea, RaisePanel, type PreAction } from '@/components/table/actions';
import { Ended } from '@/components/table/ended';
import { FeltOval } from '@/components/table/felt';
import { Lobby } from '@/components/table/lobby';
import { MyArea } from '@/components/table/my-area';
import { SeatRow } from '@/components/table/seats';
import { ThemedText } from '@/components/themed-text';
import { myPlayer, options, seatFor, type Game } from '@/engine';
import { leaveTable, dispatch, me as myDevice, useTable } from '@/state/session';
import { spacing, useColors } from '@/theme';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * The table, laid out as on the web: the bar (menu, blinds, hand number), the other players along the top, the
 * felt with the pot and board, whose turn it is and your buttons, then your cards and your box at the bottom.
 */
export default function TableScreen() {
  const game = useTable();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const leave = () => {
    leaveTable();
    router.dismissAll();
  };
  if (!game) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ThemedText tone="tertiaryLabel">No table open.</ThemedText>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.sm) }}>
      <TableBar game={game} onLeave={leave} />
      {game.status === 'lobby' && <Lobby game={game} />}
      {game.status === 'playing' && <Playing game={game} />}
      {game.status === 'ended' && <Ended game={game} onLeave={leave} />}
    </View>
  );
}

function TableBar({ game, onLeave }: { game: Game; onLeave: () => void }) {
  const colors = useColors();
  const menu = () => {
    haptic.tap();
    const ask = () =>
      Alert.alert('Leave the table?', 'This bots-only table ends when you leave.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeave },
      ]);
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options: ['Leave table', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 }, (i) => i === 0 && ask());
    else ask();
  };
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Menu" onPress={menu} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="line.3.horizontal" size={18} color={colors.label} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 17, fontWeight: '700', color: colors.label }}>
          Blinds {chips(game.settings.smallBlind)}/{chips(game.settings.bigBlind)}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, color: colors.tertiaryLabel }}>
          {game.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : 'You vs the bots'}
        </Text>
      </View>
    </View>
  );
}

/** A hand in play: seats, felt, actions and your cards, with pre-actions that play themselves when your turn comes. */
function Playing({ game }: { game: Game }) {
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
  // A win worth celebrating gets the success haptic.
  const won = hand?.result && me ? (hand.result.won[me.id] ?? 0) : 0;
  const winKey = won - (mySeat?.total ?? 0) > 0 ? hand!.number : 0;
  useEffect(() => {
    if (winKey) haptic.success();
  }, [winKey]);

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <SeatRow game={game} me={me} />
      <FeltOval game={game} me={me} />
      <View style={{ gap: spacing.md }}>
        <View style={{ paddingHorizontal: spacing.md, minHeight: 100, justifyContent: 'flex-end' }}>
          <ActionArea game={game} me={me} seat={mySeat} myTurn={myTurn} pre={pre} setPre={setPre} onRaise={() => setRaising(true)} />
        </View>
        <MyArea game={game} me={me} />
      </View>
      {raising && myTurn && hand && mySeat && <RaisePanel game={game} hand={hand} seat={mySeat} onClose={() => setRaising(false)} />}
    </View>
  );
}
