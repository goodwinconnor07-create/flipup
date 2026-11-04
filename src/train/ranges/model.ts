// Range training: a hand played to the turn or the river, the whole action so far, and one decision. Each scenario
// spells out the opponent's range at that moment as groups of hands ("sets", "missed flush draws"), each with what
// it does. Everything shown is worked out from that data: the hand log and pot from the actions, and the numbers in
// the review (how often you win against each group) by dealing every combination out. The unit tests check that the
// answer agrees with those numbers, so a scenario can't say "call" when the price is wrong.

import { score, toInt } from '../../game/botEval';
import { fullDeck, RANKS, SUITS, type Card } from '../../game/cards';

export type Pos = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type Who = 'hero' | 'villain';

/** One move. Bets and raises give the total put in on that street (`to`), in big blinds. */
export interface Step {
  street: Street;
  who: Who;
  move: 'raise' | 'call' | 'check' | 'bet';
  to?: number;
}

/**
 * What a group of hands does here. When you're facing a bet: `value` and `bluff` (it bet with them). When it's
 * your turn to check or bet: `calls`, `folds` or `raises` (what it does if you bet).
 */
export type Role = 'value' | 'bluff' | 'calls' | 'folds' | 'raises';

export interface RangeGroup {
  label: string;
  /** Hands, like "99, 55, K8s, AhQh, AQs@h" (AQs@h is only the heart combo). */
  hands: string;
  role: Role;
  /** How often it plays these hands this way (1 = always). */
  weight?: number;
}

/** A read on one street: what the action there says about the opponent's hand. */
export interface Clue {
  street: Street;
  text: string;
}

export type OptionId = 'fold' | 'call' | 'raise' | 'check' | 'bet33' | 'bet75' | 'bet125';

export interface Scenario {
  id: string;
  title: string;
  /** What it teaches, for the list ("Polarised ranges", "Thin value"...). */
  concept: string;
  /** How the opponent plays, in a line. */
  villainType: string;
  hero: { pos: Pos; cards: [Card, Card] };
  villain: { pos: Pos };
  /** Effective stacks at the start, in big blinds. */
  stack: number;
  /** Three, four or five cards: the street the decision is on. */
  board: Card[];
  actions: Step[];
  /** The opponent's range at the decision, grouped. */
  range: RangeGroup[];
  best: OptionId;
  /** Close enough to the best play to count as a good answer. */
  alsoOk?: OptionId[];
  clues: Clue[];
  /** Why the best play is best, in a few sentences. */
  why: string;
  /** Hero bets as a bluff: the test checks enough folds instead of enough worse calls. */
  bluff?: boolean;
}

// ── Hands ───────────────────────────────────────────────────────────────────

const rankChar = (c: string) => {
  const r = c.toUpperCase();
  if (!RANKS.includes(r)) throw new Error(`Bad rank ${c}`);
  return r;
};

/** Every combo a hand string stands for, before taking out dead cards. */
export function expandHand(token: string): [Card, Card][] {
  const t = token.trim();
  // An exact combo: AhKh.
  if (/^[2-9TJQKA][shdc][2-9TJQKA][shdc]$/.test(t)) return [[t.slice(0, 2), t.slice(2, 4)]];
  const [body, suit] = t.split('@');
  const m = /^([2-9TJQKA])([2-9TJQKA])([so]?)$/.exec(body);
  if (!m) throw new Error(`Can't read hand "${token}"`);
  const [a, b, kind] = [rankChar(m[1]), rankChar(m[2]), m[3]];
  const out: [Card, Card][] = [];
  if (a === b) {
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) out.push([a + SUITS[i], a + SUITS[j]]);
    return out;
  }
  for (const s1 of SUITS)
    for (const s2 of SUITS) {
      const suited = s1 === s2;
      if (kind === 's' && !suited) continue;
      if (kind === 'o' && suited) continue;
      if (suit && !(suited && s1 === suit)) continue;
      out.push([a + s1, b + s2]);
    }
  return out;
}

/** The live combos of a group: its hands, less any that use a card we can see. */
export function combosOf(group: RangeGroup, dead: Card[]): [Card, Card][] {
  const gone = new Set(dead);
  const seen = new Set<string>();
  const out: [Card, Card][] = [];
  for (const token of group.hands.split(',')) {
    if (!token.trim()) continue;
    for (const c of expandHand(token)) {
      if (gone.has(c[0]) || gone.has(c[1])) continue;
      const key = [...c].sort().join();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

// ── Equity ──────────────────────────────────────────────────────────────────

const strength = (hole: Card[], board: Card[]) => score([...hole, ...board].map(toInt));

/** How often the hero's hand wins against one combo (ties count half), dealing out the river if it's still to come. */
export function equityVs(hero: Card[], villain: Card[], board: Card[]): number {
  if (board.length === 5) {
    const [h, v] = [strength(hero, board), strength(villain, board)];
    return h > v ? 1 : h === v ? 0.5 : 0;
  }
  const used = new Set([...hero, ...villain, ...board]);
  const rest = fullDeck().filter((c) => !used.has(c));
  let won = 0;
  let n = 0;
  for (const turn of board.length === 3 ? rest : [null]) {
    for (const river of rest) {
      if (river === turn) continue;
      const full = turn ? [...board, turn, river] : [...board, river];
      const [h, v] = [strength(hero, full), strength(villain, full)];
      won += h > v ? 1 : h === v ? 0.5 : 0;
      n++;
    }
  }
  return won / n;
}

export interface GroupView {
  group: RangeGroup;
  combos: number;
  /** Combos times how often it plays them this way: its share of the range. */
  weight: number;
  /** The hero's equity against this group. */
  equity: number;
}

/** Each group of the opponent's range: how many combos are live, its share, and how the hero's hand does against it. */
export function analyse(s: Scenario): GroupView[] {
  const dead = [...s.hero.cards, ...s.board];
  return s.range.map((group) => {
    const combos = combosOf(group, dead);
    const eq = combos.length ? combos.reduce((n, c) => n + equityVs(s.hero.cards, c, s.board), 0) / combos.length : 0;
    return { group, combos: combos.length, weight: combos.length * (group.weight ?? 1), equity: eq };
  });
}

/** Hero equity against the groups with these roles, weighted by how much of the range each is. */
export function equityAgainst(views: GroupView[], roles: Role[]): number {
  const picked = views.filter((v) => roles.includes(v.group.role));
  const total = picked.reduce((n, v) => n + v.weight, 0);
  return total ? picked.reduce((n, v) => n + v.weight * v.equity, 0) / total : 0;
}

/** The share of the range (by weighted combos) in these roles. */
export function shareOf(views: GroupView[], roles: Role[]): number {
  const total = views.reduce((n, v) => n + v.weight, 0);
  return total ? views.filter((v) => roles.includes(v.group.role)).reduce((n, v) => n + v.weight, 0) / total : 0;
}

// ── The hand so far ─────────────────────────────────────────────────────────

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
export const streetOfBoard = (board: Card[]): Street => (board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river');

/** Blinds from players who folded preflop, which stay in the pot. */
function deadBlinds(s: Scenario): number {
  const seats = [s.hero.pos, s.villain.pos];
  return (seats.includes('SB') ? 0 : 0.5) + (seats.includes('BB') ? 0 : 1);
}

export interface Replay {
  /** Pot at the decision, counting the bet you're facing. */
  pot: number;
  /** What the hero has to put in to call (0 when it's check or bet). */
  toCall: number;
  /** What each player has left. */
  stacks: Record<Who, number>;
  /** The hand log, street by street. */
  lines: { street: Street; text: string }[];
  /** Pot at the start of each street that was played. */
  potAt: Partial<Record<Street, number>>;
  /** What each player has put in on the decision street so far. */
  bets: Record<Who, number>;
}

export const bb = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1).replace(/\.0$/, '')}bb`;

/** Plays the actions back: the pot, the stacks and the hand log at the decision. Throws on a move that can't happen. */
export function replay(s: Scenario): Replay {
  const name: Record<Who, string> = { hero: 'You', villain: s.villain.pos };
  // "You call", "CO calls".
  const verb = (who: Who, v: string) => (who === 'hero' ? v : v === 'raise to' ? 'raises to' : `${v}s`);
  const stacks: Record<Who, number> = { hero: s.stack, villain: s.stack };
  // Blinds posted by the two players in the hand.
  const posted: Record<Who, number> = { hero: s.hero.pos === 'SB' ? 0.5 : s.hero.pos === 'BB' ? 1 : 0, villain: s.villain.pos === 'SB' ? 0.5 : s.villain.pos === 'BB' ? 1 : 0 };
  let pot = deadBlinds(s);
  let current = 1;
  let street: Street = 'preflop';
  let bet: Record<Who, number> = { ...posted };
  const lines: Replay['lines'] = [];
  const potAt: Replay['potAt'] = {};
  const flush = () => {
    pot += bet.hero + bet.villain;
    stacks.hero -= bet.hero;
    stacks.villain -= bet.villain;
    bet = { hero: 0, villain: 0 };
    current = 0;
  };
  for (const step of s.actions) {
    if (STREETS.indexOf(step.street) < STREETS.indexOf(street)) throw new Error(`${s.id}: ${step.street} after ${street}`);
    if (step.street !== street) {
      flush();
      street = step.street;
      potAt[street] = pot;
    }
    const who = step.who;
    const other: Who = who === 'hero' ? 'villain' : 'hero';
    const label = name[who];
    switch (step.move) {
      case 'check':
        if (bet[other] > bet[who]) throw new Error(`${s.id}: ${label} checks facing a bet`);
        lines.push({ street, text: `${label} ${verb(who, 'check')}` });
        break;
      case 'call':
        if (bet[other] <= bet[who]) throw new Error(`${s.id}: ${label} calls nothing`);
        bet[who] = Math.min(bet[other], stacks[who]);
        lines.push({ street, text: `${label} ${verb(who, 'call')} ${bb(bet[who])}` });
        break;
      case 'bet':
      case 'raise': {
        const to = step.to;
        if (to === undefined || to <= Math.max(current, bet[other])) throw new Error(`${s.id}: ${label} ${step.move} to ${to} isn't more than ${current}`);
        if (to > stacks[who]) throw new Error(`${s.id}: ${label} bets more than their stack`);
        if (step.move === 'bet' && current > 0) throw new Error(`${s.id}: ${label} bets into a bet (that's a raise)`);
        bet[who] = to;
        current = to;
        lines.push({ street, text: `${label} ${verb(who, step.move === 'bet' ? 'bet' : 'raise to')} ${bb(to)}${to === stacks[who] ? ' (all in)' : ''}` });
        break;
      }
    }
  }
  const decision = streetOfBoard(s.board);
  if (street !== decision) {
    flush();
    street = decision;
    potAt[street] = pot;
  }
  const toCall = Math.max(0, bet.villain - bet.hero);
  return { pot: pot + bet.hero + bet.villain, toCall, stacks: { hero: stacks.hero - bet.hero, villain: stacks.villain - bet.villain }, lines, potAt, bets: { ...bet } };
}

// ── The decision ────────────────────────────────────────────────────────────

export interface Option {
  id: OptionId;
  label: string;
  /** Chips the hero puts in with it. */
  amount: number;
}

/** The choices at the decision: fold, call or raise facing a bet; otherwise check or one of three bet sizes. */
export function optionsFor(s: Scenario, r: Replay = replay(s)): Option[] {
  if (r.toCall > 0) {
    // A raise to three times the bet, or all in if that's most of the stack.
    const allIn = r.bets.hero + r.stacks.hero;
    const raiseTo = r.bets.villain * 3 > allIn * 0.6 ? allIn : r.bets.villain * 3;
    return [
      { id: 'fold', label: 'Fold', amount: 0 },
      { id: 'call', label: `Call ${bb(r.toCall)}`, amount: r.toCall },
      { id: 'raise', label: raiseTo === allIn ? `All in (${bb(allIn)})` : `Raise to ${bb(raiseTo)}`, amount: raiseTo },
    ];
  }
  const size = (f: number) => Math.min(r.stacks.hero, Math.round(r.pot * f * 2) / 2);
  return [
    { id: 'check', label: 'Check', amount: 0 },
    { id: 'bet33', label: `Bet ⅓ pot (${bb(size(0.33))})`, amount: size(0.33) },
    { id: 'bet75', label: `Bet ¾ pot (${bb(size(0.75))})`, amount: size(0.75) },
    { id: 'bet125', label: `Overbet (${bb(size(1.25))})`, amount: size(1.25) },
  ];
}

export type Grade = 'best' | 'ok' | 'mistake';
export const gradeOf = (s: Scenario, pick: OptionId): Grade => (pick === s.best ? 'best' : s.alsoOk?.includes(pick) ? 'ok' : 'mistake');

/** Equity needed to call: what you put in over the pot you'd win. */
export const priceToCall = (r: Replay) => r.toCall / (r.pot + r.toCall);
/** How often a bet of this size has to work to show a profit as a bluff. */
export const breakEven = (r: Replay, amount: number) => amount / (r.pot + amount);
