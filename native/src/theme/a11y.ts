// The phone's Reduce Transparency and Increase Contrast settings (iPhone only; both read false elsewhere).
// One question and one listener for the whole app, like useReduceMotion.
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

type Flag = 'transparency' | 'contrast';
const state: Record<Flag, boolean> = { transparency: false, contrast: false };
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
  AccessibilityInfo.addEventListener('reduceTransparencyChanged', (on) => set('transparency', on));
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
