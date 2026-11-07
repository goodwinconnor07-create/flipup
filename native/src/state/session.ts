// The table this phone is at, kept as the web app keeps it.
// - A bots-only table runs right here: applyAction() is the only way it changes, and its own clock ticks it at
//   game.wakeAt (bots act, cards run out, hands deal). The screens only ever see redactForDevice()'s view.
// - An online table lives on the server (one TableRoom per code). This phone sends its moves and shows the state the
//   server sends back, which is already redacted for this device.
import { useSyncExternalStore } from 'react';

import {
  applyAction,
  beforeDeal,
  challengeRng,
  checkDue,
  cleanName,
  createTable,
  cryptoRng,
  dealDue,
  decisionPoint,
  heroOf,
  newId,
  openChallenge,
  publicStats,
  recordNet,
  redactForDevice,
  redactLogs,
  replayFrom,
  rewindChoices,
  rightCount,
  runOver,
  scoreRun,
  STYLE_LABEL,
  STYLE_TELL,
  toTableTime,
  truthOf,
  usuallyGoes,
  type Action,
  type ChallengeId,
  type ChallengeRun,
  type Choice,
  type DecisionPoint,
  type Game,
  type HandLog,
  type HandRecord,
  type Label,
  type Move,
  type ServerMessage,
  type Settings,
  type StyleId,
} from '@/engine';

import { createOnlineTable, PremiumRequiredError } from './api';
import { bindPurchase } from './entitlement';
import { hasPremium } from './premium';
import { restorePremium } from './purchase';
import { Connection, type ConnStatus } from './connection';
import { deviceId } from './device';
import { isFast } from './prefs';
import { wornLook } from './profile';
import { noteRun } from './challenges';
import { noteGame, noteHand } from './record';
import { markPlayedToday } from './streak';
import { BLOCKED_KEY, isBlocked, maskBlocked, seatKey } from './blocks';
import { save, subscribe } from './storage';

const KEY = 'flipup.session';

type Session = { mode: 'local'; code: null; game: Game; challenge?: ChallengeRun & { result?: ChallengeResult } } | { mode: 'online'; code: string; game: Game | null; joining?: boolean};

/** How a finished challenge run came out. */
export interface ChallengeResult {
  score: number;
  best: number;
  newBest: boolean;
}

/**
 * What the table screen may know about the challenge running at it. Never the answer key: Detective's styles stay
 * in the phone's own copy of the table until the run is over (`revealSuspects()`).
 */
export interface ChallengeView {
  id: ChallengeId;
  /** Detective: your tags, by player id. */
  tags: Record<string, Label>;
  /** Detective: checks answered so far, and the one waiting to be answered before the next deal (-1: none). */
  checks: number;
  checkWaiting: number;
  rewindsLeft: number;
  /** Rewind: the hand just played can be rewound now. */
  canRewind: boolean;
  /** Rewind: a rewound hand has finished, and how it came out against the first time (chips), with both moves. */
  whatIf: { hand: number; was: number; now: number; did: string; tried: string; bigBlind: number } | null;
  result: ChallengeResult | null;
  /** Rewind: the hands rewound so far, and what each came to the first time and after (chips). */
  rewound: { hand: number; was: number; now: number }[];
}

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
  /** A solo challenge at this table, if it is one. */
  challenge: ChallengeView | null;
}

export let me = deviceId();

let session: Session | null = null;
let identityVersion = 0;
let state: TableState = { mode: null, code: null, game: null, conn: 'none', sending: false, notice: null, logs: null, challenge: null };
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
  if (next?.mode === 'local' && next.challenge) {
    watchWhatIf();
    finishRun(next);
  }
  publish({
    mode: next?.mode ?? null,
    code: next?.code ?? null,
    game: !next?.game ? null : maskBlocked(next.mode === 'local' ? redactForDevice(next.game, me) : next.game),
    challenge: challengeView(),
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
  // A challenge's chips are pretend: its hands count for the streak, never for your poker record.
  const challenge = !!game.challenge;
  if (hand?.result && key !== lastCounted && hand.seats.some((s) => s.playerId === mine.id && s.cards.length > 0)) {
    lastCounted = key;
    markPlayedToday();
    if (!challenge) noteHand(game, mine.id);
  }
  // Home's record of your games: where you finished, once the table is over.
  if (game.status === 'ended' && !challenge) noteGame(game, mine.id);
}

/** The table as it is right now, outside a component (the setup page waits on its new lobby with it). */
export const currentTable = (): TableState => state;

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
function schedule(minDelay = 0): void {
  clearTimeout(timer);
  const wakeAt = session?.mode === 'local' ? session.game.wakeAt : null;
  if (wakeAt == null || session?.mode !== 'local') return;
  // A challenge's sheets stop the clock while they're open (and a Detective check waits to be answered).
  if (session.challenge && (paused || checkWaiting >= 0)) return;
  // A fast table's clock runs twice as fast: its waits are half as long in real time.
  const fast = !!session.game.fast;
  timer = setTimeout(
    () => {
      if (session?.mode !== 'local') return;
      const now = toTableTime(Date.now(), session.game.fast);
      if (session.challenge && dealDue(session.game, now) && !readyToDeal()) return;
      let r: ReturnType<typeof applyAction>;
      try {
        r = applyAction(session.game, { type: 'tick' }, { deviceId: 'clock', now, rng: rngFor(session.game) });
      } catch (e) {
        clockFailed(e);
        return;
      }
      clockFails = 0;
      if (r.ok && r.changed) set({ ...session, game: r.game });
      // Nothing changed though it was due: wait a beat rather than spin on a 0ms timer.
      else schedule(wakeAt <= now ? IDLE_RETRY_MS : 0);
    },
    Math.max(minDelay, (wakeAt - toTableTime(Date.now(), fast)) / (fast ? 2 : 1)),
  );
}

/** How long the clock waits before looking again when a tick that was due changed nothing. */
const IDLE_RETRY_MS = 250;
/** A tick that throws is tried again this many times, a second apart, before the table is put away. */
const CLOCK_RETRIES = 3;
let clockFails = 0;

/**
 * A bots-only table's clock hit an error in the engine. An error thrown from a timer closes the app in a release
 * build (and a saved table would do it again at every launch), so it's caught here: tried again a few times, then
 * the table is put away with a note, and nothing else is lost.
 */
function clockFailed(e: unknown): void {
  clockFails++;
  console.warn('[table clock]', e);
  if (clockFails <= CLOCK_RETRIES) {
    clearTimeout(timer);
    timer = setTimeout(schedule, 1000);
    return;
  }
  clockFails = 0;
  set(null);
  notify('Something went wrong at that table, so it was closed. Sorry! Start a new one from Play.');
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
  if (session.challenge) {
    // A sheet is open: the table waits for it.
    if (action.type === 'next' && (paused || checkWaiting >= 0)) return null;
    // Next hand deals at once, so whatever happens between hands happens first.
    if (action.type === 'next' && !readyToDeal()) return null;
    if (action.type === 'act') notePoint(action.move, action.to);
  }
  let r: ReturnType<typeof applyAction>;
  try {
    r = applyAction(session.game, action, { deviceId: me, now: toTableTime(Date.now(), session.game.fast), rng: rngFor(session.game) });
  } catch (e) {
    // A tap that hits an engine error is turned down, never thrown into the screen that sent it.
    console.warn('[table move]', action.type, e);
    notify("That didn't work. Try again.");
    return 'error';
  }
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
export function openLocalTable(settings: Settings, bots: number, name: string, emoji: string, botNames?: string[]): void {
  closeConnection();
  const fast = isFast();
  const game = createTable({
    hostDeviceId: me,
    name: cleanName(name) || 'You',
    emoji,
    settings,
    bots,
    ...(botNames?.length ? { botNames } : {}),
    code: null,
    now: toTableTime(Date.now(), fast),
  });
  if (fast) game.fast = true;
  set({ mode: 'local', code: null, game });
}

/** Opens a table on the server for friends to join with its code, seated as the host. Throws with a message. */
export async function openOnlineTable(settings: Settings, bots: number, name: string, emoji: string, botNames?: string[]): Promise<string> {
  const version = identityVersion;
  profile = { name, emoji };
  const body = { deviceId: me, name: cleanName(name) || 'Host', emoji, settings, bots, ...(botNames?.length ? { botNames } : {}) };
  let code: string;
  try {
    code = await createOnlineTable(body);
  } catch (e) {
    // Bought Premium but the server hasn't seen the purchase yet (offline at the time): ask the App Store for it
    // once more, wait for the server to take it, then try again. Someone with no Premium at all just gets the
    // server's answer.
    if (!(e instanceof PremiumRequiredError) || !hasPremium()) throw e;
    await restorePremium();
    if (!(await bindPurchase(null))) throw e;
    code = await createOnlineTable(body);
  }
  if (version !== identityVersion) throw new Error('Your data was reset. Open a new table to continue.');
  set({ mode: 'online', code, game: null });
  connect(code);
  return code;
}

/**
 * The lobby's Change: the host picks their own game code. A table's code is its name on the server, so this opens
 * the same table again at the new code (the settings and the bots come along) and ends the old one; anyone who'd
 * sat down there sees it close. Throws with the server's sentence when the code is taken or can't be used.
 */
export async function changeTableCode(code: string): Promise<string> {
  const old = session?.mode === 'online' ? session.game : null;
  if (!old || session?.mode !== 'online' || old.status !== 'lobby' || old.hostDeviceId !== me) throw new Error('Only the host can change the code, before the deal.');
  if (old.code === code) return code;
  const host = old.players.find((p) => p.deviceId === me);
  const fresh = await createOnlineTable({
    deviceId: me,
    name: cleanName(host?.name ?? profile.name) || 'Host',
    emoji: host?.emoji ?? profile.emoji,
    settings: old.settings,
    bots: 0,
    botNames: old.players.filter((p) => p.bot).map((p) => p.name),
    code,
  });
  if (session?.mode !== 'online' || session.code !== old.code) return fresh;
  conn?.send({ t: 'act', id: newId(8), a: { type: 'end' } });
  // The old lobby stays on screen under the new code until the new table's first update replaces it.
  set({ mode: 'online', code: fresh, game: { ...old, code: fresh } });
  connect(fresh);
  return fresh;
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
  old?.close();
  sendingId = null;
  publish({ conn: 'none', sending: false });
  points = [];
  pendingWhatIf = null;
  paused = false;
  checkWaiting = -1;
  set(null);
}

/**
 * The setup page opened an online lobby early (so invited friends have a table to join) and the host went back
 * without opening it: end that table, so anyone who sat down sees it close, and leave it. Any other table is left alone.
 */
export function abandonLobby(code: string): void {
  if (session?.mode !== 'online' || session.code !== code) return;
  const game = session.game;
  if (!game || (game.status === 'lobby' && game.hostDeviceId === me)) conn?.send({ t: 'act', id: newId(8), a: { type: 'end' } });
  leaveTable();
}

/** After deletion, all table consumers and API calls must share the new identity. */
export function resetSessionIdentity(): void {
  identityVersion++;
  points = [];
  pendingWhatIf = null;
  doneWhatIf = null;
  whatIf = null;
  paused = false;
  checkWaiting = -1;
  closeConnection();
  clearTimeout(timer);
  clearTimeout(saveTimer);
  session = null;
  profile = { name: '', emoji: '' };
  lookSent = '';
  lastCounted = '';
  joinSent = false;
  me = deviceId();
  publish({ mode: null, code: null, game: null, conn: 'none', sending: false, notice: null, logs: null, challenge: null });
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

// ── Challenges ───────────────────────────────────────────────────────────────
// A challenge is a bots-only table with a run beside it (src/game/challenges.ts). Its random numbers are seeded from
// the table's own state, so a spot always plays the same way, which is what lets Rewind replay a hand. Between hands,
// just before each deal, `readyToDeal()` does what the challenge needs (a Detective check, the end of the run, new
// blinds and bots).

/** Sheets that stop the clock: Rewind and its result. */
let paused = false;
/** Detective: the check waiting to be answered before the next deal, or -1. */
let checkWaiting = -1;
/** Rewind: your decisions in the hand that can be rewound, and which hand that is. Kept in memory only. */
let points: DecisionPoint[] = [];
type WhatIfLine = { hand: number; was: number; point: DecisionPoint; lines: { move: Move; to?: number }[] };
let pendingWhatIf: WhatIfLine | null = null;
/** The rewound hand that's finished, kept for its "how it usually goes". */
let doneWhatIf: WhatIfLine | null = null;
let whatIf: ChallengeView['whatIf'] = null;

function rngFor(game: Game): () => number {
  return session?.mode === 'local' && session.challenge ? challengeRng(game, session.challenge.seed) : cryptoRng;
}

const recordsOf = (game: Game): HandRecord[] => game.logs.flatMap((l) => (l.record && l.record.tableId === game.id ? [l.record] : []));

function challengeView(): ChallengeView | null {
  const run = session?.mode === 'local' ? session.challenge : undefined;
  if (!run || session?.mode !== 'local') return null;
  return {
    id: run.id,
    tags: run.tags ?? {},
    checks: run.checks?.length ?? 0,
    checkWaiting,
    rewindsLeft: run.rewindsLeft ?? 0,
    canRewind: canRewind(session.game, run),
    whatIf,
    result: run.result ?? null,
    rewound: run.rewound ?? [],
  };
}

const publishChallenge = () => publish({ challenge: challengeView() });

/** Opens a challenge on this phone and deals it. */
export function openChallengeTable(id: ChallengeId, name: string, emoji: string): void {
  closeConnection();
  points = [];
  pendingWhatIf = null;
  whatIf = null;
  paused = false;
  checkWaiting = -1;
  const fast = isFast();
  const now = toTableTime(Date.now(), fast || id === 'detective');
  const seed = Math.floor(cryptoRng() * 2 ** 32);
  const { game, run } = openChallenge(id, { deviceId: me, name: cleanName(name) || 'You', emoji, now, seed, fast });
  const r = applyAction(game, { type: 'start' }, { deviceId: me, now, rng: challengeRng(game, seed) });
  set({ mode: 'local', code: null, game: r.ok ? r.game : game, challenge: run });
}

/**
 * Just before a deal: a Detective check waits for its answers, a finished run ends, and otherwise the challenge sets up
 * the next hand (blinds, new bots, top-ups). Returns false if the deal mustn't happen now.
 */
function readyToDeal(): boolean {
  if (session?.mode !== 'local' || !session.challenge) return true;
  const run = session.challenge;
  const now = toTableTime(Date.now(), session.game.fast);
  const due = checkDue(session.game, run);
  if (due >= 0) {
    checkWaiting = due;
    clearTimeout(timer);
    publishChallenge();
    return false;
  }
  if (runOver(session.game, run)) {
    const r = applyAction(session.game, { type: 'end' }, { deviceId: me, now, rng: rngFor(session.game) });
    if (r.ok) set({ ...session, game: r.game });
    return false;
  }
  session = { ...session, game: beforeDeal(session.game, run, rngFor(session.game)) };
  return true;
}

/** Scores a run once its table is over, and keeps your best. */
function finishRun(s: Session & { mode: 'local' }): void {
  const run = s.challenge;
  if (!run || run.result || s.game.status !== 'ended') return;
  const score = scoreRun(s.game, run, recordsOf(s.game));
  const { before, newBest } = noteRun(run.id, score, Date.now());
  run.result = { score, best: Math.max(before?.best ?? 0, score), newBest };
  run.score = score;
  points = [];
}

// ── Style Detective ──

/** Tags a bot with a label (or clears it). The tag shows on its seat. */
export function tagBot(playerId: string, label: Label | null): void {
  if (session?.mode !== 'local' || session.challenge?.id !== 'detective') return;
  const tags = { ...(session.challenge.tags ?? {}) };
  if (label) tags[playerId] = label;
  else delete tags[playerId];
  session.challenge.tags = tags;
  save(KEY, session);
  publishChallenge();
}

/** The bots to name at a check, in seat order. */
export function suspects(): { id: string; name: string; emoji: string }[] {
  if (session?.mode !== 'local') return [];
  return session.game.players.filter((p) => p.bot).sort((a, b) => a.seat - b.seat).map((p) => ({ id: p.id, name: p.name, emoji: p.emoji }));
}

/** Answers the waiting check. Says only how many of the five are right. */
export function answerCheck(answers: Record<string, Label>): number {
  if (session?.mode !== 'local' || session.challenge?.id !== 'detective' || checkWaiting < 0) return 0;
  const run = session.challenge;
  run.checks = [...(run.checks ?? []), { ...answers }];
  run.tags = { ...answers };
  save(KEY, session);
  publishChallenge();
  return rightCount(answers, truthOf(session.game));
}

/** After the answer's been seen: the table carries on (or, after the last check, the run ends). */
export function closeCheck(): void {
  if (session?.mode !== 'local') return;
  checkWaiting = -1;
  publishChallenge();
  if (readyToDeal()) {
    const r = applyAction(session.game, { type: 'tick' }, { deviceId: 'clock', now: toTableTime(Date.now(), session.game.fast), rng: rngFor(session.game) });
    set({ ...session, game: r.ok ? r.game : session.game });
  }
}

export interface Suspect {
  id: string;
  name: string;
  emoji: string;
  label: Label;
  style: StyleId;
  tell: string;
  /** "Played 54% of hands, raised 31%", from public moves. */
  stats: { hands: number; played: number; raised: number };
  /** What you said at each check. */
  answers: (Label | undefined)[];
}

/** The answer key, only once the run is over. */
export function revealSuspects(): Suspect[] | null {
  if (session?.mode !== 'local' || session.challenge?.id !== 'detective' || session.game.status !== 'ended') return null;
  const run = session.challenge;
  const recs = recordsOf(session.game);
  return session.game.players
    .filter((p) => p.bot && p.style)
    .sort((a, b) => a.seat - b.seat)
    .map((p) => {
      const style = p.style as StyleId;
      return { id: p.id, name: p.name, emoji: p.emoji, style, label: STYLE_LABEL[style], tell: STYLE_TELL[style], stats: publicStats(recs, p.id), answers: (run.checks ?? []).map((c) => c[p.id]) };
    });
}

// ── Rewind ──

/** Before a move of yours at a Rewind table: keep the table as it was, so the hand can be played again from here. */
function notePoint(move: Move, to?: number): void {
  if (session?.mode !== 'local' || session.challenge?.id !== 'rewind') return;
  const game = session.game;
  const hero = heroOf(game);
  if (!hero || game.hand?.toAct !== hero.id) return;
  if (points[0] && points[0].hand !== game.hand.number) points = [];
  const p = decisionPoint(game, hero.id, { move, to });
  if (p) points.push(p);
}

/** The hand you can rewind, if there is one: the one just finished, until the next hand's first move. */
function rewindHand(game: Game): number | null {
  const hand = game.hand;
  const n = points[0]?.hand;
  if (!hand || n === undefined || game.status !== 'playing') return null;
  if (hand.number === n && hand.result) return n;
  if (hand.number === n + 1 && !hand.result && (hand.actions?.length ?? 0) === 0) return n;
  return null;
}

function canRewind(game: Game, run: ChallengeRun): boolean {
  return run.id === 'rewind' && (run.rewindsLeft ?? 0) > 0 && rewindHand(game) !== null && !pendingWhatIf;
}

/** Stops or restarts the table's clock while a Rewind sheet is open. */
export function pauseTable(on: boolean): void {
  if (paused === on) return;
  paused = on;
  if (on) clearTimeout(timer);
  else schedule();
}

export interface RewindSpot {
  index: number;
  street: string;
  /** What you did, as the table said it. */
  did: string;
  pot: number;
  toCall: number;
  choices: Choice[];
}

const said = (m: { move: Move; to?: number }): string =>
  m.move === 'fold' ? 'Fold' : m.move === 'check' ? 'Check' : m.move === 'call' ? 'Call' : m.move === 'allin' ? 'All in' : `${m.move === 'bet' ? 'Bet' : 'Raise to'} ${(m.to ?? 0).toLocaleString('en-US')}`;

/** Your decisions in the hand that can be rewound, each with what else you could have done. */
export function rewindSpots(): RewindSpot[] {
  if (session?.mode !== 'local' || !session.challenge || !canRewind(session.game, session.challenge)) return [];
  const hero = heroOf(session.game);
  if (!hero) return [];
  return points.map((p, index) => ({ index, street: p.street, did: said(p.did), pot: p.pot, toCall: p.toCall, choices: rewindChoices(p, hero.id) }));
}

/** Plays the hand again from one of your decisions with a different move. The new line counts. */
export function rewindTo(index: number, choice: Choice): boolean {
  if (session?.mode !== 'local' || !session.challenge || !canRewind(session.game, session.challenge)) return false;
  const run = session.challenge;
  const point = points[index];
  const hero = heroOf(session.game);
  if (!point || !hero) return false;
  const rec = recordsOf(session.game).find((r) => r.number === point.hand);
  const was = rec ? recordNet(rec, hero.id) : 0;
  const now = toTableTime(Date.now(), session.game.fast);
  const replay = replayFrom(point, session.game.logs, choice, { deviceId: me, now, rng: challengeRng(point.snapshot, run.seed) });
  if (typeof replay === 'string') {
    notify(replay);
    return false;
  }
  run.rewindsLeft = (run.rewindsLeft ?? 1) - 1;
  pendingWhatIf = { hand: point.hand, was, point, lines: [point.did, { move: choice.move, to: choice.to }] };
  points = points.slice(0, index);
  set({ ...session, game: replay });
  return true;
}

/** Once the rewound hand is over: how it came out this time against the first. */
function watchWhatIf(): void {
  if (!pendingWhatIf || session?.mode !== 'local') return;
  const hand = session.game.hand;
  if (!hand || hand.number !== pendingWhatIf.hand || !hand.result) return;
  const hero = heroOf(session.game);
  const rec = recordsOf(session.game).find((r) => r.number === pendingWhatIf!.hand);
  const nowNet = rec && hero ? recordNet(rec, hero.id) : 0;
  whatIf = { hand: pendingWhatIf.hand, was: pendingWhatIf.was, now: nowNet, did: said(pendingWhatIf.lines[0]), tried: said(pendingWhatIf.lines[1]), bigBlind: session.game.settings.bigBlind };
  session.challenge?.rewound?.push({ hand: pendingWhatIf.hand, was: pendingWhatIf.was, now: nowNet });
  doneWhatIf = pendingWhatIf;
  pendingWhatIf = null;
}

/** "How it usually goes" for the hand you just rewound: both lines, from the same spot, a chunk at a time. */
export function usuallyForWhatIf(runs: number) {
  const w = doneWhatIf;
  const hero = session?.mode === 'local' ? heroOf(session.game) : undefined;
  if (!w || !hero) return null;
  return usuallyGoes(w.point, hero.id, me, w.lines, runs, w.point.snapshot.version + 1);
}

/** The result sheet has been seen. */
export function closeWhatIf(): void {
  whatIf = null;
  publishChallenge();
}
