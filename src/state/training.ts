// Training data kept on this phone: every hand you played (as data), GTO reviews of them, and
// how you did on practice drills. Stats and weaknesses are worked out from these.

import { handRecord, recordNet, type Game, type HandRecord } from '../game';
import { markPlayedToday, read, write } from './persist';
import { recordTwinHand } from './twin';
import { handFacts } from '../train/twinFacts';
import { observeHand } from './friends';
import { maybeSyncShare } from './share';
import { addTwinHand } from './twinGames';

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

export function loadHistory(now = Date.now()): PlayedHand[] {
  const h = read<PlayedHand[]>(KEYS.history);
  const kept = Array.isArray(h) ? h.filter((x) => x && x.record && typeof x.heroId === 'string'
    && Number.isFinite(x.record.at) && x.record.at <= now && now - x.record.at < 24 * 60 * 60 * 1000) : [];
  if (Array.isArray(h) && kept.length !== h.length) {
    write(KEYS.history, kept);
    const keys = new Set(kept.map(x => x.key));
    for (const key of [KEYS.reviews, KEYS.reports]) {
      const all = read<Record<string, unknown>>(key) ?? {};
      write(key, Object.fromEntries(Object.entries(all).filter(([id]) => keys.has(id))));
    }
  }
  return kept;
}

function saveHistory(hands: PlayedHand[]): void {
  write(KEYS.history, hands.slice(-MAX_HANDS));
}

export function addHand(hand: PlayedHand): boolean {
  const hands = loadHistory();
  if (hands.some((h) => h.key === hand.key)) return false;
  saveHistory([...hands, hand]);
  return true;
}

export const hasHand = (key: string) => loadHistory().some((h) => h.key === key);

/** A hand to review from your games. */
export function findPlayed(key: string): PlayedHand | null {
  return loadHistory().find((h) => h.key === key) ?? null;
}

let captured = new Set<string>();

/** Saves the hand that just finished at this table, once, if this phone was dealt in. */
/** `full` is the whole table when this phone holds it (a game on this phone): after a hand it lets a twin game keep the twin's cards. */
export function captureFinishedHand(game: Game | null, deviceId: string, full: Game | null = null): void {
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
  recordTwinHand(key, record, me.id);
  maybeSyncShare();
  // Friends at an online table who share a twin: count what they did.
  if (game.code) observeHand(record, key, me.id);
  if (game.twinGame) {
    const everything = full?.hand?.result && full.hand.number === hand.number ? handRecord(full, full.hand, Date.now()) : null;
    const facts = everything ? handFacts(everything, me.id) : null;
    addTwinHand(game.id, { key, number: record.number, net: recordNet(record, me.id), ...(facts ? { facts } : {}) }, game.settings.bigBlind);
  }
  markPlayedToday();
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export function loadSummaries(): Record<string, ReviewSummary> {
  const r = read<Record<string, ReviewSummary>>(KEYS.reviews);
  return r && typeof r === 'object' ? r : {};
}

/** Full review reports for the most recent reviewed hands (they're big, so only a few are kept). */
export function loadReport<T>(key: string): T | null {
  const all = read<Record<string, { at: number; report: T }>>(KEYS.reports) ?? {};
  return all[key]?.report ?? null;
}

export function saveReview<T>(summary: ReviewSummary, report: T): void {
  write(KEYS.reviews, { ...loadSummaries(), [summary.key]: summary });
  const all = read<Record<string, { at: number; report: T }>>(KEYS.reports) ?? {};
  all[summary.key] = { at: summary.at, report };
  const keep = Object.entries(all)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, MAX_REPORTS);
  write(KEYS.reports, Object.fromEntries(keep));
}

// ── Drills ──────────────────────────────────────────────────────────────────

export function loadDrills(): Record<string, DrillScore> {
  const d = read<Record<string, DrillScore>>(KEYS.drills);
  return d && typeof d === 'object' ? d : {};
}

export function recordDrill(scenario: string, colour: Colour, evLoss: number): void {
  const all = loadDrills();
  const s = all[scenario] ?? { attempts: 0, green: 0, yellow: 0, red: 0, evLoss: 0 };
  s.attempts += 1;
  s[colour] += 1;
  s.evLoss += Math.max(0, evLoss);
  write(KEYS.drills, { ...all, [scenario]: s });
}
