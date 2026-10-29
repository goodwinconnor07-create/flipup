// Campaign: one player's bankroll against the bots, kept from day to day. A daily salary tops it up to 1,000,
// venues climb from the Garage to the Yacht (each with a cash table and a sit and go), and goals pay chips.
// Pure: the phone stores the state (state/campaign.ts) and runs the tables like any bots-only table.
// Rules are in docs/RULES.md (Campaign).

import type { Bets } from './roulette';
import { payout, pocketColour, totalBet } from './roulette';
import type { Game } from './types';

/** What the daily salary tops a bankroll up to. Days you don't open the app pay nothing. */
export const SALARY = 1000;

/** Sit and go: six players, everyone starts with 1,500 tournament chips at 10/20, and the blinds double every six hands. */
export const SNG = { seats: 6, stack: 1500, smallBlind: 10, bigBlind: 20, levelHands: 6 } as const;
/** What 1st and 2nd win, as a multiple of the buy-in. Six buy-ins in, six out: the house takes nothing. */
export const SNG_PRIZES = [4, 2] as const;

/** Cash tables: six seats, and you sit with 50 to 100 big blinds. */
export const CASH = { seats: 6, minBB: 50, maxBB: 100 } as const;

/** The smallest roulette chip: below this you're out of chips until tomorrow. */
export const ROULETTE_MIN = 5;

export interface Venue {
  id: string;
  name: string;
  emoji: string;
  /** One line on what it's like. */
  line: string;
  smallBlind: number;
  bigBlind: number;
  /** Sit and go buy-in. */
  sng: number;
  /** The peak bankroll that opens it for good. */
  unlock: number;
  /** The bot styles that sit here: the Garage gets the loose ones, the Yacht the sharks. */
  styles: string[];
}

export const VENUES: Venue[] = [
  { id: 'garage', name: 'The Garage', emoji: '🔧', line: 'A folding table and loose calls.', smallBlind: 1, bigBlind: 2, sng: 100, unlock: 0, styles: ['station', 'gambler', 'nervous', 'maniac'] },
  { id: 'backroom', name: 'The Back Room', emoji: '🎱', line: 'Regulars who think they’re good.', smallBlind: 5, bigBlind: 10, sng: 250, unlock: 0, styles: ['station', 'gambler', 'nervous', 'rock', 'maniac', 'tag'] },
  { id: 'riverboat', name: 'The Riverboat', emoji: '🛳️', line: 'Slow river, fast money.', smallBlind: 25, bigBlind: 50, sng: 1000, unlock: 5000, styles: ['gambler', 'rock', 'station', 'tag', 'lag', 'trapper'] },
  { id: 'casino', name: 'Downtown Casino', emoji: '🎰', line: 'Bright lights, sharper players.', smallBlind: 100, bigBlind: 200, sng: 5000, unlock: 20000, styles: ['rock', 'tag', 'lag', 'trapper', 'maniac', 'pro'] },
  { id: 'strip', name: 'The Strip', emoji: '🌃', line: 'Big stacks under neon.', smallBlind: 500, bigBlind: 1000, sng: 25000, unlock: 100000, styles: ['tag', 'lag', 'trapper', 'pro', 'shark'] },
  { id: 'monaco', name: 'Monte Carlo', emoji: '🏎️', line: 'Old money and cold reads.', smallBlind: 2500, bigBlind: 5000, sng: 100000, unlock: 500000, styles: ['lag', 'trapper', 'tag', 'pro', 'shark'] },
  { id: 'penthouse', name: 'The Penthouse', emoji: '🏙️', line: 'Invite only. Nobody’s bluffing. Probably.', smallBlind: 10000, bigBlind: 20000, sng: 500000, unlock: 2000000, styles: ['pro', 'shark', 'lag'] },
  { id: 'yacht', name: 'The Yacht', emoji: '🛥️', line: 'The biggest game on the water.', smallBlind: 50000, bigBlind: 100000, sng: 2500000, unlock: 10000000, styles: ['shark', 'pro'] },
];

export const venueById = (id: string | undefined): Venue | undefined => VENUES.find((v) => v.id === id);

export const cashMax = (v: Venue): number => v.bigBlind * CASH.maxBB;
export const cashMin = (v: Venue): number => v.bigBlind * CASH.minBB;

export const sngPrize = (v: Venue, place: number): number => (SNG_PRIZES[place - 1] ?? 0) * v.sng;

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
  venue: string;
  /** Everything paid in: the buy-in plus any buy-ins after going bust at a cash table. */
  paid: number;
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
  /** Sit and go: where you finished (missing if you left before it was over). */
  place?: number;
  at: number;
}

export interface CampaignStats {
  sngs: number;
  sngWins: number;
  /** Finished 1st or 2nd. */
  sngCashes: number;
  /** Sit and go wins in a row, and the best run. */
  winRun: number;
  bestRun: number;
  /** Venues where you've won a sit and go. */
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
}

export interface Campaign {
  v: 1;
  /** The bankroll: chips not on a table. */
  chips: number;
  /** The most the bankroll (plus anything on the table you were at) has ever been. Ranks and venues follow it. */
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
    stats: { sngs: 0, sngWins: 0, sngCashes: 0, winRun: 0, bestRun: 0, wonAt: [], cashSessions: 0, bestCash: 0, bestCashX: 0, spins: 0, bestSpin: 0, straightHits: 0 },
    claimed: [],
    spins: [],
  };
}

const withPeak = (c: Campaign, extra = 0): Campaign => ({ ...c, peak: Math.max(c.peak, c.chips + extra) });

/** What today's salary adds: enough to bring the bankroll (and whatever you have on a table) up to 1,000. Zero once collected today. */
export function salaryDue(c: Campaign, today: string, onTable = 0): number {
  if (c.day === today) return 0;
  return Math.max(0, SALARY - c.chips - onTable);
}

/** Collects today's salary. Counts the day even when there's nothing to top up. */
export function collectSalary(c: Campaign, today: string, onTable = 0): Campaign {
  if (c.day === today) return c;
  const pay = salaryDue(c, today, onTable);
  return withPeak({ ...c, chips: c.chips + pay, day: today, days: c.days + 1 }, onTable);
}

/** What you sit down with at a venue's cash table: as much as you can, up to 100 big blinds. Zero if you can't cover 50. */
export function cashBuyIn(c: Campaign, v: Venue): number {
  return c.chips >= cashMin(v) ? Math.min(cashMax(v), c.chips) : 0;
}

export const isOpen = (c: Campaign, v: Venue): boolean => c.peak >= v.unlock;

/** Takes a table's buy-in out of the bankroll. Returns why not instead when it can't. */
export function sitDown(c: Campaign, kind: 'cash' | 'sng', v: Venue, gameId: string, now: number): Campaign | string {
  if (c.seat) return 'Finish the table you’re at first.';
  if (!isOpen(c, v)) return `Reach ${v.unlock.toLocaleString('en-US')} to open ${v.name}.`;
  const cost = kind === 'cash' ? cashBuyIn(c, v) : v.sng;
  if (cost <= 0 || cost > c.chips) return 'Not enough chips for that table.';
  return { ...c, chips: c.chips - cost, seat: { gameId, kind, venue: v.id, paid: cost, at: now } };
}

/** Another buy-in at the cash table you're at, after going bust. */
export function buyAgain(c: Campaign, gameId: string, amount: number): Campaign | string {
  if (c.seat?.gameId !== gameId || c.seat.kind !== 'cash') return 'You’re not at that table.';
  if (amount <= 0 || amount > c.chips) return 'Not enough chips.';
  return { ...c, chips: c.chips - amount, seat: { ...c.seat, paid: c.seat.paid + amount } };
}

/** Leaving a cash table: what's in front of you goes back to the bankroll. */
export function cashOut(c: Campaign, gameId: string, stack: number, now: number): Campaign {
  const seat = c.seat;
  if (seat?.gameId !== gameId || seat.kind !== 'cash') return c;
  const back = Math.max(0, Math.floor(stack));
  const s = c.stats;
  return withPeak({
    ...c,
    chips: c.chips + back,
    seat: null,
    last: { gameId, kind: 'cash', venue: seat.venue, paid: seat.paid, back, at: now },
    stats: { ...s, cashSessions: s.cashSessions + 1, bestCash: Math.max(s.bestCash, back - seat.paid), bestCashX: Math.max(s.bestCashX, seat.paid ? back / seat.paid : 0) },
  });
}

/** A sit and go is over for you: finished in `place`, or left early (no place, no prize). */
export function finishSng(c: Campaign, gameId: string, place: number | undefined, now: number): Campaign {
  const seat = c.seat;
  if (seat?.gameId !== gameId || seat.kind !== 'sng') return c;
  const v = venueById(seat.venue);
  const back = v && place ? sngPrize(v, place) : 0;
  const s = c.stats;
  const won = place === 1;
  return withPeak({
    ...c,
    chips: c.chips + back,
    seat: null,
    last: { gameId, kind: 'sng', venue: seat.venue, paid: seat.paid, back, place, at: now },
    stats: {
      ...s,
      sngs: s.sngs + 1,
      sngWins: s.sngWins + (won ? 1 : 0),
      sngCashes: s.sngCashes + (back > 0 ? 1 : 0),
      winRun: won ? s.winRun + 1 : 0,
      bestRun: Math.max(s.bestRun, won ? s.winRun + 1 : 0),
      wonAt: won && !s.wonAt.includes(seat.venue) ? [...s.wonAt, seat.venue] : s.wonAt,
    },
  });
}

/** Where a person finished a campaign sit and go, once it's settled for them: 1st if they're the last with chips, otherwise by the order they went out. */
export function sngPlace(game: Game, playerId: string): number | undefined {
  if (game.campaign?.kind !== 'sng') return undefined;
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
  const back = payout(bets, n);
  const s = c.stats;
  const straight = (bets[`n${n}`] ?? 0) > 0;
  return withPeak({
    ...c,
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

/** Goals in the order they're meant to come. Each pays its reward once. */
const GOALS: ((c: Campaign) => Goal)[] = [
  reach('double', '✌️', 'Double up', 2000, 250),
  (c) => ({ id: 'firstWin', emoji: '🏆', title: 'First trophy', line: 'Win a tournament.', reward: 500, have: c.stats.sngWins, need: 1 }),
  (c) => ({ id: 'lucky', emoji: '🍀', title: 'Lucky number', line: 'Hit a straight-up number at roulette.', reward: 250, have: c.stats.straightHits, need: 1 }),
  (c) => ({ id: 'doubleCash', emoji: '💵', title: 'Double or nothing', line: 'Leave a cash table with twice your buy-in.', reward: 500, have: c.stats.bestCashX >= 2 ? 1 : 0, need: 1 }),
  reach('riverboat', '🛳️', 'All aboard', 5000, 1000),
  (c) => ({ id: 'itm5', emoji: '🥈', title: 'In the money', line: 'Finish 1st or 2nd in five tournaments.', reward: 1000, have: c.stats.sngCashes, need: 5 }),
  (c) => ({ id: 'week', emoji: '📅', title: 'Payday regular', line: 'Collect your salary on seven days.', reward: 2000, have: c.days, need: 7 }),
  reach('casino', '🎰', 'Big time', 20000, 2500),
  (c) => ({ id: 'run3', emoji: '🔥', title: 'Hot streak', line: 'Win three tournaments in a row.', reward: 5000, have: c.stats.bestRun, need: 3 }),
  (c) => ({ id: 'tour3', emoji: '🗺️', title: 'World tour', line: 'Win a tournament at three different venues.', reward: 5000, have: c.stats.wonAt.length, need: 3 }),
  reach('sixFigures', '💯', 'Six figures', 100000, 10000),
  reach('million', '🤑', 'Millionaire', 1000000, 100000),
  (c) => ({ id: 'tour8', emoji: '🌍', title: 'Every table', line: 'Win a tournament at every venue.', reward: 250000, have: c.stats.wonAt.length, need: VENUES.length }),
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

/** Reads a saved campaign, filling in anything an older version didn't have. */
export function cleanCampaign(raw: unknown): Campaign {
  const base = newCampaign();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Campaign>;
  const num = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : d);
  const seat = r.seat && typeof r.seat.gameId === 'string' && venueById(r.seat.venue) && (r.seat.kind === 'cash' || r.seat.kind === 'sng') ? r.seat : null;
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
  };
}
