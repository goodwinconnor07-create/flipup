// The first-time rules card (components/rules-card.tsx): each mini game in three short lines, the least you need to
// play your first hand. The full rules stay in `VARIANTS` (src/game/variants.ts), behind "All the rules". Keep each
// line short enough to read in a glance: an online table gives you five seconds.
import type { Variant } from '@/engine';

export const GAME_BASICS: Record<Exclude<Variant, 'holdem'>, string[]> = {
  pineapple: ['You get three cards, not two.', 'After the flop betting, throw one away.', "Then it's Hold'em with the two you kept."],
  deuces: ['Every 2 is wild, in your hand or on the board.', 'It turns into whatever card helps you most.', 'Five of a kind beats everything.'],
  ghost: ['A ghost gets two hidden cards each hand.', 'To win at a showdown you also have to beat the ghost.', 'If it wins, the pot rolls over to the next hand.'],
  pittsburgh: ['Three rivers come instead of one.', 'Your hand uses the flop, the turn and one river.', 'The app picks the river that suits you best.'],
  dice: ["Normal Hold'em until the river.", 'Then a die rolls: 1 to 5 swaps that board card.', 'Roll a 6 and the board stays.'],
  redriver: ["Normal Hold'em until the river.", 'Then ten cards: red stays, black swaps out the newest.', 'Then the river. Every board card counts.'],
  crucifix: ['The board is a cross of nine cards.', 'Use one line of five: across, down, or an L.', 'Plus your two cards. The app picks the line.'],
  circle: ['Twelve board cards sit round a clock.', 'Use your two cards and five in a row.', 'The app picks the best run for you.'],
  memory: ['Before each hand, 20 cards are shown, then taken out.', "Nobody can have them and they can't come.", 'Remember what\'s gone to work out your odds.'],
  beanstalk: ['You start with two cards.', 'You get one more on the flop, the turn and the river.', 'Best five from your five and the board.'],
  bjholdem: ['On any street you can Hit for another card.', 'Over 21 and you bust: your hand folds.', 'Half the pot to the best hand, half to closest to 21.'],
  power: ['Everyone gets a secret power each hand.', 'Play it on your turn, or when a card comes while all in.', "Once a hand. Unplayed, it's gone."],
};

/** The short rundown for a game, or nothing for Texas Hold'em. */
export const basicsOf = (v: Variant): string[] => (v === 'holdem' ? [] : GAME_BASICS[v]);
