// The app's motion vocabulary. Values come from src/design/tokens.ts (`motion`) and the expo-animation skill's
// tables; nothing here is tuned by eye. Screens and sheets never use these: they use the native stack.
import { Easing, FadeIn, FadeInDown, FadeOut, FadeOutDown, ReduceMotion } from 'react-native-reanimated';

import { motion } from '@design/tokens';

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
  return reduce ? FadeOut.duration(motion.sheetOut) : FadeOutDown.duration(motion.sheetOut).easing(EASE_OUT);
}
