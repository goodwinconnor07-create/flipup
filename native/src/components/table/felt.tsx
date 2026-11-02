import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { tableThemes } from '@design/tokens';
import { bestHand, boardSize, CIRCLE_HOURS, CROSS_CELLS, pot, rankLabel, rankOf, seatFor, streetCards, suitOf, variantInfo, variantOf, type Card, type Game, type Player } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, radius, spacing } from '@/theme';

import { CardSlot, PlayingCard } from './playing-card';
import { TurnTimer } from './turn-timer';
import { useNow } from './use-now';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Mixes a #rrggbb colour toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * a));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The table look: the player's felt and rail for Hold'em (the defaults for now; the picker comes with Settings), each mini game's own. */
const FELT = '#1f7a4d';
const RAIL: readonly [string, string] = ['#4a4a55', '#1b1b22'];
const SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;
const short = (c: Card) => `${rankLabel(c)}${SYMBOL[suitOf(c)]}`;

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
  const theme = variant === 'holdem' ? null : tableThemes[variant];
  const felt = theme?.felt ?? FELT;
  const rail = theme?.rail ?? RAIL;
  const info = variantInfo(variant);
  // Imposter: you only learn it's you; everyone else in the hand is innocent.
  const role = hand?.variant === 'imposter' && mySeat ? (hand.imposter === me?.id ? 'imposter' : 'innocent') : null;
  const myValue = mySeat && !mySeat.folded && mySeat.cards.length && hand?.variant !== 'imposter' ? bestHand(variant, mySeat.cards, hand?.board ?? []) : null;
  const named = (v: { name: string; detail?: string }) => (v.detail && v.detail.length <= 16 ? v.detail : v.name);
  const myHandName = myValue && (hand!.board.length >= 3 || myValue.category > 0) ? named(myValue) : null;
  const pillName = hand?.result?.showdown ? highlight?.name : myHandName;
  const potNow = hand && !hand.result ? pot(hand) : 0;
  const pack = me?.cardPack;

  return (
    <View
      style={{
        marginHorizontal: spacing.md,
        padding: 11,
        borderRadius: radius.full,
        minHeight: 210,
        boxShadow: '0 12px 26px -14px rgba(18,18,40,0.55), inset 0 1px 0 rgba(255,255,255,0.28)',
        ...gradient(`linear-gradient(165deg, ${rail[0]}, ${rail[1]})`),
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
          gap: spacing.xs,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.45)',
          ...gradient(`radial-gradient(ellipse at 50% 38%, ${shade(felt, 0.14)} 0%, ${felt} 42%, ${shade(felt, -0.42)} 100%)`),
        }}
      >
        <View pointerEvents="none" style={{ position: 'absolute', top: 9, left: 9, right: 9, bottom: 9, borderRadius: radius.full, borderWidth: 2, borderColor: 'rgba(255,255,255,0.16)' }} />
        {theme && (
          // The game's emoji, faded into the felt.
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 120, opacity: 0.07 }} maxFontSizeMultiplier={1} accessible={false}>
              {info.emoji}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.xs, minHeight: 28 }}>
          {variant !== 'holdem' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${info.name}: how it plays`}
              onPress={() => router.push({ pathname: '/game/[id]', params: { id: variant, rules: '1' } })}
            >
              <FeltPill text={role === 'imposter' ? '🕵️ Imposter: you' : role === 'innocent' ? '😇 Innocent' : `${info.emoji} ${info.name}`} hot={role === 'imposter'} />
            </Pressable>
          )}
          {hand && !hand.result && !game.memory && <FeltPill text={`Pot ${chips(potNow)}`} chip />}
        </View>
        <Ghost game={game} pack={pack} />
        {hand?.dice && (
          <Animated.View key={`dice-${hand.number}`} entering={reduce ? FadeIn : ZoomIn.springify().damping(14)}>
            <FeltPill text={hand.dice.out && hand.dice.in ? `🎲 Rolled ${hand.dice.roll}: ${short(hand.dice.out)} → ${short(hand.dice.in)}` : `🎲 Rolled ${hand.dice.roll}: the board stays`} small />
          </Animated.View>
        )}
        {game.memory ? <MemoryPeek game={game} width={width} pack={pack} /> : <Board game={game} width={width} dim={dim} glow={glow} pack={pack} />}
        <View style={{ minHeight: 32, justifyContent: 'center' }}>
          {game.memory ? (
            <MemoryCountdown game={game} />
          ) : hand?.result ? (
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

/**
 * The board: a row of five (smaller and wrapping when a game deals more, with a gap before Pittsburgh's three
 * rivers), the Crucifix's cross of nine, or the Circle's six cards round a clock face.
 */
function Board({ game, width, dim, glow, pack }: { game: Game; width: number; dim: (c: Card) => boolean; glow: (c: Card) => boolean; pack?: string }) {
  const hand = game.hand;
  const variant = variantOf(game);
  const slots = Math.max(boardSize(variant), hand?.board.length ?? 0);
  const card = (i: number, w: number, style?: ViewStyle) => {
    const c = hand?.board[i];
    return (
      <View key={c ? `${hand!.number}-${c}` : `slot-${i}`} style={style}>
        {c ? <PlayingCard card={c} width={w} flip dim={dim(c)} glow={glow(c)} pack={pack} delay={i < streetCards(variant, 'flop') ? i * 160 : 0} /> : <CardSlot width={w} />}
      </View>
    );
  };
  if (variant === 'crucifix') {
    // A five-by-five grid with the nine cards in a cross.
    const w = 27;
    const gap = 3;
    const h = Math.round(w * 1.4);
    return (
      <View accessibilityLabel="Board, laid out in a cross" style={{ width: w * 5 + gap * 4, height: h * 5 + gap * 4 }}>
        {Array.from({ length: slots }, (_, i) => card(i, w, { position: 'absolute', top: (CROSS_CELLS[i][0] - 1) * (h + gap), left: (CROSS_CELLS[i][1] - 1) * (w + gap) }))}
      </View>
    );
  }
  if (variant === 'circle') {
    // Six cards round a clock, each at its hour.
    const w = 34;
    const h = Math.round(w * 1.4);
    const rx = w * 1.9;
    const ry = h + 4;
    const boxW = w * 4.8;
    const boxH = h * 3 + 16;
    return (
      <View accessibilityLabel="Board, laid out round a clock" style={{ width: boxW, height: boxH }}>
        {Array.from({ length: slots }, (_, i) => {
          const a = (CIRCLE_HOURS[i] / 12) * 2 * Math.PI;
          return card(i, w, { position: 'absolute', left: boxW / 2 + Math.sin(a) * rx - w / 2, top: boxH / 2 - Math.cos(a) * ry - h / 2 });
        })}
      </View>
    );
  }
  const wide = slots > 5;
  const perRow = Math.min(slots, 7);
  const gap = wide ? 4 : 6;
  // Five cards across the felt, smaller on a narrow phone; boards with more cards use the smaller size and wrap.
  const room = width - spacing.md * 2 - 22 - spacing.lg * 2 - (variant === 'pittsburgh' ? 8 : 0);
  const w = Math.min(wide ? 44 : 60, Math.floor((room - (perRow - 1) * gap) / perRow));
  return (
    <View accessibilityLabel="Board" style={{ flexDirection: 'row', gap, rowGap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
      {Array.from({ length: slots }, (_, i) => card(i, w, variant === 'pittsburgh' && i === 4 ? { marginLeft: 8 } : undefined))}
    </View>
  );
}

/** Ghost Hold'em: the ghost's two cards (face down until a showdown) and what it's holding for the next hand. */
function Ghost({ game, pack }: { game: Game; pack?: string }) {
  const hand = game.hand;
  const ghost = hand?.result?.ghost;
  const holding = hand && !hand.result ? (hand.carry ?? 0) : (game.ghostPot ?? 0);
  const isGhost = variantOf(game) === 'ghost';
  if (!isGhost && !holding) return null;
  const cards = ghost?.cards ?? hand?.ghost ?? [null, null];
  return (
    <View accessibilityLabel="The ghost" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full, backgroundColor: ghost?.kept ? 'rgba(124,92,255,0.45)' : 'rgba(0,0,0,0.28)' }}>
      <Text style={{ fontSize: 20 }} maxFontSizeMultiplier={1} accessible={false}>
        👻
      </Text>
      {hand && isGhost && (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {cards.map((c, i) => (c ? <PlayingCard key={c} card={c} size="sm" flip pack={pack} /> : <PlayingCard key={i} back size="sm" pack={pack} />))}
        </View>
      )}
      <Text maxFontSizeMultiplier={1.2} style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
        {ghost ? (ghost.kept ? `Keeps ${chips(ghost.kept)} · ${ghost.name}` : ghost.name) : holding ? `Holding ${chips(holding)}` : 'Ghost'}
      </Text>
    </View>
  );
}

const SUIT_ORDER = 'shdc';
/** Memory Poker: the 20 cards taken out of the deck, sorted by suit then high to low, until the hand is dealt. */
function MemoryPeek({ game, width, pack }: { game: Game; width: number; pack?: string }) {
  const cards = [...(game.memory?.cards ?? [])].sort((a, b) => SUIT_ORDER.indexOf(suitOf(a)) - SUIT_ORDER.indexOf(suitOf(b)) || rankOf(b) - rankOf(a));
  const w = Math.min(30, Math.floor((width - spacing.md * 2 - 22 - spacing.lg * 2 - 9 * 3) / 10));
  return (
    <View accessibilityLabel={`Cards taken out: ${cards.map(short).join(' ')}`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: w * 10 + 27 }}>
      {cards.map((c, i) => (
        <PlayingCard key={c} card={c} size="sm" width={w} flip delay={i * 25} pack={pack} />
      ))}
    </View>
  );
}

/** "Remember these 20 · 6s" under the cards. */
function MemoryCountdown({ game }: { game: Game }) {
  const now = useNow(250);
  const secs = Math.max(0, Math.ceil(((game.memory?.until ?? now) - now) / 1000));
  return <FeltPill text={`🧠 Remember these 20 · ${secs}s`} />;
}

function FeltPill({ text, chip, hot, small }: { text: string; chip?: boolean; hot?: boolean; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: small ? 3 : 4, borderRadius: radius.full, backgroundColor: hot ? '#c4123a' : 'rgba(0,0,0,0.32)' }}>
      {chip && <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#ffffff', backgroundColor: '#e5322d' }} />}
      <Text maxFontSizeMultiplier={1.2} style={{ color: '#ffffff', fontWeight: '700', fontSize: small ? 13 : 15, fontVariant: ['tabular-nums'] }}>
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
  if (result.imposter) {
    // Imposter: who it was, and whether the table found them.
    const imp = game.players.find((p) => p.id === result.imposter!.id);
    const tally = Object.values(result.imposter.votes).filter((v) => v === result.imposter!.id).length;
    const total = Object.keys(result.imposter.votes).length;
    const all = Object.values(result.won).reduce((a, b) => a + b, 0);
    title = result.imposter.caught
      ? `Caught! Innocents split ${chips(all)}`
      : winners.length === 1 && winners[0].id === result.imposter.id
        ? `${imp?.name ?? 'Imposter'} got away: ${chips(all)}`
        : `Innocents split ${chips(all)}`;
    how = `Imposter: ${imp?.name ?? '?'} · ${tally} of ${total} votes`;
    face = '🕵️';
  } else if (!winners.length) {
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
