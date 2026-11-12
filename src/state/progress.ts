// What you've earned on this phone: badges and the totals they read. Kept in `flipup.progress`. Nothing here takes
// anything away.

import type { Game, HandRecord } from '../game';
import { loadStats, loadStreak, read, write } from './persist';
import { loadHistory } from './training';
import { tableStats, type TableStats } from '../train/tableStats';

const KEY = 'flipup.progress';

export interface Tally {
  w: number;
  l: number;
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
  comeback: boolean;
  /** Streak after this table. */
  streak: number;
}

export interface Progress {
  badges: Record<string, number>;
  totals: Record<'bluffs' | 'allInsWon' | 'tablesWon' | 'bigPots' | 'showdownsWon' | 'comebacks', number>;
  settled: string[];
  reports: Record<string, TableReport>;
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

export const BADGES: BadgeDef[] = [
  { id: 'first-win', name: 'First win', emoji: '🏆', text: 'Win a table.', has: (p) => p.totals.tablesWon >= 1 },
  { id: 'wins-5', name: 'Five wins', emoji: '🥇', text: 'Win 5 tables.', has: (p) => p.totals.tablesWon >= 5 },
  { id: 'bluff-1', name: 'First bluff', emoji: '🎭', text: 'Win a pot with nothing.', has: (p) => p.totals.bluffs >= 1 },
  { id: 'bluff-10', name: 'Bluff artist', emoji: '🃏', text: 'Win 10 pots with a bluff.', has: (p) => p.totals.bluffs >= 10 },
  { id: 'big-pot', name: 'Big pot', emoji: '💰', text: 'Win a pot of 20 big blinds or more.', has: (p) => p.totals.bigPots >= 1 },
  { id: 'all-in', name: 'Fearless', emoji: '🔥', text: 'Win 3 all-ins.', has: (p) => p.totals.allInsWon >= 3 },
  { id: 'showdowns', name: 'Cool under pressure', emoji: '🧊', text: 'Win 10 showdowns.', has: (p) => p.totals.showdownsWon >= 10 },
  { id: 'comeback', name: 'Comeback', emoji: '🎢', text: 'Win a table after falling below half your chips.', has: (p) => p.totals.comebacks >= 1 },
  { id: 'hands-100', name: '100 hands', emoji: '🎴', text: 'Play 100 hands.', has: (_p, hands) => hands >= 100 },
  { id: 'hands-500', name: '500 hands', emoji: '📚', text: 'Play 500 hands.', has: (_p, hands) => hands >= 500 },
  { id: 'streak-3', name: 'Three days', emoji: '🔥', text: 'Play 3 days in a row.', has: (_p, _h, days) => days >= 3 },
  { id: 'streak-7', name: 'A full week', emoji: '📅', text: 'Play 7 days in a row.', has: (_p, _h, days) => days >= 7 },
];

export const badgeById = (id: string): BadgeDef | undefined => BADGES.find((b) => b.id === id);

// ── Storage ─────────────────────────────────────────────────────────────────

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0);

/** Reads what's saved (anything it doesn't know any more, like the legends ladder, is dropped). */
export function loadProgress(): Progress {
  const s = read<Partial<Progress>>(KEY);
  const badges: Progress['badges'] = Object.fromEntries(Object.entries(s?.badges ?? {}).filter(([id]) => badgeById(id)).map(([id, at]) => [id, num(at)]));
  const t = s?.totals ?? ({} as Progress['totals']);
  return {
    badges,
    totals: { bluffs: num(t.bluffs), allInsWon: num(t.allInsWon), tablesWon: num(t.tablesWon), bigPots: num(t.bigPots), showdownsWon: num(t.showdownsWon), comebacks: num(t.comebacks) },
    settled: Array.isArray(s?.settled) ? s.settled.filter((x) => typeof x === 'string') : [],
    reports: s?.reports && typeof s.reports === 'object' ? (s.reports as Progress['reports']) : {},
  };
}

export function saveProgress(p: Progress): void {
  const keep = Object.entries(p.reports).sort((a, b) => b[1].at - a[1].at).slice(0, 4);
  write(KEY, { ...p, settled: p.settled.slice(-40), reports: Object.fromEntries(keep) });
}

// ── Counting a table ────────────────────────────────────────────────────────

/**
 * Counts a table once: the numbers from the hands you saved and what you earned.
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

  const p = before;
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

  const streak = loadStreak().days;
  const lifetime = loadStats().hands + played;
  const newBadges: string[] = [];
  for (const b of BADGES) if (!p.badges[b.id] && b.has(p, lifetime, streak)) {
    p.badges[b.id] = Date.now();
    newBadges.push(b.id);
  }

  const report: TableReport = { id: game.id, at: Date.now(), place, players: game.players.length, won, knockedOut, stats, newBadges, comeback, streak };
  p.settled = [...p.settled, game.id];
  p.reports = { ...p.reports, [game.id]: report };
  saveProgress(p);
  return report;
}
