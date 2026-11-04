import { useSyncExternalStore } from 'react';

/** A bot chosen on Play with bots: who it is and the face it wears. */
export interface PickedBot {
  key: string;
  name: string;
  emoji: string;
}

let picked: PickedBot[] = [];
const listeners = new Set<() => void>();

/** The bots on the page, handed to the deal popup (a separate screen) when Deal is pressed. */
export function setPickedBots(bots: PickedBot[]): void {
  picked = bots;
  listeners.forEach((fn) => fn());
}

export function usePickedBots(): PickedBot[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => picked,
  );
}
