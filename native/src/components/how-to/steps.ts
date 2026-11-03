// How to Play's captions: what each moment of a recorded hand shows, game by game. The moments (when the cards
// were dealt, each street, the throw-away, the die, the vote, the showdown) come from the recording itself, in
// clips.json, written by scripts/recordHowTo.mjs; the words are here.
import type { Variant } from '@/engine';

import CLIPS from './clips.json';

export type Moment = 'peek' | 'deal' | 'bet' | 'street' | 'discard' | 'dice' | 'vote' | 'grow' | 'showdown' | 'ghost' | 'reveal' | 'fold';

export interface ClipEvent {
  at: number;
  kind: Moment;
  /** For a street: which one (1 is the flop). */
  n?: number;
  /** For a street: cards on the board after it. */
  cards?: number;
}

export interface Step {
  at: number;
  text: string;
}

type Words = Partial<Record<Moment | 'street1' | 'street2' | 'street3' | 'streetMore', string>>;

/** Texas Hold'em's words; every other game starts from these and changes what it does differently. */
const HOLDEM: Words = {
  deal: 'Everyone gets two cards only they can see.',
  bet: 'Round the table: check, bet, call, raise or fold.',
  street1: 'The flop: three cards everyone shares.',
  street2: 'The turn: a fourth shared card, and more betting.',
  street3: 'The river: the fifth and last card.',
  showdown: 'Best five cards from your two and the board win the pot.',
  fold: 'Everyone else folded, so the last one in takes the pot.',
};

const WORDS: Record<Variant, Words> = {
  holdem: HOLDEM,
  pineapple: {
    ...HOLDEM,
    deal: 'You get three cards, not two.',
    discard: 'After the flop betting, everyone throws one card away.',
    street2: "The turn. From here it's Hold'em with the two you kept.",
  },
  deuces: {
    ...HOLDEM,
    deal: 'Every 2 is wild. It becomes whatever card helps you most.',
    showdown: 'Wild cards count as anything, so five of a kind can happen.',
  },
  ghost: {
    ...HOLDEM,
    deal: 'A ghost is dealt two cards too. Nobody sees them yet.',
    ghost: 'At the showdown you have to beat the ghost as well. If it wins, the pot stays for the next hand.',
    showdown: 'At the showdown you have to beat the ghost as well. If it wins, the pot stays for the next hand.',
  },
  pittsburgh: {
    ...HOLDEM,
    street3: 'Three rivers instead of one.',
    showdown: 'Your hand uses whichever river suits it best.',
  },
  dice: {
    ...HOLDEM,
    dice: 'With the river, a die rolls. A 1 to 5 swaps that board card for a new one.',
    showdown: 'The new board is the one that counts.',
  },
  redriver: {
    ...HOLDEM,
    street3: 'The river. If it lands red, another card comes.',
    streetMore: 'The river came red, so the cards kept coming until a black one.',
    showdown: 'Every board card counts. Best five from all of them wins.',
  },
  crucifix: {
    ...HOLDEM,
    street1: 'The board is a cross. The flop is the middle and one card on each arm.',
    street2: 'The turn adds to the top arm and the right arm.',
    street3: 'The river finishes the cross.',
    showdown: 'Your hand is your two cards with one line: across or down.',
  },
  circle: {
    ...HOLDEM,
    street1: 'The board is a clock. The flop lands at 12 and 6.',
    street2: 'The turn adds 2 and 8 o’clock.',
    street3: 'The river closes the circle.',
    showdown: 'Use both your cards plus three board cards next to each other.',
  },
  memory: {
    ...HOLDEM,
    peek: 'Twenty cards are shown, then taken out of the deck. Remember them.',
    deal: 'The hand is dealt from the cards that are left.',
    showdown: 'Nobody can hold a card that was taken out. Use that to read hands.',
  },
  beanstalk: {
    ...HOLDEM,
    street1: 'The flop, and everyone still in gets another card of their own.',
    street2: 'The turn: one more card each.',
    street3: 'The river: by now you hold five.',
    showdown: 'Best five from all ten: yours and the board.',
  },
  imposter: {
    ...HOLDEM,
    deal: 'Everyone gets the same two cards, except one secret imposter.',
    bet: "Nobody can fold. Bet and call to read who's different.",
    vote: 'After the river, everyone votes for the imposter.',
    reveal: "Catch the imposter and the innocents share the pot. Miss, and it's theirs.",
    showdown: "Catch the imposter and the innocents share the pot. Miss, and it's theirs.",
  },
};

function words(v: Variant, e: ClipEvent): string | null {
  const w = WORDS[v];
  if (e.kind === 'street') {
    // Red River: a red river brings its extra cards in the same moment, so the river's words say so.
    const more = e.n === 3 && (e.cards ?? 0) > 5 && w.streetMore;
    return (more || (e.n && e.n <= 3 ? w[`street${e.n}` as 'street1'] : w.streetMore)) ?? null;
  }
  return w[e.kind] ?? null;
}

export interface Clip {
  seconds: number;
  steps: Step[];
}

/** A game's recording as captions: each moment's words from when it happens, with a line about betting after the deal. */
export function clipFor(v: Variant): Clip | null {
  const raw = (CLIPS as Record<string, { seconds: number; events: ClipEvent[] } | undefined>)[v];
  if (!raw) return null;
  const events = [...raw.events];
  // Betting between the deal and the flop: shown once there's room for it.
  const deal = events.find((e) => e.kind === 'deal');
  const next = deal && events.find((e) => e.at > deal.at);
  if (deal && next && next.at - deal.at > 4.5) events.push({ at: deal.at + 2.2, kind: 'bet' });
  const steps: Step[] = [];
  for (const e of events.sort((a, b) => a.at - b.at)) {
    const text = words(v, e);
    // Two moments with the same words (a ghost showdown) read as one step.
    if (!text || steps.at(-1)?.text === text) continue;
    steps.push({ at: Math.max(0, e.at - 0.3), text });
  }
  if (steps.length) steps[0].at = 0;
  return { seconds: raw.seconds, steps };
}
