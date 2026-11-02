import { useMemo } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { bestHand, boardSize, pot, seatFor, streetCards, variantInfo, variantOf, type Card, type Game, type Player } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, radius, spacing } from '@/theme';

import { CardSlot, PlayingCard } from './playing-card';
import { TurnTimer } from './turn-timer';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Mixes a #rrggbb colour toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * a));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The table look: the player's felt and rail for Hold'em (the defaults for now; the picker comes with Settings). */
const FELT = '#1f7a4d';
const RAIL: [string, string] = ['#4a4a55', '#1b1b22'];

/** Which cards make the hand that matters: the winner's at a showdown (they glow, the rest grey), yours while you play. */
export function useHighlight(game: Game, me: Player | undefined) {
  const hand = game.hand;
  const mySeat = seatFor(hand, me?.id);
  const variant = variantOf(game);
  return useMemo(() => {
    if (!hand || hand.board.length < 3 || hand.variant === 'imposter') return null;
    if (hand.result?.showdown) {
      const winner = hand.result.pots[0]?.winners[0];
      const seat = seatFor(hand, winner);
      if (seat?.cards.length) return bestHand(variant, seat.cards, hand.board);
    }
    if (mySeat && !mySeat.folded && mySeat.cards.length) return bestHand(variant, mySeat.cards, hand.board);
    return null;
  }, [hand?.number, hand?.board.length, hand?.result, mySeat?.folded, mySeat?.cards.length]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The oval: a rail round the felt, the pot at the top, the board in the middle, the hand or the winner at the bottom. */
export function FeltOval({ game, me }: { game: Game; me: Player | undefined }) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const hand = game.hand;
  const variant = variantOf(game);
  const mySeat = seatFor(hand, me?.id);
  const highlight = useHighlight(game, me);
  const lit = new Set(highlight?.best ?? []);
  const showdown = !!hand?.result?.showdown && !!highlight;
  const dim = (c: Card) => showdown && !lit.has(c);
  const glow = (c: Card) => showdown && lit.has(c);
  const slots = Math.max(boardSize(variant), hand?.board.length ?? 0);
  // Five cards across the felt, smaller on a narrow phone; boards with more cards use the smaller size.
  const cardW = Math.min(slots > 5 ? 44 : 60, Math.floor((width - spacing.md * 2 - 60 - (slots - 1) * 6) / slots));
  const myValue = mySeat && !mySeat.folded && mySeat.cards.length && hand?.variant !== 'imposter' ? bestHand(variant, mySeat.cards, hand?.board ?? []) : null;
  const short = (v: { name: string; detail?: string }) => (v.detail && v.detail.length <= 16 ? v.detail : v.name);
  const myHandName = myValue && (hand!.board.length >= 3 || myValue.category > 0) ? short(myValue) : null;
  const pillName = hand?.result?.showdown ? highlight?.name : myHandName;
  const potNow = hand && !hand.result ? pot(hand) : 0;

  return (
    <View
      style={{
        marginHorizontal: spacing.md,
        padding: 11,
        borderRadius: radius.full,
        minHeight: 210,
        boxShadow: '0 12px 26px -14px rgba(18,18,40,0.55), inset 0 1px 0 rgba(255,255,255,0.28)',
        ...gradient(`linear-gradient(165deg, ${RAIL[0]}, ${RAIL[1]})`),
      }}
    >
      <TurnTimer game={game} mine={!!hand && !hand.result && !!me && hand.toAct === me.id} />
      <View
        style={{
          flex: 1,
          borderRadius: radius.full,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.45)',
          ...gradient(`radial-gradient(ellipse at 50% 38%, ${shade(FELT, 0.14)} 0%, ${FELT} 42%, ${shade(FELT, -0.42)} 100%)`),
        }}
      >
        <View pointerEvents="none" style={{ position: 'absolute', top: 9, left: 9, right: 9, bottom: 9, borderRadius: radius.full, borderWidth: 2, borderColor: 'rgba(255,255,255,0.16)' }} />
        <View style={{ flexDirection: 'row', gap: spacing.xs, minHeight: 28 }}>
          {variant !== 'holdem' && <FeltPill text={`${variantInfo(variant).emoji} ${variantInfo(variant).name}`} />}
          {hand && <FeltPill text={`Pot ${chips(potNow)}`} chip />}
        </View>
        <View accessibilityLabel="Board" style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Array.from({ length: slots }, (_, i) => {
            const c = hand?.board[i];
            return c ? (
              <PlayingCard key={`${hand!.number}-${c}`} card={c} width={cardW} flip dim={dim(c)} glow={glow(c)} delay={i < streetCards(variant, 'flop') ? i * 160 : 0} />
            ) : (
              <CardSlot key={`slot-${i}`} width={cardW} />
            );
          })}
        </View>
        <View style={{ minHeight: 32, justifyContent: 'center' }}>
          {hand?.result ? (
            <WinBanner game={game} me={me} />
          ) : pillName ? (
            <Animated.View key={pillName} entering={reduce ? FadeIn : ZoomIn.springify().damping(14)}>
              <FeltPill text={pillName} />
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function FeltPill({ text, chip }: { text: string; chip?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.32)' }}>
      {chip && <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#ffffff', backgroundColor: '#e5322d' }} />}
      <Text maxFontSizeMultiplier={1.2} style={{ color: '#ffffff', fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] }}>
        {text}
      </Text>
    </View>
  );
}

/** "Remi wins 340 · Two pair", on the felt when a hand finishes. */
function WinBanner({ game, me }: { game: Game; me: Player | undefined }) {
  const reduce = useReduceMotion();
  const hand = game.hand!;
  const result = hand.result!;
  const winners = Object.entries(result.won)
    .map(([id, amount]) => ({ p: game.players.find((x) => x.id === id), id, amount }))
    .filter((w) => w.p)
    .sort((a, b) => b.amount - a.amount);
  let title: string;
  let how: string | undefined;
  let face: string;
  if (!winners.length) {
    if (!result.ghost?.kept) return null;
    title = `The ghost keeps ${chips(result.ghost.kept)}`;
    how = result.ghost.name;
    face = '👻';
  } else {
    const top = winners[0];
    const split = winners.length > 1;
    title = split ? `Split pot · ${winners.map((w) => w.p!.name).join(' & ')}` : `${top.p!.id === me?.id ? 'You win' : `${top.p!.name} wins`} ${chips(top.amount)}`;
    how = result.showdown ? result.names[top.id] : 'Everyone else folded';
    face = top.p!.emoji;
  }
  return (
    <Animated.View
      key={hand.number}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      entering={reduce ? FadeIn : ZoomIn.springify().damping(14)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <Text style={{ fontSize: 22 }} maxFontSizeMultiplier={1}>
        {face}
      </Text>
      <View>
        <Text maxFontSizeMultiplier={1.2} style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
          {title}
        </Text>
        {how && (
          <Text maxFontSizeMultiplier={1.2} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            {how}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
