import type { BotMemory } from './memory';
import type { Game } from '../game/types';
export interface SessionFeel {
  version: 1;
  lastHand: number;
  caution: number;
  confidence: number;
  pressure: number;
  lastNetBb: number;
}
export function validateSessionFeel(s: SessionFeel) {
  if (
    s.version !== 1 ||
    !Number.isSafeInteger(s.lastHand) ||
    s.lastHand < 0 ||
    !Number.isFinite(s.lastNetBb) ||
    [s.caution, s.confidence, s.pressure].some((v) => !Number.isFinite(v) || v < 0 || v > 1)
  )
    throw new Error('Invalid session feel');
}
export function sessionFeel(m: BotMemory, hand: number) {
  const s = m.sessionFeel;
  if (!s) return { caution: 0, confidence: 0, pressure: 0 };
  validateSessionFeel(s);
  if (s.lastHand >= hand) throw new Error('Session outcome is not from an earlier hand');
  const decay = 0.7 ** Math.max(0, hand - s.lastHand - 1);
  return { caution: s.caution * decay, confidence: s.confidence * decay, pressure: s.pressure * decay };
}
/** Public chip outcomes only. Difficulty, cards and underlying strategy stay fixed. */
export function observeSessionFeel(m: BotMemory, e: { hand: number; netBb: number; opposingRaises: number }): void {
  if (
    !Number.isSafeInteger(e.hand) ||
    e.hand < 0 ||
    !Number.isFinite(e.netBb) ||
    !Number.isSafeInteger(e.opposingRaises) ||
    e.opposingRaises < 0
  )
    throw new Error('Invalid public session outcome');
  const old = m.sessionFeel;
  if (old && e.hand <= old.lastHand) return;
  const d = old ? 0.7 ** (e.hand - old.lastHand) : 0;
  m.sessionFeel = {
    version: 1,
    lastHand: e.hand,
    lastNetBb: e.netBb,
    caution: Math.min(1, (old?.caution ?? 0) * d + (e.netBb <= -12 ? 0.35 : 0)),
    confidence: Math.min(1, (old?.confidence ?? 0) * d + (e.netBb >= 12 ? 0.25 : 0)),
    pressure: Math.min(1, (old?.pressure ?? 0) * d + (e.opposingRaises >= 3 ? 0.2 : 0)),
  };
}
export function learnPublicSession(game: Game, memories: BotMemory[]): void {
  const h = game.hand;
  if (!h?.result || (h.variant ?? game.settings.variant ?? 'holdem') !== 'holdem') return;
  for (const m of memories) {
    const seat = h.seats.find((s) => s.playerId === m.botId);
    if (!seat) continue;
    let price = game.settings.bigBlind,
      street = 'preflop',
      raises = 0;
    for (const a of h.actions ?? []) {
      if (a.street !== street) {
        street = a.street;
        price = 0;
      }
      if (!a.outOfTurn && ['bet', 'raise', 'allin'].includes(a.move) && a.to > price) {
        if (a.playerId !== m.botId) raises++;
        price = a.to;
      }
    }
    observeSessionFeel(m, {
      hand: h.number,
      netBb: ((h.result.won[m.botId] ?? 0) - seat.total) / game.settings.bigBlind,
      opposingRaises: raises,
    });
  }
}
