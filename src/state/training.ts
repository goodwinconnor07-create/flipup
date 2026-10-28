// Hands you played on this phone, kept for a day (the finish page and the table's stats read them).

import { handRecord, type Game, type HandRecord } from '../game';
import { markPlayedToday, read, write } from './persist';

const KEY = 'flipup.history';
const MAX_HANDS = 400;

/** A hand you played, and which seat was you. */
export interface PlayedHand {
  key: string;
  heroId: string;
  record: HandRecord;
}

export const handKey = (tableId: string, number: number) => `${tableId}#${number}`;

/** Hands are kept for a day. */
export const KEEP_MS = 24 * 60 * 60 * 1000;

/** Hands you played in the last 24 hours (older ones are deleted here). */
export function loadHistory(now = Date.now()): PlayedHand[] {
  const h = read<PlayedHand[]>(KEY);
  const kept = Array.isArray(h) ? h.filter((x) => x && x.record && typeof x.heroId === 'string' && Number.isFinite(x.record.at) && x.record.at <= now && now - x.record.at < KEEP_MS) : [];
  if (Array.isArray(h) && kept.length !== h.length) write(KEY, kept);
  return kept;
}

export function addHand(hand: PlayedHand): boolean {
  const hands = loadHistory();
  if (hands.some((h) => h.key === hand.key)) return false;
  write(KEY, [...hands, hand].slice(-MAX_HANDS));
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
  if (!seat || seat.cards.length < 2) return;
  markPlayedToday();
  // The other games deal and score differently, so only plain Hold'em hands can be watched back.
  if ((game.settings.variant ?? 'holdem') !== 'holdem') return;
  const key = handKey(game.id, hand.number);
  if (captured.has(key)) return;
  const record = handRecord(game, hand, Date.now());
  if (!record) return;
  captured.add(key);
  if (captured.size > 50) captured = new Set([...captured].slice(-20));
  addHand({ key, heroId: me.id, record });
}
