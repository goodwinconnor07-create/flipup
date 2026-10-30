// Campaign: one player's bankroll against the bots, kept from day to day. A daily salary tops it up to 1,000.
// Cash games are a ladder of stakes on their own; tournaments are venues from the Garage to the Yacht, each one
// format (a six-player Sit & Go or a three-player Jackpot) whose prize is drawn at random when you buy in.
// Goals pay chips, and friends can sit at the same campaign table online.
// Pure: the phone stores the state (state/campaign.ts) and runs the tables like any bots-only table.
// Rules are in docs/RULES.md (Campaign).

import type { Bets } from './roulette';
import { payout, pocketColour, totalBet } from './roulette';
import type { Game, PlayerRead } from './types';

/** What the daily salary tops a bankroll up to on the first day. Days you don't open the app pay nothing. */
export const SALARY = 1000;
/** Each day in a row you collect adds this to what the salary tops you up to, up to `STREAK_DAYS` days. Miss one and it starts again. */
export const STREAK_STEP = 100;
export const STREAK_DAYS = 11;

/** What the salary tops you up to on the `streak`th day in a row. */
export const salaryFor = (streak: number): number => SALARY + STREAK_STEP * (Math.max(1, Math.min(STREAK_DAYS, streak)) - 1);

/** The day before a YYYY-MM-DD day. */
export function dayBefore(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** The Monday that starts a day's week (YYYY-MM-DD): the weekly board resets then. */
export function weekOf(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Cash games: six seats, and you sit with 50 to 100 big blinds. */
/** Cash tables: you sit with 20 to 100 big blinds. The blinds are set by your bankroll, `fitBB` big blinds of it per table (see `cashStakeFor`). */
export const CASH = { seats: 6, minBB: 20, maxBB: 100, fitBB: 50 } as const;

/** The smallest roulette chip: below this you're out of chips until tomorrow. */
export const ROULETTE_MIN = 5;

export type FormatId = 'sng' | 'jackpot';

export interface Format {
  id: FormatId;
  name: string;
  /** One line on how it plays. */
  line: string;
  seats: number;
  stack: number;
  smallBlind: number;
  bigBlind: number;
  /** The blinds double every this many hands. */
  levelHands: number;
  /** How the prize is shared: 1st, 2nd... */
  split: number[];
  /** The prize as a multiple of the buy-in, and how often each comes up (out of 1,000). */
  draws: [number, number][];
}

/**
 * The prize doesn't come from the buy-ins at the table: it's drawn when you buy in, so a 100 chip tournament can pay
 * 15,000. Both average a little less than the seats put in (a Sit & Go about 5.3 buy-ins for six seats, a Jackpot
 * about 2.8 for three), so only playing better than the bots climbs; the rare big draw is what keeps it exciting.
 */
export const FORMATS: Record<FormatId, Format> = {
  sng: {
    id: 'sng',
    name: 'Sit & Go',
    line: 'Six players. 1st and 2nd get paid.',
    seats: 6,
    stack: 1500,
    smallBlind: 10,
    bigBlind: 20,
    levelHands: 10,
    split: [0.7, 0.3],
    draws: [
      [3, 500],
      [4, 280],
      [6, 130],
      [12, 65],
      [30, 22],
      [150, 3],
    ],
  },
  jackpot: {
    id: 'jackpot',
    name: 'Jackpot',
    line: 'Three players, fast blinds, winner takes it all.',
    seats: 3,
    stack: 1000,
    smallBlind: 10,
    bigBlind: 20,
    levelHands: 6,
    split: [1],
    draws: [
      [2, 800],
      [3, 140],
      [5, 40],
      [10, 15],
      [50, 4],
      [250, 1],
    ],
  },
};

/** The biggest prize a format can draw, as a multiple of the buy-in. */
export const topDraw = (f: Format): number => Math.max(...f.draws.map(([x]) => x));

/** Draws a prize multiplier, weighted by the format's table. */
export function drawMultiplier(f: Format, rng: () => number): number {
  const total = f.draws.reduce((a, [, w]) => a + w, 0);
  let roll = rng() * total;
  for (const [x, w] of f.draws) {
    roll -= w;
    if (roll < 0) return x;
  }
  return f.draws[0][0];
}

/** A tournament venue: one format at one buy-in. */
export interface Venue {
  id: string;
  name: string;
  emoji: string;
  /** One line on what it's like. */
  line: string;
  format: FormatId;
  buyIn: number;
  /** The peak bankroll that opens it for good. */
  unlock: number;
  /** 0 to 1: how much less well the bots here play than their styles (see `dulled()`). The Garage is the softest. */
  dull: number;
  /** The legend who runs the venue: one seat at every tournament here. Knock them out yourself to beat them. */
  boss?: string;
  /** The bot styles that sit here: the Garage gets the loose ones, the Yacht the sharks. */
  styles: string[];
}

export const VENUES: Venue[] = [
  { id: 'garage', name: 'The Garage', emoji: '🔧', line: 'A folding table and loose calls.', format: 'sng', buyIn: 100, unlock: 0, dull: 0.85, styles: ['station', 'gambler', 'nervous', 'maniac'] },
  { id: 'backroom', name: 'The Back Room', emoji: '🎱', line: 'Three in, one out.', format: 'jackpot', buyIn: 250, unlock: 0, dull: 0.75, styles: ['station', 'gambler', 'nervous', 'rock', 'maniac'] },
  { id: 'riverboat', name: 'The Riverboat', emoji: '🛳️', line: 'Slow river, fast money.', format: 'sng', buyIn: 1000, unlock: 2500, dull: 0.6, boss: 'brunson', styles: ['gambler', 'rock', 'station', 'tag', 'lag', 'trapper'] },
  { id: 'casino', name: 'Downtown Casino', emoji: '🎰', line: 'Bright lights, sharper players.', format: 'jackpot', buyIn: 5000, unlock: 15000, dull: 0.45, boss: 'hellmuth', styles: ['rock', 'tag', 'lag', 'trapper', 'maniac'] },
  { id: 'strip', name: 'The Strip', emoji: '🌃', line: 'Big stacks under neon.', format: 'sng', buyIn: 25000, unlock: 75000, dull: 0.3, boss: 'negreanu', styles: ['tag', 'lag', 'trapper', 'pro', 'shark'] },
  { id: 'monaco', name: 'Monte Carlo', emoji: '🏎️', line: 'Old money and cold reads.', format: 'jackpot', buyIn: 100000, unlock: 400000, dull: 0.2, boss: 'ivey', styles: ['lag', 'trapper', 'tag', 'pro', 'shark'] },
  { id: 'penthouse', name: 'The Penthouse', emoji: '🏙️', line: 'Invite only. Nobody’s bluffing. Probably.', format: 'sng', buyIn: 500000, unlock: 2000000, dull: 0.1, boss: 'dwan', styles: ['pro', 'shark', 'lag'] },
  { id: 'yacht', name: 'The Yacht', emoji: '🛥️', line: 'The biggest game on the water.', format: 'jackpot', buyIn: 2500000, unlock: 10000000, dull: 0, boss: 'rampage', styles: ['shark', 'pro'] },
];

export const venueById = (id: string | undefined): Venue | undefined => VENUES.find((v) => v.id === id);

/** A cash game's blinds. Which one you play is set by your bankroll (`cashStakeFor`). */
export interface Stake {
  id: string;
  smallBlind: number;
  bigBlind: number;
  unlock: number;
  /** 0 to 1: how much less well the bots here play than their styles. */
  dull: number;
  styles: string[];
}

export const STAKES: Stake[] = [
  { id: '1-2', smallBlind: 1, bigBlind: 2, unlock: 0, dull: 0.85, styles: ['station', 'gambler', 'nervous', 'maniac'] },
  { id: '2-4', smallBlind: 2, bigBlind: 4, unlock: 0, dull: 0.8, styles: ['station', 'gambler', 'nervous', 'maniac'] },
  { id: '5-10', smallBlind: 5, bigBlind: 10, unlock: 0, dull: 0.75, styles: ['station', 'gambler', 'nervous', 'rock', 'maniac', 'tag'] },
  { id: '10-20', smallBlind: 10, bigBlind: 20, unlock: 0, dull: 0.68, styles: ['station', 'gambler', 'nervous', 'rock', 'maniac', 'tag'] },
  { id: '25-50', smallBlind: 25, bigBlind: 50, unlock: 0, dull: 0.6, styles: ['gambler', 'rock', 'station', 'tag', 'lag', 'trapper'] },
  { id: '50-100', smallBlind: 50, bigBlind: 100, unlock: 0, dull: 0.52, styles: ['gambler', 'rock', 'station', 'tag', 'lag', 'trapper'] },
  { id: '100-200', smallBlind: 100, bigBlind: 200, unlock: 0, dull: 0.45, styles: ['rock', 'tag', 'lag', 'trapper', 'maniac', 'pro'] },
  { id: '250-500', smallBlind: 250, bigBlind: 500, unlock: 0, dull: 0.38, styles: ['rock', 'tag', 'lag', 'trapper', 'maniac', 'pro'] },
  { id: '500-1k', smallBlind: 500, bigBlind: 1000, unlock: 0, dull: 0.3, styles: ['tag', 'lag', 'trapper', 'pro', 'shark'] },
  { id: '1k-2k', smallBlind: 1000, bigBlind: 2000, unlock: 0, dull: 0.25, styles: ['tag', 'lag', 'trapper', 'pro', 'shark'] },
  { id: '2.5k-5k', smallBlind: 2500, bigBlind: 5000, unlock: 0, dull: 0.2, styles: ['lag', 'trapper', 'tag', 'pro', 'shark'] },
  { id: '5k-10k', smallBlind: 5000, bigBlind: 10000, unlock: 0, dull: 0.15, styles: ['lag', 'trapper', 'tag', 'pro', 'shark'] },
  { id: '10k-20k', smallBlind: 10000, bigBlind: 20000, unlock: 0, dull: 0.1, styles: ['pro', 'shark', 'lag'] },
  { id: '25k-50k', smallBlind: 25000, bigBlind: 50000, unlock: 0, dull: 0.05, styles: ['pro', 'shark', 'lag'] },
  { id: '50k-100k', smallBlind: 50000, bigBlind: 100000, unlock: 0, dull: 0, styles: ['shark', 'pro'] },
];

/** Cash tables opened before cash games had their own ladder were named after a venue. */
const OLD_CASH: Record<string, string> = { garage: '1-2', backroom: '5-10', riverboat: '25-50', casino: '100-200', strip: '500-1k', monaco: '2.5k-5k', penthouse: '10k-20k', yacht: '50k-100k' };

export const stakeById = (id: string | undefined): Stake | undefined => (id ? STAKES.find((s) => s.id === (OLD_CASH[id] ?? id)) : undefined);

export const cashMax = (s: Stake): number => s.bigBlind * CASH.maxBB;
export const cashMin = (s: Stake): number => s.bigBlind * CASH.minBB;

/** What a finish pays from a drawn prize. */
export const placePrize = (format: FormatId, prize: number, place: number): number => Math.floor(prize * (FORMATS[format].split[place - 1] ?? 0));

/** Titles by peak bankroll. They never go down. */
export const TITLES = [
  { at: 0, name: 'Rookie', emoji: '🐣' },
  { at: 2500, name: 'Regular', emoji: '🙂' },
  { at: 10000, name: 'Grinder', emoji: '⚙️' },
  { at: 50000, name: 'Shark', emoji: '🦈' },
  { at: 250000, name: 'High Roller', emoji: '💎' },
  { at: 1000000, name: 'Millionaire', emoji: '🤑' },
  { at: 10000000, name: 'Whale', emoji: '🐋' },
  { at: 100000000, name: 'Tycoon', emoji: '👑' },
  { at: 1000000000, name: 'Billionaire', emoji: '🚀' },
] as const;

export type Title = (typeof TITLES)[number];

export function titleOf(peak: number): Title {
  let r: Title = TITLES[0];
  for (const x of TITLES) if (peak >= x.at) r = x;
  return r;
}

export function nextTitle(peak: number): Title | undefined {
  return TITLES.find((r) => r.at > peak);
}

/** A table you're sitting at: the chips that left the bankroll for it. */
export interface CampaignSeat {
  gameId: string;
  kind: 'cash' | 'sng';
  /** A venue for a tournament, a stake for a cash game. */
  venue: string;
  /** Everything paid in: the buy-in plus any buy-ins after going bust at a cash table. */
  paid: number;
  /** Tournaments: the prize drawn for this one. Missing on tables from before prizes were drawn. */
  prize?: number;
  format?: FormatId;
  /** An online table with friends at it. */
  friends?: boolean;
  at: number;
}

/** How the last table went, for the finish screen and the toast. */
export interface CampaignResult {
  gameId: string;
  kind: 'cash' | 'sng';
  venue: string;
  paid: number;
  /** What came back to the bankroll. */
  back: number;
  /** Tournament: where you finished (missing if you left before it was over). */
  place?: number;
  prize?: number;
  format?: FormatId;
  /** Never got going: the buy-in came back. */
  refunded?: boolean;
  /** A bounty collected, and a boss beaten for the first time with what it paid. Both are in `back`. */
  bounty?: number;
  boss?: string;
  bossPay?: number;
  /** The first tournament won at this venue (its card back is yours now). */
  firstWin?: boolean;
  at: number;
}

export interface CampaignStats {
  sngs: number;
  sngWins: number;
  /** Got paid in a tournament. */
  sngCashes: number;
  /** Tournament wins in a row, and the best run. */
  winRun: number;
  bestRun: number;
  /** Venues where you've won a tournament. */
  wonAt: string[];
  cashSessions: number;
  /** Biggest profit from one cash table. */
  bestCash: number;
  /** Most times your buy-in you've left a cash table with. */
  bestCashX: number;
  spins: number;
  /** Biggest win on one spin (what came back less what was staked). */
  bestSpin: number;
  straightHits: number;
  /** The biggest prize multiplier you've drawn. */
  bestDraw: number;
  /** Tournaments won with a friend at the table. */
  friendWins: number;
  /** Bosses you've knocked out yourself (legend ids), each counted once. */
  bosses: string[];
  bounties: number;
  /** Most days in a row you've collected the salary. */
  bestStreak: number;
}

/** Something friends hear about: a big prize drawn, a boss beaten, a tournament won. */
export interface Brag {
  kind: 'draw' | 'boss' | 'win';
  /** The prize multiple for a draw, the chips won for a win. */
  value: number;
  /** The venue, or the boss's legend id. */
  where: string;
  at: number;
}

/** Today's three missions: what they are, how far along, which are collected. */
export interface Daily {
  day: string;
  picks: string[];
  progress: Record<string, number>;
  claimed: string[];
  bonus: boolean;
  /** The last hand counted (table id and hand number), so a hand never counts twice. */
  seen?: string;
}

export interface Campaign {
  v: 1;
  /** The bankroll: chips not on a table. */
  chips: number;
  /** The most the bankroll (plus anything on the table you were at) has ever been. Ranks and unlocks follow it. */
  peak: number;
  /** The last day the salary was collected (YYYY-MM-DD, this phone's time). */
  day: string | null;
  /** Days the salary was collected. */
  days: number;
  /** Seen the "how it works" sheet. */
  intro: boolean;
  seat: CampaignSeat | null;
  last: CampaignResult | null;
  stats: CampaignStats;
  /** Goals whose reward has been collected. */
  claimed: string[];
  /** The last numbers the wheel landed on, newest first. */
  spins: number[];
  /** Days in a row the salary was collected, counting the last one. */
  streak: number;
  daily: Daily | null;
  /** The last day the free daily spin was used. */
  spinDay: string | null;
  /** Chips won at the tables, the wheel and from bounties this week (less what was lost), and last week's. */
  week: { key: string; won: number } | null;
  lastWeek: { key: string; won: number } | null;
  brag: Brag | null;
  /** What each boss has seen you do, kept between tables so they remember how you play. */
  bossReads: Record<string, PlayerRead>;
}

export function newCampaign(): Campaign {
  return {
    v: 1,
    chips: 0,
    peak: 0,
    day: null,
    days: 0,
    intro: false,
    seat: null,
    last: null,
    stats: { sngs: 0, sngWins: 0, sngCashes: 0, winRun: 0, bestRun: 0, wonAt: [], cashSessions: 0, bestCash: 0, bestCashX: 0, spins: 0, bestSpin: 0, straightHits: 0, bestDraw: 0, friendWins: 0, bosses: [], bounties: 0, bestStreak: 0 },
    claimed: [],
    spins: [],
    streak: 0,
    daily: null,
    spinDay: null,
    week: null,
    lastWeek: null,
    brag: null,
    bossReads: {},
  };
}

/** Adds a table's or a spin's result (chips back less chips in) to this week's tally, starting a new week when one has. */
function tally(c: Campaign, net: number, now: number): Campaign {
  const key = weekOf(new Date(now).toISOString().slice(0, 10));
  if (c.week?.key === key) return { ...c, week: { key, won: c.week.won + net } };
  return { ...c, lastWeek: c.week && c.week.key < key ? c.week : c.lastWeek, week: { key, won: net } };
}

const withPeak = (c: Campaign, extra = 0): Campaign => ({ ...c, peak: Math.max(c.peak, c.chips + extra) });

/** Days in a row if the salary is collected today: one more than before if the last was yesterday, otherwise one. */
export const streakToday = (c: Campaign, today: string): number => (c.day === today ? c.streak : c.day === dayBefore(today) ? c.streak + 1 : 1);

/** What today's salary adds: enough to bring the bankroll (and whatever you have on a table) up to today's salary. Zero once collected today. */
export function salaryDue(c: Campaign, today: string, onTable = 0): number {
  if (c.day === today) return 0;
  return Math.max(0, salaryFor(streakToday(c, today)) - c.chips - onTable);
}

/** Collects today's salary and keeps the streak going. Counts the day even when there's nothing to top up. */
export function collectSalary(c: Campaign, today: string, onTable = 0): Campaign {
  if (c.day === today) return c;
  const pay = salaryDue(c, today, onTable);
  const streak = streakToday(c, today);
  return withPeak({ ...c, chips: c.chips + pay, day: today, days: c.days + 1, streak, stats: { ...c.stats, bestStreak: Math.max(c.stats.bestStreak, streak) } }, onTable);
}

/** The biggest tournament buy-in open to you: mission rewards and the roulette limit grow with it. */
export const topBuyIn = (c: Campaign): number => Math.max(...VENUES.filter((v) => isOpen(c, v)).map((v) => v.buyIn));

/** The most you can have on the roulette table in one spin: twice the biggest buy-in open to you, so the wheel can't skip the climb. */
export const rouletteLimit = (c: Campaign): number => Math.max(500, 2 * topBuyIn(c));

const nice = (n: number): number => {
  const step = n >= 100000 ? 10000 : n >= 10000 ? 1000 : n >= 1000 ? 100 : 25;
  return Math.max(step, Math.round(n / step) * step);
};

/** What one daily mission pays, and the bonus for all three. They grow with the rooms you've opened. */
export const missionReward = (c: Campaign): number => Math.max(100, nice(topBuyIn(c) * 0.08));
export const missionBonus = (c: Campaign): number => missionReward(c) * 2;

/** The free daily spin: what it can pay, and how often (out of 1,000). Averages about 400. */
export const DAILY_SPIN: [number, number][] = [
  [100, 300],
  [200, 250],
  [250, 180],
  [500, 150],
  [1000, 80],
  [2500, 30],
  [5000, 10],
];

export function drawDailySpin(rng: () => number): number {
  let roll = rng() * DAILY_SPIN.reduce((a, [, w]) => a + w, 0);
  for (const [x, w] of DAILY_SPIN) {
    roll -= w;
    if (roll < 0) return x;
  }
  return DAILY_SPIN[0][0];
}

/** Takes today's free spin (once a day). */
export function takeDailySpin(c: Campaign, today: string, won: number): Campaign {
  if (c.spinDay === today) return c;
  return withPeak({ ...c, chips: c.chips + won, spinDay: today });
}

/** How often a tournament comes with a bounty on one of its bots, and what it pays (a few buy-ins). */
export const bountyChance = 0.3;
export function bountyReward(v: Venue, rng: () => number): number {
  const times = [1, 1, 1, 2, 2, 3];
  return v.buyIn * times[Math.floor(rng() * times.length)];
}

/** What knocking out a venue's boss pays the first time you do it. */
export const bossReward = (v: Venue): number => v.buyIn * 3;

export interface Mission {
  id: string;
  emoji: string;
  line: string;
  need: number;
}

/** What a day's missions are picked from. Ids never change: they're how progress is remembered. */
export const MISSIONS: Mission[] = [
  { id: 'hands', emoji: '🃏', line: 'Play 25 hands', need: 25 },
  { id: 'pots', emoji: '💰', line: 'Win 6 pots', need: 6 },
  { id: 'showdown', emoji: '👀', line: 'Win 3 hands at showdown', need: 3 },
  { id: 'flush', emoji: '♣️', line: 'Win a hand with a flush or better', need: 1 },
  { id: 'bigPot', emoji: '⛰️', line: 'Win a pot of 30 big blinds or more', need: 1 },
  { id: 'knockouts', emoji: '🥊', line: 'Knock out 2 players', need: 2 },
  { id: 'tourneys', emoji: '🏆', line: 'Play 3 tournaments', need: 3 },
  { id: 'itm', emoji: '🥈', line: 'Get paid in a tournament', need: 1 },
  { id: 'cashAhead', emoji: '💵', line: 'Leave a cash game ahead', need: 1 },
  { id: 'spins', emoji: '🎡', line: 'Spin the roulette wheel 3 times', need: 3 },
];

/** Three missions for a day, the same on every phone that day, never two of a kind. */
export function missionsFor(day: string): string[] {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const pool = MISSIONS.map((m) => m.id);
  const out: string[] = [];
  while (out.length < 3) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    const id = pool[h % pool.length];
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Today's missions, started fresh on a new day. */
export const dailyFor = (c: Campaign, today: string): Daily => (c.daily?.day === today ? c.daily : { day: today, picks: missionsFor(today), progress: {}, claimed: [], bonus: false });

/** Counts something towards today's missions (only the ones picked today). */
export function noteMission(c: Campaign, today: string, id: string, n = 1): Campaign {
  const daily = dailyFor(c, today);
  if (!daily.picks.includes(id) || n <= 0) return c.daily === daily ? c : { ...c, daily };
  return { ...c, daily: { ...daily, progress: { ...daily.progress, [id]: (daily.progress[id] ?? 0) + n } } };
}

/** Collects a finished mission's reward, and the bonus once all three are collected. */
export function claimMission(c: Campaign, today: string, id: string): Campaign {
  const daily = dailyFor(c, today);
  const m = MISSIONS.find((x) => x.id === id);
  if (!m || !daily.picks.includes(id) || daily.claimed.includes(id) || (daily.progress[id] ?? 0) < m.need) return c;
  const claimed = [...daily.claimed, id];
  const all = claimed.length === daily.picks.length;
  const pay = missionReward(c) + (all ? missionBonus(c) : 0);
  return withPeak({ ...c, chips: c.chips + pay, daily: { ...daily, claimed, bonus: all } });
}

/** What you sit down with at a cash game: as much as you can, up to 100 big blinds. Zero if you can't cover 50. */
export function cashBuyIn(c: Campaign, s: Stake): number {
  return c.chips >= cashMin(s) ? Math.min(cashMax(s), c.chips) : 0;
}

/**
 * The blinds a bankroll plays: the biggest stake whose big blind is at most 1/50th of it, so a full bankroll is
 * about 50 big blinds. Below that the smallest stake, as long as it can cover a minimum buy-in. Nothing if it can't.
 */
export function cashStakeFor(chips: number): Stake | undefined {
  const fit = STAKES.findLast((s) => chips >= s.bigBlind * CASH.fitBB);
  if (fit) return fit;
  return chips >= cashMin(STAKES[0]) ? STAKES[0] : undefined;
}

export const isOpen = (c: Campaign, x: { unlock: number }): boolean => c.peak >= x.unlock;

/** What a seat is for: a tournament at a venue with its drawn prize, or a cash game at a stake for `cost` chips. */
export type SeatFor =
  | { kind: 'sng'; venue: Venue; prize: number; friends?: boolean }
  | { kind: 'cash'; stake: Stake; cost: number; friends?: boolean };

/** Takes a table's buy-in out of the bankroll. Returns why not instead when it can't. */
export function sitDown(c: Campaign, seat: SeatFor, gameId: string, now: number): Campaign | string {
  if (c.seat) return 'Finish the table you’re at first.';
  const place = seat.kind === 'sng' ? seat.venue : seat.stake;
  // A friend can bring you to a table you haven't reached yet; on your own you climb to it.
  if (!seat.friends && !isOpen(c, place)) return `Reach ${place.unlock.toLocaleString('en-US')} in your bankroll to open that table.`;
  const cost = seat.kind === 'cash' ? seat.cost : seat.venue.buyIn;
  if (cost <= 0 || cost > c.chips) return 'Not enough chips for that table.';
  const friends = seat.friends ? { friends: true } : {};
  if (seat.kind === 'cash') return { ...c, chips: c.chips - cost, seat: { gameId, kind: 'cash', venue: seat.stake.id, paid: cost, at: now, ...friends } };
  const draw = Math.round(seat.prize / seat.venue.buyIn);
  return {
    ...c,
    chips: c.chips - cost,
    seat: { gameId, kind: 'sng', venue: seat.venue.id, paid: cost, prize: seat.prize, format: seat.venue.format, at: now, ...friends },
    stats: { ...c.stats, bestDraw: Math.max(c.stats.bestDraw, draw) },
  };
}

/** Another buy-in at the cash table you're at, after going bust. */
export function buyAgain(c: Campaign, gameId: string, amount: number): Campaign | string {
  if (c.seat?.gameId !== gameId || c.seat.kind !== 'cash') return 'You’re not at that table.';
  if (amount <= 0 || amount > c.chips) return 'Not enough chips.';
  return { ...c, chips: c.chips - amount, seat: { ...c.seat, paid: c.seat.paid + amount } };
}

/** A table that never got going (you left the lobby, or it closed before the deal): the buy-in comes back. */
export function refundSeat(c: Campaign, gameId: string, now: number): Campaign {
  const seat = c.seat;
  if (seat?.gameId !== gameId) return c;
  return { ...c, chips: c.chips + seat.paid, seat: null, last: { gameId, kind: seat.kind, venue: seat.venue, paid: seat.paid, back: seat.paid, refunded: true, at: now } };
}

/** Leaving a cash table: what's in front of you goes back to the bankroll. */
export function cashOut(c: Campaign, gameId: string, stack: number, now: number): Campaign {
  const seat = c.seat;
  if (seat?.gameId !== gameId || seat.kind !== 'cash') return c;
  const back = Math.max(0, Math.floor(stack));
  const s = c.stats;
  return withPeak({
    ...tally(c, back - seat.paid, now),
    chips: c.chips + back,
    seat: null,
    last: { gameId, kind: 'cash', venue: seat.venue, paid: seat.paid, back, at: now },
    stats: { ...s, cashSessions: s.cashSessions + 1, bestCash: Math.max(s.bestCash, back - seat.paid), bestCashX: Math.max(s.bestCashX, seat.paid ? back / seat.paid : 0) },
  });
}

/** What a tournament seat pays for a finish. Seats from before prizes were drawn pay four and two buy-ins. */
export function seatPrize(seat: CampaignSeat, place: number | undefined): number {
  if (!place) return 0;
  if (seat.prize !== undefined && seat.format) return placePrize(seat.format, seat.prize, place);
  return ([4, 2][place - 1] ?? 0) * seat.paid;
}

/**
 * A tournament is over for you: finished in `place`, or left early (no place, no prize). `bounty` is what the bounty
 * paid if you knocked its bot out, and `boss` the legend you knocked out yourself: the first time, that pays the
 * venue's boss reward.
 */
export function finishSng(c: Campaign, gameId: string, place: number | undefined, now: number, extra: { bounty?: number; boss?: string } = {}): Campaign {
  const seat = c.seat;
  if (seat?.gameId !== gameId || seat.kind !== 'sng') return c;
  const venue = venueById(seat.venue);
  const prize = seatPrize(seat, place);
  const bounty = Math.max(0, Math.floor(extra.bounty ?? 0));
  const newBoss = !!extra.boss && !!venue && venue.boss === extra.boss && !c.stats.bosses.includes(extra.boss);
  const bossPay = newBoss && venue ? bossReward(venue) : 0;
  const back = prize + bounty + bossPay;
  const s = c.stats;
  const won = place === 1;
  const draw = seat.prize && seat.paid ? Math.round(seat.prize / seat.paid) : 0;
  // What friends hear about: a boss beaten first, then a win, then a big draw.
  const brag: Brag | null = newBoss
    ? { kind: 'boss', value: bossPay, where: extra.boss!, at: now }
    : won && prize >= 1000
      ? { kind: 'win', value: prize, where: seat.venue, at: now }
      : draw >= 10
        ? { kind: 'draw', value: draw, where: seat.venue, at: now }
        : c.brag;
  return withPeak({
    ...tally(c, prize + bounty - seat.paid, now),
    chips: c.chips + back,
    seat: null,
    brag,
    last: { gameId, kind: 'sng', venue: seat.venue, paid: seat.paid, back, place, prize: seat.prize, format: seat.format, at: now, ...(bounty ? { bounty } : {}), ...(newBoss ? { boss: extra.boss, bossPay } : {}), ...(won && !s.wonAt.includes(seat.venue) ? { firstWin: true } : {}) },
    stats: {
      ...s,
      sngs: s.sngs + 1,
      sngWins: s.sngWins + (won ? 1 : 0),
      sngCashes: s.sngCashes + (back > 0 ? 1 : 0),
      winRun: won ? s.winRun + 1 : 0,
      bestRun: Math.max(s.bestRun, won ? s.winRun + 1 : 0),
      wonAt: won && !s.wonAt.includes(seat.venue) ? [...s.wonAt, seat.venue] : s.wonAt,
      friendWins: s.friendWins + (won && seat.friends ? 1 : 0),
      bosses: newBoss ? [...s.bosses, extra.boss!] : s.bosses,
      bounties: s.bounties + (bounty ? 1 : 0),
    },
  });
}

/** Where a person finished a campaign tournament, once it's settled for them: 1st if they're the last with chips, otherwise by the order they went out. */
export function sngPlace(game: Game, playerId: string): number | undefined {
  if (game.campaign?.kind !== 'sng' || game.status === 'lobby') return undefined;
  const me = game.players.find((p) => p.id === playerId);
  const out = game.busted ?? [];
  const at = out.indexOf(playerId);
  if (at >= 0) return Math.max(1, game.campaign.seats - at);
  // Everyone else is out.
  if (me && me.stack > 0 && out.length >= game.campaign.seats - 1) return 1;
  return undefined;
}

/** One spin of the wheel against the bankroll. Returns why not instead when the bets don't add up. */
export function spinBets(c: Campaign, bets: Bets, n: number): Campaign | string {
  const staked = totalBet(bets);
  if (staked <= 0) return 'Put some chips down first.';
  if (Object.values(bets).some((x) => x !== undefined && (!Number.isInteger(x) || x < 0))) return 'Those bets don’t add up.';
  if (staked > c.chips) return 'You don’t have that many chips.';
  if (staked > rouletteLimit(c)) return `The table limit is ${rouletteLimit(c).toLocaleString('en-US')} a spin.`;
  const back = payout(bets, n);
  const s = c.stats;
  const straight = (bets[`n${n}`] ?? 0) > 0;
  return withPeak({
    ...tally(c, back - staked, Date.now()),
    chips: c.chips - staked + back,
    spins: [n, ...c.spins].slice(0, 12),
    stats: { ...s, spins: s.spins + 1, bestSpin: Math.max(s.bestSpin, back - staked), straightHits: s.straightHits + (straight ? 1 : 0) },
  });
}

export interface Goal {
  id: string;
  emoji: string;
  title: string;
  line: string;
  reward: number;
  have: number;
  need: number;
}

const reach = (id: string, emoji: string, title: string, need: number, reward: number) => (c: Campaign): Goal => ({
  id,
  emoji,
  title,
  line: `Reach a bankroll of ${need.toLocaleString('en-US')}.`,
  reward,
  have: c.peak,
  need,
});

/** Goals in the order they're meant to come. Each pays its reward once. Ids never change: they're how a claim is remembered. */
const GOALS: ((c: Campaign) => Goal)[] = [
  reach('double', '✌️', 'Double up', 2000, 250),
  (c) => ({ id: 'firstWin', emoji: '🏆', title: 'First trophy', line: 'Win a tournament.', reward: 500, have: c.stats.sngWins, need: 1 }),
  (c) => ({ id: 'lucky', emoji: '🍀', title: 'Lucky number', line: 'Hit a straight-up number at roulette.', reward: 250, have: c.stats.straightHits, need: 1 }),
  (c) => ({ id: 'doubleCash', emoji: '💵', title: 'Double or nothing', line: 'Leave a cash game with twice your buy-in.', reward: 500, have: c.stats.bestCashX >= 2 ? 1 : 0, need: 1 }),
  (c) => ({ id: 'jackpot10', emoji: '🎰', title: 'Big draw', line: 'Draw a tournament prize of 10× the buy-in or more.', reward: 1000, have: c.stats.bestDraw >= 10 ? 1 : 0, need: 1 }),
  reach('riverboat', '🃏', 'Moving up', 5000, 1000),
  (c) => ({ id: 'friendWin', emoji: '🤝', title: 'Bragging rights', line: 'Win a tournament with a friend at the table.', reward: 2500, have: c.stats.friendWins, need: 1 }),
  (c) => ({ id: 'itm5', emoji: '🥈', title: 'In the money', line: 'Get paid in five tournaments.', reward: 1000, have: c.stats.sngCashes, need: 5 }),
  (c) => ({ id: 'week', emoji: '📅', title: 'Payday regular', line: 'Collect your salary on seven days.', reward: 2000, have: c.days, need: 7 }),
  (c) => ({ id: 'boss1', emoji: '😈', title: 'Boss fight', line: 'Knock out a venue’s boss yourself.', reward: 2500, have: c.stats.bosses.length, need: 1 }),
  (c) => ({ id: 'streak7', emoji: '🔁', title: 'Seven in a row', line: 'Collect your salary seven days in a row.', reward: 5000, have: c.stats.bestStreak, need: 7 }),
  reach('casino', '🎲', 'Big time', 20000, 2500),
  (c) => ({ id: 'run3', emoji: '🔥', title: 'Hot streak', line: 'Win three tournaments in a row.', reward: 5000, have: c.stats.bestRun, need: 3 }),
  (c) => ({ id: 'tour3', emoji: '🗺️', title: 'World tour', line: 'Win a tournament at three different venues.', reward: 5000, have: c.stats.wonAt.length, need: 3 }),
  reach('sixFigures', '💯', 'Six figures', 100000, 10000),
  (c) => ({ id: 'jackpot50', emoji: '💥', title: 'Jackpot', line: 'Draw a prize of 50× the buy-in or more.', reward: 25000, have: c.stats.bestDraw >= 50 ? 1 : 0, need: 1 }),
  reach('million', '🤑', 'Millionaire', 1000000, 100000),
  (c) => ({ id: 'tour8', emoji: '🌍', title: 'Every table', line: 'Win a tournament at every venue.', reward: 250000, have: c.stats.wonAt.length, need: VENUES.length }),
  (c) => ({ id: 'bossAll', emoji: '👹', title: 'Boss of bosses', line: 'Knock out every venue’s boss.', reward: 250000, have: c.stats.bosses.length, need: VENUES.filter((v) => v.boss).length }),
  (c) => ({ id: 'captain', emoji: '⚓', title: 'Captain', line: 'Win a tournament on the Yacht.', reward: 2500000, have: c.stats.wonAt.includes('yacht') ? 1 : 0, need: 1 }),
  reach('whale', '🐋', 'Whale', 10000000, 1000000),
  reach('billion', '🚀', 'Billionaire', 1000000000, 100000000),
];

export function goals(c: Campaign): Goal[] {
  return GOALS.map((g) => g(c));
}

export const goalDone = (g: Goal): boolean => g.have >= g.need;

/** Collects a finished goal's reward (once). */
export function claimGoal(c: Campaign, id: string): Campaign {
  const g = goals(c).find((x) => x.id === id);
  if (!g || !goalDone(g) || c.claimed.includes(id)) return c;
  return withPeak({ ...c, chips: c.chips + g.reward, claimed: [...c.claimed, id] });
}

/** Out of chips for today: nothing on a table and not enough for the smallest roulette chip. */
export const broke = (c: Campaign): boolean => !c.seat && c.chips < ROULETTE_MIN;

/** Short colour word for a pocket, for the result line. */
export const pocketName = (n: number): string => (n === 0 ? '0 Green' : `${n} ${pocketColour(n) === 'red' ? 'Red' : 'Black'}`);

/** What friends see of your campaign: on your friend card, never more. */
export interface CampaignCard {
  chips: number;
  peak: number;
  wins: number;
  at: number;
  /** This week's winnings (the week starts on the Monday `week` names), and last week's. */
  week?: string;
  weekWon?: number;
  lastWeek?: string;
  lastWeekWon?: number;
  brag?: Brag;
}

const MAX_CHIPS = 1e15;

/** A campaign card from the network, or undefined if it isn't one. */
export function parseCampaignCard(raw: unknown): CampaignCard | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const n = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= MAX_CHIPS;
  if (!n(r.chips) || !n(r.peak) || !n(r.wins) || !n(r.at)) return undefined;
  const out: CampaignCard = { chips: Math.floor(r.chips as number), peak: Math.floor(r.peak as number), wins: Math.floor(r.wins as number), at: Math.floor(r.at as number) };
  const day = (x: unknown) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
  // Winnings can be negative; anything that isn't a sensible number is left out.
  const won = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= MAX_CHIPS;
  if (day(r.week) && won(r.weekWon)) Object.assign(out, { week: r.week, weekWon: Math.round(r.weekWon as number) });
  if (day(r.lastWeek) && won(r.lastWeekWon)) Object.assign(out, { lastWeek: r.lastWeek, lastWeekWon: Math.round(r.lastWeekWon as number) });
  const b = r.brag as Record<string, unknown> | undefined;
  if (b && (b.kind === 'draw' || b.kind === 'boss' || b.kind === 'win') && n(b.value) && typeof b.where === 'string' && b.where.length <= 20 && /^[a-z0-9.-]+$/.test(b.where) && n(b.at))
    out.brag = { kind: b.kind, value: Math.floor(b.value as number), where: b.where, at: Math.floor(b.at as number) };
  return out;
}

export const campaignCard = (c: Campaign, now: number): CampaignCard => ({
  chips: c.chips,
  peak: c.peak,
  wins: c.stats.sngWins,
  at: now,
  ...(c.week ? { week: c.week.key, weekWon: c.week.won } : {}),
  ...(c.lastWeek ? { lastWeek: c.lastWeek.key, lastWeekWon: c.lastWeek.won } : {}),
  ...(c.brag ? { brag: c.brag } : {}),
});

/** Reads a saved campaign, filling in anything an older version didn't have. */
export function cleanCampaign(raw: unknown): Campaign {
  const base = newCampaign();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Campaign>;
  const num = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : d);
  const s = r.seat;
  const seat =
    s && typeof s.gameId === 'string' && ((s.kind === 'cash' && stakeById(s.venue)) || (s.kind === 'sng' && venueById(s.venue)))
      ? { ...s, venue: s.kind === 'cash' ? stakeById(s.venue)!.id : s.venue }
      : null;
  return {
    ...base,
    chips: num(r.chips),
    peak: num(r.peak),
    day: typeof r.day === 'string' ? r.day : null,
    days: num(r.days),
    intro: r.intro === true,
    seat,
    last: r.last && typeof r.last.gameId === 'string' ? r.last : null,
    stats: { ...base.stats, ...(r.stats && typeof r.stats === 'object' ? r.stats : {}) },
    claimed: Array.isArray(r.claimed) ? r.claimed.filter((x) => typeof x === 'string') : [],
    spins: Array.isArray(r.spins) ? r.spins.filter((x) => Number.isInteger(x) && x >= 0 && x <= 36).slice(0, 12) : [],
    streak: num(r.streak),
    daily: r.daily && typeof r.daily.day === 'string' && Array.isArray(r.daily.picks) ? { day: r.daily.day, picks: r.daily.picks, progress: r.daily.progress ?? {}, claimed: r.daily.claimed ?? [], bonus: !!r.daily.bonus } : null,
    spinDay: typeof r.spinDay === 'string' ? r.spinDay : null,
    week: r.week && typeof r.week.key === 'string' && typeof r.week.won === 'number' ? r.week : null,
    lastWeek: r.lastWeek && typeof r.lastWeek.key === 'string' && typeof r.lastWeek.won === 'number' ? r.lastWeek : null,
    brag: r.brag && typeof r.brag.kind === 'string' ? r.brag : null,
    bossReads: r.bossReads && typeof r.bossReads === 'object' ? r.bossReads : {},
  };
}

/** The settings and campaign tag for a campaign table, shared by the phone (bots-only) and the server (with friends). */
export function campaignTable(
  pick: { kind: 'cash'; stake: Stake; stack: number } | { kind: 'sng'; venue: Venue; prize: number },
  online: boolean,
): { settings: Game['settings']; campaign: NonNullable<Game['campaign']> } {
  if (pick.kind === 'cash') {
    const s = pick.stake;
    return {
      settings: { startingStack: pick.stack, smallBlind: s.smallBlind, bigBlind: s.bigBlind, rebuys: true, turnSeconds: online ? 30 : 0 },
      campaign: { kind: 'cash', venue: s.id, seats: CASH.seats, buyIn: pick.stack },
    };
  }
  const f = FORMATS[pick.venue.format];
  return {
    settings: { startingStack: f.stack, smallBlind: f.smallBlind, bigBlind: f.bigBlind, rebuys: false, turnSeconds: online ? 20 : 0, blindHands: f.levelHands },
    campaign: { kind: 'sng', venue: pick.venue.id, seats: f.seats, format: f.id, prize: pick.prize, buyIn: pick.venue.buyIn },
  };
}

/** The bot styles that sit at a campaign table. */
export const campaignStyles = (c: NonNullable<Game['campaign']>): string[] | undefined => (c.kind === 'cash' ? stakeById(c.venue)?.styles : venueById(c.venue)?.styles);

/** How dull the bots at a campaign table play (0 is their full strength). */
export const campaignDull = (c: NonNullable<Game['campaign']>): number => (c.kind === 'cash' ? stakeById(c.venue)?.dull : venueById(c.venue)?.dull) ?? 0;

/** A boss plays sharper than the room around them, but not at full strength until the top. */
export const BOSS_DULL = 0.5;
