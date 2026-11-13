// Play with bots: who's at the table as a small cluster of faces floating softly together, in place of a list (the
// owner's ask, 12 Nov 2026: not a big drawn table, a compact section, so the game card under it stays in view without
// scrolling; if it works it goes on the online lobby too). Each face sits in a filled circle with its name under it,
// and the two drift together. A new bot pops into the space; holding a bot (or the Bots stepper's minus) pops it back
// out. Faces sit in up to two loose, staggered rows, you first.
//
// Motion (docs/MOTION.md): the drift is transform only on the UI thread, stopped off screen, in the background and
// under Reduce Motion (useDrift). The pop in is ease-out from 50% and never from nothing (rule 10), the pop out is a
// short ease-out swell then away, quicker than the arrival (rule 15), and nothing overshoots (rule 13). A face that
// changes seat glides there with SETTLE. Under Reduce Motion faces only fade.
//
// Holding a bot draws a ring round its face, clockwise from the top, so you can see the hold working: it starts after
// 120ms (a tap never shows it), fills in a steady 530ms (a timer runs at an even pace, like the turn timer), and the
// bot pops out the moment it closes. Let go early and the ring unwinds back to the top, ease-out in 200ms (rule 15),
// with no overshoot. The ring is red, the app's colour for taking something away. It works the same under Reduce
// Motion: it shows progress, it doesn't move anything.
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { EASE_OUT, SETTLE } from '@/motion/presets';
import { useDrift } from '@/motion/use-drift';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, motion } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';

export interface FloatSeat {
  key: string;
  emoji: string;
  name: string;
  /** You: a gold ring, and never taken off. */
  you?: boolean;
  /** Being taken off: it pops out, then `onGone` runs. */
  leaving?: boolean;
  /** The Add a bot button, drawn the same size as a face and floating with them. */
  add?: boolean;
  /** False for someone who can't be held off (a person at an online table: they have `onPress` for their menu). */
  removable?: boolean;
  /** A tap: a person's menu (Report, Block, Remove). */
  onPress?: () => void;
  /** A Premium player's gold name. */
  gold?: boolean;
  /** A real person (not you): a solid white ring, where a bot's is faint, so people and bots tell apart at a glance. */
  person?: boolean;
}

/** A face's circle. Bigger since 13 Nov 2026 (the owner's ask) inside the same section: the room came out of the gaps. */
const FACE = 56;
/** The name under a face: its gap above and its line. */
const NAME_GAP = 3;
const LABEL = 14;
/** One row of faces with their names, a fixed 76 so the section keeps its size; the most a row holds. */
const ROW = 76;
const PER_ROW = 5;
const PAD = 10;
/** The section's height for this many faces: one row, or two. */
export const clusterHeight = (n: number) => Math.max(1, Math.ceil(n / PER_ROW)) * ROW + PAD * 2;
/** How long a press must last before a bot pops out: long enough to watch the ring go round, short enough not to drag. */
const HOLD_MS = 650;
/** The ring waits this long before it starts, so a quick tap never flashes it. */
const RING_WAIT = 120;
/** The hold ring: a little outside the face's own edge, so it reads as a ring round it, not a border. */
const RING_GAP = 4;
const RING_STROKE = 3;
const RING = FACE + (RING_GAP + RING_STROKE) * 2;
const RING_R = (RING - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_R;
/** From the face's inner edge (inside its 1pt border) out to the ring's. */
const RING_OUT = RING_GAP + RING_STROKE + 1;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
/** Apple's system red in dark mode: the colour for taking something away. */
const HOLD_RED = '#ff453a';
/** Where a new face starts (rule 10: from something, never from nothing). */
const POP_FROM = 0.5;

/**
 * Where each face rests: rows of up to five, every row split into the same equal columns across the whole width, so
 * everyone is evenly spaced and the group fills the section; a shorter last row is centred on the same columns.
 */
export function seatSpots(n: number, width: number): { x: number; y: number }[] {
  const rows = Math.max(1, Math.ceil(n / PER_ROW));
  const perRow = Math.max(1, Math.ceil(n / rows));
  const col = width / perRow;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - r * perRow);
    const k = i - r * perRow;
    return { x: width / 2 + (k - (inRow - 1) / 2) * col, y: PAD + FACE / 2 + r * ROW };
  });
}

/**
 * Everyone in one small section. `onHold` asks for a bot to be taken off (the parent marks it `leaving`), and
 * `onGone` runs once its pop out has played. `canRemove` is false when the last bot would leave the table empty.
 */
export function FloatTable({
  seats: people,
  canRemove,
  onHold,
  onGone,
  onAdd,
}: {
  seats: FloatSeat[];
  canRemove: boolean;
  onHold: (key: string) => void;
  onGone: (key: string) => void;
  /** Adds a bot; while set, an Add button floats at the end of the group. */
  onAdd?: () => void;
}) {
  const [width, setWidth] = useState(0);
  const seats: FloatSeat[] = onAdd ? [...people, { key: '+add', emoji: '', name: 'Add a bot', add: true }] : people;
  const staying = seats.filter((s) => !s.leaving);
  // Spots are worked out for those staying, so the others move over while one pops out.
  const spots = seatSpots(staying.length, width);
  const spotOf = new Map(staying.map((s, i) => [s.key, spots[i]]));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <View
      onLayout={onLayout}
      accessibilityLabel={`At the table: ${staying.filter((s) => !s.add).map((s) => (s.you ? 'you' : s.name)).join(', ')}`}
      style={{ height: clusterHeight(staying.length) }}
    >
      {width > 0 &&
        seats.map((s, i) => (
          <Floater
            key={s.key}
            seat={s}
            spot={spotOf.get(s.key) ?? spots[0] ?? { x: width / 2, y: PAD + FACE / 2 }}
            phase={i}
            canRemove={canRemove && !s.you && !s.add && s.removable !== false}
            onAdd={s.add ? onAdd : undefined}
            onHold={() => onHold(s.key)}
            onGone={() => onGone(s.key)}
          />
        ))}
    </View>
  );
}

/** One face and its name, drifting together round their seat. */
function Floater({
  seat,
  spot,
  phase,
  canRemove,
  onAdd,
  onHold,
  onGone,
}: {
  seat: FloatSeat;
  spot: { x: number; y: number };
  phase: number;
  canRemove: boolean;
  onAdd?: () => void;
  onHold: () => void;
  onGone: () => void;
}) {
  const reduce = useReduceMotion();
  // Each face keeps its own slow clock (4.2 to 6.6s a leg), so they never move in step.
  const { t } = useDrift(4200 + ((phase * 937) % 2400));
  const lean = (phase * 1.7) % (Math.PI * 2);
  const x = useSharedValue(spot.x);
  const y = useSharedValue(spot.y);
  const scale = useSharedValue(reduce ? 1 : POP_FROM);
  const opacity = useSharedValue(0);

  // Pops in where it sits.
  useEffect(() => {
    scale.set(withTiming(1, { duration: motion.base, easing: EASE_OUT }));
    opacity.set(withTiming(1, { duration: motion.base, easing: EASE_OUT }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Moves over when someone joins or leaves.
  useEffect(() => {
    x.set(withSpring(spot.x, SETTLE));
    y.set(withSpring(spot.y, SETTLE));
  }, [spot.x, spot.y]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pops out: a quick swell, then shrinks away and fades, quicker than it came; then it's gone for good.
  useEffect(() => {
    if (!seat.leaving) return;
    const out = motion.exit;
    opacity.set(withTiming(0, { duration: out, easing: EASE_OUT }, (done) => done && runOnJS(onGone)()));
    if (!reduce) scale.set(withSequence(withTiming(1.12, { duration: 80, easing: EASE_OUT }), withTiming(POP_FROM, { duration: out - 80, easing: EASE_OUT })));
  }, [seat.leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => {
    const d = t.get();
    return {
      opacity: opacity.get(),
      transform: [
        { translateX: x.get() - FACE / 2 + (d - 0.5) * 2 * 5 * Math.cos(lean) },
        { translateY: y.get() - FACE / 2 + Math.sin(d * Math.PI * 2 + lean) * 2.5 },
        { scale: scale.get() },
      ],
    };
  });

  const [held, setHeld] = useState(false);
  // The hold ring: 0 empty, 1 closed (the bot leaves).
  const ring = useSharedValue(0);
  const closed = useRef(false);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LENGTH * (1 - ring.get()) }));
  const ringTrack = useAnimatedStyle(() => ({ opacity: Math.min(1, ring.get() * 6) }));
  const startRing = () => {
    if (!canRemove) return;
    cancelAnimation(ring);
    ring.set(withDelay(RING_WAIT, withTiming(1, { duration: HOLD_MS - RING_WAIT, easing: Easing.linear })));
  };
  const dropRing = () => {
    if (closed.current) return;
    cancelAnimation(ring);
    ring.set(withTiming(0, { duration: motion.exit, easing: EASE_OUT }));
  };
  const box = [{ position: 'absolute' as const, left: 0, top: 0, width: FACE, alignItems: 'center' as const }, style];
  if (seat.add)
    // Add a bot: an empty seat the same size as a face, dashed, with a plus; a tap seats a bot that pops in.
    return (
      <Animated.View style={box}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a bot"
          onPressIn={() => setHeld(true)}
          onPressOut={() => setHeld(false)}
          onPress={() => {
            haptic.tap();
            onAdd?.();
          }}
          style={{ alignItems: 'center' }}
        >
          <View
            style={{
              width: FACE,
              height: FACE,
              borderRadius: FACE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: held ? 'rgba(91,139,255,0.28)' : 'rgba(91,139,255,0.14)',
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: brand.violetDark,
              transform: [{ scale: held ? 0.97 : 1 }],
            }}
          >
            <Icon name="plus" size={23} color={brand.violetDark} />
          </View>
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={{ marginTop: NAME_GAP, width: FACE + 10, textAlign: 'center', fontSize: 11, lineHeight: LABEL, fontWeight: '700', color: brand.violetDark }}>
            Add Bot
          </Text>
        </Pressable>
      </Animated.View>
    );
  return (
    <Animated.View pointerEvents={seat.leaving ? 'none' : 'auto'} style={[{ position: 'absolute', left: 0, top: 0, width: FACE, alignItems: 'center' }, style]}>
      <Pressable
        accessibilityRole={seat.you && !seat.onPress ? undefined : 'button'}
        accessibilityLabel={seat.you ? `${seat.name}, you` : seat.removable === false ? seat.name : `${seat.name}, bot`}
        accessibilityHint={canRemove ? 'Hold to take this bot off the table' : undefined}
        accessibilityActions={canRemove ? [{ name: 'longpress', label: 'Take off the table' }] : undefined}
        onAccessibilityAction={canRemove ? onHold : undefined}
        delayLongPress={HOLD_MS}
        onPressIn={() => {
          if (!seat.you || seat.onPress) setHeld(true);
          startRing();
        }}
        onPressOut={() => {
          setHeld(false);
          dropRing();
        }}
        onPress={
          seat.onPress
            ? () => {
                haptic.tap();
                seat.onPress?.();
              }
            : undefined
        }
        onLongPress={() => {
          if (seat.you || seat.removable === false) return;
          if (!canRemove) {
            haptic.failure();
            return;
          }
          closed.current = true;
          cancelAnimation(ring);
          ring.set(1);
          haptic.turn();
          onHold();
        }}
        style={{ alignItems: 'center' }}
      >
        <View
          style={{
            width: FACE,
            height: FACE,
            borderRadius: FACE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: held ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.16)',
            // You in gold, other people in solid white, bots in a faint ring.
            borderWidth: seat.you || seat.person ? 2 : 1,
            borderColor: seat.you ? brand.gold : seat.person ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.26)',
            boxShadow: '0 6px 14px -6px rgba(0,0,0,0.6)',
            transform: [{ scale: held ? 0.97 : 1 }],
          }}
        >
        {canRemove && (
          // The hold ring, drawn round the face from 12 o'clock (the view is turned a
          // quarter so the stroke starts at the top). Its faint track shows only once it has started.
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -RING_OUT, left: -RING_OUT, width: RING, height: RING, transform: [{ rotate: '-90deg' }] }, ringTrack]}>
            <Svg width={RING} height={RING}>
              <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke="rgba(255,255,255,0.14)" strokeWidth={RING_STROKE} fill="none" />
              <AnimatedCircle
                cx={RING / 2}
                cy={RING / 2}
                r={RING_R}
                stroke={HOLD_RED}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
                animatedProps={ringProps}
              />
            </Svg>
          </Animated.View>
        )}
          <Text style={{ fontSize: 30 }} maxFontSizeMultiplier={1}>
            {seat.emoji}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          style={{ marginTop: NAME_GAP, width: FACE + 10, textAlign: 'center', fontSize: 11, lineHeight: LABEL, fontWeight: '700', color: seat.you || seat.gold ? brand.gold : '#ffffff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 }}
        >
          {seat.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
