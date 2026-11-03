import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { RAILS } from '@design/tableLooks';
import { BOTS, describeHand, fullDeck, shuffle, type Card } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useTableLook } from '@/state/prefs';
import { useProfile } from '@/state/profile';
import { gradient, party, radius, spacing, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';
import { PlayingCard } from '../table/playing-card';

/** The room round the table: dark in both appearances, like the lights are down. */
const ROOM = 'linear-gradient(165deg, #241c3d 0%, #0d0a17 100%)';

/** Where each seat sits round the oval (centre of the face, as a share of the oval), you at the bottom. */
const SEATS = [
  { x: 0.5, y: 1.0 },
  { x: 0.05, y: 0.62 },
  { x: 0.22, y: 0.02 },
  { x: 0.78, y: 0.02 },
  { x: 0.95, y: 0.62 },
] as const;

/** The hand's beats, in ms from the deal: flop, turn, river, showdown, then a new hand. */
const BEATS = [1100, 2500, 3700, 4900, 7600] as const;
const POTS = [60, 240, 520, 1240, 1240];

const FACES = BOTS.slice(0, SEATS.length - 1);

/** A hand dealt for the show: everyone's two cards and the board, and who wins it. */
function deal(seed: number) {
  let s = seed * 9301 + 49297;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const deck = shuffle(fullDeck(), rng);
  const holes = SEATS.map((_, i) => [deck[i * 2], deck[i * 2 + 1]] as Card[]);
  const board = deck.slice(12, 17);
  const values = holes.map((h) => describeHand([...h, ...board]));
  const winner = values.reduce((best, v, i) => (v.score > values[best].score ? i : best), 0);
  return { holes, board, winner, name: values[winner].name };
}

/**
 * Home's table: your own felt and rail, four regulars and you, a hand dealt and played out on a loop (the flop, the
 * turn, the river, a winner), and the two ways to sit down under it. Still under Reduce Motion, and while Home is
 * covered or in the background.
 */
export function TableHero({ onFriends, onBots }: { onFriends: () => void; onBots: () => void }) {
  const shadow = useShadows();
  const look = useTableLook();
  const profile = useProfile();
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen - spacing.md * 2, 560);
  const oval = { w: width - spacing.xxl * 2, h: Math.round((width - spacing.xxl * 2) * 0.5) };
  const [round, setRound] = useState(1);
  const [step, setStep] = useState(0);
  const hand = useMemo(() => deal(round), [round]);
  // Still (the whole hand shown) under Reduce Motion, and while Home is covered.
  const still = reduce || !focused;
  const beat = still ? 4 : step;

  useEffect(() => {
    if (still) return;
    // Back on Home part way through a hand: deal a fresh one rather than run the old one backwards.
    if (step !== 0) {
      const t = setTimeout(() => {
        setStep(0);
        setRound((r) => r + 1);
      }, 0);
      return () => clearTimeout(t);
    }
    const timers = BEATS.map((at, i) =>
      setTimeout(() => {
        if (i === BEATS.length - 1) {
          setStep(0);
          setRound((r) => r + 1);
        } else setStep(i + 1);
      }, at),
    );
    return () => timers.forEach(clearTimeout);
  }, [round, still]); // eslint-disable-line react-hooks/exhaustive-deps -- the beats are timed from the deal, so a new step mustn't restart them

  const rail = RAILS.find((r) => r.id === look.rail)?.colors ?? RAILS[0].colors;
  const shown = beat === 0 ? 0 : beat === 1 ? 3 : beat === 2 ? 4 : 5;
  const showdown = beat >= 4;
  const winnerName = hand.winner === 0 ? 'You' : FACES[hand.winner - 1].name;
  const cardW = Math.min(34, Math.round(oval.w / 8.4));

  return (
    <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadow.raised, overflow: 'hidden', ...gradient(ROOM) }}>
      {/* A pool of light over the table. */}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, ...gradient('radial-gradient(ellipse at 50% 30%, rgba(255, 214, 140, 0.22) 0%, transparent 62%)') }} />
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="A poker table: you and four bots, a hand being played"
        style={{ marginTop: spacing.xxl + spacing.xs, marginBottom: spacing.xxl + spacing.md, marginHorizontal: spacing.xxl, height: oval.h }}
      >
        {/* The rail, then the felt inside it. */}
        <View style={{ position: 'absolute', inset: 0, borderRadius: oval.h / 2, padding: 7, boxShadow: '0 14px 30px -12px rgba(0, 0, 0, 0.8)', ...gradient(`linear-gradient(165deg, ${rail[0]}, ${rail[1]})`) }}>
          <View style={{ flex: 1, borderRadius: oval.h / 2, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, ...gradient(`radial-gradient(ellipse at 50% 38%, ${tint(look.felt, 0.14)} 0%, ${look.felt} 46%, ${tint(look.felt, -0.42)} 100%)`) }}>
            <Pot amount={POTS[beat]} />
            <View style={{ flexDirection: 'row', gap: 4, height: Math.round(cardW * 1.4) }}>
              {hand.board.map((c, i) =>
                i < shown ? (
                  <PlayingCard key={`${round}-${i}`} card={c} width={cardW} size="md" flip={!reduce && beat < 4} delay={i < 3 ? i * 110 : 0} glow={false} />
                ) : (
                  <View key={`${round}-${i}`} style={{ width: cardW, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.18)', borderStyle: 'dashed' }} />
                ),
              )}
            </View>
            <View style={{ height: 22, justifyContent: 'center' }}>
              {showdown && (
                <Animated.View entering={reduce ? undefined : FadeInDown.duration(300)} style={{ paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, backgroundColor: 'rgba(0, 0, 0, 0.35)' }}>
                  <Text maxFontSizeMultiplier={1} numberOfLines={1} style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                    {winnerName} {hand.winner === 0 ? 'win' : 'wins'} · {hand.name}
                  </Text>
                </Animated.View>
              )}
            </View>
          </View>
        </View>
        {SEATS.map((p, i) => (
          <Seat
            key={i}
            x={p.x * oval.w}
            y={p.y * oval.h}
            emoji={i === 0 ? profile.emoji || '🙂' : FACES[i - 1].emoji}
            cards={hand.holes[i]}
            faceUp={i === 0 || (showdown && i === hand.winner)}
            winner={showdown && i === hand.winner}
            you={i === 0}
            round={round}
            reduce={reduce}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, paddingTop: 0 }}>
        <Way icon="person.2.fill" title="With friends" label="Play with friends" tint={party.blue} onPress={onFriends} />
        <Way icon="cpu.fill" title="With bots" label="Play with bots" tint={party.green} onPress={onBots} />
      </View>
    </View>
  );
}

function Pot({ amount }: { amount: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full, backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#ffffff', backgroundColor: party.yellow }} />
      <Text maxFontSizeMultiplier={1} style={{ color: '#ffffff', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
        {amount.toLocaleString('en-US')}
      </Text>
    </View>
  );
}

const FACE = 40;

function Seat({ x, y, emoji, cards, faceUp, winner, you, round, reduce }: { x: number; y: number; emoji: string; cards: Card[]; faceUp: boolean; winner: boolean; you: boolean; round: number; reduce: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - FACE / 2, top: y - FACE / 2, width: FACE, alignItems: 'center' }}>
      <View
        style={{
          width: FACE,
          height: FACE,
          borderRadius: FACE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: you ? '#ffffff' : 'rgba(255, 255, 255, 0.16)',
          borderWidth: 2,
          borderColor: winner ? party.yellow : 'rgba(255, 255, 255, 0.35)',
          boxShadow: winner ? `0 0 16px 2px ${party.yellow}` : undefined,
        }}
      >
        <Text maxFontSizeMultiplier={1} style={{ fontSize: 22 }}>
          {emoji}
        </Text>
      </View>
      <Animated.View key={`${round}-${faceUp}`} entering={reduce ? undefined : (winner ? ZoomIn : FadeIn).duration(260)} style={{ flexDirection: 'row', marginTop: -6 }}>
        {cards.map((c, i) => (
          <View key={i} style={{ marginLeft: i ? -8 : 0, transform: [{ rotate: i ? '8deg' : '-8deg' }] }}>
            <PlayingCard card={c} back={!faceUp} size="sm" width={you ? 24 : 18} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/** One of the two ways in: a chunky white button with a coloured icon and a bottom edge. */
function Way({ icon, title, label, tint: colour, onPress }: { icon: IconName; title: string; label: string; tint: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      outerStyle={{ flex: 1 }}
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: '#ffffff',
        borderBottomWidth: 4,
        borderBottomColor: party.edge,
      }}
    >
      <Icon name={icon} size={20} color={colour} />
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontSize: 17, fontWeight: '800', color: '#000000' }}>
        {title}
      </Text>
    </PressableScale>
  );
}

/** A felt colour made lighter (amount > 0) or darker, as the table's felt is shaded. */
function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * a));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
