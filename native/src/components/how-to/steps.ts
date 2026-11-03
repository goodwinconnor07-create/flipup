// How to Play's steps: for each game, the moments of one real hand (scripts/shootHowTo.mjs takes a picture of each
// on the app's own table) with a short title and a line on what's happening. A step whose picture is missing is
// left out.
import type { Variant } from '@/engine';

import { SHOTS } from './shots';

/** A moment in a hand that has a picture. */
export type Shot = 'peek' | 'deal' | 'flop' | 'turn' | 'river' | 'more' | 'discard' | 'dice' | 'vote' | 'showdown' | 'ghost' | 'reveal';

export interface Step {
  shot: Shot;
  /** The picture to use when `shot` has none. */
  or?: Shot;
  title: string;
  text: string;
}

const deal: Step = { shot: 'deal', title: 'Your two cards', text: 'Everyone gets two cards only they can see. Check, bet, call, raise or fold when it’s your turn.' };
const flop: Step = { shot: 'flop', title: 'The flop', text: 'Three cards everyone shares. Another round of betting.' };
const turn: Step = { shot: 'turn', title: 'The turn', text: 'A fourth shared card, and more betting.' };
const river: Step = { shot: 'river', title: 'The river', text: 'The fifth and last shared card. The last round of betting.' };
const showdown: Step = { shot: 'showdown', title: 'Showdown', text: 'Your best five from your two cards and the board. The best hand takes the pot.' };

const STEPS: Record<Variant, Step[]> = {
  holdem: [deal, flop, turn, river, showdown],
  pineapple: [
    { ...deal, title: 'Three cards', text: 'You get three cards instead of two. Bet as usual.' },
    flop,
    { shot: 'discard', title: 'Throw one away', text: 'After the flop betting, everyone drops one card. Keep the two that work best with the board.' },
    { ...turn, text: 'From here it’s Hold’em with the two you kept.' },
    river,
    showdown,
  ],
  deuces: [
    { ...deal, title: 'Deuces are wild', text: 'Every 2 becomes whatever card helps you most.' },
    flop,
    turn,
    river,
    { ...showdown, text: 'Wild cards count as anything, so five of a kind can happen. It beats everything.' },
  ],
  ghost: [
    { ...deal, title: 'A ghost sits in', text: 'The ghost gets two cards too. Nobody sees them until the end.' },
    flop,
    turn,
    river,
    { shot: 'ghost', title: 'Beat the ghost', text: 'At the showdown you have to beat the ghost as well. If it wins, the pot stays for the next hand.' },
  ],
  pittsburgh: [deal, flop, turn, { ...river, title: 'Three rivers', text: 'Three river cards land instead of one.' }, { ...showdown, text: 'Your hand uses whichever river suits it best.' }],
  dice: [
    deal,
    flop,
    turn,
    { shot: 'dice', title: 'Roll the die', text: 'With the river, a die rolls. A 1 to 5 swaps that board card for a new one.' },
    { ...showdown, text: 'The new board is the one that counts.' },
  ],
  redriver: [
    deal,
    flop,
    turn,
    { ...river, shot: 'more', or: 'river', title: 'Red keeps coming', text: 'If the river is red, another card comes, and another, until a black one lands.' },
    { ...showdown, text: 'Every board card counts. Best five from all of them wins.' },
  ],
  crucifix: [
    deal,
    { ...flop, title: 'A cross', text: 'The board is a cross. The flop is the middle and one card on each arm.' },
    { ...turn, text: 'The turn adds to the top arm and the right arm.' },
    { ...river, text: 'The river finishes the cross.' },
    { ...showdown, text: 'Your hand is your two cards with one line of the cross: across or down.' },
  ],
  circle: [
    deal,
    { ...flop, title: 'A clock', text: 'The board is a circle. The flop lands at 12 and 6 o’clock.' },
    { ...turn, text: 'The turn adds 2 and 8 o’clock.' },
    { ...river, text: 'The river closes the circle.' },
    { ...showdown, text: 'Use both your cards plus three board cards next to each other.' },
  ],
  memory: [
    { shot: 'peek', title: 'Remember these', text: 'Twenty cards are shown, then taken out of the deck. Nobody can be dealt them.' },
    { ...deal, text: 'The hand is dealt from the cards that are left.' },
    flop,
    turn,
    river,
    { ...showdown, text: 'Nobody can hold a card that was taken out. Use what you remember to read hands.' },
  ],
  beanstalk: [
    deal,
    { ...flop, text: 'The flop, and everyone still in gets another card of their own.' },
    { ...turn, text: 'One more card each, with the turn.' },
    { ...river, text: 'By the river you hold five cards.' },
    { ...showdown, text: 'Best five from all ten: yours and the board.' },
  ],
  imposter: [
    { ...deal, title: 'One imposter', text: 'Everyone gets the same two cards, except one secret imposter.' },
    { ...flop, title: 'No folding', text: 'Nobody can fold. Bet and call to read who’s different.' },
    turn,
    { shot: 'vote', title: 'Vote', text: 'After the river, everyone votes for who they think the imposter is.' },
    { shot: 'reveal', title: 'The reveal', text: 'Catch the imposter and everyone else shares the pot. Miss, and the imposter takes it.' },
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
