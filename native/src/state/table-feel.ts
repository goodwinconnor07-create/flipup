// How the bot tables feel to you, kept on this phone only (nothing is sent anywhere):
// - `flipup.rivals`: every bot you've shared a table with, by name: tables together, showdowns won and lost. A bot you
//   know greets you as a regular at your next table on this phone (`Game.rivals`).
// - `flipup.tablefeel`: one line per table: hands, rebuys, the biggest pot, whether you finished it or left early,
//   whether you started another within ten minutes, and your result. These are the numbers that say whether the bots
//   are fun (people play more hands, rebuy and come back), so they're ready for a later feedback screen or upload,
//   which needs the owner's privacy decision first.
// The counting is pure (`noteFeel()`, `suggestChallenge()`), tested in tests/table-feel.test.ts.
import type { Game, Rival } from '@/engine';

import { read, save, useStored } from './storage';

const RIVALS = 'flipup.rivals';
const FEEL = 'flipup.tablefeel';
/** Bots remembered at most (the oldest go first). */
const MAX_RIVALS = 120;
/** Tables remembered at most. */
const MAX_TABLES = 60;
/** A new table this soon after the last one counts as coming back for more. */
export const AGAIN_MS = 10 * 60_000;

export type Rivals = Record<string, Rival & { at: number }>;

export interface TableFeel {
  id: string;
  at: number;
  last: number;
  variant: string;
  /** Plain Hold'em with only bots and you: the tables the everyday bots play. */
  botsOnly: boolean;
  difficulty: 'casual' | 'challenge';
  hands: number;
  rebuys: number;
  biggestPot: number;
  /** Chips up (or down) against what you bought in for. */
  net: number;
  bigBlind: number;
  /** You played it to the end (rather than leaving with the table still going). */
  finished: boolean;
  /** You started another table within `AGAIN_MS` of this one's last hand. */
  cameBack: boolean;
  /** Bots that showed a bluff after taking a pot. */
  bluffsShown: number;
}

interface FeelStore {
  tables: TableFeel[];
  /** Hands already counted ("game/hand"), so a redraw never counts one twice. */
  seen: string[];
}

const cleanStore = (s: Partial<FeelStore> | null): FeelStore => ({
  tables: Array.isArray(s?.tables) ? s.tables.filter((t) => t && typeof t.id === 'string') : [],
  seen: Array.isArray(s?.seen) ? s.seen.filter((x) => typeof x === 'string') : [],
});

/** The bots of this table you've met before, for `createTable({ rivals })`. */
export function rivalsFor(names: string[]): Record<string, Rival> {
  const all = read<Rivals>(RIVALS, {});
  const out: Record<string, Rival> = {};
  for (const n of names) {
    const r = all[n.toLowerCase()];
    if (r) out[n.toLowerCase()] = { tables: r.tables, beat: r.beat, lost: r.lost };
  }
  return out;
}

/** Names of bots you know best, most-met first (setup can seat one now and then). */
export function knownBots(limit = 8): string[] {
  const all = read<Rivals>(RIVALS, {});
  return Object.entries(all)
    .sort((a, b) => b[1].tables * 10 + b[1].beat + b[1].lost - (a[1].tables * 10 + a[1].beat + a[1].lost))
    .slice(0, limit)
    .map(([name]) => name);
}

/**
 * What one table view adds to the rivals and the table lines. Pure: takes the stores and returns new ones (or null when
 * nothing changed). Counts each hand once, each table's bots once, and marks the previous table as come back to.
 */
export function noteFeel(
  game: Game,
  myId: string,
  rivals: Rivals,
  store: FeelStore,
  now: number,
): { rivals: Rivals; store: FeelStore } | null {
  const me = game.players.find((p) => p.id === myId);
  if (!me || game.status === 'lobby' || game.challenge || game.campaign) return null;
  let changed = false;
  const tables = store.tables.slice();
  let seen = store.seen;
  let line = tables.find((t) => t.id === game.id);
  const bots = game.players.filter((p) => p.bot && !p.legend);
  const variant = game.settings.variant ?? 'holdem';
  const nextRivals: Rivals = { ...rivals };
  if (!line) {
    const prev = tables[tables.length - 1];
    if (prev && now - prev.last < AGAIN_MS) tables[tables.length - 1] = { ...prev, cameBack: true };
    line = {
      id: game.id,
      at: now,
      last: now,
      variant,
      botsOnly: !game.code && game.players.every((p) => p.bot || p.id === myId),
      difficulty: game.settings.botDifficulty === 'challenge' ? 'challenge' : 'casual',
      hands: 0,
      rebuys: 0,
      biggestPot: 0,
      net: 0,
      bigBlind: game.settings.bigBlind,
      finished: false,
      cameBack: false,
      bluffsShown: 0,
    };
    tables.push(line);
    for (const b of bots) {
      const k = b.name.toLowerCase();
      const r = nextRivals[k];
      nextRivals[k] = { tables: (r?.tables ?? 0) + 1, beat: r?.beat ?? 0, lost: r?.lost ?? 0, at: now };
    }
    changed = true;
  }
  const i = tables.indexOf(line);
  let next = { ...line };
  const hand = game.hand;
  const key = hand ? `${game.id}/${hand.number}` : '';
  if (hand?.result && !seen.includes(key) && hand.seats.some((s) => s.playerId === myId && s.cards.length > 0)) {
    seen = [...seen, key].slice(-80);
    const mine = hand.seats.find((s) => s.playerId === myId)!;
    const won = hand.result.pots.filter((p) => p.winners.includes(myId)).reduce((sum, p) => sum + Math.floor(p.amount / p.winners.length), 0);
    next = { ...next, hands: next.hands + 1, biggestPot: Math.max(next.biggestPot, won), last: now };
    // Showdowns against bots: you won the pot they showed down for, or they won one you showed down for.
    if (hand.result.showdown && !mine.folded)
      for (const s of hand.seats) {
        const bot = bots.find((b) => b.id === s.playerId);
        if (!bot || s.folded) continue;
        const k = bot.name.toLowerCase();
        const r = nextRivals[k] ?? { tables: 1, beat: 0, lost: 0, at: now };
        const iWon = hand.result.pots.some((p) => p.winners.includes(myId) && !p.winners.includes(bot.id));
        const theyWon = hand.result.pots.some((p) => p.winners.includes(bot.id) && !p.winners.includes(myId));
        nextRivals[k] = { ...r, beat: r.beat + (iWon ? 1 : 0), lost: r.lost + (theyWon ? 1 : 0), at: now };
      }
    // A bot that took a pot without a showdown and turned its cards over with nothing (a shown bluff).
    if (!hand.result.showdown)
      for (const s of hand.seats)
        if (s.shown && bots.some((b) => b.id === s.playerId) && hand.result.won[s.playerId] > 0 && hand.result.names[s.playerId]?.startsWith('High card'))
          next = { ...next, bluffsShown: next.bluffsShown + 1 };
    changed = true;
  }
  const start = game.settings.startingStack || 1;
  const rebuys = Math.max(0, Math.round(me.bought / start) - 1);
  const net = me.stack - me.bought;
  const finished = game.status === 'ended';
  if (rebuys !== next.rebuys || net !== next.net || finished !== next.finished) {
    next = { ...next, rebuys, net, finished };
    changed = true;
  }
  if (!changed) return null;
  tables[i] = next;
  const trimmed = Object.entries(nextRivals)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_RIVALS);
  return { rivals: Object.fromEntries(trimmed), store: { tables: tables.slice(-MAX_TABLES), seen } };
}

/** Counts this table view (called from the session on every change). */
export function recordFeel(game: Game | null, myId: string | undefined): void {
  if (!game || !myId) return;
  const r = noteFeel(game, myId, read<Rivals>(RIVALS, {}), cleanStore(read<Partial<FeelStore> | null>(FEEL, null)), Date.now());
  if (!r) return;
  save(RIVALS, r.rivals);
  save(FEEL, r.store);
}

/**
 * Whether to suggest Challenge: your last three finished-or-long Casual tables against the everyday bots (30 hands or
 * more each) all ended up by at least 20 big blinds. A suggestion only: the level never changes by itself.
 */
export function suggestChallenge(tables: TableFeel[]): boolean {
  const casual = tables.filter((t) => t.botsOnly && t.variant === 'holdem' && t.difficulty === 'casual' && t.hands >= 30);
  const last = casual.slice(-3);
  return last.length === 3 && last.every((t) => t.net >= t.bigBlind * 20);
}

export function useSuggestChallenge(): boolean {
  return suggestChallenge(cleanStore(useStored<Partial<FeelStore> | null>(FEEL, null)).tables);
}

/** Every table line, for a later feedback screen. */
export function useTableFeel(): TableFeel[] {
  return cleanStore(useStored<Partial<FeelStore> | null>(FEEL, null)).tables;
}
