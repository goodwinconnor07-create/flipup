import { useEffect, useRef, useState, type RefObject } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { holeCountAt, moveLabel, positionOf, seatFor, variantOf, type Game, type Player, type Position, type Seat, type Talk } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing, useColors } from '@/theme';

import { haptic } from '../haptics';
import { ThemedText } from '../themed-text';
import { Capsule, Thread } from './bubbles';
import { MoodFace } from './mood-face';
import { PlayingCard } from './playing-card';
import { moveSig } from './use-reactions';

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

/**
 * The row of other players across the top of the table. `say` and `quiet` are the table talk (useReactions);
 * `shownRef` is told who's in view, so nobody out of it holds up the talk.
 */
export function SeatRow({ game, me, say, quiet, shownRef }: { game: Game; me: Player | undefined; say: Record<string, Talk>; quiet: Record<string, string>; shownRef: RefObject<Set<string>> }) {
  const others = othersInOrder(game, me);
  const shown = useWindow(game, others);
  const ids = shown.map((p) => p.id).join(',');
  useEffect(() => {
    shownRef.current = new Set(ids.split(','));
  }, [ids, shownRef]);
  const hidden = others.filter((p) => !shown.includes(p));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', paddingHorizontal: spacing.xs, minHeight: 156 }}>
      {shown.map((p) => (
        <Animated.View key={p.id} layout={LinearTransition.duration(250)} entering={FadeIn.duration(200)} style={{ flex: 1, maxWidth: 96 }}>
          <SeatPod game={game} player={p} seat={seatFor(game.hand, p.id)} talk={say[p.id]} quiet={quiet[p.id]} />
        </Animated.View>
      ))}
      {hidden.length > 0 && <HiddenPlayers game={game} players={hidden} />}
    </View>
  );
}

/** "+3": the players out of the row. A tap lists them with their chips. */
function HiddenPlayers({ game, players }: { game: Game; players: Player[] }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${players.length} more players`}
        hitSlop={8}
        onPress={() => {
          haptic.tap();
          setOpen(true);
        }}
        style={{ position: 'absolute', right: spacing.xs, top: 0 }}
      >
        <Capsule text={`+${players.length}`} tone="grey" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', top: 110, right: spacing.md, minWidth: 220, padding: spacing.xs, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>
            {players.map((p) => {
              const seat = seatFor(game.hand, p.id);
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs, minHeight: 44, opacity: game.hand && (!seat || seat.folded) ? 0.5 : 1 }}>
                  <Text style={{ fontSize: 24 }} maxFontSizeMultiplier={1}>
                    {p.emoji}
                  </Text>
                  <ThemedText variant="body" numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
                    {p.name}
                  </ThemedText>
                  <ThemedText variant="body" style={{ fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                    {p.stack === 0 && !seat ? 'Out' : chips(p.stack)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** One player: their speech bubble (last move, or dots while a bot thinks), face, BOT chip, position, name, chips, cards and bet. */
function SeatPod({ game, player, seat, talk, quiet }: { game: Game; player: Player; seat: Seat | undefined; talk?: Talk; quiet?: string }) {
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
  // A move whose talk has run its course stays hidden, so it doesn't look like they moved again.
  const hush = !!hand && !!quiet && quiet === moveSig(hand.number, last);
  const faceDown = holeCountAt(variantOf(game), hand?.board.length ?? 0);
  return (
    <View
      accessible
      accessibilityLabel={`${player.name}${player.bot ? ', a bot' : ''}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}`}
      style={{ alignItems: 'center', opacity: out ? 0.5 : 1 }}
    >
      <View style={{ height: 30, justifyContent: 'flex-end' }}>
        {talk ? (
          <Thread talk={talk} fx={player.bubble} room={92} />
        ) : thinking ? (
          <Capsule text="•••" tone="grey" />
        ) : last && !hush ? (
          <Animated.View key={`${hand?.number}-${moveLabel(last)}`} entering={reduce ? FadeIn : ZoomIn.springify().damping(14)} style={{ opacity: stale ? 0.55 : 1 }}>
            <Capsule text={moveLabel(last)} tone={money ? 'blue' : 'grey'} fx={player.bubble} />
          </Animated.View>
        ) : null}
      </View>
      <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        <MoodFace game={game} player={player} seat={seat} size={52} />
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
      <View style={{ height: 40, marginTop: 4, flexDirection: 'row' }}>
        {seat && (!seat.folded || seat.cards.length > 0) &&
          (seat.cards.length ? seat.cards : Array.from({ length: faceDown }, () => null)).map((c, i, all) => (
            // Two cards sit side by side; more (Pineapple, Bean Stalk) fan over each other to stay inside the seat.
            <View key={c ?? i} style={{ marginLeft: i === 0 ? 0 : all.length > 2 ? -Math.ceil(26 - 54 / (all.length - 1)) : 2 }}>
              {c ? <PlayingCard card={c} size="sm" flip pack={player.cardPack} /> : <PlayingCard back size="sm" pack={player.cardPack} />}
            </View>
          ))}
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
