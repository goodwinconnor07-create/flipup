// What you've earned on this phone: legends beaten (which opens the next one), badges and your record
// against each legend. Kept in `flipup.progress`. Nothing here takes anything away.

import { LEGENDS, legendById, type Game, type HandRecord } from '../game';
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
  /** A legend this table opened, and the legend beaten (first time only counts for the first). */
  unlocked: string | null;
  beat: string | null;
  firstBeat: boolean;
  rival: { id: string; record: Tally; won: boolean } | null;
  comeback: boolean;
  /** Streak after this table. */
  streak: number;
}

export interface Progress {
  beaten: Record<string, { wins: number; first: number }>;
  badges: Record<string, number>;
  totals: Record<'bluffs' | 'allInsWon' | 'tablesWon' | 'bigPots' | 'showdownsWon' | 'comebacks', number>;
  rivals: { legends: Record<string, Tally> };
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
  return {
    beaten,
    badges: Object.fromEntries(Object.entries(s?.badges ?? {}).filter(([id]) => badgeById(id)).map(([id, at]) => [id, num(at)])),
    totals: { bluffs: num(t.bluffs), allInsWon: num(t.allInsWon), tablesWon: num(t.tablesWon), bigPots: num(t.bigPots), showdownsWon: num(t.showdownsWon), comebacks: num(t.comebacks) },
    rivals: {
      legends: Object.fromEntries(Object.entries(s?.rivals?.legends ?? {}).filter(([k]) => legendById(k)).map(([k, v]) => [k, rec(v)])),
    },
    settled: Array.isArray(s?.settled) ? s.settled.filter((x) => typeof x === 'string') : [],
    reports: s?.reports && typeof s.reports === 'object' ? (s.reports as Progress['reports']) : {},
  };
}

export function saveProgress(p: Progress): void {
  const keep = Object.entries(p.reports).sort((a, b) => b[1].at - a[1].at).slice(0, 4);
  write(KEY, { ...p, settled: p.settled.slice(-40), reports: Object.fromEntries(keep) });
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
    rival = { id, record: r, won: place === 1 };
  }

  const streak = loadStreak().days;
  const lifetime = loadStats().hands + played;
  const newBadges: string[] = [];
  for (const b of BADGES) if (!p.badges[b.id] && b.has(p, lifetime, streak)) {
    p.badges[b.id] = Date.now();
    newBadges.push(b.id);
  }

  const report: TableReport = { id: game.id, at: Date.now(), place, players: game.players.length, won, knockedOut, stats, newBadges, unlocked, beat, firstBeat, rival, comeback, streak };
  p.settled = [...p.settled, game.id];
  p.reports = { ...p.reports, [game.id]: report };
  saveProgress(p);
  return report;
}
