// What you've earned on this phone: legends beaten (which opens the next one), badges, today's goals
// and your record against your twin, your friends' twins and each legend. Kept in `flipup.progress`.
// Nothing here takes anything away: no streak penalties, no goals that expire loudly.

import { LEGENDS, legendById, type Game, type HandRecord } from '../game';
import { dayKey, loadStats, loadStreak, read, write } from './persist';
import { loadHistory } from './training';
import { twinStatus } from './twin';
import { tableStats, type TableStats } from '../train/tableStats';

const KEY = 'flipup.progress';

export type Metric = 'hands' | 'tables' | 'tablesWon' | 'bluffs' | 'showdownsWon' | 'legendWins' | 'twinGames' | 'drills' | 'bigPots' | 'allInsWon';

export interface Tally {
  w: number;
  l: number;
}

export interface GoalState {
  id: string;
  done: boolean;
}

/** What happened when one table was counted, kept so the end screen can show it again after a reload. */
export interface TableReport {
  id: string;
  at: number;
  place: number;
  players: number;
  /** First by chips, with at least a few hands played. */
  won: boolean;
  /** Left the table with the other side out of chips. */
  knockedOut: boolean;
  stats: TableStats;
  newBadges: string[];
  goalsDone: string[];
  /** A legend this table opened, and the legend beaten (first time only counts for the first). */
  unlocked: string | null;
  beat: string | null;
  firstBeat: boolean;
  rival: { kind: 'twin' | 'friend' | 'legend'; id?: string; record: Tally; won: boolean } | null;
  comeback: boolean;
  /** Streak after this table. */
  streak: number;
}

export interface Progress {
  beaten: Record<string, { wins: number; first: number }>;
  badges: Record<string, number>;
  totals: Record<'bluffs' | 'allInsWon' | 'tablesWon' | 'bigPots' | 'showdownsWon' | 'comebacks', number>;
  rivals: { twin: Tally; friends: Record<string, Tally>; legends: Record<string, Tally> };
  day: string;
  counts: Partial<Record<Metric, number>>;
  goals: GoalState[];
  settled: string[];
  reports: Record<string, TableReport>;
}

// ── Goals ───────────────────────────────────────────────────────────────────

/** Daily goals are paused for now: nothing is picked, counted or shown while this is off. */
export const DAILY_GOALS = false;

/** What the page with the ladder and badges is called. */
export const PROGRESS_TITLE = DAILY_GOALS ? 'Goals and badges' : 'Badges and ladder';

export interface GoalDef {
  id: string;
  metric: Metric;
  target: number;
  label: string;
  /** Easy ones: one of these is always in the day. */
  easy?: boolean;
  /** Only offered when it can be done (a twin needs its hands first). */
  needs?: 'twin';
}

export const GOALS: GoalDef[] = [
  { id: 'hands20', metric: 'hands', target: 20, label: 'Play 20 hands', easy: true },
  { id: 'table1', metric: 'tables', target: 1, label: 'Finish a table', easy: true },
  { id: 'win1', metric: 'tablesWon', target: 1, label: 'Win a table' },
  { id: 'bluff1', metric: 'bluffs', target: 1, label: 'Win a pot with a bluff' },
  { id: 'show2', metric: 'showdownsWon', target: 2, label: 'Win 2 showdowns' },
  { id: 'legend1', metric: 'legendWins', target: 1, label: 'Beat a legend' },
  { id: 'twin1', metric: 'twinGames', target: 1, label: 'Play your AI twin', needs: 'twin' },
  { id: 'drill3', metric: 'drills', target: 3, label: 'Do 3 practice drills' },
  { id: 'pot20', metric: 'bigPots', target: 1, label: 'Win a pot of 20 big blinds or more' },
  { id: 'allin1', metric: 'allInsWon', target: 1, label: 'Win an all-in' },
];

export const goalById = (id: string): GoalDef | undefined => GOALS.find((g) => g.id === id);

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Three goals for a day: one easy, two others, the same for the whole day. */
export function goalsFor(day: string, twinReady: boolean): string[] {
  const pool = GOALS.filter((g) => !g.needs || (g.needs === 'twin' && twinReady));
  const easy = pool.filter((g) => g.easy);
  const rest = pool.filter((g) => !g.easy);
  let h = hash(day);
  const pick = <T,>(xs: T[]): T => {
    const x = xs[h % xs.length];
    h = Math.floor(h / xs.length) + 17;
    return x;
  };
  const first = pick(easy);
  const second = pick(rest);
  const third = pick(rest.filter((g) => g.id !== second.id));
  return [first.id, second.id, third.id];
}

// ── Badges ──────────────────────────────────────────────────────────────────

export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  text: string;
  /** Called with everything known after a table. */
  has: (p: Progress, lifetimeHands: number, streakDays: number) => boolean;
}

const legendBadges: BadgeDef[] = LEGENDS.map((l) => ({
  id: `beat-${l.id}`,
  name: `Beat ${l.short}`,
  emoji: l.emoji,
  text: `Knock out ${l.name} heads-up.`,
  has: (p) => !!p.beaten[l.id],
}));

export const BADGES: BadgeDef[] = [
  { id: 'first-win', name: 'First win', emoji: '🏆', text: 'Win a table.', has: (p) => p.totals.tablesWon >= 1 },
  { id: 'wins-5', name: 'Five wins', emoji: '🥇', text: 'Win 5 tables.', has: (p) => p.totals.tablesWon >= 5 },
  ...legendBadges,
  { id: 'ladder', name: 'Top of the ladder', emoji: '👑', text: 'Beat every legend.', has: (p) => LEGENDS.every((l) => !!p.beaten[l.id]) },
  { id: 'bluff-1', name: 'First bluff', emoji: '🎭', text: 'Win a pot with nothing.', has: (p) => p.totals.bluffs >= 1 },
  { id: 'bluff-10', name: 'Bluff artist', emoji: '🃏', text: 'Win 10 pots with a bluff.', has: (p) => p.totals.bluffs >= 10 },
  { id: 'big-pot', name: 'Big pot', emoji: '💰', text: 'Win a pot of 20 big blinds or more.', has: (p) => p.totals.bigPots >= 1 },
  { id: 'all-in', name: 'Fearless', emoji: '🔥', text: 'Win 3 all-ins.', has: (p) => p.totals.allInsWon >= 3 },
  { id: 'showdowns', name: 'Cool under pressure', emoji: '🧊', text: 'Win 10 showdowns.', has: (p) => p.totals.showdownsWon >= 10 },
  { id: 'comeback', name: 'Comeback', emoji: '🎢', text: 'Win a table after falling below half your chips.', has: (p) => p.totals.comebacks >= 1 },
  { id: 'twin', name: 'Beat yourself', emoji: '🪞', text: 'Beat your AI twin.', has: (p) => p.rivals.twin.w >= 1 },
  { id: 'friend-twin', name: 'Scouted', emoji: '🔭', text: "Beat a friend's AI twin.", has: (p) => Object.values(p.rivals.friends).some((r) => r.w >= 1) },
  { id: 'hands-100', name: '100 hands', emoji: '🎴', text: 'Play 100 hands.', has: (_p, hands) => hands >= 100 },
  { id: 'hands-500', name: '500 hands', emoji: '📚', text: 'Play 500 hands.', has: (_p, hands) => hands >= 500 },
  { id: 'streak-3', name: 'Three days', emoji: '🔥', text: 'Play 3 days in a row.', has: (_p, _h, days) => days >= 3 },
  { id: 'streak-7', name: 'A full week', emoji: '📅', text: 'Play 7 days in a row.', has: (_p, _h, days) => days >= 7 },
];

export const badgeById = (id: string): BadgeDef | undefined => BADGES.find((b) => b.id === id);

// ── Storage ─────────────────────────────────────────────────────────────────

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0);
const rec = (r: unknown): Tally => ({ w: num((r as Tally | undefined)?.w), l: num((r as Tally | undefined)?.l) });

/** Reads what's saved. Legends you'd already beaten before the ladder existed count as beaten. */
export function loadProgress(): Progress {
  const s = read<Partial<Progress>>(KEY);
  const beaten: Progress['beaten'] = {};
  for (const [id, v] of Object.entries(s?.beaten ?? {})) if (legendById(id)) beaten[id] = { wins: Math.max(1, num(v?.wins)), first: num(v?.first) };
  const first = !s;
  if (first) {
    for (const g of loadStats().games) if (g.legend && legendById(g.legend) && g.place === 1) beaten[g.legend] = { wins: (beaten[g.legend]?.wins ?? 0) + 1, first: beaten[g.legend]?.first ?? g.at };
  }
  const t = s?.totals ?? ({} as Progress['totals']);
  const day = dayKey(new Date());
  return {
    beaten,
    badges: Object.fromEntries(Object.entries(s?.badges ?? {}).filter(([id]) => badgeById(id)).map(([id, at]) => [id, num(at)])),
    totals: { bluffs: num(t.bluffs), allInsWon: num(t.allInsWon), tablesWon: num(t.tablesWon), bigPots: num(t.bigPots), showdownsWon: num(t.showdownsWon), comebacks: num(t.comebacks) },
    rivals: {
      twin: rec(s?.rivals?.twin),
      friends: Object.fromEntries(Object.entries(s?.rivals?.friends ?? {}).map(([k, v]) => [k, rec(v)])),
      legends: Object.fromEntries(Object.entries(s?.rivals?.legends ?? {}).filter(([k]) => legendById(k)).map(([k, v]) => [k, rec(v)])),
    },
    day: typeof s?.day === 'string' ? s.day : day,
    counts: s?.counts && typeof s.counts === 'object' ? s.counts : {},
    goals: Array.isArray(s?.goals) ? s.goals.filter((g) => g && typeof g.id === 'string' && goalById(g.id)).map((g) => ({ id: g.id, done: g.done === true })) : [],
    settled: Array.isArray(s?.settled) ? s.settled.filter((x) => typeof x === 'string') : [],
    reports: s?.reports && typeof s.reports === 'object' ? (s.reports as Progress['reports']) : {},
  };
}

export function saveProgress(p: Progress): void {
  const keep = Object.entries(p.reports).sort((a, b) => b[1].at - a[1].at).slice(0, 4);
  write(KEY, { ...p, settled: p.settled.slice(-40), reports: Object.fromEntries(keep) });
}

/** Today's goals, rolled over if the day changed (counts start again, the goals change). */
export function rollDay(p: Progress, twinReady: boolean, now = new Date()): Progress {
  const day = dayKey(now);
  if (p.day === day && (!DAILY_GOALS || p.goals.length > 0)) return p;
  return { ...p, day, counts: {}, goals: DAILY_GOALS ? goalsFor(day, twinReady).map((id) => ({ id, done: false })) : [] };
}

/** Today's goals with how far each one is. */
export function todaysGoals(p: Progress): { def: GoalDef; have: number; done: boolean }[] {
  return p.goals.map((g) => {
    const def = goalById(g.id)!;
    return { def, have: Math.min(def.target, p.counts[def.metric] ?? 0), done: g.done };
  });
}

// ── Ladder ──────────────────────────────────────────────────────────────────

/** The first legend is open; each next one opens when you knock out the one before. */
export function legendOpen(p: Progress, id: string): boolean {
  const l = legendById(id);
  if (!l) return false;
  if (l.rung <= 1) return true;
  const before = LEGENDS.find((x) => x.rung === l.rung - 1);
  return !before || !!p.beaten[before.id];
}

/** The legend whose beating opens `id` (null for the first rung). */
export function legendBefore(id: string) {
  const l = legendById(id);
  return l ? LEGENDS.find((x) => x.rung === l.rung - 1) ?? null : null;
}

/** The next legend you haven't beaten that's open, or null when you've done them all. */
export function nextLegend(p: Progress) {
  return LEGENDS.find((l) => !p.beaten[l.id] && legendOpen(p, l.id)) ?? null;
}

// ── Counting a table ────────────────────────────────────────────────────────

/** Adds to today's counts and marks goals done; returns the ones that just finished. */
function bump(p: Progress, add: Partial<Record<Metric, number>>): string[] {
  for (const [k, v] of Object.entries(add) as [Metric, number][]) p.counts[k] = (p.counts[k] ?? 0) + v;
  const done: string[] = [];
  for (const g of p.goals) {
    const def = goalById(g.id);
    if (def && !g.done && (p.counts[def.metric] ?? 0) >= def.target) {
      g.done = true;
      done.push(g.id);
    }
  }
  return done;
}

/** A practice drill was finished. */
export function noteDrill(): void {
  const p = rollDay(loadProgress(), twinStatus().ready);
  bump(p, { drills: 1 });
  saveProgress(p);
}

/**
 * Counts a table once: the numbers from the hands you saved, what you earned and what it opened.
 * Safe to call again for the same table: it gives back the same report.
 */
export function settleTable(game: Game, deviceId: string, history: { key: string; record: HandRecord }[] = loadHistory()): TableReport | null {
  const me = game.players.find((x) => x.deviceId === deviceId);
  if (!me) return null;
  const before = loadProgress();
  const seen = before.reports[game.id];
  if (seen) return seen;
  const played = game.hands ?? game.hand?.number ?? 0;
  if (played === 0 || before.settled.includes(game.id)) return null;

  const p = rollDay(before, twinStatus().ready);
  const records = history.filter((h) => h.key.startsWith(`${game.id}#`)).map((h) => h.record);
  const stats = tableStats(records, me.id);
  const place = 1 + game.players.filter((x) => x.stack > me.stack).length;
  const others = game.players.filter((x) => x.id !== me.id);
  const knockedOut = others.length > 0 && others.every((x) => x.stack <= 0);
  const won = place === 1 && others.length > 0 && played >= 3;
  const comeback = won && stats.lowest < 0.5;

  const bigPots = stats.bigWinBlinds >= 20 ? 1 : 0;
  p.totals.bluffs += stats.bluffsWon;
  p.totals.allInsWon += stats.allInsWon;
  p.totals.showdownsWon += stats.showdownsWon;
  p.totals.bigPots += bigPots;
  if (won) p.totals.tablesWon++;
  if (comeback) p.totals.comebacks++;

  // The ladder and the rivalries.
  let beat: string | null = null;
  let firstBeat = false;
  let unlocked: string | null = null;
  let rival: TableReport['rival'] = null;
  if (game.legendGame && legendById(game.legendGame)) {
    const id = game.legendGame;
    const r = p.rivals.legends[id] ?? { w: 0, l: 0 };
    if (knockedOut && place === 1) {
      r.w++;
      beat = id;
      firstBeat = !p.beaten[id];
      p.beaten[id] = { wins: (p.beaten[id]?.wins ?? 0) + 1, first: p.beaten[id]?.first ?? Date.now() };
      const after = LEGENDS.find((l) => l.rung === legendById(id)!.rung + 1);
      if (firstBeat && after) unlocked = after.id;
    } else if (place !== 1) r.l++;
    p.rivals.legends[id] = r;
    rival = { kind: 'legend', id, record: r, won: place === 1 };
  } else if (game.twinGame) {
    const target = game.friendTwin ? (p.rivals.friends[game.friendTwin] ??= { w: 0, l: 0 }) : p.rivals.twin;
    if (place === 1) target.w++;
    else target.l++;
    rival = { kind: game.friendTwin ? 'friend' : 'twin', id: game.friendTwin, record: { ...target }, won: place === 1 };
  }

  const goalsDone = bump(p, {
    hands: stats.hands,
    tables: 1,
    tablesWon: won ? 1 : 0,
    bluffs: stats.bluffsWon,
    showdownsWon: stats.showdownsWon,
    legendWins: beat ? 1 : 0,
    twinGames: game.twinGame ? 1 : 0,
    bigPots,
    allInsWon: stats.allInsWon,
  });

  const streak = loadStreak().days;
  const lifetime = loadStats().hands + played;
  const newBadges: string[] = [];
  for (const b of BADGES) if (!p.badges[b.id] && b.has(p, lifetime, streak)) {
    p.badges[b.id] = Date.now();
    newBadges.push(b.id);
  }

  const report: TableReport = { id: game.id, at: Date.now(), place, players: game.players.length, won, knockedOut, stats, newBadges, goalsDone, unlocked, beat, firstBeat, rival, comeback, streak };
  p.settled = [...p.settled, game.id];
  p.reports = { ...p.reports, [game.id]: report };
  saveProgress(p);
  return report;
}

/** Progress with today's goals in place (saved when the day just turned over), for the screens that show them. */
export function loadToday(): Progress {
  const before = loadProgress();
  const p = rollDay(before, twinStatus().ready);
  if (p !== before) saveProgress(p);
  return p;
}
