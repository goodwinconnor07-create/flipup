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
  redactLogs,
  toTableTime,
  type Action,
  type Game,
  type HandLog,
  type ServerMessage,
  type Settings,
} from '@/engine';

import { createOnlineTable, PremiumRequiredError } from './api';
import { ensurePass } from './entitlement';
import { hasPremium } from './premium';
import { restorePremium } from './purchase';
import { Connection, type ConnStatus } from './connection';
import { deviceId } from './device';
import { isFast } from './prefs';
import { wornLook } from './profile';
import { noteGame, noteHand } from './record';
import { markPlayedToday } from './streak';
import { BLOCKED_KEY, isBlocked, maskBlocked, seatKey } from './blocks';
import { save, subscribe } from './storage';

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
  /** The hand log, once asked for (null while it's on its way from the server). */
  logs: HandLog[] | null;
}

export const me = deviceId();

let session: Session | null = null;
let state: TableState = { mode: null, code: null, game: null, conn: 'none', sending: false, notice: null, logs: null };
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
    game: !next?.game ? null : maskBlocked(next.mode === 'local' ? redactForDevice(next.game, me) : next.game),
  });
  schedule();
  noteDay(state.game);
  syncLook();
  // Writing the whole table on every move is a lot of work mid-hand, so it waits a moment and goes in one go.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(KEY, session), next ? 600 : 0);
}

// Blocking or unblocking someone redraws the table at once.
subscribe(BLOCKED_KEY, () => {
  if (session?.game) publish({ game: maskBlocked(session.mode === 'local' ? redactForDevice(session.game, me) : session.game) });
});

/**
 * Keeps your bubble effect and card back on your seat (the web's `syncLook()`): a table you just opened or joined
 * doesn't know them yet, and picking a new one mid-game should show at once. Sent once per table and look.
 */
let lookSent = '';
export function syncLook(): void {
  const game = session?.game;
  const mine = game?.players.find((p) => p.deviceId === me);
  if (!game || !mine || game.status === 'ended') return;
  const want = wornLook();
  const key = `${game.id}:${want.bubble ?? ''}:${want.cardPack ?? ''}`;
  if (((mine.bubble ?? '') === (want.bubble ?? '') && (mine.cardPack ?? '') === (want.cardPack ?? '')) || lookSent === key) return;
  lookSent = key;
  // After this update has gone out, so a bots-only table doesn't change inside its own set().
  setTimeout(() => dispatch({ type: 'setLook', name: mine.name, emoji: mine.emoji, ...want }), 0);
}

/** A finished hand you were dealt into counts today toward the daily streak (once per hand, as on the web). */
let lastCounted = '';
function noteDay(game: Game | null): void {
  const hand = game?.hand;
  const mine = game?.players.find((p) => p.deviceId === me);
  if (!game || !mine) return;
  const key = `${game.id}/${hand?.number}`;
  if (hand?.result && key !== lastCounted && hand.seats.some((s) => s.playerId === mine.id && s.cards.length > 0)) {
    lastCounted = key;
    markPlayedToday();
    noteHand(game, mine.id);
  }
  // Home's record of your games: where you finished, once the table is over.
  if (game.status === 'ended') noteGame(game, mine.id);
}

// The How to Play shooter (scripts/shootHowTo.mjs) reads the bots table it photographs through this. It only exists in
// a web build exported with EXPO_PUBLIC_RECORDER=1; every other build compiles it away.
if (process.env.EXPO_PUBLIC_RECORDER === '1' && typeof window !== 'undefined') {
  (window as unknown as { __flipupTable: () => Game | null }).__flipupTable = () => session?.game ?? null;
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
  if (wakeAt == null || session?.mode !== 'local') return;
  // A fast table's clock runs twice as fast: its waits are half as long in real time.
  const fast = !!session.game.fast;
  timer = setTimeout(
    () => {
      if (session?.mode !== 'local') return;
      const r = applyAction(session.game, { type: 'tick' }, { deviceId: 'clock', now: toTableTime(Date.now(), session.game.fast), rng: cryptoRng });
      if (r.ok && r.changed) set({ ...session, game: r.game });
      else schedule();
    },
    Math.max(0, (wakeAt - toTableTime(Date.now(), fast)) / (fast ? 2 : 1)),
  );
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
  const r = applyAction(session.game, action, { deviceId: me, now: toTableTime(Date.now(), session.game.fast), rng: cryptoRng });
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
    // You blocked this table's host: you aren't seated at their table.
    const host = msg.game.players.find((p) => p.deviceId === msg.game.hostDeviceId);
    if (joining && host && isBlocked(seatKey(host))) {
      leaveTable();
      notify("You've blocked this table's host, so you can't join their table.");
      return;
    }
    set({ ...session, game: msg.game, joining });
    // Arrived from the join screen: take a seat.
    if (joining && msg.game.status !== 'ended') sendJoin();
  } else if (msg.t === 'log') {
    publish({ logs: msg.logs });
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

/** Asks for the hand log: straight from the table on a bots-only one, from the server online. */
export function requestLogs(): void {
  if (session?.mode === 'local') publish({ logs: redactLogs(session.game, me) });
  else {
    publish({ logs: null });
    if (!conn?.send({ t: 'log' })) notify("You're offline. The hand log needs a connection.");
  }
}

/** Opens a bots-only table on this phone and seats you at it. */
export function openLocalTable(settings: Settings, bots: number, name: string, emoji: string): void {
  closeConnection();
  const fast = isFast();
  const game = createTable({ hostDeviceId: me, name: cleanName(name) || 'You', emoji, settings, bots, code: null, now: toTableTime(Date.now(), fast) });
  if (fast) game.fast = true;
  set({ mode: 'local', code: null, game });
}

/** Opens a table on the server for friends to join with its code, seated as the host. Throws with a message. */
export async function openOnlineTable(settings: Settings, bots: number, name: string, emoji: string): Promise<string> {
  profile = { name, emoji };
  const body = { deviceId: me, name: cleanName(name) || 'Host', emoji, settings, bots };
  let code: string;
  try {
    code = await createOnlineTable(body);
  } catch (e) {
    // Bought Premium but the server hasn't seen the purchase yet (offline at the time, or the pass ran out): ask the
    // App Store for it once more, then try again. Someone with no Premium at all just gets the server's answer.
    if (!(e instanceof PremiumRequiredError) || !hasPremium()) throw e;
    await restorePremium();
    if (!(await ensurePass(null))) throw e;
    code = await createOnlineTable(body);
  }
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
