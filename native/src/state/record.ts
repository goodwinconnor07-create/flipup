// Your poker on this phone (`flipup.record`), for Home: hands played and won, the biggest pot, your best hand and
// the last few games. Counted from the table view this phone sees, once per hand and once per game.
import { bestHand, variantOf, type Card, type Game, type Variant } from '@/engine';

import { cleanStats, tallyGame, tallyHand, type MoreStats } from './record-stats';
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
  /** The most you took from one hand, in big blinds (so a bigger starting stack or a rebuy never changes it). */
  biggestPot: number;
  /** Set once `biggestPot` is in big blinds; older saves held chips and start over. */
  units?: 'bb';
  best: { score: number; name: string; cards: Card[]; variant: Variant } | null;
  games: GameLine[];
  /** Every game you've been dealt a hand of, so Home can stop explaining one you know. */
  played: Variant[];
  /** Hands and games already counted ("game/hand" and "game"), so a redraw never counts one twice. */
  seen: string[];
  /** The bigger stats (style, chips line, all-ins and luck, streaks, starting hands), counted since they came in. */
  more: MoreStats;
  /** The same numbers for Texas Hold'em alone and for the mini games alone (the Stats page's switch), counted since they came in. */
  modes: { holdem: ModeSlice; variants: ModeSlice };
}

/** One mode's share of your record: what Stats shows when it's switched to Hold'em or to the mini games. */
export interface ModeSlice {
  hands: number;
  won: number;
  biggestPot: number;
  best: PokerRecord['best'];
  more: MoreStats;
}

export type StatsMode = 'all' | 'holdem' | 'variants';
const modeOf = (v: Variant): 'holdem' | 'variants' => (v === 'holdem' ? 'holdem' : 'variants');

function cleanSlice(s: Partial<ModeSlice> | null | undefined): ModeSlice {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return { hands: n(s?.hands), won: n(s?.won), biggestPot: n(s?.biggestPot), best: s?.best && Array.isArray(s.best.cards) && typeof s.best.name === 'string' ? s.best : null, more: cleanStats(s?.more) };
}

/** The record as Stats should draw it for a mode: all of it, or only Hold'em's or only the mini games' hands, games and numbers. */
export function recordFor(r: PokerRecord, mode: StatsMode): PokerRecord {
  if (mode === 'all') return r;
  const s = r.modes[mode];
  return { ...r, hands: s.hands, won: s.won, biggestPot: s.biggestPot, best: s.best, more: s.more, games: r.games.filter((g) => modeOf(g.variant) === mode) };
}

function clean(r: Partial<PokerRecord> | null): PokerRecord {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    hands: n(r?.hands),
    won: n(r?.won),
    units: 'bb',
    biggestPot: r?.units === 'bb' ? n(r?.biggestPot) : 0,
    best: r?.best && Array.isArray(r.best.cards) && typeof r.best.name === 'string' ? r.best : null,
    games: Array.isArray(r?.games) ? r.games.filter((g) => g && typeof g.variant === 'string' && typeof g.place === 'number') : [],
    played: Array.isArray(r?.played) ? r.played.filter((v): v is Variant => typeof v === 'string') : [],
    seen: Array.isArray(r?.seen) ? r.seen.filter((s) => typeof s === 'string') : [],
    more: cleanStats(r?.more),
    modes: { holdem: cleanSlice(r?.modes?.holdem), variants: cleanSlice(r?.modes?.variants) },
  };
}

/** Whether you've played this game before: a hand dealt in it, a finished game or your best hand. */
export function hasPlayed(r: PokerRecord, variant: Variant): boolean {
  return r.played.includes(variant) || r.games.some((g) => g.variant === variant) || r.best?.variant === variant;
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
    const mineBB = game.settings.bigBlind > 0 ? Math.round((mine / game.settings.bigBlind) * 10) / 10 : 0;
    // Your best hand: only one you made to the river and showed down.
    const better = (prev: PokerRecord['best']): PokerRecord['best'] => {
      if (!(result.showdown && !seat.folded && hand.board.length >= 5)) return prev;
      try {
        const v = bestHand(hand.variant ?? 'holdem', seat.cards, hand.board);
        return !prev || v.score > prev.score ? { score: v.score, name: v.detail, cards: v.best, variant: hand.variant ?? 'holdem' } : prev;
      } catch {
        // A board this game can't score yet: leave the best hand as it was.
        return prev;
      }
    };
    const best = better(r.best);
    const v: Variant = hand.variant ?? 'holdem';
    const now = new Date();
    const more = tallyHand(r.more, game, myId, now);
    const m = modeOf(v);
    const slice = r.modes[m];
    const modes = { ...r.modes, [m]: { hands: slice.hands + 1, won: slice.won + (mine > 0 ? 1 : 0), biggestPot: Math.max(slice.biggestPot, mineBB), best: better(slice.best), more: tallyHand(slice.more, game, myId, now) } };
    return { ...r, more, modes, played: r.played.includes(v) ? r.played : [...r.played, v], hands: r.hands + 1, won: r.won + (mine > 0 ? 1 : 0), biggestPot: Math.max(r.biggestPot, mineBB), best, seen: [...r.seen, key] };
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
    const m = modeOf(variantOf(game));
    const modes = { ...r.modes, [m]: { ...r.modes[m], more: tallyGame(r.modes[m].more, game, myId, place) } };
    return { ...r, more: tallyGame(r.more, game, myId, place), modes, games: [...r.games, { at: Date.now(), variant: variantOf(game), place, players: game.players.length }], seen: [...r.seen, game.id] };
  });
}

/** A saved hand watched back (once each time its replay opens). */
export function noteWatched(): void {
  update((r) => ({ ...r, more: { ...r.more, watched: r.more.watched + 1 } }));
}
