// How to Play's steps: for each game, the moments of one real hand (scripts/shootHowTo.mjs takes a picture of each
// on the app's own table), each with a short title, a line, and where to look: a step can zoom in on part of the
// picture (your cards, the board, the seats) so what it's talking about is big. Games take as many steps as they
// need, not a fixed five. A step whose picture is missing is left out.
import type { Variant } from '@/engine';

import { SHOTS } from './shots';

/** A moment in a hand that has a picture. */
export type Shot = 'peek' | 'deal' | 'flop' | 'turn' | 'river' | 'more' | 'discard' | 'dice' | 'vote' | 'showdown' | 'ghost' | 'reveal';

/**
 * Where a step looks: a full-width strip of the 390 × 844 picture, from `top` down `height` (fractions of its
 * height). The screen shows just that strip as big as it fits, so a short strip (your cards, the board) comes out
 * much bigger than the whole phone would, and nothing is cut off at the sides.
 */
export const ZOOMS = {
  full: { top: 0, height: 1 },
  /** The buttons, your cards and your box. */
  hand: { top: 0.58, height: 0.42 },
  /** The players along the top and what they did. */
  seats: { top: 0.0, height: 0.3 },
  /** The board on the felt. */
  board: { top: 0.24, height: 0.34 },
  /** A big board: the cross, the circle, Red River's extra cards, the cards to remember. */
  bigBoard: { top: 0.15, height: 0.52 },
  /** The board and who won, with your cards. */
  showdown: { top: 0.22, height: 0.78 },
  /** The board and the vote under it. */
  vote: { top: 0.24, height: 0.5 },
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

const cards: Step = { shot: 'deal', zoom: 'hand', title: 'Your two cards', text: 'Everyone gets two cards only they can see. These are yours.' };
const turnToAct: Step = { shot: 'deal', zoom: 'seats', title: 'Take turns', text: 'Round the table, each player checks, bets, calls, raises or folds. Their move shows over their face.' };
const yourMove: Step = { shot: 'deal', zoom: 'hand', title: 'Your move', text: 'On your turn: Fold to drop out, Call to match the bet, Raise to bet more.' };
const flop: Step = { shot: 'flop', zoom: 'board', title: 'The flop', text: 'Three cards everyone shares. Another round of betting.' };
const turn: Step = { shot: 'turn', zoom: 'board', title: 'The turn', text: 'A fourth shared card, and more betting.' };
const river: Step = { shot: 'river', zoom: 'board', title: 'The river', text: 'The fifth and last shared card, and the last round of betting.' };
const showdown: Step = { shot: 'showdown', zoom: 'showdown', title: 'Showdown', text: 'Best five from your two cards and the board. The best hand takes the pot.' };

const STEPS: Record<Variant, Step[]> = {
  holdem: [cards, turnToAct, yourMove, flop, turn, river, showdown],
  pineapple: [
    { ...cards, title: 'Three cards', text: 'You get three cards instead of two. Bet as usual.' },
    flop,
    { shot: 'discard', zoom: 'hand', title: 'Throw one away', text: 'After the flop betting, everyone drops one card. Keep the two that work best with the board.' },
    { ...turn, text: 'From here it’s Hold’em with the two you kept.' },
    showdown,
  ],
  deuces: [
    { ...cards, title: 'Deuces are wild', text: 'Every 2 becomes whatever card helps you most.' },
    flop,
    river,
    { ...showdown, text: 'Wild cards count as anything, so five of a kind can happen. It beats everything.' },
  ],
  ghost: [
    { ...cards, title: 'A ghost sits in', text: 'The ghost gets two cards too. Nobody sees them until the end.' },
    flop,
    river,
    { shot: 'ghost', zoom: 'showdown', title: 'Beat the ghost', text: 'At the showdown you have to beat the ghost as well. If it wins, the pot stays for the next hand.' },
  ],
  pittsburgh: [cards, flop, { ...river, title: 'Three rivers', text: 'Three river cards land instead of one.' }, { ...showdown, text: 'Your hand uses whichever river suits it best.' }],
  dice: [
    cards,
    flop,
    turn,
    { shot: 'dice', zoom: 'board', title: 'Roll the die', text: 'With the river, a die rolls. A 1 to 5 swaps that board card for a new one.' },
    { ...showdown, text: 'The new board is the one that counts.' },
  ],
  redriver: [
    cards,
    flop,
    { shot: 'more', or: 'river', zoom: 'bigBoard', title: 'Red keeps coming', text: 'If the river is red, another card comes, and another, until a black one lands.' },
    { ...showdown, text: 'Every board card counts. Best five from all of them wins.' },
  ],
  crucifix: [
    cards,
    { ...flop, zoom: 'bigBoard', title: 'A cross', text: 'The board is a cross. The flop is the middle and one card on each arm.' },
    { ...turn, zoom: 'bigBoard', text: 'The turn adds to the top arm and the right arm.' },
    { ...river, zoom: 'bigBoard', text: 'The river finishes the cross.' },
    { ...showdown, text: 'Your hand is your two cards with one line of the cross: across or down.' },
  ],
  circle: [
    cards,
    { ...flop, zoom: 'bigBoard', title: 'A clock', text: 'The board is a circle. The flop lands at 12 and 6 o’clock.' },
    { ...turn, zoom: 'bigBoard', text: 'The turn adds 2 and 8 o’clock.' },
    { ...river, zoom: 'bigBoard', text: 'The river closes the circle.' },
    { ...showdown, text: 'Use both your cards plus three board cards next to each other.' },
  ],
  memory: [
    { shot: 'peek', zoom: 'bigBoard', title: 'Remember these', text: 'Twenty cards are shown, then taken out of the deck. Nobody can be dealt them.' },
    { ...cards, text: 'The hand is dealt from the cards that are left.' },
    flop,
    river,
    { ...showdown, text: 'Nobody can hold a card that was taken out. Use what you remember to read hands.' },
  ],
  beanstalk: [
    cards,
    { ...flop, zoom: 'hand', title: 'Your hand grows', text: 'With the flop, everyone still in gets another card of their own.' },
    { ...turn, zoom: 'hand', text: 'One more card each, with the turn.' },
    { ...river, zoom: 'full', text: 'By the river you hold five cards.' },
    { ...showdown, text: 'Best five from all ten: yours and the board.' },
  ],
  imposter: [
    { ...cards, title: 'One imposter', text: 'Everyone gets the same two cards, except one secret imposter.' },
    { ...flop, zoom: 'seats', title: 'No folding', text: 'Nobody can fold. Watch how everyone bets to work out who’s different.' },
    { shot: 'vote', zoom: 'vote', title: 'Vote', text: 'After the river, everyone votes for who they think the imposter is.' },
    { shot: 'reveal', zoom: 'showdown', title: 'The reveal', text: 'Catch the imposter and everyone else shares the pot. Miss, and the imposter takes it.' },
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
