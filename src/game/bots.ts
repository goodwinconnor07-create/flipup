// Computer players. They play a simple, readable game: strong hands bet, weak hands fold,
// and now and then they bluff. They only see what a real player in their seat would see.

import { rankOf, suitOf, type Card } from './cards';
import { strengthVsRandom } from './equity';
import { options, pot } from './selectors';
import type { Game, Hand, Move, Seat } from './types';

/** Names and pictures for bots, picked in order of what's free. */
export const BOTS: { name: string; emoji: string }[] = [
  { name: 'Luna', emoji: '🐸' },
  { name: 'Eli', emoji: '🤩' },
  { name: 'Remi', emoji: '🧌' },
  { name: 'Emma', emoji: '🦊' },
  { name: 'Anna', emoji: '🐼' },
  { name: 'Max', emoji: '🤠' },
  { name: 'Zoe', emoji: '🐙' },
  { name: 'Theo', emoji: '🦁' },
  { name: 'Ivy', emoji: '🦄' },
  { name: 'Kai', emoji: '🐯' },
];

/** Chen formula: a quick score for two hole cards (about −1 for 7-2 offsuit up to 20 for aces). */
export function chen(cards: Card[]): number {
  const [a, b] = cards.map(rankOf).sort((x, y) => y - x);
  const value = (r: number) => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
  let score = value(a);
  if (a === b) return Math.max(5, Math.ceil(score * 2));
  if (suitOf(cards[0]) === suitOf(cards[1])) score += 2;
  const gap = a - b - 1;
  score -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  if (gap <= 1 && a < 12) score += 1;
  return Math.ceil(score);
}

export interface BotMove {
  move: Move;
  to?: number;
}

/** What the bot whose turn it is does. */
export function botMove(game: Game, hand: Hand, seat: Seat, rng: () => number): BotMove {
  const o = options(game, hand, seat);
  const bb = game.settings.bigBlind;
  const potNow = pot(hand);
  const roll = rng();

  const raiseTo = (amount: number): BotMove => {
    if (!o.canRaise) return o.canCheck ? { move: 'check' } : { move: 'call' };
    let to = Math.round(Math.max(o.minTo, Math.min(o.maxTo, amount)) / bb) * bb;
    to = Math.max(o.minTo, Math.min(o.maxTo, to));
    // Close to everything anyway: just go all in.
    if (to >= o.maxTo * 0.8) return { move: 'allin' };
    return { move: hand.currentBet > 0 ? 'raise' : 'bet', to };
  };
  const passive = (): BotMove => (o.canCheck ? { move: 'check' } : { move: 'fold' });

  if (hand.street === 'preflop') {
    const score = chen(seat.cards);
    const facingRaise = hand.currentBet > bb;
    const cheap = o.toCall <= bb;
    if (score >= 10) {
      if (facingRaise && hand.currentBet >= o.maxTo * 0.35) return { move: 'allin' };
      return raiseTo(facingRaise ? hand.currentBet * 3 : bb * 3 + (roll < 0.5 ? bb : 0));
    }
    if (score >= 8) {
      if (!facingRaise && roll < 0.65) return raiseTo(bb * 3);
      if (o.toCall <= bb * 4 || o.toCall <= o.maxTo * 0.1) return o.canCheck ? { move: 'check' } : { move: 'call' };
      return passive();
    }
    if (score >= 6) {
      if (!facingRaise && roll < 0.2) return raiseTo(bb * 3);
      if (cheap || (o.toCall <= bb * 3 && roll < 0.5)) return o.canCheck ? { move: 'check' } : { move: 'call' };
      return passive();
    }
    if (o.canCheck) return { move: 'check' };
    // The odd steal or cheap look at a flop keeps the bots from being too easy to read.
    if (!facingRaise && roll < 0.04) return raiseTo(bb * 3);
    if (o.toCall <= bb / 2 + 1 && roll < 0.5) return { move: 'call' };
    return { move: 'fold' };
  }

  const opponents = hand.seats.filter((s) => s !== seat && !s.folded).length;
  const strength = strengthVsRandom(seat.cards, hand.board, Math.max(1, opponents), rng);

  if (o.canCheck) {
    if (strength > 0.75) return raiseTo(potNow * (0.6 + roll * 0.4));
    if (strength > 0.55 && roll < 0.6) return raiseTo(potNow * 0.5);
    if (hand.street !== 'flop' && roll < 0.1) return raiseTo(potNow * 0.5);
    return { move: 'check' };
  }

  const odds = o.toCall / (potNow + o.toCall);
  if (strength > 0.82 && roll < 0.7) return raiseTo(hand.currentBet * 2.5 + potNow * 0.5);
  if (strength > odds + 0.08) return { move: 'call' };
  if (strength > odds - 0.04 && roll < 0.35) return { move: 'call' };
  return { move: 'fold' };
}
