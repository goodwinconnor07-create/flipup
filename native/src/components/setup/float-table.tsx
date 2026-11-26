// Play with bots: who's at the table as a small cluster of faces, in place of a list (the
// owner's ask, 12 Nov 2026: not a big drawn table, a compact section, so the game card under it stays in view without
// scrolling; if it works it goes on the online lobby too). Each face sits in a filled circle with its name under it,
// and they sit still (23 Nov 2026, the owner: they drifted until then, one moving thing too many on a lobby whose page
// light already moves). A new bot pops into the space; a tap or a long press on a bot opens its menu (Remove,
// and Swap where the page can), and Remove pops it back out. Faces sit in up to two loose, staggered rows, you first.
//
// Motion (docs/MOTION.md): the pop in is ease-out from 50% and never from nothing (rule 10), the pop out is a
// short ease-out swell then away, quicker than the arrival (rule 15), and nothing overshoots (rule 13). A face that
// changes seat glides there with SETTLE. Under Reduce Motion faces only fade.
//
// A bot's menu (19 Nov 2026, the owner's call): it replaced holding a bot until a red ring closed, which nobody found
// without the caption under the faces. A tap is what people try first, and a long press is the iPhone's way to a
// menu, so both open the same action sheet, the way a person's seat opens theirs. Removing still offers Undo.
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_OUT, SETTLE } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, motion, useLobbyTint } from '@/theme';

import { type LabBot } from '@/state/bot-lab';

import { BotPicker, type Anchor } from '../bot-lab/bot-picker';
import { choose } from '../choose';
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
  /** False for someone who can't be taken off here (a person at an online table: they have `onPress` for their menu). */
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
 * Everyone in one small section. A bot's menu asks for it to be taken off through `onHold` (the parent marks it
 * `leaving`), and `onGone` runs once its pop out has played. `onSwap`, where the page can, swaps it for another bot.
 * `canRemove` is false when the last bot would leave the table empty.
 */
export function FloatTable({
  seats: people,
  canRemove,
  onHold,
  onGone,
  onAdd,
  onAddLab,
  onSwap,
}: {
  seats: FloatSeat[];
  canRemove: boolean;
  onHold: (key: string) => void;
  /** Swaps a bot for another random one, in its place. Offered in the bot's menu while set. */
  onSwap?: (key: string) => void;
  onGone: (key: string) => void;
  /** Adds a bot; while set, an Add button floats at the end of the group. */
  onAdd?: () => void;
  /**
   * Seats a bot you made in Bot Lab. While set, the Add button opens a small menu (`BotPicker`): a random bot,
   * then your Bot Lab bots, then Bot Lab itself.
   */
  onAddLab?: (bot: LabBot) => void;
}) {
  const [width, setWidth] = useState(0);
  const [menu, setMenu] = useState<Anchor | null>(null);
  const openAdd = (anchor?: Anchor) => {
    if (onAddLab && anchor) setMenu(anchor);
    else onAdd?.();
  };
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
        seats.map((s) => (
          <Floater
            key={s.key}
            seat={s}
            spot={spotOf.get(s.key) ?? spots[0] ?? { x: width / 2, y: PAD + FACE / 2 }}
            canRemove={canRemove && !s.you && !s.add && s.removable !== false}
            onAdd={s.add ? openAdd : undefined}
            onHold={() => onHold(s.key)}
            onSwap={onSwap && !s.you && !s.add && s.removable !== false ? () => onSwap(s.key) : undefined}
            onGone={() => onGone(s.key)}
          />
        ))}
      {menu && (
        <BotPicker
          anchor={menu}
          seated={people.map((p) => p.name)}
          onRandom={() => onAdd?.()}
          onLab={(b) => onAddLab?.(b)}
          onClose={() => setMenu(null)}
        />
      )}
    </View>
  );
}

/** One face and its name, at their seat. */
function Floater({
  seat,
  spot,
  canRemove,
  onAdd,
  onHold,
  onSwap,
  onGone,
}: {
  seat: FloatSeat;
  spot: { x: number; y: number };
  canRemove: boolean;
  /** The Add button's tap, with where the button is on screen so a menu can open from it. */
  onAdd?: (anchor?: Anchor) => void;
  onHold: () => void;
  onSwap?: () => void;
  onGone: () => void;
}) {
  const reduce = useReduceMotion();
  const addRef = useRef<ComponentRef<typeof View>>(null);
  const tint = useLobbyTint();
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
    return {
      opacity: opacity.get(),
      transform: [{ translateX: x.get() - FACE / 2 }, { translateY: y.get() - FACE / 2 }, { scale: scale.get() }],
    };
  });

  const [held, setHeld] = useState(false);
  // A bot you may take off (not you, not a person with their own menu): its menu.
  const isBot = !seat.you && !seat.add && seat.removable !== false;
  const botMenu = () => {
    haptic.tap();
    choose(seat.name, canRemove ? undefined : 'A table needs at least one bot.', [
      ...(onSwap ? [{ text: 'Swap for another bot', onPress: onSwap }] : []),
      ...(canRemove ? [{ text: 'Remove from table', style: 'destructive' as const, onPress: onHold }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };
  const menu = seat.onPress
    ? () => {
        haptic.tap();
        seat.onPress?.();
      }
    : isBot
      ? botMenu
      : undefined;
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
            const ref = addRef.current;
            if (!ref) return onAdd?.();
            ref.measureInWindow((ax, ay, aw, ah) => onAdd?.({ x: ax, y: ay, w: aw, h: ah }));
          }}
          style={{ alignItems: 'center' }}
        >
          <View
            ref={addRef}
            style={{
              width: FACE,
              height: FACE,
              borderRadius: FACE / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: held ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: tint.link,
              transform: [{ scale: held ? 0.97 : 1 }],
            }}
          >
            <Icon name="plus" size={23} color={tint.link} />
          </View>
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={{ marginTop: NAME_GAP, width: FACE + 10, textAlign: 'center', fontSize: 11, lineHeight: LABEL, fontWeight: '700', color: tint.link }}>
            Add Bot
          </Text>
        </Pressable>
      </Animated.View>
    );
  return (
    <Animated.View pointerEvents={seat.leaving ? 'none' : 'auto'} style={[{ position: 'absolute', left: 0, top: 0, width: FACE, alignItems: 'center' }, style]}>
      <Pressable
        accessibilityRole={menu ? 'button' : undefined}
        accessibilityLabel={seat.you ? `${seat.name}, you` : seat.removable === false ? seat.name : `${seat.name}, bot`}
        accessibilityHint={isBot ? 'Opens a menu to remove or swap this bot' : undefined}
        onPressIn={() => menu && setHeld(true)}
        onPressOut={() => setHeld(false)}
        onPress={menu}
        onLongPress={menu}
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
