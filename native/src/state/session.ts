// The table this phone is at, kept as the web app keeps it.
// - A bots-only table runs right here: applyAction() is the only way it changes, and its own clock ticks it at
//   game.wakeAt (bots act, cards run out, hands deal). The screens only ever see redactForDevice()'s view.
// - An online table lives on the server (one TableRoom per code). This phone sends its moves and shows the state the
//   server sends back, which is already redacted for this device.
import { useSyncExternalStore } from 'react';

import {
  applyAction,
  cleanName,
  createDemoTable,
  createTable,
  cryptoRng,
  newId,
  redactForDevice,
  redactLogs,
  toTableTime,
  type Action,
  variantOf,
  type Variant,
  type Game,
  type HandLog,
  type ServerMessage,
  type Settings,
  type LabBotSpec,
  FREE_BOT_NAMES,
  isFreeBot,
  isVariant,
} from '@/engine';

import { createOnlineTable, PremiumRequiredError } from './api';
import { bindPurchase } from './entitlement';
import { hasPremium } from './premium';
import { restorePremium } from './purchase';
import { Connection, type ConnStatus } from './connection';
import { deviceId } from './device';
import { UserError } from './user-error';
import { isFast } from './prefs';
import { readProfile, wornLook } from './profile';
import { noteGame, noteHand } from './record';
import { recordFeel, rivalsFor } from './table-feel';
import { BLOCKED_KEY, isBlocked, maskBlocked, seatKey } from './blocks';
import { forgetLastHand, lastHand, noteReplay, playedPastPreflop } from './replays';
import { markRulesSeen, rulesSeen } from './rules-seen';
import { save, subscribe } from './storage';

const KEY = 'flipup.session';

type Session = { mode: 'local'; code: null; game: Game } | { mode: 'online'; code: string; game: Game | null; joining?: boolean};

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
  /** Replay after every hand (a bots-only house rule): the finished hand the table is waiting on, by its replay id.
   * The next deal holds until `releaseRecap()`. */
  recap: string | null;
  /** While the Review countdown runs: when it ends (real time, ms). Null once it's stopped by opening Review. */
  recapEnds: number | null;
  /** The Review card is open. */
  review: boolean;
  /** A mini game you've never played: its rules card is up on the table and a bots-only table's first deal waits for
   * Continue (`releaseRules()`). */
  rules: Variant | null;
  /** The Demo on screen (see `openDemo()`): which game, and whether its hand has been dealt in (`startDemo()`). */
  demo: { variant: Variant; started: boolean } | null;
}

export let me = deviceId();

let session: Session | null = null;
let identityVersion = 0;
let state: TableState = { mode: null, code: null, game: null, conn: 'none', sending: false, notice: null, logs: null, recap: null, recapEnds: null, review: false, rules: null, demo: null };
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
  // A notice belongs to the table it was about: a refusal from an earlier lobby ("You need at least two players") must not greet the next one.
  const fresh = session?.game?.id !== next?.game?.id || session?.mode !== next?.mode;
  session = next;
  publish({
    ...(fresh ? { notice: null } : {}),
    mode: next?.mode ?? null,
    code: next?.code ?? null,
    game: !next?.game ? null : maskBlocked(next.mode === 'local' ? redactForDevice(next.game, me) : next.game),
  });
  schedule();
  syncLook();
  // A demo hand is never counted, kept or saved: your real table waits aside (see openDemo()).
  if (demo) return;
  noteDay(state.game);
  if (next) noteReplay(state.game, me, next.mode === 'local' ? 'bots' : 'online', next.mode === 'local' ? next.game : null);
  holdForRecap(next);
  // Writing the whole table on every move is a lot of work mid-hand, so it waits a moment and goes in one go.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(KEY, session), next ? 600 : 0);
}

// Blocking or unblocking someone redraws the table at once.
subscribe(BLOCKED_KEY, () => {
  if (session?.game) publish({ game: maskBlocked(session.mode === 'local' ? redactForDevice(session.game, me) : session.game) });
});

/**
 * Keeps your card back on your seat (the web's `syncLook()`): a table you just opened or joined
 * doesn't know them yet, and picking a new one mid-game should show at once. Sent once per table and look.
 */
let lookSent = '';
export function syncLook(): void {
  const game = session?.game;
  const mine = game?.players.find((p) => p.deviceId === me);
  if (!game || !mine || game.status === 'ended') return;
  const want = wornLook();
  const key = `${game.id}:${want.cardPack ?? ''}:${want.gold ? 'g' : ''}`;
  if (((mine.cardPack ?? '') === (want.cardPack ?? '') && !!mine.gold === !!want.gold) || lookSent === key) return;
  lookSent = key;
  // After this update has gone out, so a bots-only table doesn't change inside its own set().
  // (Only if it's still the same table by then: a table opened in the meantime has its own name and look.)
  setTimeout(() => session?.game?.id === game.id && dispatch({ type: 'setLook', name: mine.name, emoji: mine.emoji, ...want }), 0);
}

/** A finished hand you were dealt into counts once toward your poker record; a table that ends is noted once. */
let lastCounted = '';
function noteDay(game: Game | null): void {
  const hand = game?.hand;
  const mine = game?.players.find((p) => p.deviceId === me);
  if (!game || !mine) return;
  const key = `${game.id}/${hand?.number}`;
  if (hand?.result && key !== lastCounted && hand.seats.some((s) => s.playerId === mine.id && s.cards.length > 0)) {
    lastCounted = key;
    noteHand(game, mine.id);
  }
  // Home's record of your games: where you finished, once the table is over.
  if (game.status === 'ended') noteGame(game, mine.id);
  // How the table felt (hands, rebuys, coming back) and the bots you've now met, on this phone only.
  recordFeel(game, mine.id);
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

/** The next hand is due to be dealt (a little early, so the timer's rounding never misses it). */
function dealDue(game: Game, now: number): boolean {
  const hand = game.hand;
  return game.status === 'playing' && (!hand || !!hand.result) && game.nextHandAt !== null && now >= game.nextHandAt - 20;
}

/** A bots-only table's clock: one timer for the next thing that's due. Online, the server keeps the clock. */
function schedule(minDelay = 0): void {
  clearTimeout(timer);
  const wakeAt = session?.mode === 'local' ? session.game.wakeAt : null;
  if (wakeAt == null || session?.mode !== 'local') return;
  // A fast table's clock runs twice as fast: its waits are half as long in real time.
  const fast = !!session.game.fast;
  timer = setTimeout(
    () => {
      if (session?.mode !== 'local') return;
      const now = toTableTime(Date.now(), session.game.fast);
      // The rules card is up on a first mini game, or the Demo's welcome: nothing moves until it's closed.
      if (rulesHeld || demoHeld) return;
      // Replay after every hand: the recap is up, so the deal waits for Next hand (bots may still talk).
      if (recapHeld && dealDue(session.game, now)) return;
      let r: ReturnType<typeof applyAction>;
      try {
        r = applyAction(session.game, { type: 'tick' }, { deviceId: 'clock', now, rng: cryptoRng });
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

// ── Replay after every hand ─────────────────────────────────────────────────
// A bots-only house rule (`settings.replayEachHand`): once a hand you played past preflop is over, the recap card
// comes up and the deal waits for you. Held in memory only: a table reopened after the app was closed just deals.

/** True while the recap is up and the next deal waits. */
let recapHeld = false;
/** Ends the countdown: the next hand deals when it fires unless Review was opened. */
let recapTimer: ReturnType<typeof setTimeout> | undefined;
/** Seconds the table waits after a hand you played, when Review after every hand is on. */
export const RECAP_COUNTDOWN_MS = 10_000;
/** The last hand a recap was shown for, so it comes up once per hand. */
let recapDone = '';
/** True while a saved table is being put back at launch: the hand it holds was played before the app closed, so no recap for it. */
let restoring = false;

function holdForRecap(next: Session | null): void {
  const hand = lastHand();
  const game = next?.mode === 'local' ? next.game : null;
  const on = !!game?.settings.replayEachHand && game.status === 'playing' && !!game.hand?.result;
  if (!on || !hand || hand.tableId !== game!.id || hand.number !== game!.hand!.number || recapDone === hand.id) {
    // The rule switched off (or the table went) while the recap was up: let it deal.
    if (recapHeld && !game?.settings.replayEachHand) releaseRecap();
    return;
  }
  recapDone = hand.id;
  if (restoring) return;
  if (!playedPastPreflop(hand)) return;
  recapHeld = true;
  clearTimeout(recapTimer);
  recapTimer = setTimeout(releaseRecap, RECAP_COUNTDOWN_MS);
  publish({ recap: hand.id, recapEnds: Date.now() + RECAP_COUNTDOWN_MS, review: false });
}

/** Review: the countdown stops and the Review card opens. The deal waits until Next hand. */
export function startReview(): void {
  if (!recapHeld) return;
  clearTimeout(recapTimer);
  publish({ recapEnds: null, review: true });
}

/** Back to the table from the Review card: the countdown stays stopped, Next hand deals. */
export function closeReview(): void {
  if (state.review) publish({ review: false });
}

/** Next hand on the recap: it goes away and the table deals as soon as it's due (at once if it already was). */
export function releaseRecap(): void {
  if (!recapHeld && !state.recap) return;
  recapHeld = false;
  clearTimeout(recapTimer);
  publish({ recap: null, recapEnds: null, review: false });
  if (session?.mode !== 'local') return;
  const hand = session.game.hand;
  // You've seen it: deal now rather than wait out the rest of the pause.
  if (hand?.result && session.game.status === 'playing') {
    try {
      const r = applyAction(session.game, { type: 'next', hand: hand.number }, { deviceId: me, now: toTableTime(Date.now(), session.game.fast), rng: cryptoRng });
      if (r.ok && r.changed) {
        set({ ...session, game: r.game });
        return;
      }
    } catch (e) {
      console.warn('[recap next]', e);
    }
  }
  schedule();
}

// ── The first-time rules card ───────────────────────────────────────────────
// The first time you play a mini game against bots, its rules card comes up on the table itself (the owner, 16 Nov
// 2026: in the game screen, not before it opens). The table's first deal and the greeting wait for Continue, and the
// clock shifts by however long the card was up, so "Dealing in 3…" still counts from the start.

/** True while the rules card is up and a bots-only table's clock waits. */
let rulesHeld = false;
/** When the card came up, in table time. */
let rulesAt = 0;

function holdForRules(): void {
  if (session?.mode !== 'local') return;
  const v = variantOf(session.game);
  if (rulesSeen(v)) return;
  rulesHeld = true;
  rulesAt = toTableTime(Date.now(), session.game.fast);
  publish({ rules: v });
}

/** Continue on the rules card: it's marked seen and the table carries on from where it waited. */
export function releaseRules(): void {
  if (!rulesHeld && !state.rules) return;
  const v = state.rules;
  rulesHeld = false;
  if (v) markRulesSeen(v);
  publish({ rules: null });
  shiftClock(rulesAt);
}

/** A bots-only table that waited before its first deal carries on from where it stopped, as if no time had passed. */
function shiftClock(heldAt: number): void {
  if (session?.mode !== 'local') return;
  const gap = Math.max(0, toTableTime(Date.now(), session.game.fast) - heldAt);
  const g = structuredClone(session.game);
  if (g.nextHandAt != null) g.nextHandAt += gap;
  if (g.wakeAt != null) g.wakeAt += gap;
  if (g.pendingTalk) g.pendingTalk.at += gap;
  set({ ...session, game: g });
}

function forgetRules(): void {
  rulesHeld = false;
  if (state.rules) publish({ rules: null });
}

function forgetRecap(): void {
  recapHeld = false;
  recapDone = '';
  clearTimeout(recapTimer);
  if (state.recap) publish({ recap: null, recapEnds: null, review: false });
}

// ── The Demo ────────────────────────────────────────────────────────────────
// One hand of a game, dealt to order on this phone (demo.ts in the engine), with the coach on top of the table
// (components/demo). Whatever table you were at is set aside and comes back as it was when the demo closes: a
// bots-only one waits where it stopped, an online one keeps up to date in the background. Nothing about a demo is
// counted in your record, kept as a hand or saved to the phone.

/** While a demo is open: the table it set aside (null if none), and a note for when it closes (that table ended). */
let demo: { stash: Session | null; note: string | null } | null = null;
/** True while the demo's welcome is up and its deal waits. */
let demoHeld = false;
let demoHeldAt = 0;

/** Opens the demo of a game over whatever table you're at. The deal waits for `startDemo()`. */
export function openDemo(variant: Variant): void {
  if (!demo) {
    // Your own table is saved as it is now, before the demo takes the screen.
    clearTimeout(saveTimer);
    if (session) save(KEY, session);
    demo = { stash: session, note: null };
  }
  clearTimeout(timer);
  // A recap or a rules card waiting on your own table comes up again when it's back.
  forgetRecap();
  forgetRules();
  const you = readProfile();
  const now = toTableTime(Date.now(), false);
  const table = createDemoTable({ variant, deviceId: me, name: cleanName(you.name) || 'You', emoji: you.emoji, now });
  const r = applyAction(table, { type: 'start' }, { deviceId: me, now, rng: cryptoRng });
  demoHeld = true;
  demoHeldAt = now;
  publish({ demo: { variant, started: false } });
  set({ mode: 'local', code: null, game: r.ok ? r.game : table });
}

/** The demo's welcome is closed: the clock starts and the hand is dealt a moment later. */
export function startDemo(): void {
  if (!demo || !state.demo || state.demo.started) return;
  demoHeld = false;
  publish({ demo: { ...state.demo, started: true } });
  shiftClock(demoHeldAt);
}

/** Closes the demo and puts back the table you were at, as it was (or as the server now has it). */
export function closeDemo(): void {
  if (!demo) return;
  const { stash, note } = demo;
  demo = null;
  demoHeld = false;
  clearTimeout(timer);
  publish({ demo: null });
  set(stash);
  if (stash?.mode === 'online') conn?.send({ t: 'sync' });
  if (note) notify(note);
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
  // Without Premium the host's bots come from the free ten, even when the button asks for a random one.
  // Bot Lab is Premium: its bots sit down only for a host who has it.
  if (action.type === 'addBot' && action.lab && !hasPremium()) {
    notify('Bot Lab bots need FlipUp Premium.');
    return 'premium';
  }
  if (action.type === 'addBot' && !action.lab && !hasPremium()) {
    if (action.name !== undefined && !isFreeBot(action.name)) {
      notify('That bot needs FlipUp Premium.');
      return 'premium';
    }
    if (action.name === undefined) {
      const seated = new Set((session.game?.players ?? []).map((p) => p.name));
      const name = FREE_BOT_NAMES.find((n) => !seated.has(n));
      if (!name) {
        notify('Those are all the free bots. Premium has the rest.');
        return 'premium';
      }
      action = { ...action, name };
    }
  }
  if (session.mode === 'online') {
    const id = newId(8);
    if (!conn?.send({ t: 'act', id, a: action })) {
      notify("You're offline. Hang on while we reconnect.");
      return 'offline';
    }
    sendingId = id;
    publish({ sending: true });
    previewMove(action);
    // If no answer comes back, don't leave the buttons waiting.
    setTimeout(() => {
      if (sendingId === id) {
        sendingId = null;
        publish({ sending: false });
      }
    }, 5000);
    return null;
  }
  // The table's own Next hand while the recap is up goes through the recap.
  if (action.type === 'next' && recapHeld) {
    releaseRecap();
    return null;
  }
  let r: ReturnType<typeof applyAction>;
  try {
    r = applyAction(session.game, action, { deviceId: me, now: toTableTime(Date.now(), session.game.fast), rng: cryptoRng });
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
  if (r.changed) {
    const first = action.type === 'start' && session.mode === 'local' && session.game.status === 'lobby';
    set({ ...session, game: r.game });
    if (first) holdForRules();
  }
  return null;
}

/**
 * Optimistic move: your fold, check, call or raise shows on the table the moment you tap, while the server's answer is
 * on its way. The phone has no deck, so it only shows a move that stays inside the street (nothing is dealt, no hand
 * ends); anything else waits for the server. The server's table replaces this one when it arrives, and a refusal puts
 * the table back as it was.
 */
function previewMove(action: Action): void {
  if (action.type !== 'act' || session?.mode !== 'online' || !session.game) return;
  const before = session.game;
  try {
    const r = applyAction(structuredClone(before), action, {
      deviceId: me,
      now: toTableTime(Date.now(), false),
      rng: () => {
        throw new Error('no deck on a phone');
      },
    });
    if (!r.ok || !r.changed) return;
    const a = before.hand;
    const b = r.game.hand;
    if (!a || !b || a.number !== b.number || a.street !== b.street || a.board.length !== b.board.length || b.result) return;
    publish({ game: maskBlocked(r.game) });
  } catch {
    // Not something the phone can work out alone: wait for the server.
  }
}

function onServerMessage(msg: ServerMessage): void {
  // A demo is on screen: the online table you're at keeps up to date behind it, and comes back as it is now.
  if (demo) {
    if (msg.t === 'state' && demo.stash?.mode === 'online') demo.stash = { ...demo.stash, game: msg.game };
    if (msg.t !== 'log' && sendingId) sendingId = null;
    return;
  }
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
      // Take back the move that was shown ahead of the server.
      if (session.game) publish({ game: maskBlocked(session.game) });
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
      // Behind a demo: the table is gone when the demo closes, and the note waits for then.
      if (demo) {
        demo.stash = null;
        demo.note = message;
        return;
      }
      set(null);
      notify(message);
    },
  });
}

/** The Try again button: reconnects at once instead of waiting for the next automatic try. */
export function retryConnection(): void {
  conn?.retryNow();
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
export function openLocalTable(settings: Settings, bots: number, name: string, emoji: string, botNames?: string[], labs: LabBotSpec[] = []): void {
  closeDemo();
  closeConnection();
  const fast = isFast();
  let game = createTable({
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
  // Bots you made in Bot Lab sit down after the named ones, the same way an online host seats them.
  for (const lab of labs) {
    const r = applyAction(game, { type: 'addBot', lab }, { deviceId: me, now: game.createdAt, rng: cryptoRng });
    if (r.ok) game = r.game;
  }
  // Bots you've played on this phone before know you: one greets you as a regular.
  const rivals = rivalsFor(game.players.filter((p) => p.bot).map((p) => p.name));
  if (Object.keys(rivals).length) game.rivals = rivals;
  set({ mode: 'local', code: null, game });
}

/** Opens a table on the server for friends to join with its code, seated as the host. Throws with a message. */
export async function openOnlineTable(settings: Settings, bots: number, name: string, emoji: string, botNames?: string[]): Promise<string> {
  closeDemo();
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
  if (version !== identityVersion) throw new UserError('Your data was reset. Open a new table to continue.');
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
  if (!old || session?.mode !== 'online' || old.status !== 'lobby' || old.hostDeviceId !== me) throw new UserError('Only the host can change the code, before the deal.');
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
  closeDemo();
  profile = { name, emoji };
  if (session?.mode === 'online' && session.code === code) {
    if (!conn) connect(code);
    return;
  }
  set({ mode: 'online', code, game: null, joining: true });
  connect(code);
}

/** Leaves the table. Online, you're taken off it first (a hand in play folds you on your turn). A demo just closes. */
export function leaveTable(): void {
  if (demo) {
    closeDemo();
    return;
  }
  forgetLastHand();
  forgetRecap();
  forgetRules();
  const mine = session?.mode === 'online' ? session.game?.players.find((p) => p.deviceId === me) : undefined;
  if (mine && session?.game?.status !== 'ended') conn?.send({ t: 'act', id: newId(8), a: { type: 'remove', playerId: mine.id } });
  const old = conn;
  conn = null;
  old?.close();
  sendingId = null;
  publish({ conn: 'none', sending: false });
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
  closeConnection();
  clearTimeout(timer);
  clearTimeout(saveTimer);
  session = null;
  profile = { name: '', emoji: '' };
  lookSent = '';
  lastCounted = '';
  joinSent = false;
  me = deviceId();
  forgetRecap();
  forgetRules();
  demo = null;
  demoHeld = false;
  publish({ mode: null, code: null, game: null, conn: 'none', sending: false, notice: null, logs: null, recap: null, recapEnds: null, review: false, rules: null, demo: null });
}

// A table you were at comes back after the app is closed: a bots-only one as it was, an online one by reconnecting.
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
  const p = JSON.parse(localStorage.getItem('flipup.profile') ?? 'null') as { name?: string; emoji?: string } | null;
  profile = { name: p?.name ?? '', emoji: p?.emoji ?? '' };
  // A table of a game that has since left the app (Imposter, say) can't be played on: it's dropped.
  const known = !saved?.game || ![saved.game.settings?.variant, saved.game.hand?.variant].some((v) => v && !isVariant(v));
  if (!known) save(KEY, null);
  else if (saved?.mode === 'local' && saved.game) {
    restoring = true;
    try {
      set(saved);
    } finally {
      restoring = false;
    }
  }
  else if (saved?.mode === 'online' && saved.code && saved.game?.status === 'lobby' && saved.game.hostDeviceId === me) {
    // The host's lobby was only open behind the Play with friends page, and closing the app ended that page. Putting
    // it back as a second, half-built lobby behind Rejoin was confusing; it's dropped (the server closes an unused
    // table by itself).
    save(KEY, null);
  }
  else if (saved?.mode === 'online' && saved.code) {
    set({ mode: 'online', code: saved.code, game: saved.game });
    connect(saved.code);
  }
} catch {
  // A broken saved table is dropped.
}
