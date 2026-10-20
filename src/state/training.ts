// Training data kept on this phone: every hand you played (as data), GTO reviews of them, and
// how you did on practice drills. Stats and weaknesses are worked out from these.

import { handRecord, type Game, type HandRecord } from '../game';
import { markPlayedToday, read, write } from './persist';

const KEYS = {
  history: 'flipup.history',
  reviews: 'flipup.reviews',
  reports: 'flipup.reports',
  drills: 'flipup.drills',
} as const;

const MAX_HANDS = 400;
const MAX_REPORTS = 40;

/** A hand you played, and which seat was you. */
export interface PlayedHand {
  key: string;
  heroId: string;
  record: HandRecord;
}

export type Colour = 'green' | 'yellow' | 'red';

/** The bits of a review the stats need (kept for every reviewed hand). */
export interface ReviewSummary {
  key: string;
  at: number;
  decisions: { street: string; colour: Colour | null; evLoss: number | null; scenario: string | null }[];
}

export interface DrillScore {
  attempts: number;
  green: number;
  yellow: number;
  red: number;
  evLoss: number;
}

export const handKey = (tableId: string, number: number) => `${tableId}#${number}`;

const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** A saved hand with every part the stats and replay read. Anything less (damaged storage) is skipped, not crashed on. */
function isPlayedHand(x: unknown): x is PlayedHand {
  if (!isObject(x) || typeof x.key !== 'string' || typeof x.heroId !== 'string' || !isObject(x.record)) return false;
  const r = x.record;
  return (
    Array.isArray(r.players) &&
    r.players.every((p) => isObject(p) && typeof p.id === 'string' && finite(p.stack) && finite(p.seat)) &&
    Array.isArray(r.actions) &&
    r.actions.every((a) => isObject(a) && typeof a.playerId === 'string' && typeof a.move === 'string' && typeof a.street === 'string' && finite(a.to)) &&
    Array.isArray(r.board) &&
    isObject(r.holes) &&
    isObject(r.won) &&
    finite(r.bigBlind) &&
    r.bigBlind > 0 &&
    finite(r.smallBlind) &&
    typeof r.buttonId === 'string' &&
    finite(r.at)
  );
}

export function loadHistory(): PlayedHand[] {
  const h = read<PlayedHand[]>(KEYS.history);
  return Array.isArray(h) ? h.filter(isPlayedHand).slice(-MAX_HANDS) : [];
}

function saveHistory(hands: PlayedHand[]): void {
  // If the phone is short of room, keep fewer of the oldest hands rather than losing the new one.
  for (let keep = MAX_HANDS; keep >= 1; keep = Math.floor(keep / 2)) if (write(KEYS.history, hands.slice(-keep))) return;
}

export function addHand(hand: PlayedHand): boolean {
  const hands = loadHistory();
  if (hands.some((h) => h.key === hand.key)) return false;
  saveHistory([...hands, hand]);
  return true;
}

export const hasHand = (key: string) => loadHistory().some((h) => h.key === key);

let captured = new Set<string>();

/** Saves the hand that just finished at this table, once, if this phone was dealt in. */
export function captureFinishedHand(game: Game | null, deviceId: string): void {
  const hand = game?.hand;
  if (!game || !hand?.result) return;
  const me = game.players.find((p) => p.deviceId === deviceId);
  if (!me) return;
  const seat = hand.seats.find((s) => s.playerId === me.id);
  if (!seat || seat.cards.length !== 2) return;
  const key = handKey(game.id, hand.number);
  if (captured.has(key)) return;
  const record = handRecord(game, hand, Date.now());
  if (!record) return;
  captured.add(key);
  if (captured.size > 50) captured = new Set([...captured].slice(-20));
  addHand({ key, heroId: me.id, record });
  markPlayedToday();
}

// ── Reviews ─────────────────────────────────────────────────────────────────

const COLOURS = ['green', 'yellow', 'red'];

export function loadSummaries(): Record<string, ReviewSummary> {
  const r = read<Record<string, ReviewSummary>>(KEYS.reviews);
  if (!isObject(r)) return {};
  const out: Record<string, ReviewSummary> = {};
  for (const [key, s] of Object.entries(r)) {
    if (!isObject(s) || s.key !== key || !finite(s.at) || !Array.isArray(s.decisions)) continue;
    const decisions = s.decisions
      .filter((d): d is ReviewSummary['decisions'][number] => isObject(d) && typeof d.street === 'string' && (d.colour === null || COLOURS.includes(d.colour as string)))
      .map((d) => ({ street: d.street, colour: d.colour, evLoss: finite(d.evLoss) ? d.evLoss : null, scenario: typeof d.scenario === 'string' ? d.scenario : null }));
    out[key] = { key, at: s.at, decisions };
  }
  return out;
}

/** Full review reports for the most recent reviewed hands (they're big, so only a few are kept). */
export function loadReport<T>(key: string): T | null {
  const all = read<Record<string, { at: number; report: T }>>(KEYS.reports);
  return isObject(all) && Object.hasOwn(all, key) ? (all[key]?.report ?? null) : null;
}

export function saveReview<T>(summary: ReviewSummary, report: T): void {
  // Summaries are small but would otherwise pile up for ever; keep as many as there are saved hands.
  const summaries = Object.values({ ...loadSummaries(), [summary.key]: summary })
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_HANDS);
  write(KEYS.reviews, Object.fromEntries(summaries.map((s) => [s.key, s])));
  const stored = read<Record<string, { at: number; report: T }>>(KEYS.reports);
  const all = isObject(stored) ? { ...stored } : {};
  all[summary.key] = { at: summary.at, report };
  const ranked = Object.entries(all)
    .filter(([, v]) => isObject(v) && finite(v.at))
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_REPORTS);
  // Reports are big. If the phone is short of room, keep fewer of the older ones.
  for (let n = ranked.length; n >= 1; n = n > 1 ? Math.floor(n / 2) : 0) if (write(KEYS.reports, Object.fromEntries(ranked.slice(0, n)))) return;
}

// ── Drills ──────────────────────────────────────────────────────────────────

export function loadDrills(): Record<string, DrillScore> {
  const d = read<Record<string, DrillScore>>(KEYS.drills);
  if (!isObject(d)) return {};
  const n = (x: unknown) => (finite(x) && x > 0 ? x : 0);
  const out: Record<string, DrillScore> = {};
  for (const [id, s] of Object.entries(d)) {
    if (!isObject(s)) continue;
    out[id] = { attempts: n(s.attempts), green: n(s.green), yellow: n(s.yellow), red: n(s.red), evLoss: n(s.evLoss) };
  }
  return out;
}

export function recordDrill(scenario: string, colour: Colour, evLoss: number): void {
  const all = loadDrills();
  const s = all[scenario] ?? { attempts: 0, green: 0, yellow: 0, red: 0, evLoss: 0 };
  s.attempts += 1;
  s[colour] += 1;
  // A missing or odd number from the coach must not poison the running total.
  s.evLoss += finite(evLoss) ? Math.max(0, evLoss) : 0;
  write(KEYS.drills, { ...all, [scenario]: s });
}
