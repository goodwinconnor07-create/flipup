import { bestHand, myPlayer, seatFor, variantOf, visibleBoard, type Card, type Game } from '@/engine';

/** Your hand at the table right now, for the hand rankings sheet and the table menu's row. */
export type MyHand = {
  /** Short name ("Two pair"). */
  name: string;
  /** Longer name ("Two pair, kings and sevens"). */
  detail: string;
  /** Its row in `RANKINGS` (0 is a royal flush), or null for five of a kind, which isn't on the chart. */
  row: number | null;
  /** The five cards that make it. */
  best: Card[];
};

/**
 * Your best hand from your cards and the board you can see, or null when there's nothing to name: no hand on, you
 * aren't in it or folded, or before the flop with no pair (two cards alone aren't a hand worth a chart row).
 */
export function myHandNow(game: Game | null | undefined, deviceId: string, now: number): MyHand | null {
  const hand = game?.hand;
  if (!game || !hand) return null;
  const me = myPlayer(game, deviceId);
  const seat = seatFor(hand, me?.id);
  if (!seat || seat.folded || !seat.cards.length) return null;
  const board = visibleBoard(hand, now).filter((c): c is Card => !!c);
  const value = bestHand(variantOf(game), seat.cards, board);
  if (board.length < 3 && value.category === 0) return null;
  return {
    name: value.name,
    detail: value.detail,
    row: value.category <= 9 ? 9 - value.category : null,
    best: value.best,
  };
}
