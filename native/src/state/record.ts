// Your poker on this phone (`flipup.record`), for Home: hands played and won, the biggest pot, your best hand and
// the last few games. Counted from the table view this phone sees, once per hand and once per game.
import { bestHand, variantOf, type Card, type Game, type Variant } from '@/engine';

import { read, save, useStored } from './storage';

const KEY = 'flipup.record';

export interface GameLine {
  at: number;
  variant: Variant;
  /** Where you finished by chips, 1 for first. */
  place: number;
  players: number;
}

export interface PokerRecord {
  hands: number;
  /** Hands where you took at least part of a pot. */
  won: number;
  biggestPot: number;
  best: { score: number; name: string; cards: Card[]; variant: Variant } | null;
  games: GameLine[];
  /** Hands and games already counted ("game/hand" and "game"), so a redraw never counts one twice. */
  seen: string[];
}

function clean(r: Partial<PokerRecord> | null): PokerRecord {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    hands: n(r?.hands),
    won: n(r?.won),
    biggestPot: n(r?.biggestPot),
    best: r?.best && Array.isArray(r.best.cards) && typeof r.best.name === 'string' ? r.best : null,
    games: Array.isArray(r?.games) ? r.games.filter((g) => g && typeof g.variant === 'string' && typeof g.place === 'number') : [],
    seen: Array.isArray(r?.seen) ? r.seen.filter((s) => typeof s === 'string') : [],
  };
}

export const usePokerRecord = (): PokerRecord => clean(useStored<Partial<PokerRecord> | null>(KEY, null));

function update(fn: (r: PokerRecord) => PokerRecord | null): void {
  const next = fn(clean(read<Partial<PokerRecord> | null>(KEY, null)));
  if (next) save(KEY, { ...next, seen: next.seen.slice(-60), games: next.games.slice(-20) });
}

/** A finished hand you were dealt into: one more hand, and what you won with what. */
export function noteHand(game: Game, myId: string): void {
  const hand = game.hand;
  const result = hand?.result;
  const seat = hand?.seats.find((s) => s.playerId === myId);
  if (!hand || !result || !seat || seat.cards.length === 0) return;
  const key = `${game.id}/${hand.number}`;
  update((r) => {
    if (r.seen.includes(key)) return null;
    const mine = result.pots.filter((p) => p.winners.includes(myId)).reduce((sum, p) => sum + Math.floor(p.amount / p.winners.length), 0);
    let best = r.best;
    // Your best hand: only one you made to the river and showed down (Imposter's showdowns are votes, not hands).
    if (result.showdown && !seat.folded && hand.variant !== 'imposter' && hand.board.length >= 5) {
      try {
        const v = bestHand(hand.variant ?? 'holdem', seat.cards, hand.board);
        if (!best || v.score > best.score) best = { score: v.score, name: v.detail, cards: v.best, variant: hand.variant ?? 'holdem' };
      } catch {
        // A board this game can't score yet: leave the best hand as it was.
      }
    }
    return { ...r, hands: r.hands + 1, won: r.won + (mine > 0 ? 1 : 0), biggestPot: Math.max(r.biggestPot, mine), best, seen: [...r.seen, key] };
  });
}

/** A game that's over: where you finished. */
export function noteGame(game: Game, myId: string): void {
  if (game.status !== 'ended' || !game.players.some((p) => p.id === myId)) return;
  update((r) => {
    if (r.seen.includes(game.id)) return null;
    // Nobody dealt a hand: nothing to remember.
    if (!r.seen.some((s) => s.startsWith(`${game.id}/`))) return null;
    const order = [...game.players].sort((a, b) => b.stack - a.stack);
    const place = order.findIndex((p) => p.id === myId) + 1;
    return { ...r, games: [...r.games, { at: Date.now(), variant: variantOf(game), place, players: game.players.length }], seen: [...r.seen, game.id] };
  });
}
