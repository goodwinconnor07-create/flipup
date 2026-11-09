import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, useColorScheme, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { RAILS } from '@design/tableLooks';
import { tableThemes } from '@design/tokens';
import { useTableLook } from '@/state/prefs';
import {
  bestHand,
  boardSize,
  CIRCLE_HOURS,
  CROSS_CELLS,
  pot,
  rankLabel,
  rankOf,
  seatFor,
  streetCards,
  suitOf,
  variantInfo,
  variantOf,
  type Card,
  type Game,
  type Player,
} from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { stagger } from '@/motion/presets';
import { gradient, radius, spacing, usePlainColors } from '@/theme';

import { Avatar } from '../avatar';
import { bubblePop } from './bubbles';
import { PotChips } from './pot-chips';
import { Count } from './count';
import { CardSlot, PlayingCard } from './playing-card';
import { FELT_WEAVE, WOOD_GRAIN } from './textures';
import { TurnTimer } from './turn-timer';
import { useTableNow } from './use-now';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Mixes a #rrggbb colour toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * a));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The table look: the player's own felt and rail for Hold'em (Table theme), each mini game's own. */
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
      // A split pot lights every winner's five, so nobody's winning hand is left greyed out.
      const wins = (hand.result.pots[0]?.winners ?? [])
        .map((id) => seatFor(hand, id))
        .filter((seat) => seat?.cards.length)
        .map((seat) => bestHand(variant, seat!.cards, hand.board));
      if (wins.length) return wins.length === 1 ? wins[0] : { ...wins[0], best: [...new Set(wins.flatMap((w) => w.best))] };
    }
    if (mySeat && !mySeat.folded && mySeat.cards.length) return bestHand(variant, mySeat.cards, hand.board);
    return null;
  }, [hand?.number, hand?.board.length, hand?.result, mySeat?.folded, mySeat?.cards.length]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The felt's height for a game on this phone. It depends only on the game and the screen, never on what's shown. */
export function feltHeight(variant: string, screen: number): number {
  if (variant === 'crucifix' || variant === 'circle' || variant === 'memory') return 330;
  return Math.max(196, Math.min(240, Math.round(screen * 0.3)));
}

/** The oval: a rail round the felt, the pot at the top, the board in the middle, the hand or the winner at the bottom. */
export function FeltOval({ game, me, heightLimit }: { game: Game; me: Player | undefined; heightLimit?: number }) {
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const hand = game.hand;
  const variant = variantOf(game);
  const mySeat = seatFor(hand, me?.id);
  const highlight = useHighlight(game, me);
  const lit = new Set(highlight?.best ?? []);
  const showdown = !!hand?.result?.showdown && !!highlight;
  const dim = (c: Card) => showdown && !lit.has(c);
  const glow = (c: Card) => showdown && lit.has(c);
  const theme = variant === 'holdem' ? null : tableThemes[variant];
  const look = useTableLook();
  const felt = theme?.felt ?? look.felt;
  const rail = theme?.rail ?? RAILS.find((r) => r.id === look.rail)!.colors;
  const info = variantInfo(variant);
  // Imposter: you only learn it's you; everyone else in the hand is innocent.
  const role = hand?.variant === 'imposter' && mySeat ? (hand.imposter === me?.id ? 'imposter' : 'innocent') : null;
  const myValue =
    mySeat && !mySeat.folded && mySeat.cards.length && hand?.variant !== 'imposter'
      ? bestHand(variant, mySeat.cards, hand?.board ?? [])
      : null;
  const named = (v: { name: string; detail?: string }) => (v.detail && v.detail.length <= 16 ? v.detail : v.name);
  const myHandName = myValue && (hand!.board.length >= 3 || myValue.category > 0) ? named(myValue) : null;
  const pillName = hand?.result?.showdown ? highlight?.name : myHandName;
  const potNow = hand && !hand.result ? pot(hand) : 0;
  const pack = me?.cardPack;
  // The table screen never scrolls: a board that needs more room than the phone has left (the cross or the clock on
  // a small phone) keeps its layout and shrinks to fit, from the top.
  const natural = Math.min(feltHeight(variant, height), Math.max(feltHeight(variant, 0), heightLimit ?? Infinity));
  const fit = heightLimit && heightLimit > 0 && heightLimit < natural ? Math.max(0.6, heightLimit / natural) : 1;

  const oval = (
    <View
      style={{
        marginHorizontal: spacing.md,
        padding: 11,
        borderRadius: radius.full,
        // A fixed size for the whole game, so nothing on the table (cards shown under seats, the win banner) can
        // squeeze it: a wide stadium from 196pt to 240 by the phone's height; the cross, the clock and the Memory
        // peek take more. Memory Poker plays at that size too, so the board doesn't jump when the peek ends.
        height: natural,
        flexShrink: 0,
        boxShadow: '0 12px 26px -14px rgba(18,18,40,0.55), inset 0 1px 0 rgba(255,255,255,0.28)',
        ...gradient(`${look.rail === 'wood' && !theme ? `${WOOD_GRAIN}, ` : ''}linear-gradient(165deg, ${rail[0]}, ${rail[1]})`),
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
          // Clear of the inner line (9pt in), so the pot and the hand pill sit with room round them.
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
          boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.45)',
          ...gradient(
            `${FELT_WEAVE}, radial-gradient(ellipse at 50% 38%, ${shade(felt, 0.14)} 0%, ${felt} 42%, ${shade(felt, -0.42)} 100%)`,
          ),
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 9,
            left: 9,
            right: 9,
            bottom: 9,
            borderRadius: radius.full,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.16)',
          }}
        />
        {!theme && look.logo && (
          // Texas Hold'em's own mark: the FlipUp wordmark, faded into the felt like the mini games' emoji.
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{ fontSize: 64, fontWeight: '800', letterSpacing: -1.5, color: '#ffffff', opacity: 0.09 }}
              maxFontSizeMultiplier={1}
              accessible={false}
            >
              FlipUp
            </Text>
          </View>
        )}
        {theme && (
          // The game's emoji, faded into the felt.
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 120, opacity: 0.16 }} maxFontSizeMultiplier={1} accessible={false}>
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
              <VariantPill
                text={role === 'imposter' ? '🕵️ Imposter: you' : role === 'innocent' ? '😇 Innocent' : hand?.dice ? `🎲 Rolled ${hand.dice.roll}` : `${info.emoji} ${info.name}`}
                hot={role === 'imposter'}
              />
            </Pressable>
          )}
          {hand && !game.memory && <PotPill value={potNow} bigBlind={game.settings.bigBlind} />}
        </View>
        {game.memory ? (
          <MemoryPeek game={game} width={width} pack={pack} />
        ) : (
          <Board game={game} width={width} dim={dim} glow={glow} pack={pack} />
        )}
        <View style={{ minHeight: 32, justifyContent: 'center' }}>
          {game.memory ? (
            <MemoryCountdown game={game} />
          ) : hand?.result ? (
            <WinBanner game={game} me={me} />
          ) : pillName ? (
            <Animated.View key={pillName} entering={reduce ? FadeIn : bubblePop}>
              <HandPill text={pillName} />
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
  if (fit === 1) return oval;
  return (
    <View style={{ height: natural * fit, flexShrink: 0 }}>
      <View style={{ transform: [{ scale: fit }], transformOrigin: 'top center' }}>{oval}</View>
    </View>
  );
}

/**
 * The board: a row of five (smaller and wrapping when a game deals more, with a gap before Pittsburgh's three
 * rivers), the Crucifix's cross of nine, or the Circle's six cards round a clock face.
 */
function Board({
  game,
  width,
  dim,
  glow,
  pack,
}: {
  game: Game;
  width: number;
  dim: (c: Card) => boolean;
  glow: (c: Card) => boolean;
  pack?: string;
}) {
  const hand = game.hand;
  const variant = variantOf(game);
  const slots = Math.max(boardSize(variant), hand?.board.length ?? 0);
  const card = (i: number, w: number, style?: ViewStyle) => {
    const c = hand?.board[i];
    return (
      <View key={c ? `${hand!.number}-${c}` : `slot-${i}`} style={style}>
        {c ? (
          <PlayingCard
            card={c}
            width={w}
            flip
            dim={dim(c)}
            glow={glow(c)}
            pack={pack}
            delay={i < streetCards(variant, 'flop') ? i * 160 : 0}
          />
        ) : (
          <CardSlot width={w} />
        )}
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
        {Array.from({ length: slots }, (_, i) =>
          card(i, w, { position: 'absolute', top: (CROSS_CELLS[i][0] - 1) * (h + gap), left: (CROSS_CELLS[i][1] - 1) * (w + gap) }),
        )}
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
  const w = Math.min(wide ? 44 : 56, Math.floor((room - (perRow - 1) * gap) / perRow));
  return (
    <View accessibilityLabel="Board" style={{ flexDirection: 'row', gap, rowGap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
      {Array.from({ length: slots }, (_, i) => card(i, w, variant === 'pittsburgh' && i === 4 ? { marginLeft: 8 } : undefined))}
    </View>
  );
}

const SUIT_ORDER = 'shdc';
/** Memory Poker: the 20 cards taken out of the deck, sorted by suit then high to low, until the hand is dealt. */
function MemoryPeek({ game, width, pack }: { game: Game; width: number; pack?: string }) {
  const cards = [...(game.memory?.cards ?? [])].sort(
    (a, b) => SUIT_ORDER.indexOf(suitOf(a)) - SUIT_ORDER.indexOf(suitOf(b)) || rankOf(b) - rankOf(a),
  );
  const w = Math.min(30, Math.floor((width - spacing.md * 2 - 22 - spacing.lg * 2 - 9 * 3) / 10));
  return (
    <View
      accessibilityLabel={`Cards taken out: ${cards.map(short).join(' ')}`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center', maxWidth: w * 10 + 27 }}
    >
      {cards.map((c, i) => (
        <PlayingCard key={c} card={c} size="sm" width={w} flip delay={stagger(i)} pack={pack} />
      ))}
    </View>
  );
}

/** "Remember these 20 · 6s" under the cards. */
function MemoryCountdown({ game }: { game: Game }) {
  const now = useTableNow(game.fast, 250);
  const secs = Math.max(0, Math.ceil(((game.memory?.until ?? now) - now) / 1000));
  return <HandPill text={`🧠 Remember these 20 · ${secs}s`} />;
}

/** Your hand's name, under the board: a white pill, as on the web. */
function HandPill({ text }: { text: string }) {
  const c = usePlainColors();
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: c.surface,
        boxShadow: '0 1px 2px rgba(18,18,40,0.12)',
      }}
    >
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ color: c.label, fontWeight: '600', fontSize: 15 }}>
        {text}
      </Text>
    </View>
  );
}

/** "Pot 340" with a chip in front: the number counts down to nothing as the pot is pushed to the winner. */
function PotPill({ value, bigBlind }: { value: number; bigBlind: number }) {
  return (
    <View
      accessibilityLabel={`Pot ${chips(value)}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 8,
        paddingRight: 14,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.34)',
      }}
    >
      <PotChips pot={value} bigBlind={bigBlind} />
      <Text maxFontSizeMultiplier={1.2} style={{ color: 'rgba(255,255,255,0.78)', fontWeight: '600', fontSize: 13 }}>
        Pot
      </Text>
      <Count value={value} up="#bbf7d0" down="#fecaca" style={{ color: '#ffffff', fontWeight: '700', fontSize: 17 }} />
    </View>
  );
}

/** The game's name (or your Imposter role), a tap away from how it plays. */
function VariantPill({ text, hot }: { text: string; hot?: boolean }) {
  const c = usePlainColors();
  const dark = useColorScheme() === 'dark';
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: hot ? c.redBg : dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.75)',
      }}
    >
      <Text maxFontSizeMultiplier={1.2} style={{ color: hot ? c.redInk : c.label, fontWeight: '600', fontSize: 13 }}>
        {text}
      </Text>
    </View>
  );
}

/** "Remi wins 340 · Two pair", on the felt when a hand finishes. */
function WinBanner({ game, me }: { game: Game; me: Player | undefined }) {
  const reduce = useReduceMotion();
  const c = usePlainColors();
  const { width } = useWindowDimensions();
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
  } else if (result.blackjack) {
    // Blackjack Hold'em: who took the poker half and who took the 21 half of the main pot.
    const name = (id: string) => (id === me?.id ? 'You' : (game.players.find((p) => p.id === id)?.name ?? '?'));
    const poker = result.blackjack.poker[0] ?? [];
    const count = result.blackjack.winners[0] ?? [];
    const both = poker.length === 1 && count.length === 1 && poker[0] === count[0];
    title = both ? `${name(poker[0])} ${poker[0] === me?.id ? 'win' : 'wins'} both halves` : `Hand: ${poker.map(name).join(' & ')} · 21: ${count.map(name).join(' & ')}`;
    how = `${result.names[poker[0]] ?? ''} · closest to 21: ${result.blackjack.counts[count[0]] ?? '?'}`;
    face = game.players.find((p) => p.id === (poker[0] ?? count[0]))?.emoji ?? '♠️';
  } else if (!winners.length) {
    if (!result.ghost?.kept) return null;
    title = `The ghost keeps ${chips(result.ghost.kept)}`;
    how = result.ghost.name;
    face = '👻';
  } else {
    const top = winners[0];
    // A real split is one pot with more than one winner; a main pot and a side pot to different people isn't.
    const tied = result.pots.find((pot) => pot.winners.length > 1);
    const sharers = tied ? winners.filter((w) => tied.winners.includes(w.id)) : [];
    title = tied
      ? `Split pot · ${sharers.map((w) => w.p!.name).join(' & ')}`
      : `${top.p!.id === me?.id ? 'You win' : `${top.p!.name} wins`} ${chips(top.amount)}`;
    how = !result.showdown ? 'Everyone else folded' : tied ? `${result.names[sharers[0].id] ?? ''} · ${chips(sharers[0].amount)} each` : result.names[top.id];
    face = top.p!.emoji;
  }
  return (
    <Animated.View
      key={hand.number}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      entering={reduce ? FadeIn : bubblePop}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 6,
        paddingRight: 16,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: c.surface,
        boxShadow: '0 0 0 3px rgba(245,158,11,0.7), 0 6px 16px -6px rgba(0,0,0,0.5)',
      }}
    >
      <Avatar emoji={face} size={34} />
      <View style={{ maxWidth: width - 150 }}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ color: c.label, fontWeight: '700', fontSize: 15 }}>
          {title}
        </Text>
        {how && (
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ color: c.tertiaryLabel, fontWeight: '600', fontSize: 13 }}>
            {how}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
