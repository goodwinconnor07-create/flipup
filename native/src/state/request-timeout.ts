import { useSyncExternalStore } from 'react';

/** Every server request gives up after this long (a backup so nothing can load for ever). */
export const REQUEST_TIMEOUT_MS = 30_000;

let shown = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** A request ran out of time: show the friendly popup. */
export function noteRequestTimeout() {
  if (shown) return;
  shown = true;
  emit();
}

export function dismissRequestTimeout() {
  shown = false;
  emit();
}

export function useRequestTimedOut(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => shown,
    () => false,
  );
}
