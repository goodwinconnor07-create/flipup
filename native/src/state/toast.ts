// The toast for things that went wrong and need no decision ("Couldn't open the party. Check your connection."): a
// small card over the bottom of the screen for a few seconds, where a modal alert would stop the person for no reason.
// One at a time; a new one replaces the old. Choices ("Leave the party?") stay as alerts.
import { useSyncExternalStore } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
}

/** How long a toast stays up. */
export const TOAST_MS = 5000;

let current: ToastMessage | null = null;
let next = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

/** Shows a short, plain sentence about what went wrong. */
export function showToast(text: string): void {
  current = { id: next++, text };
  emit();
}

/** Takes the toast down (it timed out or was tapped). With an id, only that toast. */
export function dismissToast(id?: number): void {
  if (!current || (id !== undefined && current.id !== id)) return;
  current = null;
  emit();
}

export function useToast(): ToastMessage | null {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => current,
    () => null,
  );
}
