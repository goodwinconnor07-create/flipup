// Bankroll, the monthly game: "1,000 chips. One month. Don't go broke." (rules and tuning in docs/BANKROLL.md)
//
// 1. Everyone starts with 1,000 chips on the 1st of the month (UTC). Anyone joining later starts with 1,000 too.
// 2. Play up to 50 hands a day against bots.
// 3. Your chips carry over. Bust and you're out for the month, with one rebuy by watching an ad.
// 4. Every Sunday at midnight UTC, the bottom 10% of players still alive are cut.
// 5. Biggest stack at the end of the month wins.
//
// The server deals every card and runs every bot (worker/bankroll.ts): a Bankroll table is an ordinary online table
// where every other seat is a bot, changed only by `applyAction()`. This file holds what both sides need: the
// numbers, the calendar (seasons, days, cuts), the bots' stack range, the cut itself, and which of a player's
// month-long habits are strong enough for a bot to mention. The table's own steps (sitting down, the deal) are in
// reducer.ts (`createBankrollTable()`, `bankrollDeal()`).

import type { Game, PlayerRead, Settings } from './types';

export const BANKROLL = {
  /** Everyone's bankroll on the 1st, or the day they join. */
  start: 1000,
  smallBlind: 10,
  bigBlind: 20,
  /** The most of your bankroll on the table at once, in big blinds. Anything above stays in the bank. */
  capBB: 100,
  handsADay: 50,
  /** You and five bots. */
  bots: 5,
  /** The one rebuy a month, for watching an ad. */
  rebuy: 1000,
  /** Each Sunday cut takes this share of the players still alive. */
  cutShare: 0.1,
  /** Seconds to act. The table needs a clock so a phone that has gone away folds and the table can close. */
  turnSeconds: 30,
  /** Bots sit with this share of your stack (spread between the two), never under `minBB` big blinds... */
  low: 0.7,
  high: 1.3,
  minBB: 10,
  /** ...and a bot that has run up to this share of your stack or more gets up at the next deal. */
  far: 1.5,
  /** "I remember you" lines a sitting may hold, at most. */
  rememberMax: 2,
} as const;

/** The most of a bankroll that goes on the table at once: 100 big blinds. */
export const BANKROLL_CAP = BANKROLL.capBB * BANKROLL.bigBlind;

/** A Bankroll table's `code`. It isn't a table code anyone can join with: the table lives in the player's own room. */
export const BANKROLL_CODE = 'BNKRL';

export type BankrollStatus = 'alive' | 'busted' | 'cut';
/** Why a Bankroll sitting ended: you left (or your phone did), the day's 50 hands, you went broke, the Sunday cut, the month ended. */
export type BankrollClose = 'left' | 'limit' | 'busted' | 'cut' | 'season';

/** What a Bankroll table carries (`Game.bankroll`). Public: only its own player ever sees it. */
export interface BankrollTag {
  /** The season, a UTC month: "2026-11". */
  season: string;
  /** The UTC day these hands count toward: "2026-11-23". It moves on if you play across midnight. */
  day: string;
  /** Chips of your bankroll that aren't on the table (anything above the cap). */
  bank: number;
  /** The most of your bankroll on the table at once. */
  cap: number;
  /** Hands played today before this sitting, and the day's limit. */
  today: number;
  limit: number;
  /** Hands dealt at this sitting (or since midnight UTC, if it crossed it). */
  played: number;
  /** Your bankroll when you sat down, and at the start of today, for today's result. */
  start: number;
  dayStart: number;
  /** Bot chips that came onto the table (top-ups, new bots) and left it (bots that got up): the books balance with these. */
  botIn: number;
  botOut: number;
  /** The server asks the table to close at the next deal (the Sunday cut). */
  stop?: BankrollClose;
  /** Set when the table has closed, and why. */
  closed?: BankrollClose;
  /** Month-long habits a bot has already mentioned this sitting ("I remember you"), at most `rememberMax`. */
  remembered?: string[];
  /** Your place on the board and how many are still alive, as of your last hand (filled in by the server). */
  rank?: number;
  alive?: number;
  players?: number;
}

/** The table's settings: one blind level all month, the same for everyone. */
export function bankrollSettings(stack: number): Settings {
  return { startingStack: stack, smallBlind: BANKROLL.smallBlind, bigBlind: BANKROLL.bigBlind, rebuys: false, turnSeconds: BANKROLL.turnSeconds, variant: 'holdem' };
}

/** Your bankroll at a Bankroll table right now: what's on the table plus what's in the bank. Null at any other table. */
export function bankrollNow(game: Game): number | null {
  const tag = game.bankroll;
  if (!tag) return null;
  const person = game.players.find((p) => !p.bot);
  const inHand = game.hand && !game.hand.result ? (game.hand.seats.find((s) => s.playerId === person?.id)?.total ?? 0) : 0;
  return tag.bank + (person?.stack ?? 0) + inHand;
}

/** Hands played today, counting this sitting. */
export const bankrollHandsToday = (tag: BankrollTag): number => tag.today + tag.played;

// ── The calendar ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The season (a calendar month in UTC) at this moment: "2026-11". */
export function seasonOf(now: number): string {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** The UTC day at this moment: "2026-11-23". */
export function dayOf(now: number): string {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const isSeason = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);

/** When a season starts (midnight UTC on the 1st). */
export function seasonStart(season: string): number {
  const [y, m] = season.split('-').map(Number);
  return Date.UTC(y, m - 1, 1);
}

/** When a season ends: midnight UTC on the 1st of the next month. */
export function seasonEnd(season: string): number {
  const [y, m] = season.split('-').map(Number);
  return Date.UTC(y, m, 1);
}

/** The season before this one. */
export function previousSeason(season: string): string {
  return seasonOf(seasonStart(season) - 1);
}

/** "November". */
export function seasonName(season: string): string {
  return MONTHS[Number(season.split('-')[1]) - 1] ?? season;
}

/** Whole days left in the season, counting today ("ends in 25 days"). */
export function daysLeftInSeason(now: number): number {
  return Math.max(0, Math.ceil((seasonEnd(seasonOf(now)) - now) / DAY_MS));
}

/** Which day of the season it is: the 1st is day 1. */
export function dayOfSeason(now: number): number {
  return new Date(now).getUTCDate();
}

/** Time until the next midnight UTC, when the day's 50 hands come back. */
export function msToMidnight(now: number): number {
  return Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1) - now;
}

/**
 * The cut's week number for a cut at this moment (a Sunday's midnight UTC): the first Sunday after the 1st is week 1.
 * A Sunday that is the 1st is the start of a season, not a cut: 0.
 */
export function cutWeek(at: number): number {
  return Math.ceil((new Date(at).getUTCDate() - 1) / 7);
}

/** Midnight UTC at the start of the most recent Sunday, at or before `now`. */
function lastSundayMidnight(now: number): number {
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return midnight - d.getUTCDay() * DAY_MS;
}

/** The cut that's due at this moment: this season's latest Sunday midnight at or before `now`, or null before the first one. */
export function dueCut(now: number): { season: string; week: number; at: number } | null {
  const at = lastSundayMidnight(now);
  const season = seasonOf(now);
  if (at < seasonStart(season) || cutWeek(at) < 1) return null;
  return { season, week: cutWeek(at), at };
}

/** The next cut after `now` in this season, or null when the season ends first. */
export function nextCutAt(now: number): number | null {
  const at = lastSundayMidnight(now) + 7 * DAY_MS;
  return at < seasonEnd(seasonOf(now)) && cutWeek(at) >= 1 ? at : null;
}

/** Whole days until the next cut (1 on the Saturday before), or null when there isn't one this season. */
export function daysToNextCut(now: number): number | null {
  const at = nextCutAt(now);
  return at === null ? null : Math.max(1, Math.ceil((at - now) / DAY_MS));
}

// ── The bots' stacks ─────────────────────────────────────────────────────────

/**
 * Where the bots' stacks sit for your stack on the table: a new or topped-up bot gets between `lo` and `hi`, and one
 * at `far` or more gets up at the next deal. Never under 10 big blinds, so a short stack still plays a real table.
 */
export function botRange(stack: number, bigBlind: number = BANKROLL.bigBlind): { lo: number; hi: number; far: number } {
  const lo = Math.max(Math.round(stack * BANKROLL.low), bigBlind * BANKROLL.minBB);
  const hi = Math.max(Math.round(stack * BANKROLL.high), Math.round(lo * BANKROLL.high));
  const far = Math.max(Math.round(stack * BANKROLL.far), Math.round(hi * 1.15));
  return { lo, hi, far };
}

/** A stack somewhere in the range, rounded to the small blind, so the bots aren't all the same. */
export function spreadStack(lo: number, hi: number, rng: () => number, step: number = BANKROLL.smallBlind): number {
  const raw = lo + rng() * (hi - lo);
  return Math.min(hi, Math.max(lo, Math.round(raw / step) * step));
}

// ── The Sunday cut ───────────────────────────────────────────────────────────

/** What the cut needs of a row on the board. */
export interface CutRow {
  code: string;
  score: number;
  peak: number;
  status: BankrollStatus;
}

/**
 * The players a Sunday cut takes: the bottom `share` (10%) of the players still alive, by bankroll (rounded down, so
 * a board of fewer than ten loses nobody). Ties go by the lower peak, then by friend code, so the same board always
 * cuts the same people.
 */
export function pickCut<T extends CutRow>(rows: readonly T[], share: number = BANKROLL.cutShare): T[] {
  const alive = rows.filter((r) => r.status === 'alive');
  const n = Math.floor(alive.length * share);
  if (n <= 0) return [];
  return [...alive].sort((a, b) => a.score - b.score || a.peak - b.peak || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0)).slice(0, n);
}

// ── "I remember you" ─────────────────────────────────────────────────────────

/** A month-long habit strong enough for a bot to say it out loud. */
export type MemoryNote = 'again' | 'bluffs' | 'fold3bet' | 'bigBets' | 'checkRaise' | 'folds' | 'calls';

const share = (n: number | undefined, of: number | undefined) => ((of ?? 0) > 0 ? (n ?? 0) / of! : 0);

/**
 * Which of a player's habits, over the month so far, are strong enough to mention. Each needs enough hands behind it
 * that the bot is right: a bluffer who has shown down a few river bluffs, someone who folds to 3-bets nearly every
 * time, a player whose big bets have always been the goods.
 */
export function memoryNotes(read: PlayerRead | undefined): Set<MemoryNote> {
  const notes = new Set<MemoryNote>();
  if (!read) return notes;
  if (read.hands >= 40) notes.add('again');
  if ((read.shownBets ?? 0) >= 4 && share(read.shownBluffs, read.shownBets) >= 0.4) notes.add('bluffs');
  if ((read.threeBetFaced ?? 0) >= 5 && share(read.threeBetFolds, read.threeBetFaced) >= 0.7) notes.add('fold3bet');
  if ((read.shownBig ?? 0) >= 4 && share(read.shownBigStrong, read.shownBig) >= 0.85) notes.add('bigBets');
  if ((read.crOpps ?? 0) >= 10 && share(read.crs, read.crOpps) >= 0.2) notes.add('checkRaise');
  if ((read.cbetFaced ?? 0) >= 10 && share(read.cbetFolds, read.cbetFaced) >= 0.65) notes.add('folds');
  if (read.betsFaced >= 30 && share(read.foldsToBet, read.betsFaced) <= 0.25) notes.add('calls');
  return notes;
}
