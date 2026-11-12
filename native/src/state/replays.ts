// Replay (FlipUp Premium): your hand bank. Nothing is recorded on its own: the table keeps only the last finished
// hand you were dealt into (in memory, `useLastHand()`), and the Save hand button at the table puts it in the bank
// (`saveLastHand()`, `flipup.replays`), at a bots table or online. From the bank a hand can be watched back move by
// move and turned into a share card. Built from the table view this phone already sees (`redactForDevice()`), so a
// saved hand never holds a card you couldn't see: your own and any that were shown.
import { useSyncExternalStore } from 'react';

import { bestHand, streetCards, type Card, type Game, type HandAction, type Variant } from '@/engine';

import { read, save, useStored } from './storage';

const KEY = 'flipup.replays';
const STARS = 'flipup.replaystars';
/** Hands the bank holds, newest first. About a kilobyte each. */
export const KEEP = 500;

export interface ReplayPlayer {
  id: string;
  name: string;
  emoji: string;
  /** Chips before the blinds. */
  stack: number;
  bot?: boolean;
  gold?: boolean;
}

export interface Replay {
  /** `<tableId>/<hand number>`. */
  id: string;
  tableId: string;
  at: number;
  mode: 'bots' | 'online';
  variant: Variant;
  number: number;
  smallBlind: number;
  bigBlind: number;
  buttonId: string;
  sbId: string | null;
  bbId: string;
  /** Your player id at that table. */
  me: string;
  players: ReplayPlayer[];
  actions: HandAction[];
  board: Card[];
  /** Board cards out after each street. */
  streets: { flop: number; turn: number; river: number };
  /** Hole cards you could see: yours and any shown. */
  holes: Record<string, Card[]>;
  /** Chips each player took back at the end. */
  won: Record<string, number>;
  /** Hand names for everyone who showed. */
  names: Record<string, string>;
  showdown: boolean;
  /** What you won or lost in the hand. */
  net: number;
  /** The whole pot. */
  pot: number;
  /** Your best five-card hand at the end, if you saw the river ("Full house, kings over fives"). */
  myHand?: string;
  /** Its strength, to rank your best hands. */
  myScore?: number;
}

const clean = (v: unknown): Replay[] => (Array.isArray(v) ? v.filter((r): r is Replay => !!r && typeof r === 'object' && typeof (r as Replay).id === 'string') : []);

export const useReplays = (): Replay[] => clean(useStored<Replay[] | null>(KEY, null));
export const allReplays = (): Replay[] => clean(read<Replay[] | null>(KEY, null));
export const replayById = (id: string | undefined): Replay | undefined => (id ? allReplays().find((r) => r.id === id) : undefined);

export const useStars = (): string[] => {
  const v = useStored<string[] | null>(STARS, null);
  return Array.isArray(v) ? v : [];
};
export function toggleStar(id: string): void {
  const now = read<string[] | null>(STARS, null) ?? [];
  save(STARS, now.includes(id) ? now.filter((s) => s !== id) : [...now, id]);
}

export function clearReplays(): void {
  save(KEY, null);
}

export function removeReplay(id: string): void {
  save(KEY, allReplays().filter((r) => r.id !== id));
}

// ── The last hand, held until the next one finishes ─────────────────────────

let last: Replay | null = null;
const lastListeners = new Set<() => void>();

/** The last finished hand you were dealt into at the table you're at (not saved anywhere until you tap Save hand). */
export function useLastHand(): Replay | null {
  return useSyncExternalStore(
    (fn) => {
      lastListeners.add(fn);
      return () => lastListeners.delete(fn);
    },
    () => last,
  );
}
export const lastHand = (): Replay | null => last;

/** Puts the last hand in your bank. Returns its id, or null if there's no finished hand to save. */
export function saveLastHand(): string | null {
  if (!last) return null;
  const have = allReplays();
  if (!have.some((r) => r.id === last!.id)) {
    const stars = new Set(read<string[] | null>(STARS, null) ?? []);
    save(KEY, [{ ...last, at: Date.now() }, ...have].filter((r, i) => i < KEEP || stars.has(r.id)));
  }
  return last.id;
}

/** True once the last hand is in the bank. */
export function useLastSaved(): boolean {
  const hand = useLastHand();
  const bank = useReplays();
  return !!hand && bank.some((r) => r.id === hand.id);
}

/** What each player put in over the hand: the most they had in on each street (blinds included). */
export function putIn(r: Pick<Replay, 'actions' | 'sbId' | 'bbId' | 'smallBlind' | 'bigBlind'>, upTo = r.actions.length): Record<string, number> {
  const street: Record<string, Record<string, number>> = {};
  const blinds: Record<string, number> = {};
  if (r.sbId) blinds[r.sbId] = r.smallBlind;
  blinds[r.bbId] = r.bigBlind;
  street.preflop = { ...blinds };
  for (const a of r.actions.slice(0, upTo)) {
    const s = (street[a.street] ??= {});
    s[a.playerId] = Math.max(s[a.playerId] ?? 0, a.to);
  }
  const total: Record<string, number> = {};
  for (const s of Object.values(street)) for (const [id, v] of Object.entries(s)) total[id] = (total[id] ?? 0) + v;
  return total;
}

let lastKey = '';
/**
 * Called with every table update: once a hand you were dealt into is over, it becomes the last hand. It's looked at
 * again while the result is on the table, because a player can tap Show cards after the hand ends: their cards
 * join the last hand, and the saved copy too if you've already saved it.
 */
export function noteReplay(game: Game | null, myDeviceId: string, mode: 'bots' | 'online'): void {
  const hand = game?.hand;
  const result = hand?.result;
  if (!game || !hand || !result || !hand.actions) return;
  const mine = game.players.find((p) => p.deviceId === myDeviceId);
  const seat = mine && hand.seats.find((s) => s.playerId === mine.id);
  if (!mine || !seat || seat.cards.length === 0) return;
  const id = `${game.id}/${hand.number}`;
  // Whose cards this phone can see: a show after the hand changes it.
  const key = `${id}|${hand.seats
    .filter((s) => s.cards.length > 0)
    .map((s) => s.playerId)
    .sort()
    .join(',')}`;
  if (key === lastKey) return;
  const again = last?.id === id;
  lastKey = key;
  const variant: Variant = hand.variant ?? game.settings.variant ?? 'holdem';
  const flop = streetCards(variant, 'flop');
  const turn = flop + streetCards(variant, 'turn');
  const players: ReplayPlayer[] = hand.seats
    .map((s) => game.players.find((p) => p.id === s.playerId))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      stack: hand.startStacks?.[p.id] ?? p.stack,
      ...(p.bot ? { bot: true } : {}),
      ...(p.gold ? { gold: true } : {}),
    }));
  const base = { actions: hand.actions.map((a) => ({ ...a })), sbId: hand.sbId, bbId: hand.bbId, smallBlind: game.settings.smallBlind, bigBlind: game.settings.bigBlind };
  const put = putIn(base);
  const pot = result.pots.reduce((sum, p) => sum + p.amount, 0);
  let myHand: string | undefined;
  let myScore: number | undefined;
  if (!seat.folded && variant !== 'imposter' && hand.board.length >= 5) {
    try {
      const v = bestHand(variant, seat.cards, hand.board);
      myHand = v.detail;
      myScore = v.score;
    } catch {
      // A board this game can't score: no hand name.
    }
  }
  const replay: Replay = {
    id,
    tableId: game.id,
    at: Date.now(),
    mode,
    variant,
    number: hand.number,
    ...base,
    buttonId: hand.buttonId,
    me: mine.id,
    players,
    board: [...hand.board],
    streets: { flop, turn, river: hand.board.length },
    holes: Object.fromEntries(hand.seats.filter((s) => s.cards.length > 0).map((s) => [s.playerId, [...s.cards]])),
    won: { ...result.won },
    names: shownNames(variant, hand.seats, hand.board, result.names ?? {}),
    showdown: result.showdown,
    net: (result.won[mine.id] ?? 0) - (put[mine.id] ?? 0),
    pot,
    ...(myHand ? { myHand, myScore } : {}),
  };
  if (again && last) {
    // Someone showed after the hand: keep when it was first seen, and bring a saved copy up to date.
    replay.at = last.at;
    const bank = allReplays();
    const i = bank.findIndex((r) => r.id === id);
    if (i >= 0) save(KEY, bank.map((r, j) => (j === i ? { ...r, holes: replay.holes, names: { ...replay.names, ...r.names } } : r)));
  }
  last = replay;
  lastListeners.forEach((fn) => fn());
}

/** Hand names for everyone whose cards you can see: the showdown's, plus anyone who showed after it. */
function shownNames(variant: Variant, seats: { playerId: string; cards: Card[] }[], board: Card[], names: Record<string, string>): Record<string, string> {
  const out = { ...names };
  if (variant === 'imposter' || board.length < 5) return out;
  for (const s of seats) {
    if (out[s.playerId] || s.cards.length === 0) continue;
    try {
      out[s.playerId] = bestHand(variant, s.cards, board).detail;
    } catch {
      // A board this game can't score: no name.
    }
  }
  return out;
}

/** Leaving a table forgets its last hand. */
export function forgetLastHand(): void {
  if (!last) return;
  last = null;
  lastKey = '';
  lastListeners.forEach((fn) => fn());
}

// ── Moments: the hands worth sharing, picked from what's been recorded ──────

export interface Moment {
  kind: 'bigWin' | 'bestHand' | 'bluff' | 'cooler' | 'starred';
  title: string;
  replay: Replay;
}

const won = (r: Replay) => r.net > 0;

/** The hands most worth sharing: biggest wins, best hands, bluffs that worked, coolers, and your starred ones. */
export function momentsOf(replays: Replay[], stars: string[] = []): Moment[] {
  const out: Moment[] = [];
  const seen = new Set<string>();
  const add = (kind: Moment['kind'], title: string, list: Replay[], n: number) => {
    for (const r of list) {
      if (out.filter((m) => m.kind === kind).length >= n) break;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ kind, title, replay: r });
    }
  };
  add('starred', 'Starred', replays.filter((r) => stars.includes(r.id)), 6);
  add('bigWin', 'Biggest win', [...replays].filter(won).sort((a, b) => b.net / b.bigBlind - a.net / a.bigBlind), 3);
  add('bestHand', 'Best hand', [...replays].filter((r) => r.showdown && r.myScore !== undefined).sort((a, b) => (b.myScore ?? 0) - (a.myScore ?? 0)), 3);
  // A bluff that worked: won without a showdown with less than a pair by the end (your cards against the board).
  add('bluff', 'Bluff that worked', replays.filter((r) => won(r) && !r.showdown && r.board.length >= 3 && isAir(r)), 3);
  add('cooler', 'Cooler', [...replays].filter((r) => r.showdown && r.net < 0 && (r.myScore ?? 0) > 0).sort((a, b) => (b.myScore ?? 0) - (a.myScore ?? 0) || a.net - b.net), 2);
  return out;
}

export function isAir(r: Replay): boolean {
  const mine = r.holes[r.me] ?? [];
  const ranks = new Set(r.board.map((c) => c[0]));
  // No pocket pair and neither card pairs the board.
  return mine.length >= 2 && mine[0][0] !== mine[1][0] && !mine.some((c) => ranks.has(c[0]));
}
