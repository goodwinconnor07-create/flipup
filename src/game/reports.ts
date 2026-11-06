// Reporting a player (App Store guideline 1.2): the reasons a phone can pick, and the check the server runs on a
// report before storing and emailing it. Nothing typed is accepted: a report names a reason from this list, where
// it happened (a table or a party, by code) and the name and emoji that were shown.
import { isCode, isDeviceId, isTableCode } from './ids';

export const REPORT_REASONS = [
  { id: 'name', label: 'Offensive name or picture' },
  { id: 'harass', label: 'Harassing other players' },
  { id: 'cheat', label: 'Cheating or teaming up' },
  { id: 'spam', label: 'Spam or advertising' },
  { id: 'other', label: 'Something else' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

export interface ReportRequest {
  /** The phone sending it. */
  deviceId: string;
  /** A table or party by its code, or a board row by the player's friend code. */
  where: 'table' | 'party' | 'board';
  code: string;
  reason: ReportReason;
  /** The name and emoji the reported player was showing. */
  name: string;
  emoji: string;
  /** Their seat id at the table, or their member id in the party. */
  playerId: string;
}

const isReason = (v: unknown): v is ReportReason => REPORT_REASONS.some((r) => r.id === v);
const shortText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

/** A report from the network, checked; null when anything is missing or wrong. */
export function parseReport(body: unknown): ReportRequest | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const code = typeof b.code === 'string' ? b.code.toUpperCase() : '';
  const board = b.where === 'board' && /^\d{6}$/.test(code);
  const known = board || (b.where === 'table' ? isTableCode(code) : b.where === 'party' && isCode(code));
  if (!isDeviceId(b.deviceId) || !known || !isReason(b.reason)) return null;
  if (!shortText(b.name, 40) || !shortText(b.emoji, 16) || !shortText(b.playerId, 40)) return null;
  return { deviceId: b.deviceId, where: b.where as ReportRequest['where'], code, reason: b.reason, name: b.name, emoji: b.emoji, playerId: b.playerId };
}
