// Checks everything that arrives over the network before it gets near the game.

import { isEmoji } from './emoji';
import { isReactionId } from './reactions';
import { LIMITS, validSettings, DEFAULT_SETTINGS } from './reducer';
import type { Action, Move, Settings } from './types';

const MOVES: Move[] = ['fold', 'check', 'call', 'bet', 'raise', 'allin'];
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && Math.abs(v) <= 1e9;
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{1,24}$/.test(v);

/** A settings change with only known keys and sensible values, or null. */
export function parseSettings(raw: unknown, partial: boolean): Partial<Settings> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  for (const key of ['startingStack', 'smallBlind', 'bigBlind', 'turnSeconds'] as const) {
    if (r[key] === undefined) continue;
    if (!isInt(r[key])) return null;
    out[key] = r[key];
  }
  if (r.revealBots !== undefined) {
    if (typeof r.revealBots !== 'boolean') return null;
    out.revealBots = r.revealBots;
  }
  if (r.rebuys !== undefined) {
    if (typeof r.rebuys !== 'boolean') return null;
    out.rebuys = r.rebuys;
  }
  if (!partial && !validSettings({ ...DEFAULT_SETTINGS, ...out })) return null;
  return out;
}

/** An action from a phone, or null if it's malformed. Never lets 'tick' through: only the server's clock ticks. */
export function parseAction(raw: unknown): Action | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  switch (a.type) {
    case 'join':
    case 'setLook':
      if (!isText(a.name, LIMITS.maxNameLength * 4) || !isEmoji(a.emoji)) return null;
      return { type: a.type, name: a.name, emoji: a.emoji };
    case 'addBot':
    case 'start':
    case 'rebuy':
    case 'end':
      return { type: a.type };
    case 'remove':
      return isId(a.playerId) ? { type: 'remove', playerId: a.playerId } : null;
    case 'settings': {
      const settings = parseSettings(a.settings, true);
      return settings ? { type: 'settings', settings } : null;
    }
    case 'act':
      if (!isInt(a.hand) || !isInt(a.seq) || !MOVES.includes(a.move as Move)) return null;
      if (a.to !== undefined && !isInt(a.to)) return null;
      return { type: 'act', hand: a.hand, seq: a.seq, move: a.move as Move, ...(a.to !== undefined ? { to: a.to as number } : {}) };
    case 'next':
    case 'show':
      return isInt(a.hand) ? { type: a.type, hand: a.hand } : null;
    case 'react':
      return isReactionId(a.id) ? { type: 'react', id: a.id } : null;
    case 'sitOut':
      return typeof a.out === 'boolean' ? { type: 'sitOut', out: a.out } : null;
    default:
      return null;
  }
}
