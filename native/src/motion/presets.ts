// The app's motion vocabulary. Values come from src/design/tokens.ts (`motion`) and the expo-animation skill's
// tables; nothing here is tuned by eye. Screens and sheets never use these: they use the native stack.
import { Easing, FadeIn, FadeInDown, FadeOut, FadeOutDown, ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { motion } from '@design/tokens';

import { settleSpring } from './rules';

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
