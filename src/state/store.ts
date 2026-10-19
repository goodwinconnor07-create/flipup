// App state and every command the screens can run.
// One small store (no library): screens read it with useApp(selector).

import { useSyncExternalStore } from 'react';
import {
  applyAction,
  cleanName,
  createTable,
  cryptoRng,
  isCode,
  newId,
  normalizeCode,
  redactForDevice,
  redactLogs,
  type HandLog,
  type Action,
  type Game,
  type ServerMessage,
  type Settings,
  type TableInfo,
} from '../game';
import { haptic, reducedMotion } from '../ui/effects';
import { createOnlineTable } from './api';
import { Connection, type ConnStatus } from './connection';
import { setMuted } from '../ui/sound';
import {
  loadDeviceId,
  loadCalm,
  loadDark,
  loadMuted,
  loadProfile,
  loadSession,
  loadStats,
  loadTableLook,
  saveLastTable,
  saveCalm,
  saveDark,
  saveMuted,
  saveProfile,
  saveSession,
  saveSettings,
  saveStats,
  saveTableLook,
  type Profile,
  type Session,
  type TableLook,
} from './persist';

export type Route =
  | { name: 'home' }
  /** Name and picture, then carry on to `then`. */
  | { name: 'profile'; then: 'host' | 'bots' | 'join' | 'done'; info?: TableInfo }
  | { name: 'setup'; mode: 'online' | 'local' }
  | { name: 'join'; code?: string }
  | { name: 'joinTable'; info: TableInfo }
  | { name: 'table' };

export type Sheet =
  | { name: 'menu' }
  | { name: 'invite' }
  | { name: 'settings' }
  | { name: 'standings' }
  | { name: 'rankings' }
  | { name: 'log' }
  | { name: 'theme' }
  | { name: 'emoji' }
  | { name: 'player'; playerId: string }
  | { name: 'confirm'; title: string; body?: string; confirm: string; danger?: boolean; onConfirm: () => void };

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

export interface AppState {
  deviceId: string;
  profile: Profile;
  stack: Route[];
  sheet: Sheet | null;
  /** The sheet is sliding down; it's removed when that finishes. */
  sheetLeaving: boolean;
  /** Changes on every open, so a sheet opened while another slides away starts fresh. */
  sheetKey: number;
  session: Session | null;
  /** The table as this phone may see it (other hands and the deck hidden). */
  game: Game | null;
  conn: ConnStatus | 'none';
  toasts: Toast[];
  busy: string | null;
  /** An action sent to the server that hasn't come back yet. */
  sending: string | null;
  /** The hand log, once asked for (null while it's on its way). */
  logs: HandLog[] | null;
  /** Felt and rail, as this phone likes them. */
  look: TableLook;
  muted: boolean;
  /** Animations switched off. */
  calm: boolean;
  dark: boolean;
}

// ── Store core ──────────────────────────────────────────────────────────────

const ROOT: Route = { name: 'home' };
const listeners = new Set<() => void>();

const bootDevice = loadDeviceId();
const bootSession = loadSession();

function viewOf(session: Session | null, deviceId: string): Game | null {
  if (!session?.game) return null;
  // A bots-only table holds the whole deck on this phone; the screens still only get what a player may see.
  return session.mode === 'local' ? redactForDevice(session.game, deviceId) : session.game;
}

let state: AppState = {
  deviceId: bootDevice,
  profile: loadProfile(),
  stack: [ROOT],
  sheet: null,
  sheetLeaving: false,
  sheetKey: 0,
  session: bootSession,
  game: viewOf(bootSession, bootDevice),
  conn: 'none',
  toasts: [],
  busy: null,
  sending: null,
  logs: null,
  look: loadTableLook(),
  muted: loadMuted(),
  calm: loadCalm(),
  dark: loadDark(),
};
applyTheme(state.dark);
document.documentElement.classList.toggle('calm', state.calm);
setMuted(loadMuted());

function set(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Read from the store. The selector must return stored values, not build new objects. */
export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

// ── Navigation (kept in step with the phone's back button) ─────────────────

let guarded = false;
let ignoreNextPop = false;

const atRoot = () => state.stack.length === 1 && !state.sheet;

/** While away from Home, one extra history entry catches the back gesture so it moves within the app. */
function syncHistory(): void {
  try {
    if (!atRoot() && !guarded) {
      history.pushState({ flipup: true }, '');
      guarded = true;
    } else if (atRoot() && guarded) {
      guarded = false;
      ignoreNextPop = true;
      history.back();
    }
  } catch {
    // Some embedded browsers block history changes. In-app back buttons still work.
  }
}

function onPopState(): void {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }
  guarded = false;
  back();
}

export function navigate(route: Route): void {
  clearTimeout(sheetTimer);
  set({ stack: [...state.stack, route], sheet: null, sheetLeaving: false });
  syncHistory();
}

export function resetTo(...routes: Route[]): void {
  clearTimeout(sheetTimer);
  set({ stack: [ROOT, ...routes], sheet: null, sheetLeaving: false });
  syncHistory();
}

/** Swaps the current screen for another, so Back skips it. */
export function replace(route: Route): void {
  set({ stack: [...state.stack.slice(0, -1), route], sheet: null, sheetLeaving: false });
  syncHistory();
}

export function back(): void {
  if (state.sheet && !state.sheetLeaving) return closeSheet();
  if (state.sheetLeaving) {
    clearTimeout(sheetTimer);
    set({ sheet: null, sheetLeaving: false });
  }
  if (state.stack.length > 1) set({ stack: state.stack.slice(0, -1) });
  syncHistory();
}

let sheetTimer: ReturnType<typeof setTimeout> | undefined;
/** Matches the sheet-down animation in global.css. */
const SHEET_OUT_MS = 200;

export function openSheet(sheet: Sheet): void {
  clearTimeout(sheetTimer);
  set({ sheet, sheetLeaving: false, sheetKey: state.sheetKey + 1 });
  syncHistory();
}

/** Slides the sheet down, then removes it. */
export function closeSheet(): void {
  if (!state.sheet || state.sheetLeaving) return;
  const done = () => {
    set({ sheet: null, sheetLeaving: false });
    syncHistory();
  };
  if (reducedMotion()) return done();
  set({ sheetLeaving: true });
  sheetTimer = setTimeout(done, SHEET_OUT_MS);
}

export function confirm(opts: Omit<Extract<Sheet, { name: 'confirm' }>, 'name'>): void {
  openSheet({ name: 'confirm', ...opts });
}

// ── Toasts ──────────────────────────────────────────────────────────────────

let toastSeq = 0;

export function toast(text: string, kind: Toast['kind'] = 'info'): void {
  const t: Toast = { id: ++toastSeq, text, kind };
  set({ toasts: [...state.toasts.slice(-2), t] });
  setTimeout(() => set({ toasts: state.toasts.filter((x) => x.id !== t.id) }), kind === 'error' ? 4000 : 2600);
}

// ── Profile ─────────────────────────────────────────────────────────────────

export function setProfile(patch: Partial<Profile>): void {
  const profile = { ...state.profile, ...patch };
  saveProfile(profile);
  set({ profile });
  // Already sitting at a table: everyone sees the change.
  const me = state.game?.players.find((p) => p.deviceId === state.deviceId);
  const name = cleanName(profile.name);
  if (me && name && (me.name !== name || me.emoji !== profile.emoji) && state.game?.status !== 'ended') {
    dispatch({ type: 'setLook', name, emoji: profile.emoji });
  }
}

// ── Session ─────────────────────────────────────────────────────────────────

let conn: Connection | null = null;
let localTimer: ReturnType<typeof setTimeout> | undefined;

function setSession(session: Session | null): void {
  saveSession(session);
  set({ session, game: viewOf(session, state.deviceId) });
  if (session?.mode === 'local') scheduleLocal();
  else clearTimeout(localTimer);
}

/** Bots-only tables keep their own clock on this phone: bots act, cards run out, hands deal. */
function scheduleLocal(): void {
  clearTimeout(localTimer);
  const wakeAt = state.session?.mode === 'local' ? state.session.game?.wakeAt : null;
  if (wakeAt == null) return;
  localTimer = setTimeout(
    () => {
      const s = state.session;
      if (s?.mode !== 'local' || !s.game) return;
      const r = applyAction(s.game, { type: 'tick' }, { deviceId: 'clock', now: Date.now(), rng: cryptoRng });
      if (r.ok && r.changed) setSession({ ...s, game: r.game });
      else scheduleLocal();
    },
    Math.max(0, wakeAt - Date.now()),
  );
}

function closeConnection(): void {
  conn?.close();
  conn = null;
  set({ conn: 'none' });
}

function onServerMessage(msg: ServerMessage): void {
  const s = state.session;
  if (!s || s.mode !== 'online') return;
  if (msg.t === 'state') {
    if (msg.ack && msg.ack === state.sending) set({ sending: null });
    const mine = msg.game.players.some((p) => p.deviceId === state.deviceId);
    setSession({ ...s, game: msg.game, joining: s.joining && !mine });
    // Arrived from the join screen: take a seat.
    if (s.joining && !mine && msg.game.status !== 'ended') sendJoin();
  } else if (msg.t === 'log') {
    set({ logs: msg.logs });
  } else if (msg.t === 'reject') {
    if (msg.id === state.sending) set({ sending: null });
    toast(msg.error, 'error');
    haptic('error');
  }
}

let joinSent = false;
function sendJoin(): void {
  if (joinSent) return;
  joinSent = true;
  const { name, emoji } = state.profile;
  send({ type: 'join', name: cleanName(name), emoji });
}

function connect(code: string): void {
  closeConnection();
  joinSent = false;
  set({ conn: 'connecting' });
  conn = new Connection(code, state.deviceId, {
    onMessage: onServerMessage,
    onStatus: (status) => set({ conn: status }),
    onOpen: () => {
      joinSent = false;
      set({ sending: null });
    },
    onGone: (message) => {
      saveLastTable(null);
      closeConnection();
      setSession(null);
      resetTo();
      toast(message, 'error');
    },
  });
}

function send(action: Action): boolean {
  const id = newId(8);
  if (!conn?.send({ t: 'act', id, a: action })) {
    toast("You're offline. Hang on while we reconnect.", 'error');
    return false;
  }
  set({ sending: id });
  return true;
}

/** Apply an action: straight away on a bots-only table, through the server online. */
export function dispatch(action: Action): boolean {
  const s = state.session;
  if (!s) return false;
  if (s.mode === 'online') return send(action);
  if (!s.game) return false;
  const r = applyAction(s.game, action, { deviceId: state.deviceId, now: Date.now(), rng: cryptoRng });
  if (!r.ok) {
    toast(r.error, 'error');
    haptic('error');
    return false;
  }
  if (r.changed) setSession({ ...s, game: r.game });
  return true;
}

/** Opens the hand log. Online it's fetched from the server; a bots-only table has it on the phone. */
export function openLog(): void {
  const s = state.session;
  if (s?.mode === 'local' && s.game) set({ logs: redactLogs(s.game, state.deviceId) });
  else {
    set({ logs: null });
    if (!conn?.send({ t: 'log' })) toast("You're offline. The hand log needs a connection.", 'error');
  }
  openSheet({ name: 'log' });
}

/** Fetches the hand log for the desktop side panel (no sheet). Does nothing if offline. */
export function refreshLogs(): void {
  const s = state.session;
  if (s?.mode === 'local' && s.game) set({ logs: redactLogs(s.game, state.deviceId) });
  else conn?.send({ t: 'log' });
}

/** Opens a new table: online with a join code, or bots-only on this phone. */
export async function openTable(mode: 'online' | 'local', settings: Settings, bots: number): Promise<void> {
  if (state.busy) return;
  saveSettings(settings);
  const name = cleanName(state.profile.name);
  const emoji = state.profile.emoji;
  if (mode === 'local') {
    const game = createTable({ hostDeviceId: state.deviceId, name, emoji, settings, bots, code: null, now: Date.now() });
    closeConnection();
    setSession({ mode: 'local', code: null, game });
    resetTo({ name: 'table' });
    return;
  }
  set({ busy: 'Opening your table…' });
  try {
    const code = await createOnlineTable({ deviceId: state.deviceId, name, emoji, settings, bots });
    setSession({ mode: 'online', code, game: null });
    saveLastTable({ code, at: Date.now() });
    connect(code);
    resetTo({ name: 'table' });
  } catch (e) {
    toast(e instanceof Error ? e.message : "Couldn't open a table.", 'error');
  } finally {
    set({ busy: null });
  }
}

/** Sit down at an online table (or go back to one this phone is already at). */
export function joinTable(code: string): void {
  if (state.session?.mode === 'online' && state.session.code === code) {
    if (!conn) connect(code);
    resetTo({ name: 'table' });
    return;
  }
  setSession({ mode: 'online', code, game: null, joining: true });
  saveLastTable({ code, at: Date.now() });
  connect(code);
  resetTo({ name: 'table' });
}

// ── Settings that live on this phone ────────────────────────────────────────

export function setTableLook(patch: Partial<TableLook>): void {
  const look = { ...state.look, ...patch };
  saveTableLook(look);
  set({ look });
}

export function toggleMuted(): void {
  const muted = !state.muted;
  saveMuted(muted);
  setMuted(muted);
  set({ muted });
}

/** Dark or light for the whole app: a data-theme on <html> that the stylesheet's colour tokens follow. */
function applyTheme(dark: boolean): void {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    meta.setAttribute('content', dark ? '#0e0f14' : '#ffffff');
}

export function toggleDark(): void {
  const dark = !state.dark;
  saveDark(dark);
  applyTheme(dark);
  set({ dark });
}

export function toggleCalm(): void {
  const calm = !state.calm;
  saveCalm(calm);
  document.documentElement.classList.toggle('calm', calm);
  set({ calm });
}

/** Counts this table's result towards the Home screen's lifetime numbers (once per table). */
function recordFinished(): void {
  const game = state.game;
  const me = game?.players.find((p) => p.deviceId === state.deviceId);
  const played = game?.hands ?? game?.hand?.number ?? 0;
  if (!game || !me || played === 0) return;
  const stats = loadStats();
  if (stats.counted.includes(game.id)) return;
  saveStats({
    net: stats.net + (me.stack - me.bought),
    tables: stats.tables + 1,
    hands: stats.hands + played,
    counted: [...stats.counted, game.id],
  });
}

/** Sends a quick message ("Nice hand!") to the table. */
export function react(id: string): void {
  dispatch({ type: 'react', id });
}

/** Leaves the table on this phone. Online, the seat is given up too. */
export function leaveTable(): void {
  recordFinished();
  const s = state.session;
  const me = state.game?.players.find((p) => p.deviceId === state.deviceId);
  if (s?.mode === 'online' && me && state.game?.status !== 'ended') send({ type: 'remove', playerId: me.id });
  // Give the message a moment to go before the socket closes.
  setTimeout(closeConnection, 300);
  setSession(null);
  resetTo();
}

/** Forget a finished table and go home. */
export function closeTable(): void {
  recordFinished();
  if (state.session?.mode === 'online') saveLastTable(null);
  closeConnection();
  setSession(null);
  resetTo();
}

/** Called once on start: reconnect to an online table, restart a bots table's clock, or follow a join link. */
export function boot(): void {
  window.addEventListener('popstate', onPopState);
  const s = state.session;
  const linked = normalizeCode(location.pathname.replace(/^\/+/, ''));
  if (location.pathname.length > 1) {
    try {
      history.replaceState(null, '', '/');
    } catch {
      // Not allowed here; harmless.
    }
  }
  if (s?.mode === 'online' && s.code) connect(s.code);
  if (s?.mode === 'local') scheduleLocal();
  if (isCode(linked) && !(s?.mode === 'online' && s.code === linked)) {
    resetTo({ name: 'join', code: linked });
  } else if (s && (s.game || s.mode === 'online')) {
    resetTo({ name: 'table' });
  }
}
