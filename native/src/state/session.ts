// The table this phone is at, kept as the web app keeps it.
// - A bots-only table runs right here: applyAction() is the only way it changes, and its own clock ticks it at
//   game.wakeAt (bots act, cards run out, hands deal). The screens only ever see redactForDevice()'s view.
// - An online table lives on the server (one TableRoom per code). This phone sends its moves and shows the state the
//   server sends back, which is already redacted for this device.
import { useSyncExternalStore } from 'react';

import {
  applyAction,
  cleanName,
  createTable,
  cryptoRng,
  newId,
  redactForDevice,
  type Action,
  type Game,
  type ServerMessage,
  type Settings,
} from '@/engine';

import { createOnlineTable } from './api';
import { Connection, type ConnStatus } from './connection';
import { deviceId } from './device';
import { save } from './storage';

const KEY = 'flipup.session';

type Session = { mode: 'local'; code: null; game: Game } | { mode: 'online'; code: string; game: Game | null; joining?: boolean };

/** What the table screen reads: the view of the table, the link's state, and a notice to show (a refused move). */
export interface TableState {
  mode: 'local' | 'online' | null;
  code: string | null;
  game: Game | null;
  conn: ConnStatus | 'none';
  /** An online move sent and not yet confirmed: the buttons wait for it. */
  sending: boolean;
  notice: { id: number; text: string } | null;
}

export const me = deviceId();

let session: Session | null = null;
let state: TableState = { mode: null, code: null, game: null, conn: 'none', sending: false, notice: null };
let conn: Connection | null = null;
let sendingId: string | null = null;
let profile = { name: '', emoji: '' };
let timer: ReturnType<typeof setTimeout> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function publish(patch: Partial<TableState>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

function set(next: Session | null): void {
  session = next;
  publish({
    mode: next?.mode ?? null,
    code: next?.code ?? null,
    game: !next?.game ? null : next.mode === 'local' ? redactForDevice(next.game, me) : next.game,
  });
  schedule();
  // Writing the whole table on every move is a lot of work mid-hand, so it waits a moment and goes in one go.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(KEY, session), next ? 600 : 0);
}

export function useTable(): TableState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}

/** A bots-only table's clock: one timer for the next thing that's due. Online, the server keeps the clock. */
function schedule(): void {
  clearTimeout(timer);
  const wakeAt = session?.mode === 'local' ? session.game.wakeAt : null;
  if (wakeAt == null) return;
  timer = setTimeout(() => {
    if (session?.mode !== 'local') return;
    const r = applyAction(session.game, { type: 'tick' }, { deviceId: 'clock', now: Date.now(), rng: cryptoRng });
    if (r.ok && r.changed) set({ ...session, game: r.game });
    else schedule();
  }, Math.max(0, wakeAt - Date.now()));
}

function notify(text: string): void {
  publish({ notice: { id: Date.now(), text } });
}

/** Applies a move from this phone: right away on a bots-only table, through the server online. */
export function dispatch(action: Action): string | null {
  if (!session) return 'No table.';
  if (session.mode === 'online') {
    const id = newId(8);
    if (!conn?.send({ t: 'act', id, a: action })) {
      notify("You're offline. Hang on while we reconnect.");
      return 'offline';
    }
    sendingId = id;
    publish({ sending: true });
    // If no answer comes back, don't leave the buttons waiting.
    setTimeout(() => {
      if (sendingId === id) {
        sendingId = null;
        publish({ sending: false });
      }
    }, 5000);
    return null;
  }
  const r = applyAction(session.game, action, { deviceId: me, now: Date.now(), rng: cryptoRng });
  if (!r.ok) {
    notify(r.error);
    return r.error;
  }
  if (r.changed) set({ ...session, game: r.game });
  return null;
}

function onServerMessage(msg: ServerMessage): void {
  if (session?.mode !== 'online') return;
  if (msg.t === 'state') {
    if (msg.ack && msg.ack === sendingId) {
      sendingId = null;
      publish({ sending: false });
    }
    const seated = msg.game.players.some((p) => p.deviceId === me);
    const joining = !!session.joining && !seated;
    set({ ...session, game: msg.game, joining });
    // Arrived from the join screen: take a seat.
    if (joining && msg.game.status !== 'ended') sendJoin();
  } else if (msg.t === 'reject') {
    if (msg.id && msg.id === sendingId) {
      sendingId = null;
      publish({ sending: false });
    }
    notify(msg.error);
  }
}

let joinSent = false;
function sendJoin(): void {
  if (joinSent) return;
  joinSent = true;
  conn?.send({ t: 'act', id: newId(8), a: { type: 'join', name: cleanName(profile.name) || 'Player', emoji: profile.emoji } });
}

function connect(code: string): void {
  conn?.close();
  joinSent = false;
  publish({ conn: 'connecting' });
  conn = new Connection(code, me, {
    onMessage: onServerMessage,
    onStatus: (status) => publish({ conn: status }),
    onOpen: () => {
      joinSent = false;
      conn?.send({ t: 'sync' });
    },
    onGone: (message) => {
      closeConnection();
      set(null);
      notify(message);
    },
  });
}

function closeConnection(): void {
  conn?.close();
  conn = null;
  sendingId = null;
  publish({ conn: 'none', sending: false });
}

/** Opens a bots-only table on this phone and seats you at it. */
export function openLocalTable(settings: Settings, bots: number, name: string, emoji: string): void {
  closeConnection();
  const game = createTable({ hostDeviceId: me, name: cleanName(name) || 'You', emoji, settings, bots, code: null, now: Date.now() });
  set({ mode: 'local', code: null, game });
}

/** Opens a table on the server for friends to join with its code, seated as the host. Throws with a message. */
export async function openOnlineTable(settings: Settings, bots: number, name: string, emoji: string): Promise<string> {
  profile = { name, emoji };
  const code = await createOnlineTable({ deviceId: me, name: cleanName(name) || 'Host', emoji, settings, bots });
  set({ mode: 'online', code, game: null });
  connect(code);
  return code;
}

/** Sits down at an online table by its code (or goes back to the one this phone is at). */
export function joinOnlineTable(code: string, name: string, emoji: string): void {
  profile = { name, emoji };
  if (session?.mode === 'online' && session.code === code) {
    if (!conn) connect(code);
    return;
  }
  set({ mode: 'online', code, game: null, joining: true });
  connect(code);
}

/** Leaves the table. Online, you're taken off it first (a hand in play folds you on your turn). */
export function leaveTable(): void {
  const mine = session?.mode === 'online' ? session.game?.players.find((p) => p.deviceId === me) : undefined;
  if (mine && session?.game?.status !== 'ended') conn?.send({ t: 'act', id: newId(8), a: { type: 'remove', playerId: mine.id } });
  const old = conn;
  conn = null;
  setTimeout(() => old?.close(), 300);
  sendingId = null;
  publish({ conn: 'none', sending: false });
  set(null);
}

// A table you were at comes back after the app is closed: a bots-only one as it was, an online one by reconnecting.
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
  const p = JSON.parse(localStorage.getItem('flipup.profile') ?? 'null') as { name?: string; emoji?: string } | null;
  profile = { name: p?.name ?? '', emoji: p?.emoji ?? '' };
  if (saved?.mode === 'local' && saved.game) set(saved);
  else if (saved?.mode === 'online' && saved.code) {
    set({ mode: 'online', code: saved.code, game: saved.game });
    connect(saved.code);
  }
} catch {
  // A broken saved table is dropped.
}
