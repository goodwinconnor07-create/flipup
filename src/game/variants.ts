// Fun versions of Hold'em the host can pick for a table. The betting is the same no-limit Hold'em everywhere
// (pot limit at a Ghost table); what changes is how many cards you get, what's wild and how a hand is scored.

import { rankName, rankOf, suitOf, SUITS, type Card } from './cards';
import { describeHand, scoreHand, type HandValue } from './evaluate';
import type { Game, Hand, Seat } from './types';

export type Variant = 'holdem' | 'pineapple' | 'deuces' | 'ghost' | 'pittsburgh';

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
];

/** The game being played: the hand's own (settings changed mid-hand wait for the next one), else the table's. */
export const variantOf = (game: Game): Variant => game.hand?.variant ?? game.settings.variant ?? 'holdem';
export const variantInfo = (v: Variant | undefined): VariantInfo => VARIANTS.find((x) => x.id === v) ?? VARIANTS[0];
export const isVariant = (v: unknown): v is Variant => VARIANTS.some((x) => x.id === v);

/** Hole cards dealt to each player. */
export const holeCount = (v: Variant) => (v === 'pineapple' ? 3 : 2);
/** Cards dealt on the river. */
export const riverCount = (v: Variant) => (v === 'pittsburgh' ? 3 : 1);
/** Bets are capped at the size of the pot. */
export const potLimit = (v: Variant) => v === 'ghost';
/** Win odds can be worked out for the all-in run-out (only plain Hold'em: the others score hands differently). */
export const showsOdds = (v: Variant) => v === 'holdem';

// ── Wild deuces ─────────────────────────────────────────────────────────────

const FIVE_OF_A_KIND = 10;
const isWild = (c: Card) => c[0] === '2';
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

  // Every rank for every wild card, all in one suit (which only matters for flushes).
  const suits = [...new Set(natural.map(suitOf))];
  if (!suits.length) suits.push(SUITS[0]);
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
      while (i < ranks.length && ranks[i] === 12) ranks[i++] = 0;
      if (i === ranks.length) break;
      ranks[i]++;
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

// ── Scoring for any variant ─────────────────────────────────────────────────

/** A player's best hand with this board, by the table's rules. */
export function bestHand(v: Variant, hole: Card[], board: Card[]): HandValue {
  const evaluate = v === 'deuces' ? wildHand : describeHand;
  if (v === 'pittsburgh' && board.length > 5) {
    const base = board.slice(0, 4);
    let best: HandValue | null = null;
    for (const river of board.slice(4)) {
      const value = evaluate([...hole, ...base, river]);
      if (!best || value.score > best.score) best = value;
    }
    return best!;
  }
  return evaluate([...hole, ...board]);
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
 * two of its three cards it would keep; in Pittsburgh at the board with the river that suits it best. All public
 * (or its own) cards, so it never learns anything a player in its seat couldn't.
 */
export function botView(game: Game, hand: Hand, seat: Seat): { game: Game; hand: Hand; seat: Seat } {
  const v = variantOf(game);
  const cards = seat.cards.length > 2 ? keepTwo(seat.cards, hand.board.slice(0, 3)) : seat.cards;
  let board = hand.board;
  if (v === 'pittsburgh' && board.length > 5) {
    const base = board.slice(0, 4);
    board = [...base, board.slice(4).reduce((a, b) => (describeHand([...cards, ...base, b]).score > describeHand([...cards, ...base, a]).score ? b : a))];
  }
  if (cards === seat.cards && board === hand.board) return { game, hand, seat };
  const mine: Seat = { ...seat, cards };
  const view: Hand = { ...hand, board, seats: hand.seats.map((s) => (s === seat ? mine : s)) };
  return { game: { ...game, hand: view }, hand: view, seat: mine };
}
