// Blackjack on the phone: a table on its own (you, one or two bots and Vincent) runs here with its own clock,
// a table with friends runs on the server (worker/blackjack.ts) and this keeps a socket to it. Either way the
// screens only see what a player may see, and every change goes through bjSettle() so the bankroll pays each
// stake once and collects each round once. Friends come through invites on their friend card (`flipup.pals`).

import { useSyncExternalStore } from 'react';
import { applyBj, bjSettle, createBlackjack, cryptoRng, isBlackjackTable, isCode, newId, redactBj, type BjAction, type BjClientMessage, type BjInvite, type BjServerMessage, type Blackjack } from '../game';
import { createBlackjackTable, fetchBjInvites, sendBjInvite } from './api';
import { getCampaign, setCampaign } from './campaign';
import { Connection, type ConnStatus } from './connection';
import { ensureMyCode, myPalCode } from './pals';
import { loadDeviceId, loadProfile, read, write } from './persist';

const KEY = 'flipup.blackjack';
const SEEN = 'flipup.bjSeen';

export interface BjState {
  /** The table as this phone may see it. */
  game: Blackjack | null;
  mode: 'local' | 'online' | null;
  conn: ConnStatus | 'none';
  /** A move sent to the server that hasn't come back yet. */
  sending: boolean;
  /** Friends asking you to their table, not yet answered. */
  invites: BjInvite[];
  /** Friends invited from this table, so their row says so. */
  invited: string[];
}

interface Saved {
  mode: 'local' | 'online';
  /** A table on its own, whole (shoe included). */
  game?: Blackjack;
  code?: string;
}

let state: BjState = { game: null, mode: null, conn: 'none', sending: false, invites: [], invited: [] };
const listeners = new Set<() => void>();
let local: Blackjack | null = null;
let conn: Connection<BjServerMessage, BjClientMessage> | null = null;
let clock: ReturnType<typeof setTimeout> | undefined;

function set(patch: Partial<BjState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useBj<T>(selector: (s: BjState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
  );
}

export const getBj = (): BjState => state;

/** This phone's seat at the table it's looking at. */
export const mySeat = (game: Blackjack | null) => game?.seats.find((s) => !s.bot && s.deviceId === loadDeviceId());

/** A new view of the table: show it, and keep the bankroll in step with it. */
function show(game: Blackjack): void {
  setCampaign(bjSettle(getCampaign(), game, mySeat(game)?.id, Date.now()));
  set({ game });
}

const saved = (): Saved | null => {
  const s = read<Saved>(KEY);
  if (s?.mode === 'local' && isBlackjackTable(s.game)) return s;
  if (s?.mode === 'online' && isCode(s.code)) return s;
  return null;
};

/** Your hand is still being played: getting up now would leave the bet on the felt. */
export function bjMidHand(): boolean {
  const me = mySeat(state.game);
  return !!me && me.hands.length > 0 && state.game!.phase !== 'betting' && state.game!.phase !== 'done';
}

/** Whether there's a table to go back to. */
export const hasBjTable = (): boolean => !!state.game || !!saved();

// ── On your own ──────────────────────────────────────────────────────────────

function runLocal(next: Blackjack): void {
  local = next;
  write(KEY, { mode: 'local', game: next } satisfies Saved);
  show(redactBj(next));
  clearTimeout(clock);
  if (next.wakeAt !== null) clock = setTimeout(() => local && localAct({ type: 'tick' }, 'server'), Math.max(0, next.wakeAt - Date.now()));
}

function localAct(action: BjAction, deviceId = loadDeviceId()): string | null {
  if (!local) return 'No table.';
  const r = applyBj(local, action, { deviceId, now: Date.now(), rng: cryptoRng });
  if (!r.ok) return r.error;
  if (r.changed) runLocal(r.game);
  return null;
}

/** Sits you down: back at the table you left, or a new one with one or two bots. */
export function openBlackjack(): void {
  // Already at a table, or on the way to one.
  if (state.game || state.mode) return;
  const s = saved();
  if (s?.mode === 'online' && s.code) return connect(s.code);
  const { name, emoji } = loadProfile();
  const game =
    s?.game ?? createBlackjack({ id: newId(), online: false, host: { deviceId: loadDeviceId(), name, emoji }, now: Date.now(), rng: cryptoRng });
  set({ mode: 'local', conn: 'none', invited: [] });
  runLocal(game);
  // Back at a saved table: the clock carries on from where it was.
  if (game.wakeAt !== null && game.wakeAt < Date.now()) localAct({ type: 'tick' }, 'server');
}

// ── With friends ─────────────────────────────────────────────────────────────

function connect(code: string, sit = false): void {
  conn?.close();
  clearTimeout(clock);
  local = null;
  write(KEY, { mode: 'online', code } satisfies Saved);
  set({ mode: 'online', conn: 'connecting' });
  const deviceId = loadDeviceId();
  const c: Connection<BjServerMessage, BjClientMessage> = new Connection<BjServerMessage, BjClientMessage>(
    code,
    deviceId,
    {
      onMessage(msg) {
        if (msg.t === 'state') {
          if (msg.ack) set({ sending: false });
          show(msg.game);
        } else if (msg.t === 'reject') {
          set({ sending: false });
          if (msg.id) onReject?.(msg.error);
        }
      },
      onStatus: (status) => set({ conn: status }),
      onOpen() {
        // Joining, or back after a dropped signal: make sure we're seated with our latest name and picture.
        const { name, emoji } = loadProfile();
        if (sit || mySeat(state.game)) c.send({ t: 'act', id: newId(8), a: { type: 'sit', name, emoji } });
      },
      onGone(message) {
        forget();
        onReject?.(message);
      },
    },
    `/api/blackjack/${code}/ws`,
  );
  conn = c;
}

/** Errors from the server, shown by the screen as a toast. */
let onReject: ((error: string) => void) | undefined;
export const onBjError = (f: (error: string) => void) => (onReject = f);

/** Opens a table on the server with this phone seated and one or two new bots, ready for invites. */
export async function openBlackjackForFriends(): Promise<void> {
  const { name, emoji } = loadProfile();
  // Invites go out from your friend code, so make sure there is one.
  await ensureMyCode();
  if (state.mode === 'local') leaveBlackjack();
  const code = await createBlackjackTable({ deviceId: loadDeviceId(), name, emoji });
  set({ game: null, invited: [] });
  connect(code);
}

/** Accepts a friend's invite. */
export function joinBlackjack(invite: BjInvite): void {
  dismissInvite(invite);
  leaveBlackjack();
  connect(invite.table, true);
}

export async function inviteFriend(friendCode: string): Promise<void> {
  const table = state.game?.code;
  const from = myPalCode() ?? (await ensureMyCode());
  if (!table) throw new Error('Open the table for friends first.');
  await sendBjInvite(friendCode, { deviceId: loadDeviceId(), fromCode: from, table });
  set({ invited: [...new Set([...state.invited, friendCode])] });
}

// ── Moves ────────────────────────────────────────────────────────────────────

/** A move from this phone. Returns why not, or null once it's on its way. */
export function bjAct(action: BjAction): string | null {
  if (state.mode === 'local') return localAct(action);
  if (!conn) return 'Not connected.';
  if (!conn.send({ t: 'act', id: newId(8), a: action })) return 'Reconnecting…';
  set({ sending: true });
  return null;
}

function forget(): void {
  conn?.close();
  conn = null;
  local = null;
  clearTimeout(clock);
  write(KEY, null);
  set({ game: null, mode: null, conn: 'none', sending: false, invited: [] });
}

/** Gets up from the table. Anything still on the felt stays there, as at a real table. */
export function leaveBlackjack(): void {
  if (state.mode === 'online') conn?.send({ t: 'act', id: newId(8), a: { type: 'leave' } });
  // Settle whatever the table already owes before it's gone.
  if (state.game) setCampaign(bjSettle(getCampaign(), state.game, mySeat(state.game)?.id, Date.now()));
  forget();
}

// ── Invites ──────────────────────────────────────────────────────────────────

const seenKey = (i: BjInvite) => `${i.from}:${i.at}`;

function dismissInvite(invite: BjInvite): void {
  const seen = (read<string[]>(SEEN) ?? []).filter((k) => typeof k === 'string');
  write(SEEN, [...seen, seenKey(invite)].slice(-40));
  set({ invites: state.invites.filter((i) => seenKey(i) !== seenKey(invite)) });
}

export const declineInvite = dismissInvite;

let polling: ReturnType<typeof setInterval> | undefined;

async function checkInvites(): Promise<void> {
  const code = myPalCode();
  if (!code || document.visibilityState !== 'visible') return;
  try {
    const seen = new Set(read<string[]>(SEEN) ?? []);
    const all = await fetchBjInvites(code, loadDeviceId());
    // Not the table you're already at.
    const fresh = all.filter((i) => !seen.has(seenKey(i)) && i.table !== state.game?.code);
    if (fresh.map(seenKey).join() !== state.invites.map(seenKey).join()) set({ invites: fresh });
  } catch {
    // Next time.
  }
}

/** Looks for invites now and every 15 seconds while the app is open. */
export function watchInvites(): void {
  if (polling) return;
  checkInvites();
  polling = setInterval(checkInvites, 15_000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkInvites());
}
