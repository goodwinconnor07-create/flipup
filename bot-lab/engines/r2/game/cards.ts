// Playing cards. A card is two characters: rank then suit, e.g. "As" (ace of spades), "Td" (ten of diamonds).

export type Suit = 's' | 'h' | 'd' | 'c';
export type Card = string;

export const RANKS = '23456789TJQKA';
export const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c'];

/** 2 to 14 (ace high). */
export function rankOf(card: Card): number {
  return RANKS.indexOf(card[0]) + 2;
}

export function suitOf(card: Card): Suit {
  return card[1] as Suit;
}

export function isCard(value: unknown): value is Card {
  return typeof value === 'string' && value.length === 2 && RANKS.includes(value[0]) && (SUITS as readonly string[]).includes(value[1]);
}

export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
  return deck;
}

/** Fisher–Yates with the given random source (Web Crypto on the server). */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const RANK_LABEL: Record<string, string> = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };

/** What's printed in the card's corner: "10", "K", "7". */
export function rankLabel(card: Card): string {
  return RANK_LABEL[card[0]] ?? card[0];
}

export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_NAME: Record<Suit, string> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const RANK_NAME = ['', '', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
const RANK_PLURAL = [
  '',
  '',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
  'sevens',
  'eights',
  'nines',
  'tens',
  'jacks',
  'queens',
  'kings',
  'aces',
];

export function rankName(rank: number, plural = false): string {
  return (plural ? RANK_PLURAL : RANK_NAME)[rank] ?? '';
}

/** For screen readers: "ace of spades". */
export function cardName(card: Card): string {
  return `${rankName(rankOf(card))} of ${SUIT_NAME[suitOf(card)]}`;
}

export function isRed(card: Card): boolean {
  return card[1] === 'h' || card[1] === 'd';
}

/** Small, fast seeded random numbers (mulberry32), so every phone works out the same odds. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
