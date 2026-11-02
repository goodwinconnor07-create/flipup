// The table being set up: shared by the Setup screen and the game list it pushes, so a game picked there shows up
// back on Setup. It starts from the last settings used (`flipup.settings`, the same key as the web) and is saved
// back when the table opens.
import { useSyncExternalStore } from 'react';

import { DEFAULT_SETTINGS, levelsFor, STACK_CHOICES, withVariant, type Settings, type Variant } from '@/engine';

import { save, useStored } from './storage';

const KEY = 'flipup.settings';
let draft: Settings | null = null;
const listeners = new Set<() => void>();

/** Starts a fresh draft for a table with friends or with bots, optionally with a game already picked. */
export function startDraft(saved: Settings | null, mode: 'friends' | 'bots', variant?: Variant): void {
  const s = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  // Old saved settings that don't fit today's choices fall back to the defaults' shape.
  const fits = STACK_CHOICES.includes(s.startingStack) && levelsFor(s.startingStack).some(([sb, bb]) => sb === s.smallBlind && bb === s.bigBlind);
  const fitted = fits ? s : { ...s, startingStack: 1000, smallBlind: 5, bigBlind: 10 };
  const base = variant ? withVariant(fitted, variant) : fitted;
  // Against bots nobody's waiting on you, so there's no clock.
  draft = mode === 'bots' ? { ...base, turnSeconds: 0 } : { ...base, turnSeconds: base.turnSeconds || DEFAULT_SETTINGS.turnSeconds };
  listeners.forEach((fn) => fn());
}

export function setDraft(next: Settings): void {
  draft = next;
  listeners.forEach((fn) => fn());
}

export function useDraft(): Settings {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => draft ?? DEFAULT_SETTINGS,
  );
}

export const useSavedSettings = () => useStored<Settings | null>(KEY, null);
export const saveSettings = (s: Settings) => save(KEY, s);
