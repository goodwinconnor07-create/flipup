// The other players along the top of the table, drawn to the web's measurements (Pods.tsx and the pod rules in
// table.css): the speech bubble over the face, the reacting face with its position (a bot's card backs carry a small robot), the name in grey
// (full colour on their turn), the stack counting as it changes, their cards (with an orange shimmer sweeping over
// them while it's their turn), and a tag under them: what they've put in this round, a win, their odds during a
// run-out, or Offline.
import { useRef, useState } from 'react';
import { Alert, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { holeCountAt, moveLabel, positionOf, seatFor, variantOf, type Card, type Game, type Player, type Position, type Seat, type Talk } from '@/engine';
import { me as myDevice, dispatch } from '@/state/session';
import { usePlainColors, brand } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { openPlayerMenu } from '../player-menu';
import { seatKey } from '@/state/blocks';
import { ThemedText } from '../themed-text';
import { bubbleOut, bubblePop, MoveBubble, pinned, Thread, TypingBubble } from './bubbles';
import { Count } from './count';
import { MoodFace } from './mood-face';
import { PlayingCard } from './playing-card';
import { moveSig } from './use-reactions';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');
export const pct = (n: number) => `${Math.round(n * 100)}%`;
const MAX_PODS = 4;

/** Everyone else, in seat order starting on your left, so play moves left to right. */
export function othersInOrder(game: Game, me: Player | undefined): Player[] {
  const all = [...game.players].sort((a, b) => a.seat - b.seat);
  if (!me) return all;
  const i = all.findIndex((p) => p.id === me.id);
  return [...all.slice(i + 1), ...all.slice(0, i)];
}

/**
 * The web's usePodSlots: up to four players show. With more, the row is a window that moves only when it has to:
 * players who've folded drop out (unless they're still saying something), and it moves to keep whoever's acting (or
 * the winner) in view, or to bring a speaker in when the one in focus can stay. `canShow(id)` says whether someone
 * could be seen talking, so a line from someone out of view isn't queued.
 */
export function usePodSlots(game: Game, others: Player[], talking: Record<string, unknown>): { shown: Player[]; hidden: Player[]; canShow: (id: string) => boolean } {
  const start = useRef(0);
  if (others.length <= MAX_PODS) return { shown: others, hidden: [], canShow: () => true };
  const hand = game.hand;
  const liveFor = (speaking: ReadonlySet<string>) =>
    others.filter((p) => {
      if (!hand) return true;
      const seat = seatFor(hand, p.id);
      return !!seat && (!seat.folded || speaking.has(p.id));
    });
  const focus = hand?.result ? Object.entries(hand.result.won).sort((a, b) => b[1] - a[1])[0]?.[0] : hand?.toAct;
  const plan = (speaking: ReadonlySet<string>) => {
    const live = liveFor(speaking);
    const n = Math.min(MAX_PODS, live.length);
    let s = Math.max(0, Math.min(start.current, live.length - n));
    const at = live.findIndex((p) => p.id === focus);
    if (at >= 0) {
      if (at < s) s = at;
      else if (at > s + n - 1) s = at - n + 1;
    }
    const speaker = live.findIndex((p, i) => speaking.has(p.id) && (i < s || i > s + n - 1));
    if (speaker >= 0) {
      const to = speaker < s ? speaker : speaker - n + 1;
      if (at < 0 || (at >= to && at <= to + n - 1)) s = to;
    }
    return { live, n, s };
  };
  const now = new Set(Object.keys(talking));
  const { live, n, s } = plan(now);
  start.current = s;
  const shown = live.slice(s, s + n);
  const canShow = (id: string) => {
    const p = plan(new Set([...now, id]));
    return p.live.slice(p.s, p.s + p.n).some((x) => x.id === id);
  };
  return { shown, hidden: others.filter((p) => !shown.includes(p)), canShow };
}

/** The row of other players across the top. */
export function SeatRow({
  game,
  shown,
  hidden,
  say,
  quiet,
  dimCard,
  glowCard,
  odds,
}: {
  game: Game;
  shown: Player[];
  hidden: Player[];
  say: Record<string, Talk>;
  quiet: Record<string, string>;
  dimCard: (c: Card) => boolean;
  glowCard: (c: Card) => boolean;
  odds: Map<string, { win: number; tie: number }> | null;
}) {
  return (
    // The row reaches a little into the side margins, so each seat (and its bubble) gets more room.
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginHorizontal: 4, paddingTop: 30, minHeight: 166 }}>
      {shown.map((p) => (
        <View key={p.id} style={{ flex: 1, maxWidth: 110 }}>
          <SeatPod game={game} player={p} seat={seatFor(game.hand, p.id)} talk={say[p.id]} quiet={quiet[p.id]} dimCard={dimCard} glowCard={glowCard} odds={odds?.get(p.id)} n={shown.length} />
        </View>
      ))}
      {hidden.length > 0 && <HiddenPlayers game={game} players={hidden} />}
    </View>
  );
}

/** "+3": the players not in the row right now. A tap lists them with their chips. */
function HiddenPlayers({ game, players }: { game: Game; players: Player[] }) {
  const c = usePlainColors();
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
        style={{ position: 'absolute', right: -2, bottom: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.cell }}
      >
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '600', color: c.tertiaryLabel }}>
          +{players.length}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', top: 120, right: 16, minWidth: 220, padding: 8, borderRadius: 16, borderCurve: 'continuous', backgroundColor: c.surface, boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>
            {players.map((p) => {
              const seat = seatFor(game.hand, p.id);
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, minHeight: 44, opacity: game.hand && (!seat || seat.folded) ? 0.5 : 1 }}>
                  <Text style={{ fontSize: 24 }} maxFontSizeMultiplier={1}>
                    {p.emoji}
                  </Text>
                  <ThemedText variant="body" numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
                    {p.name}
                  </ThemedText>
                  <ThemedText variant="body" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
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

/** How many face-down cards a player in the hand holds: three in Crazy Pineapple until the discard, more each street in Bean Stalk. */
function faceDown(game: Game): number {
  const v = variantOf(game);
  if (v === 'beanstalk') return holeCountAt(v, game.hand?.board.length ?? 0);
  const hand = game.hand;
  const three = !!hand && (hand.board.length < 3 || (hand.board.length === 3 && !hand.discarding && hand.nextStreetAt == null && !hand.result));
  return v === 'pineapple' && three ? 3 : 2;
}

function SeatPod({
  game,
  player,
  seat,
  talk,
  quiet,
  dimCard,
  glowCard,
  odds,
  n,
}: {
  game: Game;
  player: Player;
  seat: Seat | undefined;
  talk?: Talk;
  quiet?: string;
  dimCard: (c: Card) => boolean;
  glowCard: (c: Card) => boolean;
  odds?: { win: number; tie: number };
  n: number;
}) {
  const c = usePlainColors();
  const { width } = useWindowDimensions();
  const hand = game.hand;
  const host = game.hostDeviceId === myDevice;
  const turn = !!hand && !hand.result && hand.toAct === player.id;
  // Before the first hand is dealt nobody is out: they're just waiting for the cards.
  const out = !!hand && (!seat || seat.folded);
  const won = hand?.result?.won[player.id] ?? 0;
  const status = player.stack === 0 && !seat ? 'Out' : player.sittingOut ? 'Away' : null;
  const thinking = turn && player.bot && !hand?.runout;
  const last = seat?.last;
  const money = !!last && last.move !== 'fold' && last.move !== 'check' && last.move !== 'sb' && last.move !== 'bb';
  // A move whose talk has run its course stays hidden, so it doesn't look like they moved again.
  const hush = !!hand && !!quiet && quiet === moveSig(hand.number, last);
  // Once the hand is over, the host can tap a bot's face-down cards to turn them over.
  // Another person (not a bot, not you) at an online table can be reported or blocked.
  const other = !player.bot && !!game.code && !!player.deviceId && player.deviceId !== myDevice;
  const canPeek = host && !!hand?.result && player.bot && !!seat && !seat.shown && seat.cards.length === 0;
  const cards = seat && (!seat.folded || seat.cards.length > 0) ? (seat.cards.length ? seat.cards : Array.from({ length: faceDown(game) }, () => null)) : [];
  // A seat's share of the row, for wrapping its talk.
  const room = Math.floor((width + 8) / Math.max(n, 1)) - 4;
  return (
    <Pressable
      accessibilityLabel={`${player.name}${player.bot ? ', a bot' : ''}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}${player.offline ? ', offline' : ''}`}
      accessibilityHint={canPeek ? 'Shows their cards' : host || other ? 'Options for this player' : undefined}
      disabled={!host && !other}
      onPress={() => {
        haptic.tap();
        // After a hand, the host's tap turns a bot's cards over.
        if (canPeek && hand) return dispatch({ type: 'revealBots', hand: hand.number, playerId: player.id });
        const inHand = !!seat && !!hand && !hand.result;
        const remove = host
          ? [
              {
                text: 'Remove from table',
                style: 'destructive' as const,
                onPress: () =>
                  Alert.alert(`Remove ${player.name}?`, inHand ? 'Their hand is folded and they leave the table.' : 'They leave the table with their chips.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'remove', playerId: player.id }) },
                  ]),
              },
            ]
          : [];
        const info = `${chips(player.stack)} chips${player.bot ? ' · Bot' : ''}`;
        const key = seatKey(player);
        // Another person at an online table: Report and Block (App Store guideline 1.2), and the host's Remove.
        if (other && key && game.code) return openPlayerMenu({ key, name: player.name, emoji: player.emoji, where: 'table', code: game.code, playerId: player.id }, player.name, info, remove);
        Alert.alert(player.name, info, [{ text: 'Cancel', style: 'cancel' }, ...remove]);
      }}
      style={{ alignItems: 'center' }}
    >
      <View style={{ width: 56, height: 54, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ opacity: out ? 0.35 : player.offline ? 0.55 : 1 }}>
          <MoodFace game={game} player={player} seat={seat} size={50} />
        </View>
        <View style={{ position: 'absolute', right: -15, bottom: 8 }}>
          <PositionChip pos={positionOf(hand, player.id)} />
        </View>
        {/* The bubble sits over the top of the face, as on the web. */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 48, left: -40, right: -40, height: 0 }}>
          {talk ? (
            <Thread talk={talk} fx={player.bubble} room={room} place={pinned('center')} />
          ) : thinking ? (
            <Animated.View key="thinking" entering={bubblePop} exiting={bubbleOut} style={pinned('center')}>
              <TypingBubble label={`${player.name} is thinking`} />
            </Animated.View>
          ) : last && !hush ? (
            <Animated.View key={`${hand?.number}-${moveLabel(last)}`} entering={bubblePop} exiting={bubbleOut} style={pinned('center')}>
              <MoveBubble text={moveLabel(last)} tone={money ? 'blue' : 'grey'} fx={player.bubble} old={!!hand && last.street !== hand.street} />
            </Animated.View>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ maxWidth: '100%', fontSize: 15, lineHeight: 17, fontWeight: '700', color: turn ? c.label : c.tertiaryLabel, opacity: out ? 0.35 : 1 }}>
        {player.name}
      </Text>
      <View style={{ opacity: out ? 0.35 : 1 }}>
        {status ? (
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 17, lineHeight: 18, fontWeight: '700', color: c.label }}>
            {status}
          </Text>
        ) : (
          <Count value={player.stack} style={{ fontSize: 17, lineHeight: 18, fontWeight: '700', color: c.label }} />
        )}
      </View>
      <View style={{ alignItems: 'center', gap: 4, minHeight: 52, paddingTop: 4 }}>
        {cards.length > 0 && (
          <View style={{ flexDirection: 'row' }}>
              {cards.map((card, i) => (
                // Two cards overlap a little; more (Pineapple, Bean Stalk) fan tighter to stay inside the seat.
                <View key={card ?? i} style={{ marginLeft: i === 0 ? 0 : cards.length > 3 ? -12 : -6 }}>
                  {card ? (
                    <PlayingCard card={card} size="sm" flip dim={dimCard(card)} glow={glowCard(card)} pack={player.cardPack} />
                  ) : (
                    <View>
                      <PlayingCard back size="sm" pack={player.cardPack} />
                      {/* A bot's cards say so on the back: a small robot, in place of a BOT pill on the face. */}
                      {player.bot && (
                        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="cpu.fill" size={13} color="rgba(255, 255, 255, 0.7)" />
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
          </View>
        )}
        {/* A fixed slot, so a tag coming or going never changes the row's height and moves the table. */}
        <View style={{ height: 20, justifyContent: 'center' }}>
          <SeatTag c={c} won={won} odds={odds} offline={!!player.offline} />
        </View>
      </View>
    </Pressable>
  );
}

/** Under a seat: a win, odds in a run-out, or Offline. */
function SeatTag({ c, won, odds, offline }: { c: ReturnType<typeof usePlainColors>; won: number; odds?: { win: number }; offline: boolean }) {
  const tag = (key: string, text: string, bg: string, ink: string, chip = false) => (
    <Animated.View key={key} entering={bubblePop} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: bg }}>
      {chip && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.red, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }} />}
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: ink, fontVariant: ['tabular-nums'] }}>
        {text}
      </Text>
    </Animated.View>
  );
  if (won > 0) return tag(`w${won}`, `+${chips(won)}`, c.gold, brand.goldInk);
  if (odds) return tag('o', pct(odds.win), c.contrast, c.onContrast);
  if (offline) return tag('off', 'Offline', c.goldBg, c.goldInk);
  return null;
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

