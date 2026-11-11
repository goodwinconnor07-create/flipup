import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import Animated, { cancelAnimation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

import { variantNeedsPremium, VARIANTS, type Variant } from '@/engine';
import { rubber, SETTLE } from '@/motion/presets';
import { useDrift } from '@/motion/use-drift';
import { usePremium } from '@/state/premium';
import { brand } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';

/** How big each card is by its distance from the middle (0 is the chosen one)... */
const SCALES = [1, 0.62, 0.46, 0.36];
/** ...how far from the middle it sits, in card widths (the outer ones tuck under the inner ones, like a fanned deck)... */
const PLACES = [0, 0.86, 1.24, 1.5];
/** ...and how much of it shows. */
const FADES = [1, 0.75, 0.45, 0];
/** How far a drag can run past the first or last game, in cards, before it stops giving. */
const ROOM = 0.45;
/** How far a flick carries on after the finger lifts (seconds of its speed), before it's rounded to a card. */
const PROJECT = 0.18;
/** A flick faster than this (points a millisecond) always moves on one card, however short. */
const FLICK = 0.3;
/** The settle spring's natural frequency: a release faster than this × the distance left would overshoot. */
const OMEGA = Math.sqrt(SETTLE.stiffness / SETTLE.mass);

/**
 * The games in a line across the whole screen, locked on one at a time: the chosen game big in the middle, its
 * neighbours smaller and fainter either side, all from one shared position. The card is exactly under the finger
 * while it drags (rule 14), meets a rubber band past the first and last game (rule 19), and on release the flick's
 * speed carries into the settle spring (`SETTLE`, critically damped, rule 13), capped so it lands on its card with
 * no overshoot. One swipe moves one game, however hard the flick. Each card that passes the middle gives a selection
 * tick and becomes the chosen game. The line floats a few points (not under Reduce Motion). Tap the middle card for
 * its page, a neighbour to bring it in. VoiceOver treats it as one adjustable control.
 */
export function GameSwiper({ variant, onChange, size, width }: { variant: Variant; onChange: (v: Variant) => void; size: number; width: number }) {
  const premium = usePremium();
  const step = size;
  const last = VARIANTS.length - 1;
  const start = Math.max(0, VARIANTS.findIndex((v) => v.id === variant));
  // The position along the line, in points: index × step.
  const x = useSharedValue(start * step);
  const drag = useRef({ base: 0, from: 0, ended: 0 });

  const pick = (i: number) => {
    const next = VARIANTS[Math.max(0, Math.min(last, i))];
    if (!next) return;
    haptic.select();
    onChange(next.id);
  };
  useAnimatedReaction(
    () => Math.round(Math.max(0, Math.min(last * step, x.get())) / step),
    (i, was) => {
      if (was !== null && i !== was) runOnJS(pick)(i);
    },
  );

  const settle = (target: number, velocity: number) => {
    const to = target * step;
    const left = to - x.get();
    // Moving towards the card faster than the spring can absorb would carry it past: cap it (rule 13).
    const v = Math.sign(velocity) === Math.sign(left) ? Math.sign(velocity) * Math.min(Math.abs(velocity), OMEGA * Math.abs(left)) : velocity;
    x.set(withSpring(to, { ...SETTLE, velocity: v }));
  };
  const to = (i: number) => settle(Math.max(0, Math.min(last, i)), 0);

  const pan = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- the handlers read the ref only while a finger moves, never while drawing
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Taps go to the cards; a sideways drag is taken from them.
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          cancelAnimation(x);
          const base = x.get();
          drag.current = { base, from: Math.round(base / step), ended: 0 };
        },
        onPanResponderMove: (_, g) => {
          const raw = drag.current.base - g.dx;
          const max = last * step;
          const room = step * ROOM;
          x.set(raw < 0 ? -rubber(-raw, 0, room) : raw > max ? max + rubber(raw - max, 0, room) : raw);
        },
        onPanResponderRelease: (_, g) => release(g.vx),
        onPanResponderTerminate: (_, g) => release(g.vx),
      }),
    // `step` and the count are all it reads; the shared value, the ref and `release` (which reads only those) are stable.
    [step, last], // eslint-disable-line react-hooks/exhaustive-deps
  );
  function release(vx: number) {
    drag.current.ended = Date.now();
    const velocity = -vx * 1000; // points a second, along the line
    const from = drag.current.from;
    let target = Math.round((x.get() + velocity * PROJECT) / step);
    if (target === from && Math.abs(vx) > FLICK) target = from + (vx < 0 ? 1 : -1);
    target = Math.max(0, Math.min(last, Math.max(from - 1, Math.min(from + 1, target))));
    settle(target, velocity);
  }

  const { t } = useDrift(2600);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -4 + 8 * t.get() }] }));
  const offsets = useMemo(() => PLACES.map((p) => p * size), [size]);
  return (
    <Animated.View
      {...pan.panHandlers}
      style={[{ width, height: size + 36 }, float]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Game"
      accessibilityValue={{ text: VARIANTS[start]?.name }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') to(start + 1);
        else if (e.nativeEvent.actionName === 'decrement') to(start - 1);
        else router.push(`/game/${variant}`);
      }}
    >
      {VARIANTS.map((v, i) => (
        <Card
          key={v.id}
          variant={v.id}
          index={i}
          x={x}
          step={step}
          size={size}
          left={(width - size) / 2}
          offsets={offsets}
          locked={!premium && variantNeedsPremium(v.id)}
          onPress={() => {
            // The web build can still deliver the tap a drag began with.
            if (Date.now() - drag.current.ended < 300) return;
            if (i === start) {
              haptic.tap();
              router.push(`/game/${v.id}`);
            } else to(i);
          }}
        />
      ))}
    </Animated.View>
  );
}

function Card({ variant, index, x, step, size, left, offsets, locked, onPress }: { variant: Variant; index: number; x: SharedValue<number>; step: number; size: number; left: number; offsets: number[]; locked: boolean; onPress: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = index - x.get() / step;
    const a = Math.abs(d);
    const steps = [0, 1, 2, 3];
    return {
      opacity: interpolate(a, steps, FADES, 'clamp'),
      zIndex: Math.round(10 - a * 2),
      transform: [{ translateX: Math.sign(d) * interpolate(a, steps, offsets, 'clamp') }, { scale: interpolate(a, steps, SCALES, 'clamp') }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left, top: 18 }, style]}>
      <PressableScale accessible={false} onPress={onPress} haptics={false}>
        <View style={{ borderRadius: size * 0.24, borderCurve: 'continuous', boxShadow: '0 18px 36px -12px rgba(0, 0, 0, 0.65)' }}>
          <GameThumb variant={variant} size={size} />
        </View>
        {locked && (
          <View style={{ position: 'absolute', top: -8, right: -8, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1533', borderWidth: 2, borderColor: brand.gold }}>
            <Icon name="crown.fill" size={15} color={brand.gold} />
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}
