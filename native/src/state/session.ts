// The table this phone is at. A bots-only table runs right here: applyAction() is the only way it changes, and its
// own clock ticks it at game.wakeAt (bots act, cards run out, hands deal), exactly as the web app does. The screens
// only ever see the redacted view (redactForDevice), so the deck and other players' cards stay hidden.
// Online tables join this in step 3b.
import { useSyncExternalStore } from 'react';

import { applyAction, cleanName, createTable, cryptoRng, redactForDevice, type Action, type Game, type Settings } from '@/engine';

import { deviceId } from './device';
import { save } from './storage';

const KEY = 'flipup.session';

type Session = { mode: 'local'; code: null; game: Game };

let session: Session | null = null;
let view: Game | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
export const me = deviceId();

function set(next: Session | null): void {
  session = next;
  view = next ? redactForDevice(next.game, me) : null;
  listeners.forEach((fn) => fn());
  schedule();
  // Writing the whole table on every move is a lot of work mid-hand, so it waits a moment and goes in one go.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(KEY, session), next ? 600 : 0);
}

/** The table as this phone may see it, or null when not at one. */
export function useTable(): Game | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => view,
  );
}

/** The table's clock: one timer for the next thing that's due. */
function schedule(): void {
  clearTimeout(timer);
  const wakeAt = session?.game.wakeAt;
  if (wakeAt == null) return;
  timer = setTimeout(() => {
    if (!session) return;
    const r = applyAction(session.game, { type: 'tick' }, { deviceId: 'clock', now: Date.now(), rng: cryptoRng });
    if (r.ok && r.changed) set({ ...session, game: r.game });
    else schedule();
  }, Math.max(0, wakeAt - Date.now()));
}

/** Applies a move from this phone. Returns the engine's reason when it's refused. */
export function dispatch(action: Action): string | null {
  if (!session) return 'No table.';
  const r = applyAction(session.game, action, { deviceId: me, now: Date.now(), rng: cryptoRng });
  if (!r.ok) return r.error;
  if (r.changed) set({ ...session, game: r.game });
  return null;
}

/** Opens a bots-only table on this phone and seats you at it. */
export function openLocalTable(settings: Settings, bots: number, name: string, emoji: string): void {
  const game = createTable({ hostDeviceId: me, name: cleanName(name) || 'You', emoji, settings, bots, code: null, now: Date.now() });
  set({ mode: 'local', code: null, game });
}

export function leaveTable(): void {
  set(null);
}

// A table you were at comes back after the app is closed.
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
  if (saved?.mode === 'local' && saved.game) set(saved);
} catch {
  // A broken saved table is dropped.
}
