// Checks everything that arrives over the network before it gets near the game.

import { isEmoji } from './emoji';
import { isReactionId } from './reactions';
import { isCard } from './cards';
import { isVariant } from './variants';
import { isBubbleId } from './bubbles';
import { isPackId } from './cardPacks';
import { legendById } from './legends';
import { BOTS } from './botStyles';
import { LIMITS, validSettings, DEFAULT_SETTINGS } from './reducer';
import type { Action, Move, Settings } from './types';
import { isPersonality } from '../bot_engine/personalities';
import { isBotDifficulty } from '../bot_engine/everyday';

const MOVES: Move[] = ['fold', 'check', 'call', 'bet', 'raise', 'allin'];
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && Math.abs(v) <= 1e9;
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{1,24}$/.test(v);

/** A settings change with only known keys and sensible values, or null. */
export function parseSettings(raw: unknown, partial: boolean): Partial<Settings> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (r.botDifficulty !== undefined) {
    if (!isBotDifficulty(r.botDifficulty)) return null;
    out.botDifficulty = r.botDifficulty;
  }
  if (r.botPersonality !== undefined) {
    if (r.botPersonality !== 'original' && !isPersonality(r.botPersonality)) return null;
    out.botPersonality = r.botPersonality;
  }
  if (r.humanPoker !== undefined) {
    if (typeof r.humanPoker !== 'boolean') return null;
    out.humanPoker = r.humanPoker;
  }
  for (const key of ['startingStack', 'smallBlind', 'bigBlind', 'turnSeconds', 'blindMinutes', 'blindCap', 'blindHands'] as const) {
    if (r[key] === undefined) continue;
    if (!isInt(r[key])) return null;
    out[key] = r[key];
  }
  if (r.rebuys !== undefined) {
    if (typeof r.rebuys !== 'boolean') return null;
    out.rebuys = r.rebuys;
  }
  if (r.variant !== undefined) {
    if (!isVariant(r.variant)) return null;
    out.variant = r.variant;
  }
  if (r.showToBusted !== undefined) {
    if (typeof r.showToBusted !== 'boolean') return null;
    out.showToBusted = r.showToBusted;
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
      if (!isText(a.name, LIMITS.maxNameLength * 4) || !isEmoji(a.emoji)) return null;
      return { type: 'join', name: a.name, emoji: a.emoji };
    case 'setLook':
      if (!isText(a.name, LIMITS.maxNameLength * 4) || !isEmoji(a.emoji)) return null;
      if (a.bubble !== undefined && !isBubbleId(a.bubble)) return null;
      if (a.cardPack !== undefined && !isPackId(a.cardPack)) return null;
      if (a.gold !== undefined && typeof a.gold !== 'boolean') return null;
      return {
        type: 'setLook',
        name: a.name,
        emoji: a.emoji,
        ...(a.bubble !== undefined ? { bubble: a.bubble as string } : {}),
        ...(a.cardPack !== undefined ? { cardPack: a.cardPack as string } : {}),
        ...(a.gold === true ? { gold: true } : {}),
      };
    case 'addBot':
      if (a.name !== undefined)
        return a.legend === undefined && typeof a.name === 'string' && BOTS.some((b) => b.name === a.name)
          ? { type: 'addBot', name: a.name }
          : null;
      if (a.legend === undefined) return { type: 'addBot' };
      return typeof a.legend === 'string' && legendById(a.legend) ? { type: 'addBot', legend: a.legend } : null;
    case 'start':
    case 'rebuy':
    case 'end':
      return { type: a.type };
    case 'playAgain':
      if (a.off === true) return { type: 'playAgain', off: true };
      return isVariant(a.variant) ? { type: 'playAgain', variant: a.variant } : { type: 'playAgain' };
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
      return isInt(a.hand) ? { type: 'next', hand: a.hand } : null;
    case 'hit':
      return isInt(a.hand) && isInt(a.seq) ? { type: 'hit', hand: a.hand, seq: a.seq } : null;
    case 'revealBots':
      if (a.playerId !== undefined && !isId(a.playerId)) return null;
      return isInt(a.hand)
        ? { type: 'revealBots', hand: a.hand, ...(a.playerId !== undefined ? { playerId: a.playerId as string } : {}) }
        : null;
    case 'show':
      return isInt(a.hand) ? { type: a.type, hand: a.hand } : null;
    case 'vote':
      return isInt(a.hand) && isId(a.playerId) ? { type: 'vote', hand: a.hand, playerId: a.playerId } : null;
    case 'point':
      return isInt(a.hand) && (a.playerId === null || isId(a.playerId)) ? { type: 'point', hand: a.hand, playerId: a.playerId as string | null } : null;
    case 'discard':
      return isInt(a.hand) && isCard(a.card) ? { type: 'discard', hand: a.hand, card: a.card } : null;
    case 'react':
      return isReactionId(a.id) ? { type: 'react', id: a.id } : null;
    case 'sitOut':
      return typeof a.out === 'boolean' ? { type: 'sitOut', out: a.out } : null;
    default:
      return null;
  }
}
