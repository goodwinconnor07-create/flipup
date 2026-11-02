import { useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { holeCountAt, moveLabel, positionOf, seatFor, variantOf, type Game, type Player, type Position, type Seat } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing, useColors } from '@/theme';

import { ThemedText } from '../themed-text';
import { PlayingCard } from './playing-card';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');
const MAX_SEATS_SHOWN = 4;

/** Everyone else, in seat order starting on your left, so play moves left to right. */
export function othersInOrder(game: Game, me: Player | undefined): Player[] {
  const all = [...game.players].sort((a, b) => a.seat - b.seat);
  if (!me) return all;
  const i = all.findIndex((p) => p.id === me.id);
  return [...all.slice(i + 1), ...all.slice(0, i)];
}

/**
 * Up to four players show along the top (the web table's rule). With more at the table the row is a window: players
 * who've folded drop out, and it moves only to keep whoever's acting (or the winner) in view.
 */
function useWindow(game: Game, others: Player[]): Player[] {
  const start = useRef(0);
  if (others.length <= MAX_SEATS_SHOWN) return others;
  const hand = game.hand;
  const live = others.filter((p) => {
    if (!hand) return true;
    const seat = seatFor(hand, p.id);
    return !!seat && !seat.folded;
  });
  const n = Math.min(MAX_SEATS_SHOWN, live.length);
  let s = Math.max(0, Math.min(start.current, live.length - n));
  const focus = hand?.result ? Object.entries(hand.result.won).sort((a, b) => b[1] - a[1])[0]?.[0] : hand?.toAct;
  const at = live.findIndex((p) => p.id === focus);
  if (at >= 0) {
    if (at < s) s = at;
    else if (at > s + n - 1) s = at - n + 1;
  }
  start.current = s;
  return live.slice(s, s + n);
}

/** The row of other players across the top of the table. */
export function SeatRow({ game, me }: { game: Game; me: Player | undefined }) {
  const others = othersInOrder(game, me);
  const shown = useWindow(game, others);
  const hidden = others.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', paddingHorizontal: spacing.xs, minHeight: 150 }}>
      {shown.map((p) => (
        <Animated.View key={p.id} layout={LinearTransition.duration(250)} entering={FadeIn.duration(200)} style={{ flex: 1, maxWidth: 96 }}>
          <SeatPod game={game} player={p} seat={seatFor(game.hand, p.id)} />
        </Animated.View>
      ))}
      {hidden > 0 && (
        <View style={{ position: 'absolute', right: spacing.xs, top: 0 }} accessibilityLabel={`${hidden} more players not shown`}>
          <Capsule text={`+${hidden}`} tone="grey" />
        </View>
      )}
    </View>
  );
}

/** One player: their speech bubble (last move, or dots while a bot thinks), face, BOT chip, position, name, chips, cards and bet. */
function SeatPod({ game, player, seat }: { game: Game; player: Player; seat: Seat | undefined }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const hand = game.hand;
  const turn = !!hand && !hand.result && hand.toAct === player.id;
  const out = !!hand && (!seat || seat.folded);
  const won = hand?.result?.won[player.id] ?? 0;
  const status = player.stack === 0 && !seat ? 'Out' : player.sittingOut ? 'Away' : null;
  const thinking = turn && player.bot && !hand?.runout;
  const last = seat?.last;
  const money = !!last && last.move !== 'fold' && last.move !== 'check' && last.move !== 'sb' && last.move !== 'bb';
  const stale = !!last && !!hand && last.street !== hand.street;
  const faceDown = holeCountAt(variantOf(game), hand?.board.length ?? 0);
  return (
    <View
      accessible
      accessibilityLabel={`${player.name}${player.bot ? ', a bot' : ''}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}`}
      style={{ alignItems: 'center', opacity: out ? 0.45 : 1 }}
    >
      <View style={{ height: 30, justifyContent: 'flex-end' }}>
        {thinking ? (
          <Capsule text="•••" tone="grey" />
        ) : last ? (
          <Animated.View key={`${hand?.number}-${moveLabel(last)}`} entering={reduce ? FadeIn : ZoomIn.springify().damping(14)} style={{ opacity: stale ? 0.55 : 1 }}>
            <Capsule text={moveLabel(last)} tone={money ? 'blue' : 'grey'} />
          </Animated.View>
        ) : null}
      </View>
      <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        <Text style={{ fontSize: 44, lineHeight: 52 }} maxFontSizeMultiplier={1}>
          {player.emoji}
        </Text>
        {player.bot && (
          <View style={{ position: 'absolute', left: -6, bottom: 2, paddingHorizontal: 4, borderRadius: 4, backgroundColor: colors.slate }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }} maxFontSizeMultiplier={1}>
              BOT
            </Text>
          </View>
        )}
        <View style={{ position: 'absolute', right: -8, bottom: 4 }}>
          <PositionChip pos={positionOf(hand, player.id)} />
        </View>
      </View>
      <ThemedText variant="footnote" numberOfLines={1} style={{ fontWeight: '700', maxWidth: 90 }} maxFontSizeMultiplier={1.2}>
        {player.name}
      </ThemedText>
      <ThemedText variant="subhead" style={{ fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 18 }} maxFontSizeMultiplier={1.2}>
        {status ?? chips(player.stack)}
      </ThemedText>
      <View style={{ height: 40, marginTop: 4, flexDirection: 'row', gap: 2 }}>
        {seat && (!seat.folded || seat.cards.length > 0) &&
          (seat.cards.length
            ? seat.cards.map((c) => <PlayingCard key={c} card={c} size="sm" flip />)
            : Array.from({ length: faceDown }, (_, i) => <PlayingCard key={i} back size="sm" />))}
      </View>
      <View style={{ height: 22, justifyContent: 'center' }}>
        {won > 0 ? (
          <Tag text={`+${chips(won)}`} color={colors.green as string} />
        ) : seat && seat.bet > 0 && hand && !hand.result ? (
          <Tag text={`● ${chips(seat.bet)}`} color={colors.gold as string} />
        ) : null}
      </View>
    </View>
  );
}

/** A plain speech capsule: blue for chips going in, grey for check, fold and thinking. */
export function Capsule({ text, tone }: { text: string; tone: 'blue' | 'grey' }) {
  const colors = useColors();
  return (
    <View style={{ paddingHorizontal: spacing.xs + 2, paddingVertical: 3, borderRadius: radius.full, backgroundColor: tone === 'blue' ? colors.accent : colors.cellPressed }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '700', color: tone === 'blue' ? '#ffffff' : colors.label }}>
        {text}
      </Text>
    </View>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full, backgroundColor: colors.cell }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>
        {text}
      </Text>
    </View>
  );
}

const POS_LOOK: Record<Position['kind'], { bg: string; ink: string; edge?: string }> = {
  btn: { bg: '#ffffff', ink: '#000000', edge: '#000000' },
  sb: { bg: '#0a84ff', ink: '#ffffff' },
  bb: { bg: '#ff9f0a', ink: '#3d2200' },
  other: { bg: '#8e8e93', ink: '#ffffff' },
};

/** BTN, SB, BB, CO, HJ...: where a seat sits this hand. */
export function PositionChip({ pos }: { pos: Position | null }) {
  if (!pos) return null;
  const look = POS_LOOK[pos.kind];
  return (
    <View
      accessibilityLabel={`Position ${pos.label}`}
      style={{ minWidth: 20, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: look.bg, borderWidth: look.edge ? 1.5 : 0, borderColor: look.edge }}
    >
      <Text maxFontSizeMultiplier={1} style={{ fontSize: 9, fontWeight: '800', color: look.ink }}>
        {pos.label}
      </Text>
    </View>
  );
}
