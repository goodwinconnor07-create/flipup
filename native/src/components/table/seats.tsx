// The other players along the top of the table, drawn to the web's measurements (Pods.tsx and the pod rules in
// table.css): the speech bubble over the face, the plain emoji face with its position (a bot's card backs carry a small robot), the name in grey
// (full colour on their turn), the stack counting as it changes, their cards (with an orange shimmer sweeping over
// them while it's their turn), and a tag under them: what they've put in this round, a win, their odds during a
// run-out, or Offline.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { holeCount, holeCountAt, moveLabel, myPlayer, positionOf, seatFor, variantOf, type Card, type Game, type Player, type Position, type Seat, type Talk } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { me as myDevice, dispatch, useTable } from '@/state/session';
import { EASE_OUT } from '@/motion/presets';
import { usePlainColors, brand, motion } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { openPlayerMenu } from '../player-menu';
import { seatKey } from '@/state/blocks';
import { xrayCard } from '@/state/power-view';
import { ThemedText } from '../themed-text';
import { bubbleOut, bubblePop, MoveBubble, moveTone, pinned, Thread, TypingBubble } from './bubbles';
import { TagChip } from './challenge';
import { Count } from './count';
import { GhostDivider, GhostSeat } from './ghost-seat';
import { PlayingCard } from './playing-card';
import { planWindow, type WindowAnchor } from './pod-window';
import { moveSig } from './use-reactions';
import { SeatBadge } from './variant-steps';

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
 * The web's usePodSlots: up to four players show (three beside the ghost). With more, the row is a window that moves only when it has to:
 * players who've folded drop out (unless they're still saying something), and it moves to keep whoever's acting (or
 * the winner) in view, or to bring a speaker in when the one in focus can stay. `canShow(id)` says whether someone
 * could be seen talking, so a line from someone out of view isn't queued.
 */
export function usePodSlots(
  game: Game,
  others: Player[],
  talking: Record<string, unknown>,
): { shown: Player[]; hidden: Player[]; canShow: (id: string) => boolean } {
  const [anchor, setAnchor] = useState<WindowAnchor>({ id: null, idx: 0 });
  const justFolded = useJustFolded(game.hand);
  // The ghost takes a seat's room in Haunted Pot, so three players show beside it instead of four.
  const max = variantOf(game) === 'ghost' ? MAX_PODS - 1 : MAX_PODS;
  if (others.length <= max) return { shown: others, hidden: [], canShow: () => true };
  const hand = game.hand;
  const ids = others.map((p) => p.id);
  const folded = hand ? new Set(hand.seats.filter((x) => x.folded).map((x) => x.playerId)) : null;
  const focus = hand?.result ? Object.entries(hand.result.won).sort((a, b) => b[1] - a[1])[0]?.[0] : hand?.toAct;
  const plan = (speaking: ReadonlySet<string>) => planWindow({ others: ids, folded, justFolded, speaking, focus: focus ?? undefined, max, anchor });
  const now = new Set(Object.keys(talking));
  const { live, n, s } = plan(now);
  const first = live[s] ?? null;
  if (first !== anchor.id || s !== anchor.idx) setAnchor({ id: first, idx: s });
  const shownIds = new Set(live.slice(s, s + n));
  const shown = others.filter((p) => shownIds.has(p.id));
  const canShow = (id: string) => {
    const p = plan(new Set([...now, id]));
    return p.live.slice(p.s, p.s + p.n).includes(id);
  };
  return { shown, hidden: others.filter((p) => !shownIds.has(p.id)), canShow };
}

/** How long a player who just folded stays in the row, so their "Fold" bubble can be read before they go. */
const FOLD_LINGER_MS = 600;

/** The players who folded in the last moment (`FOLD_LINGER_MS`) of this hand, each on their own clock. */
function useJustFolded(hand: Game['hand']): ReadonlySet<string> {
  const n = hand?.number ?? 0;
  const folded = hand ? hand.seats.filter((x) => x.folded).map((x) => x.playerId) : [];
  const [s, setS] = useState<{ n: number; seen: string[]; recent: string[] }>({ n, seen: folded, recent: [] });
  const fresh = n === s.n ? folded.filter((id) => !s.seen.includes(id)) : [];
  if (n !== s.n) setS({ n, seen: folded, recent: [] });
  else if (fresh.length) setS({ n, seen: [...s.seen, ...fresh], recent: [...s.recent, ...fresh] });
  // Each fold has its own timer, so a second fold doesn't keep the first one on screen.
  const [timed] = useState(() => new Set<string>());
  useEffect(() => {
    timed.clear();
  }, [n, timed]);
  useEffect(() => {
    for (const id of s.recent) {
      if (timed.has(id)) continue;
      timed.add(id);
      setTimeout(() => setS((p) => ({ ...p, recent: p.recent.filter((x) => x !== id) })), FOLD_LINGER_MS);
    }
  }, [s.recent, timed]);
  return new Set(s.recent);
}

/** The row of other players across the top. */
export function SeatRow({
  game,
  compact = false,
  shown,
  hidden,
  say,
  quiet,
  dimCard,
  glowCard,
  odds,
}: {
  game: Game;
  compact?: boolean;
  shown: Player[];
  hidden: Player[];
  say: Record<string, Talk>;
  quiet: Record<string, string>;
  dimCard: (c: Card) => boolean;
  glowCard: (c: Card) => boolean;
  odds: Map<string, { win: number; tie: number }> | null;
}) {
  const reduce = useReduceMotion();
  // Seats fade in as the window moves, but not all at once when the table first draws.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    // The row reaches a little into the side margins, so each seat (and its bubble) gets more room.
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginHorizontal: 4, paddingTop: compact ? 24 : 30, minHeight: compact ? 140 : 166 }}>
      {variantOf(game) === 'ghost' && (
        <>
          <GhostSeat game={game} compact={compact} />
          <GhostDivider compact={compact} />
        </>
      )}
      {shown.map((p) => (
        <Animated.View
          key={p.id}
          entering={settled && !reduce ? FadeIn.duration(motion.base).easing(EASE_OUT) : undefined}
          exiting={reduce ? undefined : FadeOut.duration(motion.exit).easing(EASE_OUT)}
          layout={reduce ? undefined : LinearTransition.duration(motion.base).easing(EASE_OUT)}
          style={{ flex: 1, maxWidth: 110 }}
        >
          <SeatPod
            game={game}
            compact={compact}
            player={p}
            seat={seatFor(game.hand, p.id)}
            talk={say[p.id]}
            quiet={quiet[p.id]}
            dimCard={dimCard}
            glowCard={glowCard}
            odds={odds?.get(p.id)}
            n={shown.length}
          />
        </Animated.View>
      ))}
      {hidden.length > 0 && <HiddenPlayers game={game} players={hidden} />}
    </View>
  );
}

/** "+3 more": the players not in the row right now. A tap lists them with their chips. */
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
        style={{
          position: 'absolute',
          right: -2,
          bottom: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          minHeight: 30,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.separator,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        <Icon name="person.2.fill" size={14} color={c.label} />
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 15, fontWeight: '700', color: c.label }}>
          +{players.length} more
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} onPress={() => setOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: 120,
              right: 16,
              minWidth: 220,
              padding: 8,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: c.surface,
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            }}
          >
            {players.map((p) => {
              const seat = seatFor(game.hand, p.id);
              return (
                <View
                  key={p.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 8,
                    minHeight: 44,
                    opacity: game.hand && (!seat || seat.folded) ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 24 }} maxFontSizeMultiplier={1}>
                    {p.emoji}
                  </Text>
                  <ThemedText variant="body" numberOfLines={1} style={{ flex: 1, fontWeight: '600', ...(p.gold ? { color: brand.gold } : {}) }}>
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

/** How many face-down cards a player in the hand holds: three in Crazy Pineapple until the discard, more each street in Bean Stalk (Hit Me's hits are added per seat). */
function faceDown(game: Game, playerId?: string): number {
  const v = variantOf(game);
  if (v === 'beanstalk') return holeCountAt(v, game.hand?.board.length ?? 0);
  const hand = game.hand;
  // Onion: five, less what they've peeled; Conveyor Belt four; Double Board PLO five (four at a full table of nine).
  if (v === 'onion') return 5 - (playerId ? (hand?.peeled?.[playerId]?.length ?? 0) : 0);
  if (v === 'belt' || v === 'plo') return holeCount(v, hand?.seats.length ?? 0);
  const three =
    !!hand && (hand.board.length < 3 || (hand.board.length === 3 && !hand.discarding && hand.nextStreetAt == null && hand.showdownAt == null && !hand.result));
  return v === 'pineapple' && three ? 3 : 2;
}

function SeatPod({
  game,
  player,
  compact = false,
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
  compact?: boolean;
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
  const tag = useTable().challenge?.tags[player.id];
  const hand = game.hand;
  const host = game.hostDeviceId === myDevice;
  const turn = !!hand && !hand.result && hand.toAct === player.id;
  // Before the first hand is dealt nobody is out: they're just waiting for the cards.
  const out = !!hand && (!seat || seat.folded);
  const won = hand?.result?.won[player.id] ?? 0;
  const status = player.stack === 0 && !seat ? 'Out' : player.sittingOut ? 'Away' : null;
  const thinking = turn && player.bot && !hand?.runout;
  // A move from an earlier street clears once the new cards land, so last street's "Raise 25" never sits over this
  // one. An all in stays: it's still true.
  const last = seat?.last && (!hand || seat.last.street === hand.street || seat.last.move === 'allin') ? seat.last : null;
  // A move whose talk has run its course stays hidden, so it doesn't look like they moved again.
  const hush = !!hand && !!quiet && quiet === moveSig(hand.number, last);
  // Once the hand is over, the host can tap a bot's face-down cards to turn them over.
  // Another person (not a bot, not you) at an online table can be reported or blocked.
  const other = !player.bot && !!game.code && !!player.deviceId && player.deviceId !== myDevice;
  const canPeek = host && !!hand?.result && player.bot && !!seat && !seat.shown && seat.cards.length === 0;
  // Headband: their forehead card faces you (the second of the two).
  const forehead = hand?.headbands?.[player.id];
  const cards: (Card | null)[] =
    seat && (!seat.folded || seat.cards.length > 0)
      ? seat.cards.length
        ? seat.cards
        : Array.from({ length: faceDown(game, player.id) + (hand?.hits?.[player.id] ?? 0) }, (_, i) => (i === 1 && forehead ? forehead : null))
      : [];
  // Onion: the cards they've peeled off, face up beside the rest.
  const peeled = hand?.peeled?.[player.id] ?? [];
  // The dealer button and blinds sit on the back of the last face-down card (BTN, SB, BB); heads-up the button shows BTN.
  const pos = positionOf(hand, player.id);
  const mark = pos && pos.kind !== 'other' ? (pos.kind === 'btn' ? 'BTN' : pos.label) : undefined;
  // Power Cards: the card your X-ray showed you sits face up in place of their first face-down card (only on your phone).
  const xray = xrayCard(hand, myPlayer(game, myDevice)?.id, player.id);
  // A seat's share of the row, for wrapping its talk.
  const room = Math.floor((width + 8) / Math.max(n, 1)) - 4;
  return (
    <Pressable
      accessibilityLabel={`${player.name}${player.bot ? ', a bot' : ''}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}${player.offline ? ', offline' : ''}`}
      accessibilityHint={game.challenge?.id === 'detective' && player.bot ? 'Tag it with a style' : canPeek ? 'Shows their cards' : host || other ? 'Options for this player' : undefined}
      disabled={!host && !other}
      onPress={() => {
        haptic.tap();
        // Style Detective: a bot's seat takes a tag.
        if (game.challenge?.id === 'detective' && player.bot) return router.push({ pathname: '/challenge-tag', params: { id: player.id } });
        // After a hand, the host's tap turns a bot's cards over.
        if (canPeek && hand) return dispatch({ type: 'revealBots', hand: hand.number, playerId: player.id });
        const inHand = !!seat && !!hand && !hand.result;
        const remove = host
          ? [
              {
                text: 'Remove from table',
                style: 'destructive' as const,
                onPress: () =>
                  Alert.alert(
                    `Remove ${player.name}?`,
                    inHand ? 'Their hand is folded and they leave the table.' : 'They leave the table with their chips.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'remove', playerId: player.id }) },
                    ],
                  ),
              },
            ]
          : [];
        const info = `${chips(player.stack)} chips${player.bot ? ' · Bot' : ''}`;
        const key = seatKey(player);
        // Another person at an online table: Report and Block (App Store guideline 1.2), and the host's Remove.
        if (other && key && game.code)
          return openPlayerMenu(
            { key, name: player.name, emoji: player.emoji, where: 'table', code: game.code, playerId: player.id },
            player.name,
            info,
            remove,
          );
        Alert.alert(player.name, info, [{ text: 'Cancel', style: 'cancel' }, ...remove]);
      }}
      style={{ alignItems: 'center' }}
    >
      <View style={{ width: compact ? 48 : 56, height: compact ? 40 : 54, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ opacity: out ? 0.35 : player.offline ? 0.55 : 1 }}>
          <SeatFace emoji={player.emoji} size={compact ? 36 : 50} turn={turn} />
        </View>
        <SeatBadge game={game} playerId={player.id} />
        {tag && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -22, bottom: 6 }}>
            <TagChip label={tag} />
          </View>
        )}
        {/* The bubble sits over the top of the face, as on the web. */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: compact ? 34 : 48, left: -40, right: -40, height: 0 }}>
          {talk ? (
            <Thread talk={talk} room={room} place={pinned('center')} />
          ) : thinking ? (
            <Animated.View key="thinking" entering={bubblePop} exiting={bubbleOut} style={pinned('center')}>
              <TypingBubble label={`${player.name} is thinking`} />
            </Animated.View>
          ) : last && !hush ? (
            <Animated.View key={`${hand?.number}-${moveLabel(last)}`} entering={bubblePop} exiting={bubbleOut} style={pinned('center')}>
              <MoveBubble
                text={moveLabel(last)}
                tone={moveTone(last.move, hand, player.id, game.settings.bigBlind)}
                old={!!hand && last.street !== hand.street}
              />
            </Animated.View>
          ) : null}
        </View>
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={{
          maxWidth: '100%',
          fontSize: compact ? 13 : 15,
          lineHeight: compact ? 15 : 17,
          fontWeight: player.gold ? '800' : '700',
          // A Premium player's gold name (Settings > Gold name).
          color: player.gold ? brand.gold : turn ? c.label : c.tertiaryLabel,
          opacity: out ? 0.35 : 1,
        }}
      >
        {player.name}
      </Text>
      <View style={{ opacity: out ? 0.35 : 1 }}>
        {status ? (
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: compact ? 15 : 17, lineHeight: compact ? 16 : 18, fontWeight: '700', color: c.label }}>
            {status}
          </Text>
        ) : (
          <Count value={player.stack} style={{ fontSize: compact ? 15 : 17, lineHeight: compact ? 16 : 18, fontWeight: '700', color: c.label }} />
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
                ) : xray && i === 0 ? (
                  // Ringed in gold with an eye: you know this one, nobody else at the table does.
                  <View accessibilityLabel="The card your X-ray showed you" style={{ borderRadius: 6, boxShadow: `0 0 0 2px ${brand.gold}` }}>
                    <PlayingCard card={xray} size="sm" flip />
                    <View pointerEvents="none" style={{ position: 'absolute', bottom: -6, right: -6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.gold }}>
                      <Icon name="eye.fill" size={9} color={brand.goldInk} />
                    </View>
                  </View>
                ) : (
                  <View>
                    <PlayingCard back size="sm" pack={player.cardPack} mark={i === cards.length - 1 ? mark : undefined} />
                    {/* A bot's cards say so on the back: a small robot, in place of a BOT pill on the face. The card with the position chip keeps the chip alone. */}
                    {player.bot && !(i === cards.length - 1 && mark) && (
                      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="cpu.fill" size={13} color="rgba(255, 255, 255, 0.7)" />
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
            {peeled.length > 0 && (
              <View accessibilityLabel={`Peeled: ${peeled.join(' ')}`} style={{ flexDirection: 'row', marginLeft: 4, gap: 1, alignSelf: 'flex-end' }}>
                {peeled.map((p) => (
                  <PlayingCard key={p} card={p} size="sm" width={16} dim />
                ))}
              </View>
            )}
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
function SeatTag({
  c,
  won,
  odds,
  offline,
}: {
  c: ReturnType<typeof usePlainColors>;
  won: number;
  odds?: { win: number };
  offline: boolean;
}) {
  const tag = (key: string, text: string, bg: string, ink: string, chip = false) => (
    <Animated.View
      key={key}
      entering={bubblePop}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: bg,
      }}
    >
      {chip && (
        <View
          style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.red, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }}
        />
      )}
      <Text
        maxFontSizeMultiplier={1.2}
        style={{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: ink, fontVariant: ['tabular-nums'] }}
      >
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
      style={{
        minWidth: 20,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        // The ink ring is drawn inside the fill, not as a border, so its antialiased edge leaves no stray outline.
        backgroundColor: look.bg,
        boxShadow: look.edge ? `inset 0 0 0 1.5px ${look.edge}` : undefined,
      }}
    >
      <Text maxFontSizeMultiplier={1} style={{ fontSize: 9, fontWeight: '800', color: look.ink }}>
        {pos.label}
      </Text>
    </View>
  );
}

/**
 * A seat's emoji: plain, no reactions. On their turn a soft gold glow breathes behind it (a slow 3.2s cycle at low
 * opacity; still under Reduce Motion). Only other players' seats use it; your own box has its own.
 */
export function SeatFace({ emoji, size, turn }: { emoji: string; size: number; turn: boolean }) {
  const reduce = useReduceMotion();
  const glow = useSharedValue(0.5);
  useEffect(() => {
    cancelAnimation(glow);
    if (!turn || reduce) {
      glow.set(0.5);
      return;
    }
    glow.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [turn, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const halo = useAnimatedStyle(() => ({ opacity: 0.35 * glow.get() + 0.15 }));
  return (
    <View style={{ width: size + 6, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {turn && (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: brand.gold, boxShadow: `0 0 ${size * 0.5}px ${size * 0.2}px ${brand.gold}` }, halo]}
        />
      )}
      <Text style={{ fontSize: size * 0.82, lineHeight: size }} maxFontSizeMultiplier={1} accessible={false}>
        {emoji}
      </Text>
    </View>
  );
}
