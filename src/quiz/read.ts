// Reads a solved-hand decision the way a coach would: what you hold, what the board looks like, who is in
// position, who has been betting, and the price you're getting. The coach's "why" (quizWhy in
// train/coach.ts) is written from this. Pure functions, no wording here.

import { describeHand, rankOf, suitOf, type Card, type Street } from '../game';
import type { QuizDecision, QuizHand, QuizOption } from './hands';
import { POSITIONS } from './hands';

/** How strong your hand is right now. */
export type Made =
  | 'nuts-ish' // a straight or better
  | 'set' // three of a kind, or two pair using both hole cards
  | 'two-pair'
  | 'overpair'
  | 'top-pair-good' // top pair with a good kicker (T or better)
  | 'top-pair'
  | 'middle-pair'
  | 'weak-pair' // bottom pair, underpair, or a pair on the board
  | 'board' // your best hand is the board itself (a straight or better everyone shares)
  | 'ace-high'
  | 'nothing';

export type Draw = 'combo' | 'flush' | 'open-ended' | 'gutshot' | 'backdoor' | null;

export interface Texture {
  paired: boolean;
  /** Three or more of one suit on the board. */
  flushy: boolean;
  /** Two of one suit (flop or turn): flush draws are possible. */
  twoTone: boolean;
  /** Cards close together: straights and straight draws are likely. */
  connected: boolean;
  /** Highest board card is an ace, king or queen. */
  high: boolean;
  /** Board with lots of draws (connected or two-tone). */
  wet: boolean;
  /** What the newest card did, on the turn and river. */
  newCard: 'overcard' | 'flush' | 'straight' | 'pair' | 'blank' | null;
}

export interface Spot {
  street: Street;
  position: string;
  /** Postflop: you act last. */
  inPosition: boolean;
  /** You made the last raise before the flop. */
  raiser: boolean;
  /** You made the last bet or raise on the street before this one (the preflop raiser when it was checked through). */
  hadInitiative: boolean;
  /** Who made the last bet or raise on the street before this one (null preflop or when it was checked through). */
  prevAggressor: number | null;
  /** You were the one who bet or raised last on the street before this one. */
  betLastStreet: boolean;
  pot: number;
  toCall: number;
  /** Equity you need for a call to break even (0 when nothing to call). */
  needed: number;
  /** Your equity against their range here (postflop, when known). */
  equity: number | null;
  /** Stack-to-pot ratio behind. */
  spr: number;
  made: Made;
  draw: Draw;
  texture: Texture | null;
  /** A card of yours that blocks the nut flush (the ace, or the king when the ace is on the board), when a flush is possible. */
  blocker: Card | null;
  /** Both your cards are higher than every board card (and you have no pair). */
  overcards: boolean;
  /** Your flush draw is to the ace-high flush. */
  nutDraw: boolean;
  /** The card that just came (turn or river). */
  newCard: Card | null;
  /** The pot was 3-bet before the flop. */
  threeBetPot: boolean;
  /** The size of the bet you face, as a share of the pot before it (0 when nothing to call). */
  betShare: number;
  /** Share of your range you'd need to keep (call or raise) so a bluff with any two cards doesn't profit. */
  mdf: number;
  /** Players still in the hand, you included. */
  players: number;
  /** Players still to act after you on this street. */
  behind: number;
  /** Players who already called the bet you face. */
  callers: number;
  /**
   * With several of you left to answer a bet, the share each needs to keep so that together you stop a
   * bluff: 1 - (bet / (pot + bet))^(1 / defenders). Equals mdf heads-up.
   */
  mdfEach: number;
  /** Players left to answer the bet you face, you included (callers already have). */
  defenders: number;
  /** The pot share an average hand has by headcount (1 / players). */
  fairShare: number;
  /** Preflop: the hand as a class ("AKs", "T9o", "77") and what kind of hand it is. */
  handClass: string;
  preflopKind: 'premium' | 'strong' | 'suited-ace' | 'pair' | 'suited-connector' | 'broadway' | 'weak';
  /** GTO's main play here and its whole mix. */
  best: QuizOption;
  mix: QuizOption[];
}

const BOARD_AT: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };
const STREETS: Record<string, Street> = { p: 'preflop', f: 'flop', t: 'turn', r: 'river' };
const ORDER_POSTFLOP = [4, 5, 0, 1, 2, 3]; // SB acts first after the flop, the button last
const RANKS = '23456789TJQKA';

function handClassOf(cards: Card[]): string {
  const [a, b] = [...cards].sort((x, y) => rankOf(y) - rankOf(x));
  const ra = RANKS[rankOf(a) - 2];
  const rb = RANKS[rankOf(b) - 2];
  if (ra === rb) return ra + rb;
  return ra + rb + (suitOf(a) === suitOf(b) ? 's' : 'o');
}

function preflopKind(cards: Card[]): Spot['preflopKind'] {
  const [hi, lo] = cards.map(rankOf).sort((x, y) => y - x);
  const suited = suitOf(cards[0]) === suitOf(cards[1]);
  if (hi === lo) return hi >= 12 ? 'premium' : 'pair';
  if (hi === 14 && lo === 13) return 'premium';
  if (hi === 14 && (lo >= 11 || (suited && lo >= 10))) return 'strong';
  if (hi === 14 && suited) return 'suited-ace';
  if (suited && hi - lo <= 2 && lo >= 4) return 'suited-connector';
  if (lo >= 10) return 'broadway';
  return 'weak';
}

function readMade(hole: Card[], board: Card[]): Made {
  if (board.length < 3) return 'nothing';
  const all = describeHand([...hole, ...board]);
  const boardOnly = board.length >= 5 ? describeHand(board) : null;
  const ranks = board.map(rankOf).sort((a, b) => b - a);
  const [h1, h2] = hole.map(rankOf).sort((a, b) => b - a);
  if (all.category >= 4) return boardOnly && boardOnly.score === all.score ? 'board' : 'nuts-ish';
  if (all.category === 3) return 'set';
  if (all.category === 2 && h1 !== h2 && ranks.includes(h1) && ranks.includes(h2)) return 'two-pair';
  if (all.category === 1 || all.category === 2) {
    // One pair of your own (a second pair, if any, is on the board).
    if (h1 === h2) return h1 > ranks[0] ? 'overpair' : 'weak-pair';
    const paired = [h1, h2].find((r) => ranks.includes(r));
    if (paired != null) {
      if (paired === ranks[0]) return (paired === h1 ? h2 : h1) >= 10 ? 'top-pair-good' : 'top-pair';
      return paired >= ranks[1] ? 'middle-pair' : 'weak-pair';
    }
    // The only pair is on the board.
  }
  return h1 === 14 ? 'ace-high' : 'nothing';
}

function readDraw(hole: Card[], board: Card[]): Draw {
  if (board.length < 3 || board.length >= 5) return null;
  const cards = [...hole, ...board];
  const made = describeHand(cards).category;
  // Flush draw: four of a suit, at least one of them yours.
  let flush = false;
  let backdoor = false;
  for (const s of ['s', 'h', 'd', 'c']) {
    const n = cards.filter((c) => suitOf(c) === s).length;
    const mine = hole.some((c) => suitOf(c) === s);
    if (mine && n === 4) flush = true;
    if (mine && n === 3 && board.length === 3) backdoor = true;
  }
  // Straight draw: how many ranks would complete a straight that uses one of your cards.
  let outs = 0;
  if (made < 4) {
    const have = new Set(cards.map(rankOf));
    const boardSet = new Set(board.map(rankOf));
    for (let r = 2; r <= 14; r++) {
      if (have.has(r)) continue;
      const with_ = new Set([...have, r]);
      const onBoard = new Set([...boardSet, r]);
      if (straightIn(with_) && !straightIn(onBoard)) outs++;
    }
  }
  const straight = outs >= 2 ? 'open-ended' : outs === 1 ? 'gutshot' : null;
  if (made >= 4) return null;
  if (flush && straight) return 'combo';
  if (flush) return 'flush';
  if (straight) return straight;
  return backdoor ? 'backdoor' : null;
}

function straightIn(ranks: Set<number>): boolean {
  const has = (r: number) => ranks.has(r === 1 ? 14 : r);
  for (let high = 14; high >= 5; high--) {
    let ok = true;
    for (let r = high; r > high - 5; r--) if (!has(r)) ok = false;
    if (ok) return true;
  }
  return false;
}

function readTexture(board: Card[]): Texture | null {
  if (board.length < 3) return null;
  const ranks = board.map(rankOf);
  const sorted = [...new Set(ranks)].sort((a, b) => b - a);
  const suits = board.map(suitOf);
  const maxSuit = Math.max(...['s', 'h', 'd', 'c'].map((s) => suits.filter((x) => x === s).length));
  // Three different ranks within a five-rank window (a paired board like 6-2-2 isn't connected).
  const connected = sorted.some((r, i) => i + 2 < sorted.length && r - sorted[i + 2] <= 4);
  let newCard: Texture['newCard'] = null;
  if (board.length >= 4) {
    const prev = board.slice(0, -1);
    const card = board[board.length - 1];
    const r = rankOf(card);
    const prevSuitCount = prev.filter((c) => suitOf(c) === suitOf(card)).length;
    if (prev.map(rankOf).includes(r)) newCard = 'pair';
    else if (prevSuitCount >= 2) newCard = 'flush';
    else if (straightPossible(board) && !straightPossible(prev)) newCard = 'straight';
    else if (r > Math.max(...prev.map(rankOf))) newCard = 'overcard';
    else newCard = 'blank';
  }
  const twoTone = maxSuit === 2 && board.length < 5;
  return {
    paired: new Set(ranks).size < ranks.length,
    flushy: maxSuit >= 3,
    twoTone,
    connected,
    high: Math.max(...ranks) >= 12,
    wet: connected || twoTone || maxSuit >= 3,
    newCard,
  };
}

/** Three board cards within a five-rank window: a straight is possible for someone. */
function straightPossible(board: Card[]): boolean {
  const rs = [...new Set(board.map(rankOf).flatMap((r) => (r === 14 ? [14, 1] : [r])))].sort((a, b) => a - b);
  for (let i = 0; i + 2 < rs.length; i++) if (rs[i + 2] - rs[i] <= 4) return true;
  return false;
}

function readBlocker(hole: Card[], board: Card[]): Card | null {
  for (const s of ['s', 'h', 'd', 'c']) {
    const onBoard = board.filter((c) => suitOf(c) === s);
    if (onBoard.length < 3) continue;
    const boardRanks = onBoard.map(rankOf);
    const top = [14, 13, 12].find((r) => !boardRanks.includes(r));
    const mine = hole.find((c) => suitOf(c) === s && rankOf(c) === top);
    if (mine) return mine;
  }
  return null;
}

function readNutDraw(hole: Card[], board: Card[]): boolean {
  for (const s of ['s', 'h', 'd', 'c']) {
    const n = [...hole, ...board].filter((c) => suitOf(c) === s).length;
    const boardRanks = board.filter((c) => suitOf(c) === s).map(rankOf);
    const top = [14, 13, 12].find((r) => !boardRanks.includes(r));
    if (n === 4 && hole.some((c) => suitOf(c) === s && rankOf(c) === top)) return true;
  }
  return false;
}

/** Chips you've put in so far (big blinds): your last wager on each street, the blinds first. */
function investedBefore(h: QuizHand, before: QuizHand['steps']): number {
  const last = new Map<string, number>([['p', h.hero === 4 ? 0.5 : h.hero === 5 ? 1 : 0]]);
  for (const [st, seat, move, to] of before) if (seat === h.hero && move !== 'fold' && move !== 'check') last.set(st, to);
  return [...last.values()].reduce((a, b) => a + b, 0);
}

/** Everything the coach needs about one of your decisions. */
export function readSpot(h: QuizHand, d: QuizDecision): Spot {
  const step = h.steps[d.at];
  const street = STREETS[step[0]];
  const board = h.board.slice(0, BOARD_AT[street]);
  const before = h.steps.slice(0, d.at);
  const folded = new Set(before.filter((s) => s[2] === 'fold').map((s) => s[1]));
  const live = [h.hero, ...h.villains].filter((x) => !folded.has(x));
  const players = street === 'preflop' ? 6 - folded.size : (d.players ?? live.length);
  const onStreet = before.filter((s) => s[0] === step[0]);
  const aggrAt = onStreet.map((s) => s[2] === 'bet' || s[2] === 'raise' || s[2] === 'allin').lastIndexOf(true);
  const callers = d.toCall > 0 && aggrAt >= 0 ? onStreet.slice(aggrAt + 1).filter((s) => s[2] === 'call').length : 0;
  // Who still has to act after you on this street: facing a bet, everyone in who hasn't answered it yet;
  // otherwise everyone in who comes after you and hasn't acted.
  const inHand = street === 'preflop' ? [0, 1, 2, 3, 4, 5].filter((x) => !folded.has(x)) : live;
  const order = street === 'preflop' ? [0, 1, 2, 3, 4, 5] : ORDER_POSTFLOP;
  const answered = new Set(aggrAt >= 0 ? onStreet.slice(aggrAt).map((s) => s[1]) : onStreet.map((s) => s[1]));
  const behind = inHand.filter((x) => x !== h.hero && !answered.has(x) && (aggrAt >= 0 || order.indexOf(x) > order.indexOf(h.hero))).length;
  const alpha = d.toCall > 0 && d.pot > 0 ? d.toCall / d.pot : 0;
  const defenders = street === 'preflop' ? 1 : 1 + behind;
  const raises = before.filter((s) => s[0] === 'p' && (s[2] === 'raise' || s[2] === 'allin'));
  const raiserSeat = raises.length ? raises[raises.length - 1][1] : null;
  const prevStreet = { preflop: null, flop: 'p', turn: 'f', river: 't' }[street];
  const prevAggr = prevStreet ? [...before].reverse().find((s) => s[0] === prevStreet && (s[2] === 'bet' || s[2] === 'raise' || s[2] === 'allin')) : undefined;
  const stack = Math.max(0, 100 - investedBefore(h, before));
  const mix = d.options.filter((o) => o.freq >= 0.01).sort((a, b) => b.freq - a.freq);
  return {
    street,
    position: POSITIONS[h.hero],
    inPosition: live.every((x) => x === h.hero || ORDER_POSTFLOP.indexOf(h.hero) > ORDER_POSTFLOP.indexOf(x)),
    raiser: raiserSeat === h.hero,
    hadInitiative: (prevAggr ? prevAggr[1] : raiserSeat) === h.hero,
    prevAggressor: street !== 'preflop' && street !== 'flop' && prevAggr ? prevAggr[1] : null,
    betLastStreet: street !== 'flop' && !!prevAggr && prevAggr[1] === h.hero,
    pot: d.pot,
    toCall: d.toCall,
    needed: d.toCall > 0 ? d.toCall / (d.pot + d.toCall) : 0,
    equity: d.eq ?? null,
    spr: d.pot > 0 ? stack / d.pot : 0,
    made: readMade(h.cards, board),
    draw: readDraw(h.cards, board),
    texture: readTexture(board),
    blocker: street === 'preflop' ? null : readBlocker(h.cards, board),
    overcards: board.length >= 3 && board.length < 5 && h.cards.every((c) => rankOf(c) > Math.max(...board.map(rankOf))) && rankOf(h.cards[0]) !== rankOf(h.cards[1]),
    nutDraw: board.length >= 3 && board.length < 5 && readNutDraw(h.cards, board),
    newCard: board.length >= 4 ? board[board.length - 1] : null,
    threeBetPot: raises.length >= 2,
    betShare: d.toCall > 0 && d.pot - d.toCall > 0 ? d.toCall / (d.pot - d.toCall) : 0,
    mdf: d.toCall > 0 && d.pot > 0 ? (d.pot - d.toCall) / d.pot : 0,
    players,
    behind,
    callers,
    mdfEach: alpha > 0 ? 1 - Math.pow(alpha, 1 / defenders) : 0,
    defenders,
    fairShare: 1 / Math.max(1, street === 'preflop' ? 2 : players),
    handClass: handClassOf(h.cards),
    preflopKind: preflopKind(h.cards),
    best: mix[0] ?? d.options[d.line],
    mix,
  };
}
