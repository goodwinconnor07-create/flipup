import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Says `text` to VoiceOver whenever it changes (or `again` does, for the same words twice running). React Native's
 * `accessibilityLiveRegion` only works on Android, so on iPhone a status that changes by itself (your turn, a
 * result, an error, a toast) has to be announced, or VoiceOver stays silent until the person finds it by touch.
 */
export function useAnnounce(text: string | null | undefined | false, again?: string | number): void {
  useEffect(() => {
    if (text && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
  }, [text, again]);
}

/** `useAnnounce` for a spot inside JSX that only draws some of the time. Draws nothing. */
export function Announce({ text, again }: { text: string | null | undefined | false; again?: string | number }): null {
  useAnnounce(text, again);
  return null;
}
