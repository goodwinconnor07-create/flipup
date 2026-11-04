// Haptics, iPhone only. Light impact on a button tap, a selection tick when a choice changes, and the
// notification types for success and failure. Never on scrolling or other passive touches.
import * as Haptics from 'expo-haptics';

const on = process.env.EXPO_OS === 'ios';

export const haptic = {
  tap: () => void (on && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Your turn: a firmer tap, as the web's medium buzz. */
  turn: () => void (on && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  select: () => void (on && Haptics.selectionAsync()),
  success: () => void (on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  failure: () => void (on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  // Range training's haptic language: a soft tick as each street lands, a firm thud when you lock an answer in,
  // and a soft double tap for a verdict that isn't the best play (the best play gets `success`).
  /** A street lands. */
  street: () => void (on && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** Locked in: a firm, heavy thud. */
  thud: () => void (on && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** A verdict: two soft taps, 90ms apart. */
  double: () => {
    if (!on) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), 90);
  },
};
