// Fun versions of Hold'em the host can pick for a table. The betting is the same no-limit Hold'em everywhere
// (pot limit at a Ghost table); what changes is how many cards you get, what's wild and how a hand is scored.

import { rankName, rankOf, suitOf, SUITS, type Card } from './cards';
import { describeHand, scoreHand, type HandValue } from './evaluate';
import type { Game, Hand, Seat } from './types';

export type Variant = 'holdem' | 'pineapple' | 'deuces' | 'ghost' | 'pittsburgh' | 'dice' | 'redriver' | 'imposter' | 'crucifix' | 'circle';

export interface VariantInfo {
  id: Variant;
  name: string;
  emoji: string;
  /** One line for the picker. */
  tagline: string;
  /** How it plays, a sentence each. */
  rules: string[];
}

export const VARIANTS: VariantInfo[] = [
  {
    id: 'holdem',
    name: "Texas Hold'em",
    emoji: '🃏',
    tagline: 'The classic. Two cards each, five on the board.',
    rules: ['Two cards each and five on the board. Make the best five-card hand.'],
  },
  {
    id: 'pineapple',
    name: 'Crazy Pineapple',
    emoji: '🍍',
    tagline: 'Three cards each. Throw one away after the flop.',
    rules: [
      'You get three cards instead of two.',
      'After the betting on the flop, everyone still in throws one card away.',
      'From the turn on it\'s normal Hold\'em with the two you kept.',
      'All in before then? The app keeps your best two for you.',
    ],
  },
  {
    id: 'deuces',
    name: 'Crazy Deuces',
    emoji: '🤪',
    tagline: 'Every 2 is wild: it can be any card you want.',
    rules: [
      'Every 2, in your hand or on the board, is wild. It becomes whatever card makes your hand best.',
      'With wild cards you can make five of a kind, the best hand of all (then straight flushes and so on as usual).',
      'The app works out the best way to use your wild cards for you.',
    ],
  },
  {
    id: 'ghost',
    name: "Ghost Hold'em",
    emoji: '👻',
    tagline: 'Beat your friends, then beat the ghost, or the pot stays.',
    rules: [
      'A ghost is dealt two cards too. Nobody sees them until the showdown.',
      'At a showdown, whoever wins a pot also has to beat the ghost. A tie isn\'t enough.',
      'If the ghost wins, that pot stays in the middle and goes to the winner of the next hand.',
      'If everyone folds to you, you win the pot (and anything the ghost was holding) without facing the ghost.',
      'Bets are pot limit: you can raise at most the size of the pot. Deep stacks work best.',
    ],
  },
  {
    id: 'pittsburgh',
    name: 'Pittsburgh',
    emoji: '🌉',
    tagline: 'Three rivers. Your hand uses the one that suits it best.',
    rules: [
      'Three river cards are dealt instead of one.',
      'Your hand uses the flop, the turn and just one of the three rivers.',
      'The app picks the river that gives you the best hand.',
    ],
  },
  {
    id: 'dice',
    name: 'Die on the River',
    emoji: '🎲',
    tagline: 'When the river comes, a die swaps out one board card.',
    rules: [
      'Normal Hold\'em until the river.',
      'As soon as the river is dealt, a die is rolled. Roll a 1 to 5 and that card on the board (counting from the left) is replaced by a new card from the deck.',
      'Roll a 6 and the board stays as it is.',
      'Then the river betting starts with the new board.',
    ],
  },
  {
    id: 'redriver',
    name: 'Red River',
    emoji: '🟥',
    tagline: 'A red river keeps the cards coming until a black one lands.',
    rules: [
      'Normal Hold\'em until the river.',
      'If the river is red (a heart or a diamond), another card is dealt, and another, until a black card (a spade or a club) comes.',
      'Every card on the board counts: make your best five from your two and all of them.',
      'Then there\'s one round of river betting.',
    ],
  },
  {
    id: 'imposter',
    name: 'Imposter',
    emoji: '🕵️',
    tagline: 'Everyone has the same hand but one. Find the imposter.',
    rules: [
      'Everyone gets the same two cards, except the imposter, who gets a different hand. You\'re told whether you\'re the imposter or innocent.',
      'How strong your cards are doesn\'t matter, and nobody can fold: everyone plays every hand to the end. Bet, raise and call to read the table (or, as the imposter, to blend in).',
      'Everyone antes a big blind each hand, so there\'s money in the middle from the start.',
      'After the river everyone votes for who they think the imposter is.',
      'If the most votes go to the imposter, the innocent players still in split the pot. If not (a tie counts as not), the imposter takes it all.',
      'Needs three or more players: with two, the hand is plain Hold\'em.',
    ],
  },
  {
    id: 'crucifix',
    name: 'Crucifix',
    emoji: '➕',
    tagline: 'The board is a cross. Play the line across or the line down.',
    rules: [
      'The board is dealt as a cross of nine cards: one in the middle and two on each arm.',
      'The flop is the middle card and one card on each arm. The turn adds one to the top arm and one to the right arm, and the river finishes the cross.',
      'Your hand is your two cards with one line: either the five across or the five down (the middle card is in both). Make your best five from those seven.',
      'You can\'t mix cards from the two lines. The app picks the line that gives you the best hand.',
    ],
  },
  {
    id: 'circle',
    name: "Circle Hold'em",
    emoji: '⭕',
    tagline: 'Six cards round a clock. Use three in a row with both of yours.',
    rules: [
      'The board is six cards in a circle, like the hours on a clock.',
      'The flop is two cards, at 12 and 6 o\'clock. The turn adds 8 and 2 o\'clock, and the river adds 10 and 4 o\'clock to close the circle.',
      'Your hand is both of your cards plus three board cards that sit next to each other round the circle (12, 2 and 4, or 10, 12 and 2, and so on).',
      'You must use both of your cards. The app picks the best three in a row for you.',
    ],
  },
];

/** The game being played: the hand's own (settings changed mid-hand wait for the next one), else the table's. */
export const variantOf = (game: Game): Variant => game.hand?.variant ?? game.settings.variant ?? 'holdem';
export const variantInfo = (v: Variant | undefined): VariantInfo => VARIANTS.find((x) => x.id === v) ?? VARIANTS[0];
export const isVariant = (v: unknown): v is Variant => VARIANTS.some((x) => x.id === v);

/** Hole cards dealt to each player. */
export const holeCount = (v: Variant) => (v === 'pineapple' ? 3 : 2);
/** Board cards dealt on each street. */
export function streetCards(v: Variant, street: 'flop' | 'turn' | 'river'): number {
  if (v === 'crucifix') return street === 'flop' ? 5 : 2;
  if (v === 'circle') return 2;
  return street === 'flop' ? 3 : street === 'river' && v === 'pittsburgh' ? 3 : 1;
}
/** Board cards once the river is out (Red River can add more). */
export const boardSize = (v: Variant) => streetCards(v, 'flop') + streetCards(v, 'turn') + streetCards(v, 'river');
/** Bets are capped at the size of the pot. */
export const potLimit = (v: Variant) => v === 'ghost';
/** Win odds can be worked out for the all-in run-out (only plain Hold'em: the others score hands differently). */
export const showsOdds = (v: Variant) => v === 'holdem';
/** Everyone puts in this many big blinds before the blinds (dead money in the middle). */
export const anteBigBlinds = (v: Variant) => (v === 'imposter' ? 1 : 0);
/** Imposter needs three players to be a guessing game. */
export const IMPOSTER_MIN = 3;

// ── Wild deuces ─────────────────────────────────────────────────────────────

const FIVE_OF_A_KIND = 10;
export const isWild = (c: Card) => c[0] === '2';
const RANK_CHARS = '23456789TJQKA';

/** The best hand from these cards with every 2 wild. Five of a kind beats everything. `best` holds the real cards used. */
export function wildHand(cards: Card[]): HandValue {
  const wilds = cards.filter(isWild);
  if (!wilds.length) return describeHand(cards);
  const natural = cards.filter((c) => !isWild(c));

  for (let r = 14; r >= 3; r--) {
    const same = natural.filter((c) => rankOf(c) === r);
    if (same.length && same.length + wilds.length >= 5) {
      const plural = rankName(r, true);
      return {
        score: FIVE_OF_A_KIND * 16 ** 5 + r * 16 ** 4,
        category: FIVE_OF_A_KIND,
        name: 'Five of a kind',
        detail: `Five of a kind, ${plural}`,
        best: [...same, ...wilds].slice(0, 5),
      };
    }
  }

  // Every rank for the wild cards, all in one suit (which only matters for flushes). The wilds are alike, so each
  // set of ranks is tried once (in rising order), and only suits that could make a flush get their own pass.
  const flushSuits = SUITS.filter((s) => natural.filter((c) => suitOf(c) === s).length + wilds.length >= 5);
  const suits = flushSuits.length ? flushSuits : [natural.length ? suitOf(natural[0]) : SUITS[0]];
  let bestScore = -1;
  let bestSet: Card[] = cards;
  const ranks = new Array(wilds.length).fill(0);
  for (const s of suits) {
    ranks.fill(0);
    for (;;) {
      const concrete = natural.concat(ranks.map((r) => RANK_CHARS[r] + s));
      const score = scoreHand(concrete);
      if (score > bestScore) {
        bestScore = score;
        bestSet = concrete;
      }
      let i = 0;
      while (i < ranks.length && ranks[i] === 12) i++;
      if (i === ranks.length) break;
      ranks[i]++;
      for (let j = 0; j < i; j++) ranks[j] = ranks[i];
    }
  }
  const value = describeHand(bestSet);
  // Point the best five back at the real cards: a wild card stands in for whatever it became.
  const pool = bestSet.map((c, i) => ({ c, real: i < natural.length ? natural[i] : wilds[i - natural.length], used: false }));
  const best = value.best.map((c) => {
    const hit = pool.find((p) => !p.used && p.c === c)!;
    hit.used = true;
    return hit.real;
  });
  return { ...value, best };
}

// ── Crucifix and Circle boards ──────────────────────────────────────────────

/**
 * Crucifix board, in the order it's dealt: the middle, then one card on the top, right, bottom and left arms (the
 * flop), the outer top and right cards (the turn) and the outer bottom and left cards (the river). Each line is
 * listed from one end to the other, the middle card third.
 */
export const CROSS_LINES = [
  [5, 1, 0, 3, 7], // down: outer top, top, middle, bottom, outer bottom
  [8, 4, 0, 2, 6], // across: outer left, left, middle, right, outer right
];
/** Where each Crucifix board card sits on a 5×5 grid, as [row, column] (1-based). */
export const CROSS_CELLS: [number, number][] = [
  [3, 3],
  [2, 3],
  [3, 4],
  [4, 3],
  [3, 2],
  [1, 3],
  [3, 5],
  [5, 3],
  [3, 1],
];
/** Circle board, dealt at 12 and 6 o'clock, then 8 and 2, then 10 and 4. Each card's o'clock position. */
export const CIRCLE_HOURS = [12, 6, 8, 2, 10, 4];
/** The board cards in order round the circle, clockwise from 12. */
export const CIRCLE_RING = [0, 3, 5, 1, 2, 4];

// ── Scoring for any variant ─────────────────────────────────────────────────

/**
 * The card sets a hand can be made from, by the table's rules: hole cards plus the whole board, or plus each
 * Pittsburgh river, each Crucifix line, or each three-in-a-row on the Circle (only lines and runs that are out so far).
 */
export function handSets(v: Variant, hole: Card[], board: Card[]): Card[][] {
  if (v === 'pittsburgh' && board.length > 5) return board.slice(4).map((river) => [...hole, ...board.slice(0, 4), river]);
  if (v === 'crucifix' && board.length >= 5) {
    // Before the river a line has three or four cards out; a hand is made from what's there.
    return CROSS_LINES.map((line) => [...hole, ...line.filter((i) => i < board.length).map((i) => board[i])]);
  }
  if (v === 'circle') {
    const runs: Card[][] = [];
    for (let p = 0; p < 6; p++) {
      const run = [0, 1, 2].map((k) => CIRCLE_RING[(p + k) % 6]);
      if (run.every((i) => i < board.length)) runs.push([...hole, ...run.map((i) => board[i])]);
    }
    // No three in a row until the river: until then a hand is just the two hole cards.
    return runs.length ? runs : [hole];
  }
  return [[...hole, ...board]];
}

/** A player's best hand with this board, by the table's rules. */
export function bestHand(v: Variant, hole: Card[], board: Card[]): HandValue {
  const evaluate = v === 'deuces' ? wildHand : describeHand;
  let best: HandValue | null = null;
  for (const cards of handSets(v, hole, board)) {
    const value = evaluate(cards);
    if (!best || value.score > best.score) best = value;
  }
  return best!;
}

// ── Crazy Pineapple ─────────────────────────────────────────────────────────

/** A rough preflop value for two cards: pairs first, then high, suited and connected cards. */
function startValue(a: Card, b: Card): number {
  const [hi, lo] = rankOf(a) >= rankOf(b) ? [rankOf(a), rankOf(b)] : [rankOf(b), rankOf(a)];
  if (hi === lo) return 100 + hi * 2;
  return hi * 2 + lo + (suitOf(a) === suitOf(b) ? 3 : 0) + (hi - lo <= 2 ? 2 : 0);
}

/** The two of three cards worth keeping: the best hand with the board, or the best start before the flop. */
export function keepTwo(hole: Card[], board: Card[]): Card[] {
  if (hole.length <= 2) return hole;
  const pairs: Card[][] = [
    [hole[0], hole[1]],
    [hole[0], hole[2]],
    [hole[1], hole[2]],
  ];
  const value = (p: Card[]) => (board.length >= 3 ? describeHand([...p, ...board]).score * 1000 : 0) + startValue(p[0], p[1]);
  return pairs.reduce((a, b) => (value(b) > value(a) ? b : a));
}

// ── What a bot sees ─────────────────────────────────────────────────────────

/**
 * The bots think in plain Hold'em: two hole cards and up to five board cards. In Crazy Pineapple a bot looks at the
 * two of its three cards it would keep; with a bigger board, at the five board cards its best hand uses. All public
 * (or its own) cards, so it never learns anything a player in its seat couldn't.
 */
export function botView(game: Game, hand: Hand, seat: Seat): { game: Game; hand: Hand; seat: Seat } {
  const v = variantOf(game);
  const cards = seat.cards.length > 2 ? keepTwo(seat.cards, hand.board.slice(0, 3)) : seat.cards;
  let board = hand.board;
  if (board.length > 5) {
    // Three rivers, a cross, a circle or a long red river: the five board cards that matter most to its hand (the
    // ones it uses, then the first others).
    const used = new Set(bestHand(v, cards, board).best);
    board = [...board.filter((c) => used.has(c)), ...board.filter((c) => !used.has(c))].slice(0, 5);
  }
  if (cards === seat.cards && board === hand.board) return { game, hand, seat };
  const mine: Seat = { ...seat, cards };
  const view: Hand = { ...hand, board, seats: hand.seats.map((s) => (s === seat ? mine : s)) };
  return { game: { ...game, hand: view }, hand: view, seat: mine };
}

// ── Imposter votes ──────────────────────────────────────────────────────────

/** How pushy each player has been this hand: bets, raises and all-ins count, calls a little. */
function pushiness(hand: Hand): Map<string, number> {
  const score = new Map(hand.seats.map((s) => [s.playerId, 0]));
  for (const a of hand.actions ?? []) score.set(a.playerId, (score.get(a.playerId) ?? 0) + (a.move === 'bet' || a.move === 'raise' || a.move === 'allin' ? 2 : a.move === 'call' ? 1 : 0));
  return score;
}

/**
 * A bot's vote. Innocent, it suspects whoever played most differently from itself (it holds the same cards as every
 * other innocent). As the imposter it points at whoever stood out most, to throw the others off.
 */
export function botVote(hand: Hand, botId: string): string | null {
  const others = hand.seats.map((s) => s.playerId).filter((id) => id !== botId);
  if (!others.length) return null;
  const push = pushiness(hand);
  const mine = push.get(botId) ?? 0;
  const odd = (id: string) => (botId === hand.imposter ? (push.get(id) ?? 0) : Math.abs((push.get(id) ?? 0) - mine));
  return others.reduce((a, b) => (odd(b) > odd(a) ? b : a));
}
