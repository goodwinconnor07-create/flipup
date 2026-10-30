// App state and every command the screens can run.
// One small store (no library): screens read it with useApp(selector).

import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import {
  applyAction,
  bountyChance,
  bountyReward,
  noteMission,
  drawDailySpin,
  takeDailySpin,
  buyAgain,
  campaignTable,
  cashBuyIn,
  cashMax,
  cashMin,
  cashOut,
  cleanName,
  packById,
  drawMultiplier,
  finishSng,
  FORMATS,
  isOpen,
  refundSeat,
  sitDown,
  sngPlace,
  stakeById,
  venueById,
  type SeatFor,
  createTable,
  cryptoRng,
  DEFAULT_SETTINGS,
  isCode,
  newId,
  normalizeCode,
  redactForDevice,
  dressAsLegend,
  EMOJIS,
  LEGENDS_ON,
  legendById,
  redactLogs,
  type HandLog,
  type Action,
  type Game,
  type Player,
  type ServerMessage,
  type Settings,
  type Variant,
  type TableInfo,
} from '../game';
import { haptic, reducedMotion } from '../ui/effects';
import { purchasePremium, restorePurchase, type PremiumReason } from './premium';
import { createOnlineTable } from './api';
import { Connection, type ConnStatus } from './connection';
import { setMuted } from '../ui/sound';
import { captureFinishedHand } from './training';
import { FAST, toTableTime } from './clock';
import { legendBefore, legendOpen, loadProgress } from './progress';
import { getCampaign, setCampaign, subscribeCampaign, today } from './campaign';
import { shareCampaignSoon } from './pals';
import {
  forgetOldLearning,
  loadDeviceId,
  loadCalm,
  loadAppearance,
  loadGlass,
  loadPremium,
  loadMuted,
  loadFast,
  loadCam3d,
  loadTalk,
  saveFast,
  saveCam3d,
  saveTalk,
  loadProfile,
  loadSession,
  loadStats,
  loadTableLook,
  loadLastTable,
  saveLastTable,
  saveCalm,
  saveAppearance,
  saveGlass,
  savePremium,
  saveMuted,
  saveProfile,
  saveSession,
  saveSettings,
  saveStats,
  saveTableLook,
  type Profile,
  type Session,
  type TableLook,
  type Appearance,
} from './persist';

export type Route =
  | { name: 'home' }
  /** Name and picture, then carry on to `then`. */
  | { name: 'profile'; then: 'host' | 'bots' | 'join' | 'done'; info?: TableInfo; variant?: Variant }
  | { name: 'setup'; mode: 'online' | 'local'; variant?: Variant }
  | { name: 'join'; code: string }
  | { name: 'joinTable'; info: TableInfo }
  | { name: 'table' }
  /** A legend's profile: how they play, and a game against them. */
  | { name: 'legend'; id: string }
  /** Set up a party tournament: pick the games and the pace. */
  | { name: 'partySetup' }
  /** The party this phone is in: lobby, leaderboard and the way to the table. */
  | { name: 'party' }
  /** The campaign's roulette wheel. */
  | { name: 'roulette' }
  /** Cash game: the blinds your bankroll plays, and how much to sit down with. */
  | { name: 'cashSeat' };

export type Sheet =
  | { name: 'menu' }
  | { name: 'invite' }
  /** How the daily streak is going. */
  | { name: 'streak' }
  /** A game's card on Home: how it plays, and who to play it with. */
  | { name: 'game'; variant: Variant }
  /** The games that aren't on Home's shelf. */
  | { name: 'more' }
  /** Type the table code or scan its QR code. */
  | { name: 'join' }
  /** How a game plays, from the badge on the table. */
  | { name: 'rules'; variant: Variant | undefined }
  /** Choose which game a table plays. */
  | { name: 'pick'; current: Variant; onPick: (variant: Variant) => void }
  | { name: 'settings' }
  /** This phone's look and sound: dark mode, Liquid Glass, sound, animations. */
  | { name: 'prefs' }
  | { name: 'standings' }
  | { name: 'rankings' }
  | { name: 'log' }
  | { name: 'theme' }
  | { name: 'emoji' }
  /** The FlipUp Premium offer. `reason` says what was tapped; `then` runs once it's bought. */
  | { name: 'premium'; reason?: PremiumReason; then?: () => void }
  /** Pick a chat bubble colour. */
  | { name: 'bubbles' }
  /** Pick a card back. */
  | { name: 'packs' }
  /** Pick an AI Legend to seat at this table. */
  | { name: 'legends' }
  | { name: 'player'; playerId: string }
  /** Type a friend code to add them to your friends. */
  | { name: 'addPal' }
  /** Type a party code to join it. */
  | { name: 'joinParty' }
  /** How the campaign works: shown the first time the tab opens. */
  | { name: 'campaignIntro' }
  /** Every campaign goal: ready to collect, on the way, and collected. */
  | { name: 'campaignGoals' }
  /** Pick a campaign table to open online for friends. */
  | { name: 'campaignFriends' }
  /** The campaign's free daily spin. */
  | { name: 'dailySpin' }
  | { name: 'confirm'; title: string; body?: string; confirm: string; danger?: boolean; onConfirm: () => void };

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
  /** Takes back what was just done; the toast then shows an Undo button. */
  undo?: () => void;
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
  /** Show what the bots say at the table. */
  talk: boolean;
  /** Bot tables on this phone run on a faster clock. */
  fast: boolean;
  /** Show the other players in the 3D table cam instead of the row of seats. */
  cam3d: boolean;
  /** Animations switched off. */
  calm: boolean;
  /** What the player picked: light, dark or the same as the phone. */
  appearance: Appearance;
  /** Whether the app is dark right now (from the pick, or the phone's setting). */
  dark: boolean;
  /** Transparency: frosted, see-through glass on what floats. Off gives solid panels. */
  glass: boolean;
  /** Has FlipUp Premium (a one-time purchase). */
  premium: boolean;
}

// ── Store core ──────────────────────────────────────────────────────────────

const ROOT: Route = { name: 'home' };

const darkQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const isDark = (appearance: Appearance) => appearance === 'dark' || (appearance === 'auto' && !!darkQuery?.matches);
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
  talk: loadTalk(),
  fast: loadFast(),
  cam3d: loadCam3d(),
  calm: loadCalm(),
  appearance: loadAppearance(),
  dark: false,
  glass: loadGlass(),
  premium: loadPremium(),
};
state.dark = isDark(state.appearance);
forgetOldLearning();
applyTheme(state.dark);
document.documentElement.classList.toggle('no-glass', !state.glass);
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

/** Moves between screens the way iOS does: the new one slides in over the old (push), or the old slides away (pop).
 * The browser draws it (View Transitions, Safari 18 and up); anywhere else the screen just fades in as before. */
function slide(kind: 'push' | 'pop', change: () => void): void {
  const doc = document as Document & { startViewTransition?: (update: () => void) => { finished: Promise<unknown> } };
  if (!doc.startViewTransition || reducedMotion()) return change();
  const root = document.documentElement;
  // Once screens slide, they never fade in as well: the fade comes back the moment `nav` is cleared, which flashed the page.
  root.dataset.slides = '';
  root.dataset.nav = kind;
  const run = doc.startViewTransition(() => flushSync(change));
  const clear = () => delete root.dataset.nav;
  run.finished.then(clear, clear);
}

export function navigate(route: Route): void {
  clearTimeout(sheetTimer);
  slide('push', () => set({ stack: [...state.stack, route], sheet: null, sheetLeaving: false }));
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
  if (state.stack.length > 1) slide('pop', () => set({ stack: state.stack.slice(0, -1) }));
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

function showToast(t: Omit<Toast, 'id'>, ms: number): void {
  const shown: Toast = { id: ++toastSeq, ...t };
  set({ toasts: [...state.toasts.slice(-2), shown] });
  setTimeout(() => dismissToast(shown.id), ms);
}

export function dismissToast(id: number): void {
  if (state.toasts.some((x) => x.id === id)) set({ toasts: state.toasts.filter((x) => x.id !== id) });
}

export function toast(text: string, kind: Toast['kind'] = 'info'): void {
  showToast({ text, kind }, kind === 'error' ? 4000 : 2600);
}

/**
 * For something reversible: do it straight away, then say so with an Undo button for seven seconds, instead of
 * asking first. Only the toast's own button runs `undo`, and only once.
 */
export function undoToast(text: string, undo: () => void, ms = 7000): void {
  showToast({ text, kind: 'info', undo }, ms);
}

// ── Profile ─────────────────────────────────────────────────────────────────

export function setProfile(patch: Partial<Profile>): void {
  // An emoji from outside the picker's grid and a bubble colour are Premium extras.
  if (!state.premium && patch.emoji !== undefined && patch.emoji !== state.profile.emoji && !(EMOJIS as readonly string[]).includes(patch.emoji)) {
    return openPremium('emoji');
  }
  if (!state.premium && patch.bubble) return openPremium('bubbles');
  // A campaign trophy back is won at its venue; the others are Premium's.
  const pack = patch.cardPack ? packById(patch.cardPack) : undefined;
  if (pack?.venue && !packOpen(pack.id)) return toast(`${pack.note} to get this one.`);
  if (!state.premium && patch.cardPack && !pack?.venue) return openPremium('packs');
  const profile = { ...state.profile, ...patch };
  if (!profile.bubble) delete profile.bubble;
  if (!profile.cardPack) delete profile.cardPack;
  saveProfile(profile);
  set({ profile });
  // Already sitting at a table: everyone sees the change.
  const me = state.game?.players.find((p) => p.deviceId === state.deviceId);
  const name = cleanName(profile.name);
  if (me && name && (me.name !== name || me.emoji !== profile.emoji || (me.bubble ?? '') !== (profile.bubble ?? '') || (me.cardPack ?? '') !== (profile.cardPack ?? '')) && state.game?.status !== 'ended') {
    dispatch({ type: 'setLook', name, emoji: profile.emoji, ...(profile.bubble ? { bubble: profile.bubble } : {}), ...(profile.cardPack ? { cardPack: profile.cardPack } : {}) });
  }
}

// ── FlipUp Premium ──────────────────────────────────────────────────────────

/** Opens the Premium offer. `reason` is what the player just tried; `then` runs after they buy. */
export function openPremium(reason?: PremiumReason, then?: () => void): void {
  haptic('light');
  openSheet({ name: 'premium', reason, then });
}

/**
 * Runs `go` if this phone has Premium; otherwise shows the offer, and runs it after a purchase.
 * Every Premium extra goes through here.
 */
export function withPremium(reason: PremiumReason, go: () => void): void {
  if (state.premium) go();
  else openPremium(reason, go);
}

/** Marks this phone as Premium (and keeps it). Called once a purchase or a restore has gone through. */
export function grantPremium(): void {
  savePremium(true);
  set({ premium: true });
}

/** Buys Premium. Resolves true once it's bought. See `purchasePremium` in premium.ts for the payment step. */
export async function buyPremium(): Promise<boolean> {
  const ok = await purchasePremium();
  if (ok) grantPremium();
  return ok;
}

/** Brings back a past purchase (a new phone, a reinstall). */
export async function restorePremium(): Promise<boolean> {
  const ok = await restorePurchase();
  if (ok) grantPremium();
  return ok;
}

// ── Session ─────────────────────────────────────────────────────────────────

let conn: Connection | null = null;
let localTimer: ReturnType<typeof setTimeout> | undefined;

// The table is saved to the phone so a reload picks it back up. Writing the whole game on every move is a lot of
// work in the middle of play, so it waits a moment and goes in one go, and always before the page is put away.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let unsaved: Session | null | undefined;

function flushSession(): void {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  if (unsaved !== undefined) saveSession(unsaved);
  unsaved = undefined;
}

function saveSessionSoon(session: Session | null): void {
  unsaved = session;
  if (session === null) return flushSession();
  saveTimer ??= setTimeout(flushSession, 600);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushSession());
  addEventListener('pagehide', flushSession);
}

function setSession(session: Session | null): void {
  const prev = state.session?.game;
  saveSessionSoon(session);
  payCampaign(session?.game);
  settleCampaign(prev, session?.game);
  noteCampaignHand(session?.game);
  // A pending online action can't outlive an online table (it would leave the buttons greyed out).
  set({ session, game: viewOf(session, state.deviceId), ...(session?.mode === 'online' ? {} : { sending: null }) });
  captureFinishedHand(state.game, state.deviceId);
  if (session?.mode === 'local') scheduleLocal();
  else clearTimeout(localTimer);
}

/** Sits down heads-up against one bot, which `prepare` can change first, and deals. */
function startHeadsUp(bot: string | undefined, prepare: (them: Player, game: Game) => void): void {
  const name = cleanName(state.profile.name);
  if (!name) return navigate({ name: 'profile', then: 'bots' });
  const settings: Settings = { ...DEFAULT_SETTINGS, turnSeconds: 0 };
  const game = createTable({ hostDeviceId: state.deviceId, name, emoji: state.profile.emoji, settings, bots: 1, botNames: bot ? [bot] : undefined, ...premiumLook(), code: null, now: Date.now() });
  const them = game.players.find((p) => p.bot);
  if (state.fast) game.fast = true;
  if (them) prepare(them, game);
  closeConnection();
  setSession({ mode: 'local', code: null, game });
  resetTo({ name: 'table' });
  dispatch({ type: 'start' });
}

/** A heads-up game against a legend: a bot seat dressed as them. */
export function startLegend(id: string): void {
  if (!LEGENDS_ON || state.busy) return;
  const legend = legendById(id);
  if (!legend) return;
  const progress = loadProgress();
  if (!legendOpen(progress, legend.id)) {
    toast(`Beat ${legendBefore(legend.id)?.short ?? 'the one before'} first.`, 'error');
    return;
  }
  if (state.game?.legendGame) recordFinished();
  const seen = progress.rivals.legends[legend.id];
  startHeadsUp(undefined, (them, game) => {
    game.legendGame = legend.id;
    if (progress.beaten[legend.id]) game.rematch = 'won';
    else if (seen && seen.l > 0) game.rematch = 'lost';
    dressAsLegend(them, legend);
  });
}

/** Fast tables run their clock at twice the speed: the same waits, half as long. Fixed per table, so nothing moves mid-game. */
const tableNow = (game: Game | null | undefined): number => toTableTime(Date.now(), game?.fast);

/** Bots-only tables keep their own clock on this phone: bots act, cards run out, hands deal. */
function scheduleLocal(): void {
  clearTimeout(localTimer);
  const wakeAt = state.session?.mode === 'local' ? state.session.game?.wakeAt : null;
  if (wakeAt == null) return;
  localTimer = setTimeout(
    () => {
      const s = state.session;
      if (s?.mode !== 'local' || !s.game) return;
      const r = applyAction(s.game, { type: 'tick' }, { deviceId: 'clock', now: tableNow(s.game), rng: cryptoRng });
      if (r.ok && r.changed) setSession({ ...s, game: r.game });
      else scheduleLocal();
    },
    Math.max(0, (wakeAt - tableNow(state.session?.game)) / (state.session?.game?.fast ? FAST : 1)),
  );
}

function closeConnection(): void {
  conn?.close();
  conn = null;
  set({ conn: 'none' });
}

/** Lets a last message go, then closes. Only the connection that was open now is closed: a table opened in
 * the meantime keeps its own. */
function closeConnectionSoon(): void {
  const old = conn;
  conn = null;
  set({ conn: 'none' });
  setTimeout(() => old?.close(), 300);
}

/** Sends without a toast if it can't go, for messages that don't matter once you've left. */
function sendQuietly(action: Action): void {
  conn?.send({ t: 'act', id: newId(8), a: action });
}

/** Keeps who's at an online table with the "rejoin" card on Home. */
function rememberFaces(code: string | null, game: Game): void {
  const last = loadLastTable();
  if (!code || !last || last.code !== code) return;
  const faces = game.players.map((p) => p.emoji);
  if (last.faces?.join('') === faces.join('')) return;
  saveLastTable({ ...last, faces });
}

function onServerMessage(msg: ServerMessage): void {
  const s = state.session;
  if (!s || s.mode !== 'online') return;
  if (msg.t === 'state') {
    if (msg.ack && msg.ack === state.sending) set({ sending: null });
    const mine = msg.game.players.some((p) => p.deviceId === state.deviceId);
    setSession({ ...s, game: msg.game, joining: s.joining && !mine });
    rememberFaces(s.code, msg.game);
    syncLook(msg.game);
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

/** The Premium parts of this phone's look (bubble colour, card pack): empty without Premium. */
function premiumLook(): { bubble?: string; cardPack?: string } {
  const { bubble, cardPack } = state.profile;
  return { ...(state.premium && bubble ? { bubble } : {}), ...(cardPack && packOpen(cardPack) ? { cardPack } : {}) };
}

/** Whether this phone may use a card back: a campaign trophy once its venue is won, the rest with Premium. */
export function packOpen(id: string): boolean {
  const pack = packById(id);
  if (!pack) return false;
  return pack.venue ? getCampaign().stats.wonAt.includes(pack.venue) : state.premium;
}

/** A table made or joined online doesn't know this phone's bubble colour and card pack yet: say so once per table and look. */
let lookSent = '';
function syncLook(game: Game): void {
  const me = game.players.find((p) => p.deviceId === state.deviceId);
  const want = premiumLook();
  const key = `${game.id}:${want.bubble ?? ''}:${want.cardPack ?? ''}`;
  if (!me || game.status === 'ended' || ((me.bubble ?? '') === (want.bubble ?? '') && (me.cardPack ?? '') === (want.cardPack ?? '')) || lookSent === key) return;
  lookSent = key;
  send({ type: 'setLook', name: me.name, emoji: me.emoji, ...want });
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
  // If no answer comes back, don't leave the buttons greyed out.
  setTimeout(() => {
    if (state.sending === id) set({ sending: null });
  }, 5000);
  return true;
}

/** Apply an action: straight away on a bots-only table, through the server online. */
export function dispatch(action: Action): boolean {
  const s = state.session;
  if (!s) return false;
  if (s.mode === 'online') return send(action);
  if (!s.game) return false;
  const r = applyAction(s.game, action, { deviceId: state.deviceId, now: tableNow(s.game), rng: cryptoRng });
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
export async function openTable(mode: 'online' | 'local', settings: Settings, bots: number, botNames?: string[]): Promise<void> {
  if (state.busy) return;
  saveSettings(settings);
  const name = cleanName(state.profile.name);
  const emoji = state.profile.emoji;
  if (mode === 'local') {
    const game = createTable({ hostDeviceId: state.deviceId, name, emoji, settings, bots, botNames, ...premiumLook(), code: null, now: Date.now() });
    if (state.fast) game.fast = true;
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

export function toggleFast(): void {
  const fast = !state.fast;
  saveFast(fast);
  set({ fast });
}

export function toggleCam3d(): void {
  const cam3d = !state.cam3d;
  saveCam3d(cam3d);
  set({ cam3d });
}

export function toggleTalk(): void {
  const talk = !state.talk;
  saveTalk(talk);
  set({ talk });
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
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.setAttribute('content', dark ? '#000000' : '#ffffff');
}

export function setAppearance(appearance: Appearance): void {
  saveAppearance(appearance);
  const dark = isDark(appearance);
  applyTheme(dark);
  set({ appearance, dark });
}

// On Automatic, the app follows the phone when it switches between light and dark.
darkQuery?.addEventListener?.('change', () => {
  if (state.appearance !== 'auto') return;
  applyTheme(isDark('auto'));
  set({ dark: isDark('auto') });
});

export function toggleGlass(): void {
  const glass = !state.glass;
  saveGlass(glass);
  document.documentElement.classList.toggle('no-glass', !glass);
  set({ glass });
}

export function toggleCalm(): void {
  const calm = !state.calm;
  saveCalm(calm);
  document.documentElement.classList.toggle('calm', calm);
  set({ calm });
}

// ── Campaign ────────────────────────────────────────────────────────────────

/** Which Home tab to show and how far down it was, kept for the session so coming back lands in the same place. */
export const homeView: { tab: 'play' | 'campaign' | 'party'; scroll: number } = { tab: 'play', scroll: 0 };

const n0 = (n: number) => n.toLocaleString('en-US');
const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

// Friends see how your campaign is going: every change goes on your friend card a few seconds later.
subscribeCampaign(shareCampaignSoon);

/** What a seat at this campaign table is for. */
function seatFor(game: Game, cost: number): SeatFor | null {
  const tag = game.campaign;
  if (!tag) return null;
  const friends = game.code ? { friends: true } : {};
  if (tag.kind === 'cash') {
    const stake = stakeById(tag.venue);
    return stake ? { kind: 'cash', stake, cost, ...friends } : null;
  }
  const venue = venueById(tag.venue);
  return venue ? { kind: 'sng', venue, prize: tag.prize ?? 0, ...friends } : null;
}

/**
 * Online campaign tables (with friends): each phone pays its own way. The first time this phone is seated it pays
 * the buy-in (or leaves if it can't), and at a cash game every rebuy the server hands out is paid for as it shows up
 * in `bought`.
 */
function payCampaign(game: Game | null | undefined): void {
  if (!game?.campaign || !game.code || game.status === 'ended') return;
  const me = game.players.find((p) => p.deviceId === state.deviceId);
  if (!me) return;
  const c = getCampaign();
  if (c.seat?.gameId === game.id) {
    if (game.campaign.kind === 'cash' && me.bought > c.seat.paid) {
      const extra = me.bought - c.seat.paid;
      setCampaign({ ...c, chips: Math.max(0, c.chips - extra), seat: { ...c.seat, paid: me.bought } });
    }
    return;
  }
  const want = seatFor(game, game.campaign.kind === 'cash' ? me.bought : (game.campaign.buyIn ?? 0));
  const sat = c.seat ? 'Finish the campaign table you’re at first.' : want ? sitDown(c, want, game.id, Date.now()) : 'That table isn’t in the campaign.';
  if (typeof sat !== 'string') return setCampaign(sat);
  // Can't pay: give the seat back straight away.
  toast(sat, 'error');
  setTimeout(leaveTable, 0);
}

/**
 * Settles the campaign table this phone sits at, once it's over for you or you've left it: a cash table's chips go
 * back to the bankroll, a tournament pays its prize, and a table that never dealt gives the buy-in back. Runs on
 * every table change; settling twice does nothing.
 */
function settleCampaign(prev: Game | null | undefined, next: Game | null | undefined): void {
  const c = getCampaign();
  const seat = c.seat;
  if (!seat) return;
  const here = next?.id === seat.gameId;
  const game = here ? next : prev?.id === seat.gameId ? prev : null;
  if (!game) return;
  const now = Date.now();
  const mine = (g: Game | null | undefined) => g?.players.find((p) => p.deviceId === state.deviceId);
  const me = mine(game);
  const gone = !here || !me;
  // Never got going: the lobby was left, or this phone was taken out of it.
  if (game.status === 'lobby' && gone) return setCampaign(refundSeat(c, seat.gameId, now));
  if (seat.kind === 'sng') {
    const place = me ? sngPlace(game, me.id) : undefined;
    // A tournament that ended without placing you was called off: the buy-in comes back.
    if (place === undefined && here && game.status === 'ended') return setCampaign(refundSeat(c, seat.gameId, now));
    if (place === undefined && !gone) return;
    // A bounty or the boss counts if this phone's player won a pot that put them out.
    const knocked = game.knocked ?? {};
    const mineOut = (id: string | undefined) => !!me && !!id && (knocked[id] ?? []).includes(me.id);
    const bounty = game.campaign?.bounty;
    const boss = game.campaign?.boss;
    let done = finishSng(c, seat.gameId, place, now, { bounty: mineOut(bounty?.playerId) ? bounty!.reward : 0, boss: mineOut(boss?.playerId) ? boss!.legend : undefined });
    // The boss remembers how you played them (tables on this phone keep what the bots have seen).
    const read = boss && me ? game.reads?.[me.id] : undefined;
    if (read) done = { ...done, bossReads: { ...done.bossReads, [boss!.legend]: read } };
    if ((done.last?.back ?? 0) > 0 && place) done = noteMission(done, today(), 'itm');
    setCampaign(done);
    const last = done.last;
    if (last?.boss) toast(`You beat ${legendById(last.boss)?.short ?? 'the boss'}! +${n0(last.bossPay ?? 0)}`, 'success');
    else if (last?.bounty) toast(`Bounty collected: +${n0(last.bounty)}`, 'success');
    // Out of a tournament with friends still playing: say how it went now; the finish page comes when it ends.
    const paid = getCampaign().last;
    if (here && place && game.status !== 'ended' && paid) toast(paid.back > 0 ? `You finished ${ordinal(place)} and won ${n0(paid.back)}.` : `You finished ${ordinal(place)}.`, paid.back > 0 ? 'success' : 'info');
  } else if (gone || game.status === 'ended') {
    const out = cashOut(c, seat.gameId, (me ?? mine(prev))?.stack ?? 0, now);
    setCampaign(out.last && out.last.back > out.last.paid ? noteMission(out, today(), 'cashAhead') : out);
  }
}

/** Hands that finish at a campaign table count towards today's missions: hands played, pots won, showdowns, a flush or better, big pots, knockouts. Each hand once. */
function noteCampaignHand(game: Game | null | undefined): void {
  const hand = game?.hand;
  const result = hand?.result;
  if (!game?.campaign || !hand || !result) return;
  const me = game.players.find((p) => p.deviceId === state.deviceId);
  if (!me || !hand.seats.some((s) => s.playerId === me.id)) return;
  const day = today();
  let c = getCampaign();
  const key = `${game.id}:${hand.number}`;
  if (c.daily?.day === day && c.daily.seen === key) return;
  c = noteMission(c, day, 'hands');
  const pots = result.pots.filter((p) => p.winners.includes(me.id));
  if (pots.length) {
    c = noteMission(c, day, 'pots');
    if (result.showdown) c = noteMission(c, day, 'showdown');
    if (/^(flush|full house|four of a kind|straight flush|royal flush|five of a kind)/i.test(result.names[me.id] ?? '')) c = noteMission(c, day, 'flush');
    if (pots.reduce((a, p) => a + p.amount, 0) >= game.settings.bigBlind * 30) c = noteMission(c, day, 'bigPot');
    // Players who ran out of chips in a pot this phone's player won.
    const out = hand.seats.filter((s) => s.playerId !== me.id && (hand.startStacks?.[s.playerId] ?? 0) > 0 && game.players.find((p) => p.id === s.playerId)?.stack === 0 && pots.some((p) => p.eligible.includes(s.playerId)));
    if (out.length) c = noteMission(c, day, 'knockouts', out.length);
  }
  setCampaign({ ...c, daily: { ...c.daily!, seen: key } });
}

/** Today's free spin: draws what it pays, adds it to the bankroll, and says what it was. Null once it's been used today. */
export function takeFreeSpin(): number | null {
  const c = getCampaign();
  const day = today();
  if (c.spinDay === day) return null;
  const won = drawDailySpin(cryptoRng);
  setCampaign(takeDailySpin(c, day, won));
  return won;
}

/** A seat whose table is gone from this phone (it can't be played any more): settled as left, so the bankroll isn't stuck. */
export function reconcileCampaign(): void {
  const c = getCampaign();
  if (!c.seat || state.session?.game?.id === c.seat.gameId) return;
  setCampaign(c.seat.kind === 'cash' ? cashOut(c, c.seat.gameId, 0, Date.now()) : finishSng(c, c.seat.gameId, undefined, Date.now()));
}

/** A campaign table dealt but not sat at yet: shown on the confirm sheet (its bounty is named there), then played as is. */
let prepared: { kind: 'cash' | 'sng'; id: string; amount?: number; game: Game } | null = null;

/**
 * Sets up a campaign table against the bots on this phone: the seats, the venue's boss (who remembers how you've
 * played them) and sometimes a bounty on one bot. Returns what the confirm sheet should say about the bounty.
 */
export function prepareCampaign(kind: 'cash' | 'sng', id: string, amount?: number): { name: string; emoji: string; reward: number } | null {
  const name = cleanName(state.profile.name);
  const c = getCampaign();
  const stake = kind === 'cash' ? stakeById(id) : undefined;
  const venue = kind === 'sng' ? venueById(id) : undefined;
  prepared = null;
  if (!name || (!stake && !venue)) return null;
  const table = stake
    ? campaignTable({ kind: 'cash', stake, stack: Math.max(Math.min(amount ?? Infinity, cashBuyIn(c, stake)), cashMin(stake)) }, false)
    : campaignTable({ kind: 'sng', venue: venue!, prize: venue!.buyIn * drawMultiplier(FORMATS[venue!.format], cryptoRng) }, false);
  const game = createTable({ hostDeviceId: state.deviceId, name, emoji: state.profile.emoji, settings: table.settings, bots: table.campaign.seats - 1, campaign: table.campaign, ...premiumLook(), code: null, now: Date.now() });
  // The bots at a cash table sit with 100 big blinds, whatever you sat down with.
  if (stake) for (const p of game.players) if (p.bot) p.stack = p.bought = cashMax(stake);
  const me = game.players.find((p) => p.deviceId === state.deviceId);
  const boss = game.campaign?.boss;
  if (boss && me) {
    // A boss you've met greets you as a rematch, and still knows how you play.
    if (c.stats.bosses.includes(boss.legend)) game.rematch = 'won';
    else if (c.bossReads[boss.legend]) game.rematch = 'lost';
    const read = c.bossReads[boss.legend];
    if (read) game.reads = { ...(game.reads ?? {}), [me.id]: structuredClone(read) };
  }
  let bounty: { name: string; emoji: string; reward: number } | null = null;
  if (venue && game.campaign && cryptoRng() < bountyChance) {
    const marks = game.players.filter((p) => p.bot && p.id !== boss?.playerId);
    const mark = marks[Math.floor(cryptoRng() * marks.length)];
    if (mark) {
      const reward = bountyReward(venue, cryptoRng);
      game.campaign.bounty = { playerId: mark.id, reward };
      bounty = { name: mark.name, emoji: mark.emoji, reward };
    }
  }
  prepared = { kind, id, amount, game };
  return bounty;
}

/**
 * Sits down at a cash game (by stake) or a tournament (by venue), against the bots on this phone: the table from
 * `prepareCampaign()` if it was set up, otherwise a fresh one. The buy-in comes out of the bankroll. `amount` is what
 * a cash game sits down with (between its minimum and what you can cover); by default as much as you can.
 */
export function startCampaign(kind: 'cash' | 'sng', id: string, amount?: number): void {
  if (state.busy) return;
  const name = cleanName(state.profile.name);
  if (!name) return navigate({ name: 'profile', then: 'done' });
  reconcileCampaign();
  if (prepared?.kind !== kind || prepared.id !== id || prepared.amount !== amount) prepareCampaign(kind, id, amount);
  const game = prepared?.game;
  prepared = null;
  if (!game) return;
  const c = getCampaign();
  const want = seatFor(game, game.settings.startingStack);
  const sat = want ? sitDown(c, want, game.id, Date.now()) : 'That table isn’t in the campaign.';
  if (typeof sat === 'string') {
    toast(sat, 'error');
    haptic('error');
    return;
  }
  if (state.fast) game.fast = true;
  setCampaign(kind === 'sng' ? noteMission(sat, today(), 'tourneys') : sat);
  closeConnection();
  setSession({ mode: 'local', code: null, game });
  resetTo({ name: 'table' });
  dispatch({ type: 'start' });
}

/** Opens a campaign table online for friends to join by code. Everyone, you included, pays the buy-in from their own bankroll as they sit down. */
export async function openCampaignForFriends(kind: 'cash' | 'sng', id: string): Promise<void> {
  if (state.busy) return;
  const name = cleanName(state.profile.name);
  if (!name) return navigate({ name: 'profile', then: 'done' });
  reconcileCampaign();
  const c = getCampaign();
  const stake = kind === 'cash' ? stakeById(id) : undefined;
  const venue = kind === 'sng' ? venueById(id) : undefined;
  const place = stake ?? venue;
  if (!place) return;
  const cost = stake ? cashMax(stake) : venue!.buyIn;
  const why = c.seat ? 'Finish the campaign table you’re at first.' : !isOpen(c, place) ? 'That table isn’t open for you yet.' : c.chips < cost ? `You need ${n0(cost)} in your bankroll for that table.` : null;
  if (why) {
    toast(why, 'error');
    haptic('error');
    return;
  }
  set({ busy: 'Opening your table…' });
  try {
    const code = await createOnlineTable({ deviceId: state.deviceId, name, emoji: state.profile.emoji, settings: DEFAULT_SETTINGS, bots: 0, campaign: { kind, id } });
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

/** Gone bust at a campaign cash table: buy back in from the bankroll (up to 100 big blinds on this phone; the table's fixed stack online). */
export function campaignRebuy(): void {
  const s = state.session;
  const game = s?.game;
  const stake = stakeById(game?.campaign?.venue);
  if (!s || !game || !stake || game.campaign?.kind !== 'cash') return;
  const c = getCampaign();
  if (s.mode === 'online') {
    // The server hands out the table's stack; it's paid for when it arrives (payCampaign).
    if (c.chips < game.settings.startingStack) return toast(`You need ${n0(game.settings.startingStack)} in your bankroll to buy in here.`, 'error');
    dispatch({ type: 'rebuy' });
    return;
  }
  const amount = cashBuyIn(c, stake);
  if (!amount) {
    toast(`You need ${n0(cashMin(stake))} in your bankroll to buy in here.`, 'error');
    return;
  }
  // The table's rebuy hands out its starting stack, so that's set to what you're buying first.
  const ctx = { deviceId: state.deviceId, now: tableNow(game), rng: cryptoRng };
  const sized = applyAction(game, { type: 'settings', settings: { startingStack: amount } }, ctx);
  const bought = sized.ok ? applyAction(sized.game, { type: 'rebuy' }, ctx) : sized;
  const paid = buyAgain(c, game.id, amount);
  if (!bought.ok || typeof paid === 'string') {
    toast(bought.ok ? (paid as string) : bought.error, 'error');
    return;
  }
  setCampaign(paid);
  setSession({ ...s, game: bought.game });
}

/** Back on Home after a campaign table: the Campaign tab, with a word on how it went. */
function backFromCampaign(game: Game | null | undefined): void {
  if (!game?.campaign) return;
  homeView.tab = 'campaign';
  homeView.scroll = 0;
  const last = getCampaign().last;
  if (last?.gameId !== game.id) return;
  const net = last.back - last.paid;
  if (last.refunded) toast(`Your ${n0(last.paid)} buy-in is back in your bankroll.`);
  else if (last.kind === 'cash') toast(`Cashed out ${n0(last.back)} (${net >= 0 ? '+' : '−'}${n0(Math.abs(net))}).`, net > 0 ? 'success' : 'info');
  else if (last.place === undefined) toast('You left the tournament. The buy-in stays in the pot.');
}

/** Counts this table's result towards the Home screen's lifetime numbers (once per table). */
function recordFinished(): void {
  const game = state.game;
  const me = game?.players.find((p) => p.deviceId === state.deviceId);
  const played = game?.hands ?? game?.hand?.number ?? 0;
  if (!game || !me || played === 0) return;
  const stats = loadStats();
  if (stats.counted.includes(game.id)) return;
  const place = 1 + game.players.filter((p) => p.stack > me.stack).length;
  saveStats({
    net: stats.net + (me.stack - me.bought),
    tables: stats.tables + 1,
    hands: stats.hands + played,
    counted: [...stats.counted, game.id],
    games: [...stats.games, { at: Date.now(), net: me.stack - me.bought, hands: played, players: game.players.length, place, variant: game.settings.variant ?? 'holdem', ...(game.legendGame ? { legend: game.legendGame } : {}) }],
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
  if (s?.mode === 'online' && me && state.game?.status !== 'ended') sendQuietly({ type: 'remove', playerId: me.id });
  // Give the message a moment to go before the socket closes.
  closeConnectionSoon();
  const was = state.session?.game;
  setSession(null);
  backFromCampaign(was);
  resetTo();
}

/** Forget a finished table and go home. */
export function closeTable(): void {
  recordFinished();
  const me = state.game?.players.find((p) => p.deviceId === state.deviceId);
  const asked = !!me && !!state.game?.again?.includes(me.id);
  if (state.session?.mode === 'online') saveLastTable(null);
  if (state.session?.mode === 'online' && asked) {
    // Leaving after asking to play again: take the request back, so no one's seated who isn't there.
    sendQuietly({ type: 'playAgain', off: true });
    closeConnectionSoon();
  } else closeConnection();
  const was = state.session?.game;
  setSession(null);
  backFromCampaign(was);
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
  }
}
