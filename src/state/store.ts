// App state and every command the screens can run.
// One small store (no library): screens read it with useApp(selector).

import { useSyncExternalStore } from 'react';
import {
  applyAction,
  cleanName,
  createTable,
  cryptoRng,
  DEFAULT_SETTINGS,
  isCode,
  newId,
  normalizeCode,
  redactForDevice,
  redactLogs,
  handRecord,
  seededRng,
  type HandLog,
  type Action,
  type Game,
  type ServerMessage,
  type Settings,
  type TableInfo,
} from '../game';
import type { StyleId } from '../game/botStyles';
import { confetti, CONFETTI, haptic, reducedMotion } from '../ui/effects';
import { createOnlineTable } from './api';
import { Connection, type ConnStatus } from './connection';
import { setMuted } from '../ui/sound';
import { captureFinishedHand, handKey } from './training';
import { handBucket, handClass } from '../game/botPlay';
import { STRENGTH } from '../game/botRange';
import { judgeMove, readFromHabits } from '../game/judge';
import { cardTable, dealCard, fitBots } from '../scroll/deal';
import { pickCard } from '../scroll/feed';
import { finish, newRun, toDecision } from '../scroll/play';
import { addScrollHand, levelOf, loadScroll, saveScroll, type ScrollSave } from '../scroll/save';
import { STYLE_NOTES } from '../scroll/styleNotes';
import { TEMPLATE_BY_ID } from '../scroll/templates';
import type { CardRef } from '../scroll/types';
import {
  loadDeviceId,
  loadCalm,
  loadDark,
  loadGlass,
  loadMuted,
  loadProfile,
  loadSession,
  loadStats,
  markPlayedToday,
  loadTableLook,
  loadLastTable,
  saveLastTable,
  saveCalm,
  saveDark,
  saveGlass,
  saveLastBots,
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
  | { name: 'join'; code: string }
  | { name: 'joinTable'; info: TableInfo }
  | { name: 'table' }
  /** Training: reviews, the poker library, stats and custom hands. */
  | { name: 'train'; section?: TrainSection }
  | { name: 'lesson'; key: string }
  /** Watch a saved hand back, with the coach. */
  | { name: 'replay'; key: string }
  | { name: 'drill'; scenario: string }
  | { name: 'custom' }
  /** The Scroll feed of short poker cards. */
  | { name: 'scroll' };

export type TrainSection = 'review' | 'scroll' | 'insights' | 'library' | 'stats' | 'custom';

export type Sheet =
  | { name: 'menu' }
  | { name: 'invite' }
  /** How the daily streak is going. */
  | { name: 'streak' }
  /** Type the table code or scan its QR code. */
  | { name: 'join' }
  | { name: 'settings' }
  /** This phone's look and sound: dark mode, Liquid Glass, sound, animations. */
  | { name: 'prefs' }
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
  /** Liquid Glass look: frosted, see-through panels. Off gives solid ones. */
  glass: boolean;
  /** Your Scroll level, stars and combo, and the card you're on. */
  scroll: ScrollSave;
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
  glass: loadGlass(),
  scroll: loadScroll(),
};
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
  // A pending online action can't outlive an online table (it would leave the buttons greyed out).
  set({ session, game: viewOf(session, state.deviceId), ...(session?.mode === 'online' ? {} : { sending: null }) });
  // A Scroll card is graded on its own; it isn't one of the hands the coach reviews.
  if (!session?.scroll) captureFinishedHand(state.game, state.deviceId);
  else trackScroll();
  if (session?.mode === 'local') scheduleLocal();
  else clearTimeout(localTimer);
}

/** A heads-up game against one bot, loaded with another style's way of playing. */
export function startPlaystyle(bot: string, style: StyleId): void {
  if (state.busy) return;
  const name = cleanName(state.profile.name);
  if (!name) return navigate({ name: 'profile', then: 'bots' });
  const settings: Settings = { ...DEFAULT_SETTINGS, turnSeconds: 0 };
  const game = createTable({ hostDeviceId: state.deviceId, name, emoji: state.profile.emoji, settings, bots: 1, botNames: [bot], code: null, now: Date.now() });
  const them = game.players.find((p) => p.bot);
  if (them) them.style = style;
  closeConnection();
  setSession({ mode: 'local', code: null, game });
  resetTo({ name: 'table' });
  dispatch({ type: 'start' });
}

// ── Scroll ──────────────────────────────────────────────────────────────────
// A feed of short poker cards. Each card is a bots-only table with one hand dealt to order (see CardScene), so it
// runs on this phone like any other bots table. The session's `scroll` holds the card in play and your graded moves.

function setScroll(patch: Partial<ScrollSave>): void {
  const scroll = { ...state.scroll, ...patch };
  saveScroll(scroll);
  set({ scroll });
}

/** Sits down at the table for a card, in the lobby: the intro popup shows over it until Start. */
function setUpCard(ref: CardRef): void {
  const { game } = cardTable(ref, { deviceId: state.deviceId, name: state.profile.name, emoji: state.profile.emoji });
  closeConnection();
  setSession({ mode: 'local', code: null, game, scroll: newRun(ref) });
}

/** Makes sure there's a card on the table: the one you were on, or a new pick. */
export function ensureCard(): void {
  if (state.session?.scroll) return;
  let ref = state.scroll.current;
  if (!ref) {
    ref = state.scroll.upcoming ?? pickCard(state.scroll, Math.random);
    setScroll({ current: ref, upcoming: null, seed: state.scroll.seed + 1 });
  }
  setUpCard(ref);
}

/** Opens the feed from Home. A table you're sitting at is left first (you're asked). */
export function openScroll(): void {
  const s = state.session;
  const busy = !!s && !s.scroll && (s.mode === 'online' || (!!s.game && s.game.status !== 'ended'));
  const go = () => {
    ensureCard();
    navigate({ name: 'scroll' });
  };
  if (busy) {
    confirm({
      title: 'Leave your table?',
      body: s?.mode === 'online' ? 'Scroll uses this phone for a card at a time. You would leave the online table first.' : 'Scroll uses this phone for a card at a time, so your bots table closes first.',
      confirm: 'Leave and scroll',
      danger: true,
      onConfirm: () => {
        closeSheet();
        leaveTable();
        go();
      },
    });
    return;
  }
  go();
}

/** Back to Home. The card you're on stays where it is. */
export function exitScroll(): void {
  resetTo();
}

/** Start was tapped: the cards come out. */
export function startCard(): void {
  const s = state.session;
  if (!s?.scroll || s.scroll.started || !s.game) return;
  const dealt = dealCard(s.scroll.ref);
  const r = applyAction(s.game, { type: 'start' }, { deviceId: state.deviceId, now: Date.now(), rng: cryptoRng });
  if (!r.ok) return void toast(r.error, 'error');
  // Give the bot a hand that fits the way it has played so far, then let the clock run.
  const game = fitBots(r.game, dealt, seededRng(s.scroll.ref.seed ^ 0x5bd1e995));
  haptic('light');
  setSession({ ...s, game, scroll: { ...s.scroll, started: true } });
}

/** Moves on to the next card, picked when the last one finished. */
export function nextCard(): void {
  const save = state.scroll;
  const ref = save.upcoming ?? pickCard(save, Math.random);
  setScroll({ current: ref, upcoming: null, seed: save.seed + 1 });
  setUpCard(ref);
}

/** Grades the move you're about to make, with the bots' own eyes, and keeps the verdict with the card. */
function gradeMove(s: Session, action: Extract<Action, { type: 'act' }>): Session {
  const run = s.scroll;
  const game = s.game;
  const hand = game?.hand;
  const me = game?.players.find((p) => p.deviceId === state.deviceId);
  const seat = hand?.seats.find((x) => x.playerId === me?.id);
  if (!run || !game || !hand || !me || !seat || hand.toAct !== me.id) return s;
  // What the grader assumes about each bot: how its style plays.
  const dealt = dealCard(run.ref);
  const reads = { ...game.reads };
  for (const p of game.players) {
    const style = p.bot ? dealt.bots.find((b) => b.name === p.name)?.style : undefined;
    if (style) reads[p.id] = readFromHabits(STYLE_NOTES[style].habits);
  }
  const j = judgeMove({ ...game, reads }, hand, seat, action.move, action.to, seededRng(run.ref.seed + hand.seq));
  const decision = toDecision(j, seat.cards, hand.board, action.move === 'allin' ? undefined : action.to, game.settings.bigBlind);
  return { ...s, scroll: { ...run, decisions: [...run.decisions, decision] } };
}

/** A card is over: a hand that has a result, or a quick card once you've made your move. */
function trackScroll(): void {
  const s = state.session;
  const run = s?.scroll;
  if (!s || s.mode !== 'local' || !run || run.over || !run.started || !state.game?.hand) return;
  const t = TEMPLATE_BY_ID.get(run.ref.id);
  if (!t) return;
  const quickDone = t.quick && run.decisions.length > 0;
  if (!state.game.hand.result && !quickDone) return;
  finishCard(t.quick ?? false);
}

function finishCard(quick: boolean): void {
  const s = state.session;
  const view = state.game;
  const run = s?.scroll;
  const hand = view?.hand;
  const me = view?.players.find((p) => p.deviceId === state.deviceId);
  const seat = hand?.seats.find((x) => x.playerId === me?.id);
  const t = run ? TEMPLATE_BY_ID.get(run.ref.id) : undefined;
  if (!s || !view || !run || !hand || !me || !seat || !t) return;
  const bigBlind = view.settings.bigBlind;
  const net = (me.stack - (hand.startStacks?.[me.id] ?? me.stack)) / bigBlind;
  const weak = hand.board.length >= 3 ? ['air', 'weak'].includes(handBucket(seat.cards, hand.board)) : (STRENGTH.get(handClass(seat.cards)) ?? 1) < 0.4;
  const outcome = finish(t, run.decisions, { net, showdown: !!hand.result?.showdown, weak });

  // Stars, the combo and what comes next.
  const save = state.scroll;
  const before = levelOf(save.stars);
  const combo = outcome.passed ? save.combo + 1 : 0;
  const stars = save.stars + outcome.stars;
  const recent = [...save.recent, { id: t.id, seed: run.ref.seed, theme: t.theme, passed: outcome.passed, stars: outcome.stars, at: Date.now() }].slice(-80);
  const done: ScrollSave = {
    ...save,
    stars,
    cards: save.cards + 1,
    passed: save.passed + (outcome.passed ? 1 : 0),
    combo,
    bestCombo: Math.max(save.bestCombo, combo),
    best: { ...save.best, [t.id]: Math.max(save.best[t.id] ?? 0, outcome.stars) },
    recent,
    // This one is done: if the table is lost before Next, the next card is the one that comes after it.
    current: null,
  };
  done.upcoming = pickCard({ ...done, seed: save.seed + 1 }, Math.random);
  setScroll(done);
  markPlayedToday();
  if (levelOf(stars).level > before.level) setTimeout(() => toast(`Level ${levelOf(stars).level}: ${levelOf(stars).name}`, 'success'), 1200);

  // Keep the hand for the Scroll hands list. A quick card stops at your move, so it has no finished hand.
  const record = !quick ? handRecord(view, hand, Date.now()) : null;
  addScrollHand({ key: handKey(view.id, hand.number), ref: run.ref, theme: t.theme, title: t.title, at: Date.now(), outcome, decisions: run.decisions, heroId: me.id, record });

  // A quick card is frozen where it is. A full one is over, so the bots turn their cards over.
  const frozen = quick && s.game ? { ...s.game, wakeAt: null } : s.game;
  setSession({ ...s, game: frozen, scroll: { ...run, over: outcome } });
  if (!quick) dispatch({ type: 'revealBots', hand: hand.number });
  if (outcome.passed) {
    haptic('success');
    confetti(CONFETTI.win, { x: innerWidth / 2, y: innerHeight * 0.4 });
  } else haptic('error');
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
  const r = applyAction(s.game, action, { deviceId: state.deviceId, now: Date.now(), rng: cryptoRng });
  if (!r.ok) {
    toast(r.error, 'error');
    haptic('error');
    return false;
  }
  // On a Scroll card the move is graded first, while the table is still as it was when you chose.
  const graded = action.type === 'act' && s.scroll && !s.scroll.over ? gradeMove(s, action) : s;
  if (r.changed) setSession({ ...graded, game: r.game });
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
    const game = createTable({ hostDeviceId: state.deviceId, name, emoji, settings, bots, botNames, code: null, now: Date.now() });
    saveLastBots({ bots: game.players.filter((p) => p.bot).map((p) => p.name), settings, at: Date.now() });
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
    games: [...stats.games, { at: Date.now(), net: me.stack - me.bought, hands: played, players: game.players.length }],
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
  const me = state.game?.players.find((p) => p.deviceId === state.deviceId);
  const asked = !!me && !!state.game?.again?.includes(me.id);
  if (state.session?.mode === 'online') saveLastTable(null);
  if (state.session?.mode === 'online' && asked) {
    // Leaving after asking to play again: take the request back, so no one's seated who isn't there.
    send({ type: 'playAgain', off: true });
    setTimeout(closeConnection, 300);
  } else closeConnection();
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
  } else if (s?.scroll) {
    resetTo({ name: 'scroll' });
  } else if (s && (s.game || s.mode === 'online')) {
    resetTo({ name: 'table' });
  }
}
