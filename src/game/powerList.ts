// Power Cards: the powers themselves, as data (names, rules, when each can be played). Kept on its own so the game
// list in variants.ts can show them in the rules without importing the engine. See powers.ts and docs/RULES.md.

import type { PowerId, Street } from './types';

/** What a power needs from the player when it's played. */
export type PowerNeeds = 'player' | 'ownCard' | 'boardCard' | 'rank' | null;

export interface PowerInfo {
  id: PowerId;
  name: string;
  emoji: string;
  /** One line for the card. */
  short: string;
  /** The full rule, a sentence or two. */
  rule: string;
  needs: PowerNeeds;
  /** Streets it can be played on. */
  streets: Street[];
}

const BEFORE_RIVER: Street[] = ['preflop', 'flop', 'turn'];
const ANY: Street[] = ['preflop', 'flop', 'turn', 'river'];
const BOARD_OUT: Street[] = ['flop', 'turn'];

export const POWERS: PowerInfo[] = [
  {
    id: 'peek',
    name: 'Peek',
    emoji: '👁️',
    short: 'See the next board card before anyone else.',
    rule: 'You see the next card that will come on the board. Only you see it. Before the river.',
    needs: null,
    streets: BEFORE_RIVER,
  },
  {
    id: 'xray',
    name: 'X-ray',
    emoji: '🩻',
    short: "See one of an opponent's cards.",
    rule: "Pick an opponent still in the hand: you see one of their two cards (the app picks which). Only you see it.",
    needs: 'player',
    streets: ANY,
  },
  {
    id: 'swap',
    name: 'Swap',
    emoji: '🔁',
    short: 'Throw one of your cards away and get a new one.',
    rule: 'Pick one of your cards: it goes and a new card from the deck takes its place, face down. Before the river.',
    needs: 'ownCard',
    streets: BEFORE_RIVER,
  },
  {
    id: 'reroll',
    name: 'Reroll',
    emoji: '🎲',
    short: 'Swap one board card for a new one.',
    rule: 'Pick a card on the board: it goes and a new card from the deck takes its place, for everyone. On the flop or the turn.',
    needs: 'boardCard',
    streets: BOARD_OUT,
  },
  {
    id: 'extra',
    name: 'Extra Card',
    emoji: '➕',
    short: 'Add one more card to the board for everyone.',
    rule: 'One more card goes on the board straight away. Everyone can use it: make your best five from your two and the whole board. On the flop or the turn.',
    needs: null,
    streets: BOARD_OUT,
  },
  {
    id: 'passleft',
    name: 'Pass Left',
    emoji: '⬅️',
    short: 'Everyone still in passes a random card to their left.',
    rule: 'Everyone still in the hand, you too, passes one of their cards (picked at random) to the next player still in on their left. Before the river.',
    needs: null,
    streets: BEFORE_RIVER,
  },
  {
    id: 'shield',
    name: 'Shield',
    emoji: '🛡️',
    short: 'Lose at the showdown and get half your bets back.',
    rule: "If you get to the showdown and win nothing, half of what you put in after playing it comes back to you out of the pot. Folding doesn't count.",
    needs: null,
    streets: ANY,
  },
  {
    id: 'silence',
    name: 'Silence',
    emoji: '🤐',
    short: "An opponent can't bet or raise on this street.",
    rule: 'Pick an opponent still in the hand: for the rest of this street they can only check, call or fold.',
    needs: 'player',
    streets: ANY,
  },
  {
    id: 'bounty',
    name: 'Bounty',
    emoji: '🎯',
    short: 'Call a rank. If it comes on the board, everyone pays you.',
    rule: "Call a rank (say queens). If a card of that rank lands on the board after you call it, is still there at the end, and you haven't folded, every other player dealt in pays you a big blind (or what they have left). Before the river.",
    needs: 'rank',
    streets: BEFORE_RIVER,
  },
  {
    id: 'foldtax',
    name: 'Fold Tax',
    emoji: '💸',
    short: 'Anyone who folds from now on pays a big blind into the pot.',
    rule: 'For the rest of this hand, every other player who folds puts a big blind (or what they have left) into the pot as they fold.',
    needs: null,
    streets: ANY,
  },
  {
    id: 'copycat',
    name: 'Copycat',
    emoji: '🐱',
    short: 'Copy the last power someone else played this hand.',
    rule: 'Play the last power another player played this hand as if it were yours, with your own choices. It has to be one that can be played right now.',
    needs: null,
    streets: ANY,
  },
];

export const POWER_IDS = POWERS.map((p) => p.id);
export const isPowerId = (v: unknown): v is PowerId => POWER_IDS.includes(v as PowerId);
export const powerInfo = (id: PowerId): PowerInfo => POWERS.find((p) => p.id === id)!;

