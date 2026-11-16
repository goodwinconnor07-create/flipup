// Slide Switch (owner, 12 Nov 2026): when the flop, the turn and the river land, everyone still in slides one of
// their two cards face down to the next player still in on their left, all at once, and then the street's betting
// starts. The flow (asking, the clock, the swap) is in holdem.ts (`askForSlides()`, `slideCard()`, `endSlides()`);
// this file is the pure part: who slides to whom, how the cards move and which card a bot (or the clock) slides.
// Rules in docs/RULES.md (Slide Switch).

import { rankLabel, rankOf, suitOf, SUIT_SYMBOL, type Card } from './cards';
import { describeHand } from './evaluate';
import type { Hand, Seat } from './types';

/**
 * Seats that slide: everyone still in the hand, in seat order (clockwise, so the next one is on your left). Not by
 * cards: a phone doesn't see other players' cards, and it has to work out the same order.
 */
export const sliders = (hand: Hand): Seat[] => hand.seats.filter((s) => !s.folded);

/** A card in two characters for a short line: "J♦". */
export const shortCard = (c: Card): string => `${rankLabel(c)}${SUIT_SYMBOL[suitOf(c)]}`;

/** Who each player slides to: the next player still in on their left (heads-up, each other). */
export function slideTargets(hand: Hand): Record<string, string> {
  const ring = sliders(hand);
  return Object.fromEntries(ring.map((s, i) => [s.playerId, ring[(i + 1) % ring.length].playerId]));
}

/**
 * Everyone's cards after the slides, all at once: the card you slide leaves your hand and the card from the player on
 * your right takes its place (same slot, so it lands where yours was). `picks` must hold a card for every slider.
 */
export function afterSlides(hand: Hand, picks: Record<string, Card>): Record<string, Card[]> {
  const ring = sliders(hand);
  const out: Record<string, Card[]> = {};
  ring.forEach((s, i) => {
    const from = ring[(i - 1 + ring.length) % ring.length];
    const gave = picks[s.playerId];
    const got = picks[from.playerId];
    out[s.playerId] = s.cards.map((c) => (c === gave ? got : c));
  });
  return out;
}

/** How much one card is worth to you with this board: pairs and sets first, then suits and straights, then height. */
function worth(card: Card, board: Card[]): number {
  if (board.length >= 4) return describeHand([card, ...board]).score;
  const r = rankOf(card);
  const matches = board.filter((b) => rankOf(b) === r).length;
  const suited = board.filter((b) => suitOf(b) === suitOf(card)).length;
  const near = board.filter((b) => b !== card && Math.abs(rankOf(b) - r) <= 4 && rankOf(b) !== r).length;
  return matches * 1000 + (suited >= 2 ? 60 * (suited - 1) : 0) + near * 6 + r;
}

/**
 * The card to slide: the one that helps you least with the board, so you keep the better one. On the turn and the
 * river it weighs the best hand the card you'd keep makes with the board.
 */
export function slideChoice(cards: Card[], board: Card[]): Card {
  if (cards.length < 2) return cards[0];
  const [a, b] = cards;
  // Keep the card worth more; slide the other.
  return worth(a, board) >= worth(b, board) ? b : a;
}
