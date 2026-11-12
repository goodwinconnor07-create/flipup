// How to Play's steps: for each game, the moments of one real hand (scripts/howto takes a picture of each on the app's
// own table, on an iPhone simulator), each with a short title, a line, and where to look: a step can zoom in on part of the
// picture (your cards, the board, the seats) so what it's talking about is big. Games take as many steps as they
// need, not a fixed five. A step whose picture is missing is left out.
import type { Variant } from '@/engine';

import { SHOTS } from './shots';

/** A moment in a hand that has a picture. */
export type Shot =
  | 'peek'
  | 'cards'
  | 'yourturn'
  | 'flop'
  | 'turn'
  | 'river'
  | 'more'
  | 'discard'
  | 'rolling'
  | 'dice'
  | 'hit'
  | 'discuss'
  | 'vote'
  | 'showdown'
  | 'ghost'
  | 'reveal';

/**
 * Where a step looks: a part of the picture (an iPhone 17 Pro screen), from `top` down `height` and, for the round
 * boards, from `left` across `width` (fractions of the picture; the whole width when they're left out). The screen
 * shows just that part as big as it fits, so a short strip (your cards, the board) comes out much bigger than the
 * whole phone would.
 */
export const ZOOMS = {
  full: { top: 0, height: 1 },
  /** Your cards and your box. */
  mine: { top: 0.792, height: 0.188 },
  /** The buttons, your cards and your box. */
  hand: { top: 0.625, height: 0.355 },
  /** The players along the top and what they did. */
  seats: { top: 0.135, height: 0.215 },
  /** The board on the felt. */
  board: { top: 0.355, height: 0.275 },
  /** A board that runs long: Pittsburgh's rivers, Red River's extra cards. */
  bigBoard: { top: 0.345, height: 0.33 },
  /** The round felt: the cross, the circle, Memory's twenty cards. */
  round: { top: 0.352, height: 0.282, left: 0.17, width: 0.66 },
  /** The players, the board and who won, with your cards. */
  showdown: { top: 0.13, height: 0.85 },
  /** The board and the vote under it. */
  vote: { top: 0.35, height: 0.45 },
} as const;
export type Zoom = keyof typeof ZOOMS;

export interface Step {
  shot: Shot;
  /** The picture to use when `shot` has none. */
  or?: Shot;
  zoom: Zoom;
  title: string;
  text: string;
}

// The words are docs/HOW_TO_PLAY.md's script: show, don't explain; each mini game gets to its twist early.
const step = (shot: Shot, zoom: Zoom, title: string, text: string, or?: Shot): Step => ({ shot, zoom, title, text, ...(or ? { or } : {}) });

const STEPS: Record<Variant, Step[]> = {
  holdem: [
    step('cards', 'mine', 'Two cards, all yours', 'Nobody else sees them. Poker face on.'),
    step('yourturn', 'seats', 'Read the table', 'Everyone checks, bets, calls, raises or folds in turn. Every move tells you something.', 'cards'),
    step('yourturn', 'hand', 'Your move', 'Fold and wait for the next one, call to stay in, or raise and make them sweat.'),
    step('flop', 'board', 'The flop', 'Three cards everyone shares. Now hands start to take shape.'),
    step('turn', 'board', 'The turn', 'Card number four. Pots tend to grow from here.'),
    step('river', 'board', 'The river', 'The last card and the last bet. Bluff, or get paid.'),
    step('showdown', 'showdown', 'Showdown', 'Cards up. Best five from your two and the board takes it all.'),
  ],
  pineapple: [
    step('cards', 'mine', 'Three cards', "One more than Hold'em, so big hands come round more often."),
    step('flop', 'board', 'The flop', 'Bet with all three still in your hand.'),
    step('discard', 'hand', 'Throw one away', 'After the flop betting, everyone tosses a card. Keep the two that hit.'),
    step('turn', 'board', 'Back to two', "It's Hold'em from here, and people usually have something."),
    step('showdown', 'showdown', 'Showdown', 'Best five from your two and the board wins.'),
  ],
  deuces: [
    step('cards', 'mine', 'Every 2 is wild', 'A 2 becomes whatever card helps you most, in your hand or on the board.'),
    step('flop', 'board', 'Look for gold', 'Wild 2s shine gold, so you never miss one.'),
    step('river', 'board', 'Wilds for everyone', 'A 2 on the board is wild for every player.'),
    step('showdown', 'showdown', 'Monster hands', 'Wilds make huge hands. Five of a kind beats even a royal flush.'),
  ],
  ghost: [
    step('cards', 'seats', 'A ghost sits in', 'It gets two cards face down. It never bets. It just waits.'),
    step('flop', 'board', 'Play the table', 'Bet against the players as usual. Bets go up to the size of the pot.'),
    step('river', 'board', 'Good enough?', 'Your hand might beat the table. But can it beat the ghost?'),
    step('showdown', 'showdown', 'Beat the ghost', 'The ghost turns over. Beat it too, or it keeps the pot for next hand.', 'ghost'),
  ],
  pittsburgh: [
    step('cards', 'mine', 'Your two cards', "Same start as Hold'em. The surprise comes at the end."),
    step('flop', 'board', 'The flop', 'Three shared cards, then the turn, just like normal.'),
    step('river', 'bigBoard', 'Three rivers', 'Three river cards land at once. Three chances to hit.'),
    step('showdown', 'showdown', 'Pick your river', 'Your hand uses whichever river suits it best. The app picks it for you.'),
  ],
  dice: [
    step('cards', 'mine', 'Your two cards', "It plays like Hold'em, right up to the river."),
    step('turn', 'board', 'Feeling safe?', "Four cards out and you like your hand. Don't get too comfortable."),
    step('rolling', 'full', 'Roll the die', 'The river lands and a die rolls. Everyone waits.'),
    step('dice', 'full', 'Swap!', 'A 1 to 5 swaps that board card for a new one. A 6 leaves it.'),
    step('showdown', 'showdown', 'New board', 'Only the new board counts. One roll can change the winner.'),
  ],
  redriver: [
    step('cards', 'mine', 'Your two cards', "Plain Hold'em, until the river. Then watch its colour."),
    step('flop', 'board', 'The flop', 'Three shared cards, then the turn.'),
    step('river', 'bigBoard', 'Red keeps coming', 'A red river deals another card, then another, until a black one lands.', 'more'),
    step('showdown', 'showdown', 'Every card counts', 'Best five from your two and the whole board, however long it got.'),
  ],
  crucifix: [
    step('cards', 'mine', 'Your two cards', "Dealt like Hold'em. The board is where it gets strange."),
    step('flop', 'round', 'A cross', 'The flop is five cards: the middle and one on each arm.'),
    step('turn', 'round', 'The turn', 'Two more, on the top and right arms.'),
    step('river', 'round', 'The river', 'The last two finish the cross. Nine cards in all.'),
    step('showdown', 'round', 'Pick a line', 'Your two cards plus one line, across or down. Never mix them.'),
  ],
  circle: [
    step('cards', 'mine', 'Your two cards', 'Both always play here, so start strong.'),
    step('flop', 'round', 'Round the clock', 'The board is a circle. The flop lands at 12 and 6.'),
    step('turn', 'round', 'The turn', "Two more, at 2 and 8 o'clock."),
    step('river', 'round', 'Close the circle', 'The river fills 4 and 10. Six cards round the clock.'),
    step('showdown', 'round', 'Three in a row', 'Your two cards plus three board cards side by side.'),
  ],
  memory: [
    step('peek', 'round', 'Remember these', 'Twenty cards flash up, then leave the deck. You get nine seconds.'),
    step('cards', 'mine', 'Your two cards', "Dealt from what's left. None of those twenty can turn up."),
    step('flop', 'round', 'Use your memory', 'Could they have the ace? Not if you saw it leave.'),
    step('river', 'round', 'The river', 'Last card, last bet. Trust what you remember.'),
    step('showdown', 'round', 'Showdown', 'Best five wins. A good memory makes for better reads.'),
  ],
  beanstalk: [
    step('cards', 'mine', 'Two to start', "Just like Hold'em. Don't get used to it."),
    step('flop', 'hand', 'Your hand grows', 'With the flop, everyone still in gets a card of their own.'),
    step('turn', 'hand', 'And grows', 'Another one with the turn.'),
    step('river', 'full', 'Five each', 'By the river you hold five, with five on the board.'),
    step('showdown', 'showdown', 'Huge hands', 'Best five from all ten. Big hands show up a lot.'),
  ],
  bjholdem: [
    step('cards', 'mine', 'Count to 21', 'Count your cards like blackjack, play them like poker.'),
    step('flop', 'hand', 'Hit or stand', "On the flop, tap Hit for another card. Go over 21 and you're out."),
    step('hit', 'hand', 'It counts twice', 'A card you hit plays in your poker hand too.'),
    step('showdown', 'showdown', 'Two winners', "Half the pot to the best hand, half to whoever's closest to 21."),
  ],
  imposter: [
    step('cards', 'mine', 'Same cards', 'Everyone gets the same two cards, except one player. Nobody knows who. Maybe you.'),
    step('yourturn', 'seats', 'No folding', "Nobody can fold. Watch who bets like they don't belong."),
    step('discuss', 'showdown', 'Point a finger', 'After the river, point at who you think it is. The bots will too.'),
    step('vote', 'vote', 'Vote', "Everyone votes in secret. You can't vote for yourself."),
    step('reveal', 'showdown', 'The reveal', 'Catch the imposter and the rest share the pot. Miss, and they take it all.'),
  ],
};

/** A game's steps that have a picture, each with it. */
export function stepsFor(v: Variant): (Step & { image: number })[] {
  const pictures = SHOTS[v] ?? {};
  return STEPS[v].flatMap((s) => {
    const image = pictures[s.shot] ?? (s.or ? pictures[s.or] : undefined);
    return image ? [{ ...s, image }] : [];
  });
}

/** Every picture a game's steps use, for the recorder that shoots them (native/scripts/howto). */
export function shotsNeeded(v: Variant): Shot[] {
  return [...new Set(STEPS[v].flatMap((s) => (s.or ? [s.shot, s.or] : [s.shot])))];
}
