// Haptics, iPhone only. Light impact on a button tap, a selection tick when a choice changes, and the
// notification types for success and failure. Never on scrolling or other passive touches.
// At the table: a soft tap as a card lands, a rigid one as your chips go in, a win that grows with the pot,
// a tick for each of your last five seconds, and a Core Haptics pattern under an all-in run-out.
import * as Haptics from 'expo-haptics';

import { FlipupHaptics } from '../../modules/flipup-haptics';
import { RUNOUT_AHAP } from './haptic-patterns';

const on = process.env.EXPO_OS === 'ios';
const impact = (style: Haptics.ImpactFeedbackStyle) => void (on && Haptics.impactAsync(style));
const later = (ms: number, go: () => void) => (ms > 0 ? setTimeout(go, ms) : go());

/** Core Haptics when this build has it, otherwise the fallback made of plain impacts. */
function pattern(ahap: string, fallback: () => void): void {
  if (!on) return;
  if (FlipupHaptics?.isSupported()) void FlipupHaptics.play(ahap).catch(fallback);
  else fallback();
}

export const haptic = {
  tap: () => impact(Haptics.ImpactFeedbackStyle.Light),
  /** Your turn: a firmer tap, as the web's medium buzz. */
  turn: () => impact(Haptics.ImpactFeedbackStyle.Medium),
  select: () => void (on && Haptics.selectionAsync()),
  success: () => void (on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  failure: () => void (on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  /** A card landing in front of you or on the board: soft, like card on felt. */
  card: (offsetMs = 0) => later(offsetMs, () => impact(Haptics.ImpactFeedbackStyle.Soft)),
  /** Your chips going in: rigid and short, like clay on clay. */
  chip: (offsetMs = 0) => later(offsetMs, () => impact(Haptics.ImpactFeedbackStyle.Rigid)),
  /** One of your last five seconds: a selection tick, and a firmer one on the last. */
  countdown: (secondsLeft: number) => (secondsLeft <= 1 ? impact(Haptics.ImpactFeedbackStyle.Rigid) : void (on && Haptics.selectionAsync())),

  /**
   * A pot you won, by how many big blinds you came out ahead. Small pots get the success buzz; bigger ones add
   * chips raining in after it, more and heavier the bigger the pot.
   */
  win: (bigBlinds: number) => {
    if (!on) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const rain = bigBlinds >= 50 ? 5 : bigBlinds >= 20 ? 3 : bigBlinds >= 8 ? 1 : 0;
    const style = bigBlinds >= 50 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Rigid;
    for (let i = 0; i < rain; i++) setTimeout(() => impact(i === rain - 1 && rain > 1 ? Haptics.ImpactFeedbackStyle.Heavy : style), 260 + i * 90);
  },

  /** An all-in run-out you're in: a low rumble that builds while the cards come. */
  runout: () =>
    pattern(RUNOUT_AHAP, () => {
      [0, 420, 760, 1020, 1220].forEach((t, i) =>
        setTimeout(() => impact(i < 2 ? Haptics.ImpactFeedbackStyle.Soft : i < 4 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy), t),
      );
    }),
};
