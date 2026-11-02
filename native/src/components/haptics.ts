// Haptics, iPhone only. Light impact on a button tap, a selection tick when a choice changes, and the
// notification types for success and failure. Never on scrolling or other passive touches.
import * as Haptics from 'expo-haptics';

const on = process.env.EXPO_OS === 'ios';

export const haptic = {
  tap: () => void (on && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => void (on && Haptics.selectionAsync()),
  success: () => void (on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  failure: () => void (on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
