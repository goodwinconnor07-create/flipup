// Fun versions of Hold'em the host can pick for a table. The betting is the same no-limit Hold'em everywhere
// (pot limit at a Ghost table); what changes is how many cards you get, what's wild and how a hand is scored.

import { score, toInt } from './botEval';
import { crowdDeviation } from './botGames';
import { fullDeck, rankLabel, rankName, rankOf, suitOf, SUITS, type Card } from './cards';
import { describeHand, scoreHand, type HandValue } from './evaluate';
import type { Game, Hand, Seat } from './types';
import { POWERS } from './powerList';
import { MISSION_GOAL, MISSION_REWARD, MISSION_SWAP_AFTER, SECRET_MISSIONS } from './missionList';

export type Variant =
  | 'holdem'
  | 'pineapple'
  | 'deuces'
  | 'ghost'
  | 'pittsburgh'
  | 'dice'
  | 'redriver'
  | 'imposter'
  | 'crucifix'
  | 'circle'
  | 'memory'
  | 'beanstalk'
  | 'bjholdem'
  | 'power'
  | 'missions'
  | 'slide'
  | 'headband'
  | 'belt'
  | 'onion'
  | 'chain'
  | 'elevator'
  | 'plo';

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
      "From the turn on it's normal Hold'em with the two you kept.",
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
    name: 'Haunted Pot',
    emoji: '👻',
    tagline: 'Beat your friends, then beat the ghost, or the pot stays.',
    rules: [
      'A ghost is dealt two cards too. Nobody sees them until the showdown.',
      "At a showdown, whoever wins a pot also has to beat the ghost. A tie isn't enough.",
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
      "Normal Hold'em until the river.",
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
      "Normal Hold'em until the river.",
      'If the river is red (a heart or a diamond), another card is dealt, and another, until a black card (a spade or a club) comes.',
      'Every card on the board counts: make your best five from your two and all of them.',
      "Then there's one round of river betting.",
    ],
  },
  {
    id: 'imposter',
    name: 'Imposter',
    emoji: '🕵️',
    tagline: 'Everyone has the same hand but one. Find the imposter.',
    rules: [
      "Everyone gets the same two cards, except the imposter, who gets a different hand. Nobody is told who it is, not even the imposter: you might be it.",
      "How strong your cards are doesn't matter, and nobody can fold: everyone plays every hand to the end. Bet, raise and call to read the table, and try not to stand out yourself.",
      "Everyone antes a big blind each hand, so there's money in the middle from the start.",
      'After the river everyone votes for who they think the imposter is.',
      'If the most votes go to the imposter, the innocent players still in split the pot. If not (a tie counts as not), the imposter takes it all.',
      "Needs three or more players: with two, the hand is plain Hold'em.",
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
      "You can't mix cards from the two lines. The app picks the line that gives you the best hand.",
    ],
  },
  {
    id: 'circle',
    name: 'Round the Clock',
    emoji: '⭕',
    tagline: 'Six cards round a clock. Use three in a row with both of yours.',
    rules: [
      'The board is six cards in a circle, like the hours on a clock.',
      "The flop is two cards, at 12 and 6 o'clock. The turn adds 8 and 2 o'clock, and the river adds 10 and 4 o'clock to close the circle.",
      'Your hand is both of your cards plus three board cards that sit next to each other round the circle (12, 2 and 4, or 10, 12 and 2, and so on).',
      'You must use both of your cards. The app picks the best three in a row for you.',
    ],
  },
  {
    id: 'memory',
    name: 'Memory Poker',
    emoji: '🧠',
    tagline: '20 cards come out of the deck. Remember which.',
    rules: [
      'Before every hand, 20 random cards are taken out of the deck and shown to everyone for a few seconds.',
      "Then they're hidden and the hand is dealt from the 32 cards left. Nobody can have them and they can't come on the board.",
      "Remember what's gone to work out your odds: if three aces are out, nobody has a set of aces.",
      "Everything else is normal Texas Hold'em.",
    ],
  },
  {
    id: 'beanstalk',
    name: 'Bean Stalk',
    emoji: '🌱',
    tagline: 'Your hand grows: a new card for you on every street.',
    rules: [
      "You start with two cards, like normal Hold'em.",
      'When the flop comes, everyone still in gets another card of their own. The same again on the turn and on the river.',
      'By the river you have five cards of your own and five on the board. Make your best five from all ten.',
    ],
  },
  {
    id: 'bjholdem',
    name: 'Hit Me',
    emoji: '♠️',
    tagline: 'Hit on the flop. Half the pot to the best hand, half to closest to 21.',
    rules: [
      "Normal Hold'em: two cards each, then the flop, the turn and the river.",
      'On the flop, on your turn, you can Hit as many times as you like to take another card, face down, before you check, bet or call.',
      'Your 21 count is your own cards: your two plus your hits (not the board). Aces are 1 or 11, picture cards 10.',
      'Go over 21 and you bust: your hand is folded straight away.',
      'Hit cards count in your poker hand too: make your best five from your cards, your hits and the board.',
      'At the showdown half the pot goes to the best poker hand and half to whoever is closest to 21. If players tie on 21, that half goes to the best poker hand among them.',
    ],
  },
  {
    id: 'power',
    name: 'Power Cards',
    emoji: '⚡',
    tagline: 'A secret power for everyone, every hand. Play it at the right moment.',
    rules: [
      "Normal Texas Hold'em, plus powers.",
      'At the start of every hand everyone is dealt one power at random. Nobody else knows what yours is.',
      "Play it on your turn, before your move (then check, bet, call or fold as usual). Once per hand, and if you don't play it, it's gone when the hand ends.",
      'When a power is played the whole table sees which one, who played it and who it was aimed at. What a Peek or an X-ray shows stays with the player who played it.',
      'Some powers only work on certain streets, and none can be played during an all-in run-out.',
      ...POWERS.map((p) => `${p.emoji} ${p.name}: ${p.rule}`),
    ],
  },
  {
    id: 'missions',
    name: 'Secret Missions',
    emoji: '🕶️',
    tagline: 'A secret mission each. Pull it off and everyone pays you.',
    rules: [
      "Normal Texas Hold'em, plus a secret mission for everyone, like \"win a pot with one pair or less\". Nobody else knows yours.",
      `Complete it in a hand and every other player pays you: ${MISSION_REWARD[1]} big blinds for an easy one, ${MISSION_REWARD[2]} for a medium one, ${MISSION_REWARD[3]} for a hard one (or what they have left). Then you get a new mission next hand.`,
      `Didn't manage it? You keep the same mission until you do. A mission nobody completes in ${MISSION_SWAP_AFTER} hands is swapped for a new one.`,
      `It's a race to ${MISSION_GOAL} missions. Once half the table has finished, the race is over and it changes everyone's stack: 1st +150%, 2nd +100%, 3rd +50%, 4th +25%, 5th no change, 6th −25%, 7th −50%, 8th and 9th −75%. Players who didn't finish are placed by missions completed, then chips.`,
      'Then everyone gets a new mission and a new race starts.',
      ...SECRET_MISSIONS.map((m) => `${m.emoji} ${m.name} (${MISSION_REWARD[m.tier]} big blinds from each player): ${m.text}`),
    ],
  },
  {
    id: 'slide',
    name: 'Slide Switch',
    emoji: '🔄',
    tagline: 'Every street, slide one of your cards to the player on your left.',
    rules: [
      "Normal Texas Hold'em, except your cards don't stay yours.",
      'When the flop lands, everyone still in picks one of their two cards and slides it face down to the next player still in on their left. At the same moment you get one from the player on your right. Then the flop betting starts.',
      'The same again when the turn lands, and again when the river lands: three slides every hand.',
      'Everyone picks at the same time, so nobody knows what they are getting until it arrives. You know one card the player on your left has, until they slide it on.',
      'All in? You still slide. Out of time? The app slides the card that helps you least.',
      'Heads-up, you and your opponent swap a card each time.',
      "No win odds during an all-in run-out here: the slides still to come can change everyone's hand.",
    ],
  },
  {
    id: 'headband',
    name: 'Headband',
    emoji: '🤕',
    tagline: 'One card on your forehead: everyone can see it but you.',
    rules: [
      'You get two cards. One is your secret card: only you can see it.',
      "The other is your headband card. It faces out, so everyone else at the table can see it, but you can't.",
      "Everything else is normal Texas Hold'em: your hand is the best five from both your cards and the board, the one you can't see included.",
      "Read the table: how everyone bets at you tells you what's on your head.",
      'At the showdown every card turns over and you finally see your headband card. If everyone is all in, the cards turn over then, yours too.',
    ],
  },
  {
    id: 'belt',
    name: 'Conveyor Belt',
    emoji: '🛤️',
    tagline: 'Three cards on a moving belt. One in, one off, every street.',
    rules: [
      'You get four cards.',
      'The flop puts three cards on the belt. On the turn a new card comes in on the right and the card on the left end falls off. The same again on the river, and once more on the last stop: four rounds of betting after the deal.',
      "Cards that fall off are gone: they don't count for anyone.",
      'Your hand is the best five from your four cards and the three cards on the belt at the end.',
      'No win odds during an all-in run-out here.',
    ],
  },
  {
    id: 'onion',
    name: 'Onion',
    emoji: '🧅',
    tagline: 'Start with five cards. Peel one off, face up, every street.',
    rules: [
      'You get five cards.',
      'After the flop betting, everyone still in peels one card off, face up for everyone to see. Everyone picks at the same time and the peeled cards turn over together. The same again after the turn betting.',
      'When the river lands, everyone peels their last spare card before the river betting, so you play the river with two.',
      "At the showdown your hand is your last two cards and the board, like normal Hold'em.",
      'Out of time? The app peels the card that helps you least.',
    ],
  },
  {
    id: 'chain',
    name: 'Chain Reaction',
    emoji: '🔗',
    tagline: 'Every board card has to link to the one before it.',
    rules: [
      "Normal Hold'em, but the board snowballs.",
      "Every board card after the first has to share a rank or a suit with the card before it. A card that doesn't link is burned face up beside the board and the next one is tried.",
      'So boards come out flushy and paired: big hands are everywhere.',
      "The burned cards stay face up, so everyone knows they can't come.",
    ],
  },
  {
    id: 'elevator',
    name: 'Elevator',
    emoji: '⬆️',
    tagline: 'Every time a card lands, the board goes up a floor.',
    rules: [
      "Normal Hold'em, but the board climbs.",
      'When the turn lands, the three flop cards first go up one rank each: a 7 becomes an 8, a king an ace, an ace a 2. When the river lands, the four cards already out go up again.',
      'The new card lands as it is, and your own cards never change.',
      "Two board cards are never the same: a card the board's climbing cards already show is skipped when the next one is dealt. The board can show a card someone is holding.",
      'Your hand is the best five from your two cards and the final board.',
    ],
  },
  {
    id: 'plo',
    name: 'Double Board PLO',
    emoji: '♦️',
    tagline: 'Five cards, two boards, pot limit. Half the pot on each board.',
    rules: [
      'Pot Limit Omaha with five cards each: you can raise at most the size of the pot.',
      'Two boards are dealt side by side, each with its own flop, turn and river.',
      "On each board your hand is exactly two of your five cards and exactly three of that board's cards, no more and no fewer. The app finds your best two and three.",
      'Every pot is split: half to the best hand on board one, half to the best hand on board two. Win both to scoop.',
      "With nine players everyone gets four cards: one deck isn't enough for nine hands of five.",
    ],
  },
];

/** The game being played: the hand's own (settings changed mid-hand wait for the next one), else the table's. */
export const variantOf = (game: Game): Variant => game.hand?.variant ?? game.settings.variant ?? 'holdem';
export const variantInfo = (v: Variant | undefined): VariantInfo => VARIANTS.find((x) => x.id === v) ?? VARIANTS[0];

/**
 * In the iPhone app only the first game in VARIANTS, normal Texas Hold'em, is free; the rest need Premium to host, and
 * only the host of a table needs the unlock (docs/APP_STORE.md). The web doesn't lock any game yet.
 */
export const FREE_VARIANTS = 1;
export const isPremiumVariant = (v: Variant): boolean => VARIANTS.findIndex((x) => x.id === v) >= FREE_VARIANTS;
export const isVariant = (v: unknown): v is Variant => VARIANTS.some((x) => x.id === v);

/** Hole cards dealt to each player (`players` dealt in: Double Board PLO deals four each to nine). */
export const holeCount = (v: Variant, players = 0) =>
  v === 'pineapple' ? 3 : v === 'belt' ? 4 : v === 'onion' ? 5 : v === 'plo' ? (players > PLO_FULL ? 4 : 5) : 2;
/** Double Board PLO: five cards each up to this many players. */
export const PLO_FULL = 8;
/** Hole cards each player has once the board has this many cards: Bean Stalk adds one on every street. */
export function holeCountAt(v: Variant, boardLength: number): number {
  if (v !== 'beanstalk') return holeCount(v);
  return 2 + (boardLength >= 5 ? 3 : boardLength === 4 ? 2 : boardLength === 3 ? 1 : 0);
}
/** Hit Me: your own cards counted like blackjack (aces 1 or 11, picture cards 10). */
export function count21(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const r = rankOf(c);
    if (r === 14) aces++;
    total += r === 14 ? 11 : Math.min(10, r);
  }
  while (total > 21 && aces--) total -= 10;
  return total;
}
/** Memory Poker: cards taken out of the deck before each hand. */
export const MEMORY_REMOVED = 20;
/** A card is burned before each street (not in Bean Stalk, which needs them: nine players use up 50 cards). */
export const burns = (v: Variant) => v !== 'beanstalk' && v !== 'plo' && v !== 'onion' && v !== 'chain';
/** Board cards dealt on each street. */
export function streetCards(v: Variant, street: 'flop' | 'turn' | 'river'): number {
  if (v === 'crucifix') return street === 'flop' ? 5 : 2;
  if (v === 'circle') return 2;
  if (v === 'plo') return street === 'flop' ? 6 : 2;
  return street === 'flop' ? 3 : street === 'river' && v === 'pittsburgh' ? 3 : 1;
}
/** Power Cards: board cards still to come, by street (an Extra Card makes the board longer than five). */
export const cardsToCome = (street: 'preflop' | 'flop' | 'turn' | 'river'): number => (street === 'preflop' ? 5 : street === 'flop' ? 2 : street === 'turn' ? 1 : 0);
/** Board cards once the river is out (Red River can add more). */
export const boardSize = (v: Variant) => streetCards(v, 'flop') + streetCards(v, 'turn') + streetCards(v, 'river');
/** Bets are capped at the size of the pot. */
export const potLimit = (v: Variant) => v === 'ghost' || v === 'plo';
/** Win odds can be worked out for the all-in run-out (only plain Hold'em: the others score hands differently). */
export const showsOdds = (v: Variant) => v !== 'imposter' && v !== 'slide' && v !== 'belt' && v !== 'plo';
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
        wilds: [...same, ...wilds].slice(0, 5).filter(isWild).map((card) => ({ card, as: rankLabel(same[0]) })),
      };
    }
  }

  // Every rank for the wild cards, all in one suit (which only matters for flushes). The wilds are alike, so each
  // set of ranks is tried once (in rising order), and only suits that could make a flush get their own pass.
  const flushSuits = SUITS.filter((s) => natural.filter((c) => suitOf(c) === s).length + wilds.length >= 5);
  const suits = flushSuits.length ? flushSuits : [natural.length ? suitOf(natural[0]) : SUITS[0]];
  let bestScore = -1;
  let bestSet: Card[] = cards;
  let bestRanks: number[] = [];
  const ranks = new Array(wilds.length).fill(0);
  for (const s of suits) {
    ranks.fill(0);
    for (;;) {
      const concrete = natural.concat(ranks.map((r) => RANK_CHARS[r] + s));
      const score = scoreHand(concrete);
      if (score > bestScore) {
        bestScore = score;
        bestSet = concrete;
        bestRanks = [...ranks];
      }
      let i = 0;
      while (i < ranks.length && ranks[i] === 12) i++;
      if (i === ranks.length) break;
      ranks[i]++;
      for (let j = 0; j < i; j++) ranks[j] = ranks[i];
    }
  }
  // With no flush in play a wild card's suit doesn't matter, so give each one a suit that isn't already in the set
  // (two of the same card would make the best five lose one).
  if (!flushSuits.length) {
    const taken = new Set(natural);
    bestSet = natural.concat(
      bestRanks.map((r) => {
        const pick = SUITS.find((su) => !taken.has(RANK_CHARS[r] + su)) ?? SUITS[0];
        taken.add(RANK_CHARS[r] + pick);
        return RANK_CHARS[r] + pick;
      }),
    );
  }
  const value = describeHand(bestSet);
  // Point the best five back at the real cards: a wild card stands in for whatever it became.
  const pool = bestSet.map((c, i) => ({ c, real: i < natural.length ? natural[i] : wilds[i - natural.length], used: false }));
  const became: { card: Card; as: string }[] = [];
  const best = value.best.map((c) => {
    const hit = pool.find((p) => !p.used && p.c === c)!;
    hit.used = true;
    if (isWild(hit.real)) became.push({ card: hit.real, as: rankLabel(c) });
    return hit.real;
  });
  return { ...value, best, ...(became.length ? { wilds: became } : {}) };
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
/**
 * Double Board PLO: the board is dealt as both boards' flops (three each), then both turns, then both rivers:
 * board one is cards 0, 1, 2, 6 and 8, board two 3, 4, 5, 7 and 9.
 */
export const PLO_BOARDS = [
  [0, 1, 2, 6, 8],
  [3, 4, 5, 7, 9],
] as const;
export const ploBoards = (board: Card[]): Card[][] => PLO_BOARDS.map((idx) => idx.filter((i) => i < board.length).map((i) => board[i]));

const choose = <T,>(xs: T[], k: number): T[][] => (k === 0 ? [[]] : xs.flatMap((x, i) => choose(xs.slice(i + 1), k - 1).map((c) => [x, ...c])));

/** Omaha: every hand of exactly two hole cards and exactly three board cards (before the flop, the hole pairs). */
export function omahaSets(hole: Card[], board: Card[]): Card[][] {
  const pairs = choose(hole, 2);
  if (board.length < 3) return pairs;
  const threes = choose(board, 3);
  return pairs.flatMap((p) => threes.map((t) => [...p, ...t]));
}

/** Double Board PLO: a player's best hand on one board (0 or 1). */
export function ploBest(hole: Card[], board: Card[], which: 0 | 1): HandValue {
  let best: HandValue | null = null;
  for (const cards of omahaSets(hole, ploBoards(board)[which])) {
    const value = describeHand(cards);
    if (!best || value.score > best.score) best = value;
  }
  return best!;
}

export function handSets(v: Variant, hole: Card[], board: Card[]): Card[][] {
  if (v === 'plo') {
    const [one, two] = ploBoards(board);
    return one.length >= 3 ? [...omahaSets(hole, one), ...omahaSets(hole, two)] : omahaSets(hole, []);
  }
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
export function startValue(a: Card, b: Card): number {
  const [hi, lo] = rankOf(a) >= rankOf(b) ? [rankOf(a), rankOf(b)] : [rankOf(b), rankOf(a)];
  if (hi === lo) return 100 + hi * 2;
  return hi * 2 + lo + (suitOf(a) === suitOf(b) ? 3 : 0) + (hi - lo <= 2 ? 2 : 0);
}

/** The quick keep, for run-outs that do it thousands of times: the best made hand now, then the best start. */
export function keepTwoQuick(hole: Card[], board: Card[]): Card[] {
  if (hole.length <= 2) return hole;
  const pairs: Card[][] = [
    [hole[0], hole[1]],
    [hole[0], hole[2]],
    [hole[1], hole[2]],
  ];
  const value = (p: Card[]) => (board.length >= 3 ? describeHand([...p, ...board]).score * 1000 : 0) + startValue(p[0], p[1]);
  return pairs.reduce((a, b) => (value(b) > value(a) ? b : a));
}

/**
 * The two of three cards worth keeping. Before the flop, the best start. On the flop, the pair that ends up best on
 * average over every turn and river still to come (by hand category, then what it holds now), so a flush or straight
 * draw can beat a weak pair: about three thousand quick evaluations.
 */
export function keepTwo(hole: Card[], board: Card[]): Card[] {
  if (hole.length <= 2) return hole;
  const pairs: Card[][] = [
    [hole[0], hole[1]],
    [hole[0], hole[2]],
    [hole[1], hole[2]],
  ];
  if (board.length < 3) return pairs.reduce((a, b) => (startValue(b[0], b[1]) > startValue(a[0], a[1]) ? b : a));
  const flop = board.slice(0, 3);
  const seen = new Set([...hole, ...flop]);
  const rest = fullDeck()
    .filter((c) => !seen.has(c))
    .map(toInt);
  const value = (p: Card[]) => {
    const base = [...p, ...flop].map(toInt);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < rest.length; i++)
      for (let j = i + 1; j < rest.length; j++) {
        sum += Math.floor(score([...base, rest[i], rest[j]]) / 1048576);
        n++;
      }
    // Now: the made hand's category and kickers, then the preflop value, so ties fall to the stronger cards.
    return sum / n + describeHand([...p, ...flop]).score * 1e-9 + startValue(p[0], p[1]) * 1e-12;
  };
  const scored = pairs.map((p) => ({ p, v: value(p) }));
  return scored.reduce((a, b) => (b.v > a.v ? b : a)).p;
}

// ── What a bot sees ─────────────────────────────────────────────────────────

/**
 * The bots think in plain Hold'em: two hole cards and up to five board cards. In Crazy Pineapple a bot looks at the
 * two of its three cards it would keep (in Bean Stalk, the two its best hand uses most); with a bigger board, at the five board cards its best hand uses. All public
 * (or its own) cards, so it never learns anything a player in its seat couldn't.
 */
export function botView(game: Game, hand: Hand, seat: Seat): { game: Game; hand: Hand; seat: Seat } {
  // The experimental bot's observer memory is private even from legacy bot brains.
  if (game.humanPoker || game.botTable) game = { ...game, humanPoker: undefined, botTable: undefined };
  const v = variantOf(game);
  let cards = v === 'pineapple' && seat.cards.length > 2 ? keepTwo(seat.cards, hand.board.slice(0, 3)) : seat.cards;
  if (cards.length > 2) {
    // Bean Stalk: the two of its own cards its best hand leans on most.
    const used = new Set(bestHand(v, cards, hand.board).best);
    cards = [...cards.filter((c) => used.has(c)), ...cards.filter((c) => !used.has(c))].slice(0, 2);
  }
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
  for (const a of hand.actions ?? [])
    score.set(
      a.playerId,
      (score.get(a.playerId) ?? 0) + (a.move === 'bet' || a.move === 'raise' || a.move === 'allin' ? 2 : a.move === 'call' ? 1 : 0),
    );
  return score;
}

/** How many fingers point at each player (from everyone but `skip`). */
function fingers(hand: Hand, skip: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [from, at] of Object.entries(hand.points ?? {})) if (from !== skip) out.set(at, (out.get(at) ?? 0) + 1);
  return out;
}

/**
 * A bot's vote. Nobody knows their own role, so a bot plays the odds that it's innocent: the innocents all hold the
 * same cards and should play alike, so it suspects whoever played least like the rest of the table (their pushiness
 * against the middle of everyone else's), and listens a little to where the table is pointing. It never reads
 * `hand.imposter`: a person in its seat couldn't.
 */
export function botVote(hand: Hand, botId: string): string | null {
  const others = hand.seats.map((s) => s.playerId).filter((id) => id !== botId);
  if (!others.length) return null;
  // Everyone but the imposter holds the same cards, so they act alike: the one who acts least like the others is the
  // odd one out. The table pointing somewhere moves a bot a little too.
  const deviation = crowdDeviation(hand);
  const push = pushiness(hand);
  const crowd = fingers(hand, botId);
  const odd = (id: string) => (deviation.get(id) ?? 0) * 2 + (crowd.get(id) ?? 0) * 0.6 + (push.get(id) ?? 0) * 0.01;
  return others.reduce((x, y) => (odd(y) > odd(x) ? y : x));
}
