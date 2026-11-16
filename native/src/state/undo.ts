// "Undo" instead of "Are you sure?" (Apple's agency and forgiveness, 17 Nov 2026): a removal that can be put back
// happens at once, and a small toast offers to undo it for a few seconds. Only one at a time; a new one replaces
// the old. Real confirmation stays for what can't come back (End game, Delete my data).
import { useSyncExternalStore } from 'react';

export interface UndoOffer {
  id: number;
  message: string;
  undo: () => void;
}

/** How long the offer stays up. */
export const UNDO_MS = 5000;

let current: UndoOffer | null = null;
let next = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

/** Offers to take something back. `undo` runs if the person taps Undo in time. */
export function offerUndo(message: string, undo: () => void): void {
  current = { id: next++, message, undo };
  emit();
}

/** Closes the toast without undoing (it timed out, or Undo was tapped). */
export function dismissUndo(id?: number): void {
  if (!current || (id !== undefined && current.id !== id)) return;
  current = null;
  emit();
}

export function useUndoOffer(): UndoOffer | null {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => current,
    () => null,
  );
}

/** `list` with `item` put back at `at` (or the end when the list is now shorter). */
export function insertAt<T>(list: readonly T[], item: T, at: number): T[] {
  const out = list.slice();
  out.splice(Math.min(Math.max(at, 0), out.length), 0, item);
  return out;
}
