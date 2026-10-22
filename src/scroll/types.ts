// Scroll: a feed of short poker cards. Each card is a spot with a goal, played against a bot of a known style,
// then graded on the phone. These are the shapes the library, the dealer, the feed and the screens share.

import type { Bucket } from '../game/botPlay';
import type { StyleId } from '../game/botStyles';
import type { Grade, How, Kind } from '../game/judge';

export type Theme = 'open' | 'exploit' | 'defend' | 'odds';

export const THEMES: Record<Theme, { title: string; blurb: string }> = {
  open: { title: 'Opening', blurb: 'Position and opening ranges' },
  exploit: { title: 'Exploiting', blurb: "Playing against a bot's style" },
  defend: { title: 'Defending', blurb: 'Facing raises and bets' },
  odds: { title: 'Odds', blurb: 'Pot odds and short stacks' },
};

/** What passes a card. */
export type Goal =
  /** Finish the hand with more chips than you started it with. */
  | { kind: 'win' }
  /** Win at least this many big blinds. */
  | { kind: 'profit'; bb: number }
  /** Win the pot without a showdown, holding a weak hand. */
  | { kind: 'bluff' }
  /** Make every decision that matters without a Costly one. */
  | { kind: 'right' }
  /** Lose no more than this many big blinds. */
  | { kind: 'save'; bb: number };

/** Words for the cards you're dealt and the board, so a card can ask for "a flush draw on a dry flop". */
export interface Want {
  /** The street of your first decision. */
  street: 'preflop' | 'flop' | 'turn' | 'river';
  /** Starting-hand strength, from 0 (the worst) to 1 (aces). */
  strength?: [number, number];
  bucket?: Bucket[];
  texture?: ('dry' | 'wet' | 'paired' | 'mono')[];
}

type Do = 'fold' | 'check' | 'call' | 'allin';

/**
 * One move played before you get control. Sizes are in big blinds for the street, or as a share of the pot
 * (`pot`, for a bet) or a multiple of the bet being faced (`x`, for a raise). The street names mark where a new card comes.
 */
export type Step =
  | { by: 'you' | 'bot'; do: Do }
  | { by: 'you' | 'bot'; do: 'raise' | 'bet'; to?: number; pot?: number; x?: number }
  | 'flop'
  | 'turn'
  | 'river';

export interface Template {
  id: string;
  theme: Theme;
  /** 1 (first cards) to 4. */
  level: 1 | 2 | 3 | 4;
  title: string;
  goal: Goal;
  /** Both stacks, in big blinds. */
  stack: number;
  /** Where you sit, clockwise from the button (see CardScene). */
  at: number;
  /** Bots at the table (one heads up). */
  bots: number;
  /** The bot, or bots, are picked from these styles. */
  style: StyleId[];
  want: Want;
  script: Step[];
  /** One or two lines about the spot, on the intro popup. */
  hints: string[];
  /** What the coach says to remember when a card goes wrong. */
  lesson: string;
  /** Ends at your first decision, with no hand to play out. */
  quick?: boolean;
}

/** A card in the feed: which template, and the seed that makes this deal. */
export interface CardRef {
  id: string;
  seed: number;
}

/** One of your graded moves, kept so the result and the Scroll hands list can say what happened. */
export interface Decision {
  street: 'preflop' | 'flop' | 'turn' | 'river';
  grade: Grade;
  mine: Kind;
  best: Kind;
  bestSize?: number;
  loss: number;
  easy: boolean;
  how: How;
  bucket: Bucket;
  eq?: number;
  need?: number;
  folds?: number;
  freq?: number;
  size?: 'big' | 'small';
  /** Your cards and the board when you decided, as two strings of cards: "AsKd", "7h2c9d". */
  hand: string;
  board: string;
  /** The raise-to you made, in big blinds (when it was a bet or raise). */
  to?: number;
}

export interface Outcome {
  passed: boolean;
  stars: 1 | 2 | 3;
  /** Chips won or lost, in big blinds (0 for a quick card). */
  net: number;
  showdown: boolean;
  /** 0 to 1: how your graded moves went. */
  score: number;
  /** Why it missed, in a word, for the coach. */
  miss?: 'goal' | 'play';
}
