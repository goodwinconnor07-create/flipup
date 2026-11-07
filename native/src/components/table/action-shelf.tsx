// The action shelf: a slim row above the table bar, the same colour as the page, that tells the story of the hand
// as pills the size of the seats' move bubbles ("🗿 Called 150", "♠️ Folded"). Each new move joins on the right;
// the row sits against the left edge until it fills, then slides left so the oldest pills leave off the left side.
// It also covers a player who drops out of the seat row when they fold: their fold is still written here.
import { useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { positionOf, type Game, type Hand } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { motion, spacing, usePlainColors } from '@/theme';

import { bubblePop, MoveBubble, moveTone, type Tone } from './bubbles';

type Item = { key: string; hand: number; text: string; tone: Tone };

/** How many pills the shelf remembers; older ones are long off the left edge. Trimmed only when a hand starts. */
const KEEP = 30;
const HEIGHT = 30;

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Every move of one hand as a pill, and the winners once it's over. */
function handItems(game: Game, hand: Hand): Item[] {
  const face = (id: string) => game.players.find((p) => p.id === id)?.emoji ?? '';
  // What each player has put in on this street, so a call can say how many chips it added (as the seat does).
  let street = 'preflop';
  let put: Record<string, number> = {};
  const blinds = () => {
    for (const seat of hand.seats) {
      const kind = positionOf(hand, seat.playerId)?.kind;
      const start = hand.startStacks?.[seat.playerId] ?? Infinity;
      if (kind === 'sb' || (kind === 'btn' && hand.seats.length === 2)) put[seat.playerId] = Math.min(start, game.settings.smallBlind);
      if (kind === 'bb') put[seat.playerId] = Math.min(start, game.settings.bigBlind);
    }
  };
  blinds();
  const items: Item[] = (hand.actions ?? []).map((a, i) => {
    if (a.street !== street) {
      street = a.street;
      put = {};
    }
    const before = put[a.playerId] ?? 0;
    if (a.move !== 'fold' && a.move !== 'check') put[a.playerId] = Math.max(before, a.to);
    const text =
      a.move === 'fold'
        ? 'Folded'
        : a.move === 'check'
          ? 'Checked'
          : a.move === 'call'
            ? `Called ${chips(a.to - before)}`
            : a.move === 'bet'
              ? `Bet ${chips(a.to)}`
              : a.move === 'raise'
                ? `Raised to ${chips(a.to)}`
                : `All in ${chips(a.to)}`;
    return { key: `${hand.number}-${i}`, hand: hand.number, text: `${face(a.playerId)} ${text}`, tone: moveTone(a.move) };
  });
  if (hand.result) {
    for (const [id, won] of Object.entries(hand.result.won).sort((a, b) => b[1] - a[1])) {
      if (won > 0) items.push({ key: `${hand.number}-won-${id}`, hand: hand.number, text: `${face(id)} Won ${chips(won)}`, tone: 'grey' });
    }
  }
  return items;
}

const same = (a: Item[], b: Item[]) => a.length === b.length && a.every((x, i) => x.key === b[i].key && x.text === b[i].text);

/** Earlier hands' pills plus this hand's, kept across hands. */
function useFeed(game: Game): Item[] {
  const hand = game.hand;
  const cur = hand ? handItems(game, hand) : [];
  const n = hand?.number ?? 0;
  const [s, setS] = useState<{ n: number; done: Item[]; cur: Item[] }>({ n, done: [], cur });
  if (n !== s.n) setS({ n, done: [...s.done, ...s.cur].slice(-KEEP), cur });
  else if (!same(cur, s.cur)) setS({ ...s, cur });
  return n !== s.n ? [...s.done, ...s.cur, ...cur] : [...s.done, ...cur];
}

export function ActionShelf({ game }: { game: Game }) {
  const c = usePlainColors();
  const reduce = useReduceMotion();
  const items = useFeed(game);
  const [width, setWidth] = useState(0);
  const [row, setRow] = useState(0);
  const x = useSharedValue(0);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  // Older pills trimmed off the front change the layout under the same view: jump rather than slide then.
  const head = items[0]?.key;
  const lastHead = useRef(head);
  // Left-aligned until the row is wider than the shelf, then the newest pill sits at the right edge.
  useEffect(() => {
    if (!width) return;
    const trimmed = lastHead.current !== head;
    lastHead.current = head;
    const to = Math.min(0, width - row);
    x.set(reduce || trimmed ? to : withTiming(to, { duration: motion.base, easing: EASE_OUT }));
  }, [width, row]); // eslint-disable-line react-hooks/exhaustive-deps
  const onRow = (e: LayoutChangeEvent) => setRow(e.nativeEvent.layout.width);
  return (
    <View
      accessibilityLabel="What's happened this hand"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - spacing.md * 2)}
      style={{ height: HEIGHT, marginHorizontal: 0, paddingHorizontal: spacing.md, justifyContent: 'center', overflow: 'hidden', backgroundColor: c.background }}
    >
      <Animated.View
        onLayout={onRow}
        style={[{ position: 'absolute', left: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6 }, slide]}
      >
        {items.map((it, i) => (
          <View key={it.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* A hairline between hands. */}
            {i > 0 && items[i - 1].hand !== it.hand && <View style={{ width: 1, height: 16, marginHorizontal: 2, backgroundColor: c.separator }} />}
            <Animated.View entering={reduce ? FadeIn.duration(motion.base) : bubblePop}>
              <MoveBubble text={it.text} tone={it.tone} />
            </Animated.View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
