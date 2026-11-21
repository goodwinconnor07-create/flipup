// The pure parts of five games (owner's picks, 13 Nov 2026; rules in docs/RULES.md):
// - Elevator: every card already on the board climbs a rank when the next card lands (`climb()`).
// - Chain Reaction: each board card has to share a rank or a suit with the one before it (`links()`, `nextLink()`).
// - Conveyor Belt: a belt of three; one card in and one off each street, then a last stop (`beltToCome()`).
// - Onion: five cards, one peeled off face up after the flop and turn betting and when the river lands
//   (`peelTarget()`, `peelChoice()`).
// - Headband: one of your two cards faces everyone but you (`headbandOf()`); hidden from its owner by redact.ts.
// Double Board PLO's scoring is in variants.ts (`omahaSets()`, `ploBest()`); the flows are in holdem.ts.

import { rankOf, RANKS, suitOf, type Card } from './cards';
import { describeHand } from './evaluate';
import type { Hand, Seat, Street } from './types';

/** Elevator: each card up one rank in its suit, an ace round to a 2. */
export const climbCard = (c: Card): Card => `${RANKS[(RANKS.indexOf(c[0]) + 1) % RANKS.length]}${c[1]}`;
export const climb = (board: Card[]): Card[] => board.map(climbCard);

/** Chain Reaction: a card links to the one before it if they share a rank or a suit. */
export const links = (prev: Card | undefined, card: Card): boolean => !prev || prev[0] === card[0] || suitOf(prev) === suitOf(card);

/**
 * Chain Reaction: the next board card from the deck that links to the last one on the board; the ones that don't are
 * burned face up (`hand.burned`). With the deck nearly gone, the next card is taken anyway.
 */
export function nextLink(hand: Hand): Card | undefined {
  const prev = hand.board[hand.board.length - 1];
  while (hand.deck.length) {
    const card = hand.deck.shift()!;
    if (links(prev, card) || hand.deck.length < 2) return card;
    hand.burned = [...(hand.burned ?? []), card];
  }
  return undefined;
}

/** Conveyor Belt: how many more cards will come onto the belt this hand (turn, river and the last stop). */
export function beltToCome(hand: Pick<Hand, 'street' | 'lastStop'>): number {
  if (hand.street === 'preflop') return 6;
  if (hand.street === 'flop') return 3;
  if (hand.street === 'turn') return 2;
  return hand.lastStop ? 0 : 1;
}

/** Onion: the cards everyone still in should have once this street's peel is done (null: no peel on this street). */
export const peelTarget = (street: Street): number | null => (street === 'flop' ? 4 : street === 'turn' ? 3 : street === 'river' ? 2 : null);

/** Onion: seats that still have a card to peel on this street. */
export function peelers(hand: Hand): Seat[] {
  const target = peelTarget(hand.street);
  return target === null ? [] : hand.seats.filter((s) => !s.folded && s.cards.length > target);
}

/**
 * Onion: the card to peel when the choice is the app's (a bot, or the clock): the one whose loss hurts least, judged
 * by the best hand the rest make with the board, then by keeping higher cards.
 */
export function peelChoice(cards: Card[], board: Card[]): Card {
  let pick = cards[0];
  let best = -Infinity;
  for (const c of cards) {
    const rest = cards.filter((x) => x !== c);
    const made = describeHand([...rest, ...board]).score;
    const height = rest.reduce((sum, x) => sum + rankOf(x), 0) / 1000;
    const value = made + height;
    if (value > best) {
      best = value;
      pick = c;
    }
  }
  return pick;
}

/** Headband: the card on a player's forehead (the second of their two). */
export const headbandOf = (seat: Pick<Seat, 'cards'>): Card | undefined => seat.cards[1];
