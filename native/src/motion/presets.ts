// The app's motion vocabulary. Values come from src/design/tokens.ts (`motion`) and the expo-animation skill's
// tables; nothing here is tuned by eye. Screens and sheets never use these: they use the native stack.
import { Easing, FadeIn, FadeInDown, FadeOut, FadeOutDown, ReduceMotion, withTiming, ZoomIn, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { motion } from '@design/tokens';

import { settleSpring, stagger } from './rules';

export { arcPoint, exitMs, knobStretch, rubber, settleSpring, stagger } from './rules';

/** Strong ease-out for anything entering or leaving. Never ease-in on UI. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** For something moving across the screen. */
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/** Press release: the spring the plan names (mass 1, stiffness 450, damping 30). */
export const PRESS_SPRING = { ...motion.pressSpring, reduceMotion: ReduceMotion.Never } as const;

/**
 * A small element appearing (a toast, a banner, a chip): it rises 8pt and fades in over 250ms. With Reduce
 * Motion it only fades.
 */
export function enter(reduce: boolean) {
  return reduce ? FadeIn.duration(motion.base).easing(EASE_OUT) : FadeInDown.duration(motion.base).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 8 }] });
}

/** The same element leaving, quicker than it came. */
export function exit(reduce: boolean) {
  return reduce ? FadeOut.duration(motion.exit) : FadeOutDown.duration(motion.exit).easing(EASE_OUT);
}

/**
 * Something that pops in where it is (a verdict, a letter, a count): it grows from 95% and fades in over 250ms,
 * ease-out, with no overshoot. Never from nothing (rule 10) and never a bounce (rule 13). This file is the only
 * place `ZoomIn` may be used. Call sites write `reduce ? undefined : popIn()`.
 */
export function popIn() {
  return ZoomIn.duration(motion.base).easing(EASE_OUT).withInitialValues({ transform: [{ scale: motion.popFrom }] });
}

/** A spring that settles without overshooting, for a thing that lets go and comes to rest (rule 13). */
export const SETTLE = { ...settleSpring(1, 300), reduceMotion: ReduceMotion.Never } as const;

// Rules 16, 17 and 18: one thing replacing another. The old one leaves while the new one arrives (they overlap,
// there is no empty beat). An icon crossfades with scale and blur; text slides through a mask (the container
// clips it) by a few points. The arrival runs 250ms ease-out, the leaving 200ms (20% shorter, rule 15).
const SWAP_BLUR = 4;
const SWAP_SCALE = 0.5;
const SWAP_SLIDE = 8;
const IN = { duration: motion.base, easing: EASE_OUT } as const;
const OUT = { duration: motion.exit, easing: EASE_OUT } as const;

const iconIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: SWAP_SCALE }], filter: [{ blur: SWAP_BLUR }] },
    animations: { opacity: withTiming(1, IN), transform: [{ scale: withTiming(1, IN) }], filter: [{ blur: withTiming(0, IN) }] },
  } as never;
};
const iconOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }], filter: [{ blur: 0 }] },
    animations: { opacity: withTiming(0, OUT), transform: [{ scale: withTiming(SWAP_SCALE, OUT) }], filter: [{ blur: withTiming(SWAP_BLUR, OUT) }] },
  } as never;
};
const textIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: SWAP_SLIDE }] },
    animations: { opacity: withTiming(1, IN), transform: [{ translateY: withTiming(0, IN) }] },
  } as never;
};
const textOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: { opacity: withTiming(0, OUT), transform: [{ translateY: withTiming(-SWAP_SLIDE, OUT) }] },
  } as never;
};

// A panel that opens from the bottom, where its trigger is (rules 11 and 12): it rises 40pt from 95%, anchored at its
// bottom edge, and sinks back the same way, 20% quicker. Its parts settle one after another (`detail`).
const riseIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 40 }, { scale: motion.popFrom }] },
    animations: { opacity: withTiming(1, IN), transform: [{ translateY: withTiming(0, IN) }, { scale: withTiming(1, IN) }] },
  } as never;
};
const sinkOut: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: { opacity: withTiming(0, OUT), transform: [{ translateY: withTiming(40, OUT) }, { scale: withTiming(motion.popFrom, OUT) }] },
  } as never;
};

/** A panel opening from its trigger at the bottom of the screen (the raise panel). Set `transformOrigin: '50% 100%'` on it. */
export function rise(reduce: boolean) {
  return reduce ? FadeIn.duration(motion.exit) : riseIn;
}

/** The same panel closing. */
export function sink(reduce: boolean) {
  return reduce ? FadeOut.duration(motion.exit) : sinkOut;
}

/** Part `i` of a panel that has just opened: it fades in 30ms after the one before (rule 6). */
export function detail(i: number, reduce: boolean) {
  return reduce ? undefined : FadeIn.duration(motion.base).easing(EASE_OUT).delay(stagger(i + 1));
}

/** What arrives when one thing replaces another (see `Swap`). Under Reduce Motion it's a short fade. */
export function swapIn(kind: 'icon' | 'text', reduce: boolean) {
  return reduce ? FadeIn.duration(motion.exit) : kind === 'icon' ? iconIn : textIn;
}

/** What leaves while the new one arrives. */
export function swapOut(kind: 'icon' | 'text', reduce: boolean) {
  return reduce ? FadeOut.duration(motion.exit) : kind === 'icon' ? iconOut : textOut;
}
