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
  redriver: ["Normal Hold'em until the river.", 'A red river means another card, until a black one lands.', 'Every board card counts.'],
  imposter: ['Everyone has the same two cards but one player.', 'Nobody knows who the imposter is, maybe you.', 'Vote after the river. Catch them to split the pot.'],
  crucifix: ['The board is a cross of nine cards.', 'Use one line: the five across or the five down.', 'Plus your two cards. The app picks the line.'],
  circle: ['Six board cards sit round a clock.', 'Use both your cards and three in a row.', 'The app picks the best three for you.'],
  memory: ['Before each hand, 20 cards are shown, then taken out.', "Nobody can have them and they can't come.", 'Remember what\'s gone to work out your odds.'],
  beanstalk: ['You start with two cards.', 'You get one more on the flop, the turn and the river.', 'Best five from your five and the board.'],
  bjholdem: ['On the flop you can Hit for another card.', 'Over 21 and you bust: your hand folds.', 'Half the pot to the best hand, half to closest to 21.'],
  power: ['Everyone gets a secret power each hand.', 'Tap your power card to play it on your turn.', "Once a hand. Unplayed, it's gone."],
  missions: ['You get a secret mission, like "win with a pair".', 'Pull it off and everyone pays you.', 'First to five missions wins the race.'],
  slide: ['When each street lands, slide one card to your left.', 'You get one from your right at the same time.', 'Three slides a hand. Pick the card you need least.'],
  headband: ['One of your cards faces out: everyone sees it but you.', 'Read how they bet to guess what it is.', 'It turns over at the showdown.'],
  belt: ['You get four cards.', 'Three cards ride a belt: one in, one off each street.', 'Best five from your four and the belt at the end.'],
  onion: ['You get five cards.', 'Peel one off, face up, on each street.', 'You play the river with your last two.'],
  chain: ['Each board card must share a rank or suit with the last.', "Cards that don't link burn face up.", 'Boards come out paired and flushy.'],
  elevator: ['Before each new card lands, the board goes up a rank.', 'A 7 becomes an 8, an ace becomes a 2.', 'Your own cards never change.'],
  plo: ['Five cards each and two boards. Pot limit.', 'On each board use exactly two of yours and three of its.', 'Half the pot on each board. Win both to scoop.'],
};

/** The short rundown for a game, or nothing for Texas Hold'em. */
export const basicsOf = (v: Variant): string[] => (v === 'holdem' ? [] : GAME_BASICS[v]);
