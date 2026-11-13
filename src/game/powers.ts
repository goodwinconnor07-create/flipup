// Power Cards: everyone is dealt one secret power at the start of every hand and can play it once, on their turn,
// before their move. This file is the pure part: what each power is, when it can be played, and how a bot picks
// one. Playing a power changes the table in holdem.ts (`playPower()`). Rules are in docs/RULES.md (Power Cards).

import { fullDeck, rankName, rankOf, type Card } from './cards';
import { bestHand, startValue } from './variants';
import type { Game, Hand, PowerId, PowerUse, Seat } from './types';
import { powerInfo } from './powerList';

export { POWERS, POWER_IDS, isPowerId, powerInfo, type PowerInfo, type PowerNeeds } from './powerList';

/** The power this use had effect as (Copycat plays the one it copied). */
export const effectOf = (use: PowerUse): PowerId => use.as ?? use.power;

/** Has this player played their power this hand? */
export const hasPlayed = (hand: Hand, playerId: string): boolean => !!hand.powerUses?.some((u) => u.by === playerId);

/** Copycat: the power it would copy now, the last one someone else played (never a Copycat's own name). */
export function copyTarget(hand: Hand, playerId: string): PowerId | null {
  const uses = (hand.powerUses ?? []).filter((u) => u.by !== playerId);
  return uses.length ? effectOf(uses[uses.length - 1]) : null;
}

/** Players this seat could aim a power at: everyone else still in, with their cards still face down. Silence also needs them able to bet. */
export function powerTargets(hand: Hand, seat: Seat, effect: PowerId): Seat[] {
  return hand.seats.filter(
    (s) =>
      s.playerId !== seat.playerId &&
      !s.folded &&
      (effect !== 'xray' || !s.shown) &&
      (effect !== 'silence' || (!s.allIn && hand.silenced?.[s.playerId] !== hand.street)),
  );
}

/**
 * Whether the power `effect` can be played by this seat right now (the turn and the moment are checked by the caller):
 * its street, and that there's something to aim it at.
 */
export function effectPlayable(hand: Hand, seat: Seat, effect: PowerId): boolean {
  const info = powerInfo(effect);
  if (!info.streets.includes(hand.street)) return false;
  if (info.needs === 'player') return powerTargets(hand, seat, effect).length > 0;
  if (effect === 'peek' || effect === 'swap' || effect === 'reroll' || effect === 'extra') return hand.deck.length > 2;
  return true;
}

/** What the player to act could play right now, or null: their power, and for Copycat the one it copies. */
export function playablePower(_game: Game, hand: Hand, seat: Seat): { power: PowerId; effect: PowerId } | null {
  if (hand.variant !== 'power' || hand.result || hand.runout || hand.toAct !== seat.playerId || seat.folded || seat.allIn) return null;
  const power = hand.powers?.[seat.playerId];
  if (!power || hasPlayed(hand, seat.playerId)) return null;
  const effect = power === 'copycat' ? copyTarget(hand, seat.playerId) : power;
  if (!effect || effect === 'copycat') return null;
  // On a phone a hand being played has an empty deck (it never leaves the server); the server checks the deck.
  if (!effectPlayable(hand.deck.length ? hand : { ...hand, deck: ['2c', '2d', '2h'] }, seat, effect)) return null;
  return { power, effect };
}

/** A short line for the table: "🩻 Sam X-rayed Maya", "🎯 Sam put a bounty on queens". */
export function powerLine(use: PowerUse, name: (id: string) => string): string {
  const who = name(use.by);
  const info = powerInfo(effectOf(use));
  const copied = use.as ? ' (Copycat)' : '';
  switch (effectOf(use)) {
    case 'peek':
      return `${info.emoji} ${who} peeked at the next card${copied}`;
    case 'xray':
      return `${info.emoji} ${who} X-rayed ${use.target ? name(use.target) : 'someone'}${copied}`;
    case 'swap':
      return `${info.emoji} ${who} swapped a card${copied}`;
    case 'reroll':
      return `${info.emoji} ${who} rerolled [${use.out}] into [${use.in}]${copied}`;
    case 'extra':
      return `${info.emoji} ${who} added a card to the board${copied}`;
    case 'passleft':
      return `${info.emoji} ${who}: everyone passes a card left${copied}`;
    case 'shield':
      return `${info.emoji} ${who} put up a shield${copied}`;
    case 'silence':
      return `${info.emoji} ${who} silenced ${use.target ? name(use.target) : 'someone'}${copied}`;
    case 'bounty':
      return `${info.emoji} ${who} put a bounty on ${use.rank ? rankName(use.rank, true) : 'a rank'}${copied}`;
    case 'foldtax':
      return `${info.emoji} ${who}: folding costs a big blind now${copied}`;
    default:
      return `${info.emoji} ${who} played ${info.name}`;
  }
}

// ── Bots ────────────────────────────────────────────────────────────────────

export interface PowerPlan {
  target?: string;
  card?: Card;
  rank?: number;
}

/**
 * Whether a bot plays its power now, and how. Simple rules of thumb, using only what the bot can see (its cards, the
 * board and the public table): information early, Swap and Reroll for cards it isn't using, Shield and Fold Tax when
 * it's putting chips in, Bounty on its own best rank, Silence on whoever has the most chips behind.
 */
export function botPowerPlan(game: Game, hand: Hand, seat: Seat, rng: () => number): PowerPlan | null {
  const can = playablePower(game, hand, seat);
  if (!can) return null;
  const { effect } = can;
  const toCall = Math.max(0, hand.currentBet - seat.bet);
  const used = hand.board.length >= 3 ? new Set(bestHand('power', seat.cards, hand.board).best) : new Set<Card>();
  const strength = hand.board.length >= 3 ? bestHand('power', seat.cards, hand.board).category : seat.cards.length === 2 ? (rankOf(seat.cards[0]) === rankOf(seat.cards[1]) ? 1 : 0) : 0;
  const start = seat.cards.length === 2 ? startValue(seat.cards[0], seat.cards[1]) : 30;
  const stackOf = (id: string) => game.players.find((p) => p.id === id)?.stack ?? 0;
  const chance = (p: number) => rng() < p;
  switch (effect) {
    case 'peek':
      return chance(hand.street === 'preflop' ? 0.45 : 0.85) ? {} : null;
    case 'xray': {
      const targets = powerTargets(hand, seat, effect);
      if (!targets.length || !chance(hand.street === 'preflop' ? 0.5 : 0.85)) return null;
      // The player who bet, else whoever has the most chips.
      const t = targets.find((s) => s.playerId === hand.aggressorId) ?? targets.reduce((a, b) => (stackOf(b.playerId) > stackOf(a.playerId) ? b : a));
      return { target: t.playerId };
    }
    case 'swap': {
      // The card its hand isn't using, else the lower one, when the hand is weak.
      if (strength >= 2 || (hand.street === 'preflop' && start >= 26)) return null;
      if (!chance(0.9)) return null;
      const spare = seat.cards.filter((c) => !used.has(c));
      const pool = spare.length ? spare : seat.cards;
      const card = pool.reduce((a, b) => (rankOf(b) < rankOf(a) ? b : a));
      return { card };
    }
    case 'reroll': {
      // A board card it doesn't use, the highest one (it helps someone else more), when its hand is a pair or less.
      if (strength >= 2 || !chance(0.75)) return null;
      const spare = hand.board.filter((c) => !used.has(c));
      if (!spare.length) return null;
      return { card: spare.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a)) };
    }
    case 'extra':
      // More cards help a hand that's still drawing.
      return strength <= 1 && chance(0.7) ? {} : null;
    case 'passleft':
      // Chaos is good for a bad hand.
      return (hand.street === 'preflop' ? start < 18 : strength === 0) && chance(0.75) ? {} : null;
    case 'shield':
      // When it's paying to stay in after the flop.
      // When it's paying to stay in after the flop, or has a middling hand in a pot it's betting into.
      return hand.street !== 'preflop' && (toCall > 0 ? chance(0.9) : strength >= 1 && chance(0.5)) ? {} : null;
    case 'silence': {
      const targets = powerTargets(hand, seat, effect);
      if (!targets.length || hand.street === 'preflop' || !chance(0.6)) return null;
      // The player who bet (they can't raise again this street), else whoever has the most chips.
      const t = targets.find((x) => x.playerId === hand.aggressorId) ?? targets.reduce((a, b) => (stackOf(b.playerId) > stackOf(a.playerId) ? b : a));
      return { target: t.playerId };
    }
    case 'bounty': {
      // The rank most likely to land: the one with the most copies still unseen (a rank in its own hand also helps it).
      if (!chance(0.9)) return null;
      const seen = new Set<Card>([...seat.cards, ...hand.board]);
      const left = new Map<number, number>();
      for (const c of fullDeck()) if (!seen.has(c)) left.set(rankOf(c), (left.get(rankOf(c)) ?? 0) + 1);
      const mine = new Set(seat.cards.map(rankOf));
      const best = [...left].sort((a, b) => b[1] - a[1] || +mine.has(b[0]) - +mine.has(a[0]) || b[0] - a[0])[0];
      return { rank: best ? best[0] : 14 };
    }
    case 'foldtax':
      // Best when someone's facing a bet: when it's betting, or late in the hand.
      return (hand.street !== 'preflop' || hand.currentBet > game.settings.bigBlind) && chance(strength >= 2 ? 0.8 : 0.6) ? {} : null;
    default:
      return null;
  }
}
