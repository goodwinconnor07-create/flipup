// The phone's Reduce Transparency, Increase Contrast and VoiceOver settings (iPhone only; all read false elsewhere).
// One question and one listener for the whole app, like useReduceMotion.
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

type Flag = 'transparency' | 'contrast' | 'reader';
const state: Record<Flag, boolean> = { transparency: false, contrast: false, reader: false };
const listeners = new Set<() => void>();
let started = false;

function set(flag: Flag, on: boolean) {
  if (state[flag] === on) return;
  state[flag] = on;
  listeners.forEach((f) => f());
}

function start() {
  if (started || Platform.OS !== 'ios') return;
  started = true;
  AccessibilityInfo.isReduceTransparencyEnabled()
    .then((on) => set('transparency', on))
    .catch(() => undefined);
  AccessibilityInfo.isDarkerSystemColorsEnabled()
    .then((on) => set('contrast', on))
    .catch(() => undefined);
  AccessibilityInfo.isScreenReaderEnabled()
    .then((on) => set('reader', on))
    .catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceTransparencyChanged', (on) => set('transparency', on));
  AccessibilityInfo.addEventListener('screenReaderChanged', (on) => set('reader', on));
  AccessibilityInfo.addEventListener('darkerSystemColorsChanged', (on) => set('contrast', on));
}

function subscribe(f: () => void): () => void {
  start();
  listeners.add(f);
  return () => listeners.delete(f);
}

/** True while Reduce Transparency is on: see-through panels and blurs turn into solid surfaces. */
export function useReduceTransparency(): boolean {
  return useSyncExternalStore(subscribe, () => state.transparency, () => false);
}

/** True while Increase Contrast ("Darker System Colors") is on: surfaces get a clear edge and stronger text. */
export function useIncreaseContrast(): boolean {
  return useSyncExternalStore(subscribe, () => state.contrast, () => false);
}

/**
 * True while VoiceOver is on. Anything on a timer (a toast, a story that moves on by itself, a carousel) waits for the
 * person instead: VoiceOver takes longer to reach a thing than the timer allows.
 */
export function useScreenReader(): boolean {
  return useSyncExternalStore(subscribe, () => state.reader, () => false);
}
