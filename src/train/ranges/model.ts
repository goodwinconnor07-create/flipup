// Range training: a hand played to the turn or the river, the whole action so far, and one decision. Two to five
// players can be in it. Each scenario spells out every opponent's range at that moment as groups of hands ("sets",
// "missed flush draws"), each with what it does. Everything shown is worked out from that data:
//   - the hand log and the pot, by playing the actions back in turn order (a move out of turn is an error);
//   - how often you win against each group, by dealing every combination out;
//   - what each choice wins on average (its EV), against all the opponents at once.
// The unit tests check that the answer is the choice with the best EV by a clear margin, and that every hand in
// every range is one that player would really have played that way before the flop (see charts.ts).

import { score, toInt } from '../../game/botEval';
import { fullDeck, RANKS, SUITS, type Card } from '../../game/cards';

export type Pos = 'UTG' | 'UTG1' | 'MP' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';

/** One move, by the player in that seat. Bets and raises give the total put in on that street (`to`), in big blinds. */
export interface Step {
  street: Street;
  who: Pos;
  move: 'raise' | 'call' | 'check' | 'bet' | 'fold';
  to?: number;
}

/**
 * What a group of hands does here. When you're facing a bet: the bettor's hands are `value` or `bluff`, and players
 * who already called are `calls`. When it's your turn to check or bet: `calls`, `folds` or `raises` (what that
 * player does if you bet).
 */
export type Role = 'value' | 'bluff' | 'calls' | 'folds' | 'raises';

export interface RangeGroup {
  label: string;
  /** Hands, like "99, 55, K8s, AhQh, AQs@h" (AQs@h is only the heart combo). */
  hands: string;
  role: Role;
  /** When you can bet: what these hands do against a ⅓-pot bet, if that's different from `role` (a ¾-pot bet). */
  small?: Role;
  /** ...and against an overbet, if that's different. */
  big?: Role;
  /** How often it plays these hands this way (1 = always). */
  weight?: number;
}

/** A read on one street: what the action there says about the hands. */
export interface Clue {
  street: Street;
  text: string;
}

export type OptionId = 'fold' | 'call' | 'raise' | 'check' | 'bet33' | 'bet75' | 'bet125';

/** Which preflop range a player is playing from (see charts.ts). */
export type ChartKey = string;

export interface Opponent {
  pos: Pos;
  /** How they play, in a few words ("Tight regular", "Loose live player"). */
  type: string;
  /** The hands they'd play the way they did before the flop. Every hand in `range` has to be in it. */
  pre: ChartKey;
  /** Their range at the decision, grouped. Empty if they folded. */
  range: RangeGroup[];
}

export interface Scenario {
  id: string;
  title: string;
  /** What it teaches, for the list ("Polarised ranges", "Thin value"...). */
  concept: string;
  /** Six-handed (default) or a nine-handed live table. */
  table?: 6 | 9;
  hero: { pos: Pos; cards: [Card, Card]; pre: ChartKey };
  opponents: Opponent[];
  /** Stacks at the start, in big blinds (everyone, unless `stacks` says otherwise for a seat). */
  stack: number;
  /** A different starting stack for some seats (live tables and tournaments rarely have everyone even). */
  stacks?: Partial<Record<Pos, number>>;
  /** A tournament's big blind ante: dead money the big blind puts in before the cards are dealt. */
  ante?: number;
  /** A cash game (default) or a tournament. */
  format?: 'cash' | 'tournament';
  /** Four or five cards: the decision is on the turn or the river. */
  board: Card[];
  actions: Step[];
  best: OptionId;
  /** Close enough to the best play to count as a good answer. */
  alsoOk?: OptionId[];
  /** When the best play is to check: the bet it's measured against (default ¾ pot). */
  compare?: OptionId;
  clues: Clue[];
  /** Why the best play is best, in a few sentences. */
  why: string;
}

// ── Hands and ranges ────────────────────────────────────────────────────────

const rankIndex = (c: string) => {
  const i = RANKS.indexOf(c.toUpperCase());
  if (i < 0) throw new Error(`Bad rank ${c}`);
  return i;
};

/** One hand class (AKs, AKo, AK, QQ), optionally one suit (AKs@h), as combos. */
function classCombos(hi: number, lo: number, kind: string, suit?: string): [Card, Card][] {
  const [a, b] = [RANKS[hi], RANKS[lo]];
  const out: [Card, Card][] = [];
  if (hi === lo) {
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

/**
 * Every combo a hand string stands for: AhKh (one combo), AKs@d (the diamond one), AKs, AKo, AK, QQ, and the usual
 * shorthand 22+ (every pair from 22 up), ATs+ (ATs to AKs), A2s-A5s, 66-99.
 */
export function expandHand(token: string): [Card, Card][] {
  const t = token.trim();
  if (/^[2-9TJQKA][shdc][2-9TJQKA][shdc]$/.test(t)) return [[t.slice(0, 2), t.slice(2, 4)]];
  const [body, suit] = t.split('@');
  const dash = /^([2-9TJQKA])([2-9TJQKA])([so]?)-([2-9TJQKA])([2-9TJQKA])([so]?)$/.exec(body);
  if (dash) {
    const [a1, b1, k1, a2, b2] = [rankIndex(dash[1]), rankIndex(dash[2]), dash[3], rankIndex(dash[4]), rankIndex(dash[5])];
    const out: [Card, Card][] = [];
    if (a1 === b1 && a2 === b2) {
      for (let r = Math.min(a1, a2); r <= Math.max(a1, a2); r++) out.push(...classCombos(r, r, ''));
      return out;
    }
    if (a1 !== a2) throw new Error(`Can't read range "${token}"`);
    for (let r = Math.min(b1, b2); r <= Math.max(b1, b2); r++) out.push(...classCombos(a1, r, k1, suit));
    return out;
  }
  const m = /^([2-9TJQKA])([2-9TJQKA])([so]?)(\+?)$/.exec(body);
  if (!m) throw new Error(`Can't read hand "${token}"`);
  let [hi, lo] = [rankIndex(m[1]), rankIndex(m[2])];
  if (lo > hi) [hi, lo] = [lo, hi];
  const [kind, plus] = [m[3], m[4] === '+'];
  if (!plus) return classCombos(hi, lo, kind, suit);
  const out: [Card, Card][] = [];
  if (hi === lo) for (let r = hi; r < RANKS.length; r++) out.push(...classCombos(r, r, ''));
  else for (let r = lo; r < hi; r++) out.push(...classCombos(hi, r, kind, suit));
  return out;
}

const comboKey = (c: [Card, Card]) => [...c].sort().join();

/** The combos of a hand list, each once. */
export function expandRange(text: string): [Card, Card][] {
  const seen = new Set<string>();
  const out: [Card, Card][] = [];
  for (const token of text.split(',')) {
    if (!token.trim()) continue;
    for (const c of expandHand(token)) {
      const key = comboKey(c);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

/** The live combos of a group: its hands, less any that use a card we can see. */
export function combosOf(group: RangeGroup, dead: Card[]): [Card, Card][] {
  const gone = new Set(dead);
  return expandRange(group.hands).filter((c) => !gone.has(c[0]) && !gone.has(c[1]));
}

export { comboKey };

// ── The hand so far ─────────────────────────────────────────────────────────

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const SEATS: Record<6 | 9, Pos[]> = {
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};
export const streetOfBoard = (board: Card[]): Street => (board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river');
export const bb = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1).replace(/\.0$/, '')}bb`;
export const seatsOf = (s: Scenario): Pos[] => SEATS[s.table ?? 6];

export interface Replay {
  /** Pot at the decision, counting any bet you're facing. */
  pot: number;
  /** What the hero has to put in to call (0 when it's check or bet). */
  toCall: number;
  /** What each player in the hand has left. */
  stacks: Partial<Record<Pos, number>>;
  /** What each player has put in on the decision street so far. */
  bets: Partial<Record<Pos, number>>;
  /** The hand log, street by street: each move, who made it, and what they had left behind afterwards. */
  lines: { street: Street; text: string; who?: Pos; left?: number }[];
  /** Each player's stack at the start of the hand. */
  start: Partial<Record<Pos, number>>;
  /** The stacks of the players still in at the start of each street after preflop. */
  stacksAt: Partial<Record<Street, Partial<Record<Pos, number>>>>;
  /** Pot at the start of each street that was played. */
  potAt: Partial<Record<Street, number>>;
  /** Who acts next (it has to be you). */
  next: Pos | null;
  /** Opponents still in the hand at the decision. */
  live: Pos[];
  /** Opponents who still have to act on this street after you. */
  behind: Pos[];
}

/**
 * Plays the actions back in turn order, like a dealer would: blinds, then round the table preflop (players not in
 * the hand fold when it's their turn), then from the small blind on each later street. Throws on a move out of
 * turn or one that can't be made (checking facing a bet, betting more than your stack).
 */
export function replay(s: Scenario): Replay {
  const seats = seatsOf(s);
  const inHand = [s.hero.pos, ...s.opponents.map((o) => o.pos)];
  for (const p of inHand) if (!seats.includes(p)) throw new Error(`${s.id}: no ${p} at a ${seats.length}-handed table`);
  if (new Set(inHand).size !== inHand.length) throw new Error(`${s.id}: two players in one seat`);
  const name = (p: Pos) => (p === s.hero.pos ? 'You' : p);
  const verb = (p: Pos, v: string) => (p === s.hero.pos ? v : v === 'raise to' ? 'raises to' : v === 'fold' ? 'folds' : `${v}s`);

  const startOf = (p: Pos) => s.stacks?.[p] ?? s.stack;
  const stack: Partial<Record<Pos, number>> = Object.fromEntries(seats.map((p) => [p, inHand.includes(p) ? startOf(p) : 0]));
  const start: Replay['start'] = Object.fromEntries(inHand.map((p) => [p, startOf(p)]));
  const folded = new Set<Pos>();
  const allIn = new Set<Pos>();
  const lines: Replay['lines'] = [];
  const potAt: Replay['potAt'] = {};
  const stacksAt: Replay['stacksAt'] = {};
  // A big blind ante goes straight into the pot.
  const ante = s.ante ?? 0;
  let pot = ante;
  let street: Street = 'preflop';
  let bet: Partial<Record<Pos, number>> = { SB: 0.5, BB: 1 };
  if (!inHand.includes('SB')) stack.SB = 0.5;
  if (!inHand.includes('BB')) stack.BB = 1 + ante;
  stack.BB = (stack.BB ?? 0) - ante;
  /** What a player has behind right now, after what they've put in on this street. */
  const behindOf = (p: Pos) => Math.round(((stack[p] ?? 0) - (bet[p] ?? 0)) * 100) / 100;
  const snapshot = () => Object.fromEntries(inHand.filter((p) => !folded.has(p)).map((p) => [p, stack[p] ?? 0]));
  let current = 1;
  let acted = new Set<Pos>();
  let last: Pos | null = null;
  const order = () => (street === 'preflop' ? seats : (['SB', 'BB', ...seats.filter((p) => p !== 'SB' && p !== 'BB')] as Pos[]));

  /** Who has to act next on this street, folding anyone not in the hand as their turn comes. Null when it's over. */
  const nextToAct = (): Pos | null => {
    const o = order();
    const start = last === null ? 0 : (o.indexOf(last) + 1) % o.length;
    for (let i = 0; i < o.length; i++) {
      const p = o[(start + i) % o.length];
      if (folded.has(p) || allIn.has(p)) continue;
      const owes = (bet[p] ?? 0) < current;
      if (acted.has(p) && !owes) continue;
      if (!inHand.includes(p)) {
        // Not in this hand: they fold when it's their turn.
        folded.add(p);
        lines.push({ street, text: `${p} folds` });
        last = p;
        return nextToAct();
      }
      return p;
    }
    return null;
  };
  const endStreet = () => {
    for (const p of seats) {
      pot += bet[p] ?? 0;
      stack[p] = (stack[p] ?? 0) - (bet[p] ?? 0);
    }
    bet = {};
    current = 0;
    acted = new Set();
    last = null;
  };

  for (const step of s.actions) {
    if (step.street !== street) {
      if (STREETS.indexOf(step.street) !== STREETS.indexOf(street) + 1) throw new Error(`${s.id}: ${step.street} after ${street}`);
      if (nextToAct() !== null) throw new Error(`${s.id}: the ${street} isn't over before the ${step.street}`);
      endStreet();
      street = step.street;
      potAt[street] = pot;
      stacksAt[street] = snapshot();
    }
    const expected = nextToAct();
    if (step.who !== expected) throw new Error(`${s.id}: ${step.who} acts on the ${street}, but it's ${expected ?? 'nobody'}'s turn`);
    const p = step.who;
    const have = (stack[p] ?? 0) - (bet[p] ?? 0);
    switch (step.move) {
      case 'fold':
        folded.add(p);
        lines.push({ street, text: `${name(p)} ${verb(p, 'fold')}`, who: p });
        break;
      case 'check':
        if ((bet[p] ?? 0) < current) throw new Error(`${s.id}: ${p} checks facing a bet`);
        lines.push({ street, text: `${name(p)} ${verb(p, 'check')}`, who: p });
        break;
      case 'call': {
        if ((bet[p] ?? 0) >= current) throw new Error(`${s.id}: ${p} calls nothing`);
        const put = Math.min(current - (bet[p] ?? 0), have);
        bet[p] = (bet[p] ?? 0) + put;
        if (put === have) allIn.add(p);
        // Calling the big blind before anyone raises is a limp (the small blind completes).
        const word = street === 'preflop' && current === 1 ? (p === 'SB' ? 'complete' : 'limp') : 'call';
        lines.push({ street, text: `${name(p)} ${verb(p, word)}${word === 'call' ? ` ${bb(bet[p]!)}` : ''}${allIn.has(p) ? ' (all in)' : ''}`, who: p, left: behindOf(p) });
        break;
      }
      case 'bet':
      case 'raise': {
        const to = step.to;
        if (step.move === 'bet' && current > 0) throw new Error(`${s.id}: ${p} bets into a bet (that's a raise)`);
        if (step.move === 'raise' && current === 0) throw new Error(`${s.id}: ${p} raises nothing (that's a bet)`);
        if (to === undefined || to <= current) throw new Error(`${s.id}: ${p} ${step.move} to ${to} isn't more than ${current}`);
        const put = to - (bet[p] ?? 0);
        if (put > have + 1e-9) throw new Error(`${s.id}: ${p} bets more than their stack`);
        bet[p] = to;
        current = to;
        acted = new Set();
        if (Math.abs(put - have) < 1e-9) allIn.add(p);
        lines.push({ street, text: `${name(p)} ${verb(p, step.move === 'bet' ? 'bet' : 'raise to')} ${bb(to)}${allIn.has(p) ? ' (all in)' : ''}`, who: p, left: behindOf(p) });
        break;
      }
    }
    acted.add(p);
    last = p;
  }

  // On to the decision street if the last street finished.
  const decision = streetOfBoard(s.board);
  let next = nextToAct();
  if (next === null && street !== decision) {
    if (STREETS.indexOf(decision) !== STREETS.indexOf(street) + 1) throw new Error(`${s.id}: the actions stop on the ${street}`);
    endStreet();
    street = decision;
    potAt[street] = pot;
    stacksAt[street] = snapshot();
    next = nextToAct();
  }
  const live = s.opponents.map((o) => o.pos).filter((p) => !folded.has(p));
  const toCall = Math.max(0, current - (bet[s.hero.pos] ?? 0));
  // Everyone who'd still have to act if you called or checked now.
  const behind = live.filter((p) => !allIn.has(p) && (!acted.has(p) || (bet[p] ?? 0) < current));
  const streetBets = { ...bet };
  const total = pot + seats.reduce((n, p) => n + (bet[p] ?? 0), 0);
  const left = Object.fromEntries(inHand.map((p) => [p, (stack[p] ?? 0) - (bet[p] ?? 0)]));
  return { pot: total, toCall, stacks: left, bets: streetBets, lines, potAt, next, live, behind, start, stacksAt };
}

// ── The decision ────────────────────────────────────────────────────────────

export interface Option {
  id: OptionId;
  label: string;
  /** Chips the hero puts in with it (on top of what's already in this street). */
  amount: number;
}

/** The choices at the decision: fold, call or raise facing a bet; otherwise check or one of three bet sizes. */
export function optionsFor(s: Scenario, r: Replay = replay(s)): Option[] {
  const mine = r.stacks[s.hero.pos] ?? 0;
  if (r.toCall > 0) {
    const facing = Math.max(...Object.values(r.bets).map((b) => b ?? 0));
    const already = r.bets[s.hero.pos] ?? 0;
    // A raise to three times the bet, or all in if that's most of the stack.
    const allIn = already + mine;
    const raiseTo = facing * 3 > allIn * 0.6 ? allIn : facing * 3;
    return [
      { id: 'fold', label: 'Fold', amount: 0 },
      { id: 'call', label: `Call ${bb(Math.min(r.toCall, mine))}`, amount: Math.min(r.toCall, mine) },
      { id: 'raise', label: raiseTo === allIn ? `All in (${bb(allIn)})` : `Raise to ${bb(raiseTo)}`, amount: raiseTo - already },
    ];
  }
  // Nobody can be made to put in more than they have: a bet is capped at the biggest stack still against you.
  const cover = Math.max(0, ...r.live.map((p) => r.stacks[p] ?? 0));
  const size = (f: number) => Math.min(mine, cover, Math.round(r.pot * f * 2) / 2);
  return [
    { id: 'check', label: 'Check', amount: 0 },
    { id: 'bet33', label: `Bet ⅓ pot (${bb(size(0.33))})`, amount: size(0.33) },
    { id: 'bet75', label: `Bet ¾ pot (${bb(size(0.75))})`, amount: size(0.75) },
    { id: 'bet125', label: `Overbet (${bb(size(1.25))})`, amount: size(1.25) },
  ];
}

export type Grade = 'best' | 'ok' | 'mistake';
export const gradeOf = (s: Scenario, pick: OptionId): Grade => (pick === s.best ? 'best' : s.alsoOk?.includes(pick) ? 'ok' : 'mistake');

// ── Equity and EV ───────────────────────────────────────────────────────────

const ints = (cards: Card[]) => cards.map(toInt);

/** A seeded random number generator, so the same scenario always gives the same numbers. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How often the hero's hand wins against one combo (ties count half), dealing the rest of the board if it's to come. */
export function equityVs(hero: Card[], villain: Card[], board: Card[]): number {
  const used = new Set([...hero, ...villain, ...board]);
  const rest = fullDeck().filter((c) => !used.has(c));
  const [h, v, b] = [ints(hero), ints(villain), ints(board)];
  const run = (extra: number[]) => {
    const [hs, vs] = [score([...h, ...b, ...extra]), score([...v, ...b, ...extra])];
    return hs > vs ? 1 : hs === vs ? 0.5 : 0;
  };
  if (board.length === 5) return run([]);
  const r = ints(rest);
  let won = 0;
  let n = 0;
  if (board.length === 4) for (const x of r) (won += run([x])), n++;
  else
    for (let i = 0; i < r.length; i++)
      for (let j = i + 1; j < r.length; j++) {
        won += run([r[i], r[j]]);
        n++;
      }
  return won / n;
}

export interface GroupView {
  group: RangeGroup;
  combos: number;
  /** Combos times how often it plays them this way: its share of that player's range. */
  weight: number;
  /** The hero's equity against this group on its own. */
  equity: number;
}

export interface OpponentView {
  opponent: Opponent;
  groups: GroupView[];
}

/** Each live opponent's range, group by group: how many combos, its share, and how the hero's hand does against it. */
export function analyse(s: Scenario, r: Replay = replay(s)): OpponentView[] {
  const dead = [...s.hero.cards, ...s.board];
  return s.opponents
    .filter((o) => r.live.includes(o.pos))
    .map((opponent) => ({
      opponent,
      groups: opponent.range.map((group) => {
        const combos = combosOf(group, dead);
        const eq = combos.length ? combos.reduce((n, c) => n + equityVs(s.hero.cards, c, s.board), 0) / combos.length : 0;
        return { group, combos: combos.length, weight: combos.length * (group.weight ?? 1), equity: eq };
      }),
    }));
}

interface Entry {
  cards: [number, number];
  role: Role;
  weight: number;
}

/** A group's response to a bet of this size. */
export const roleFor = (g: RangeGroup, bet?: OptionId): Role => (bet === 'bet33' ? (g.small ?? g.role) : bet === 'bet125' ? (g.big ?? g.role) : g.role);

/** One opponent's range as weighted combos (ints), for dealing, with each hand's response to `bet`. */
function entries(o: Opponent, dead: Card[], bet?: OptionId): Entry[] {
  return o.range.flatMap((g) => combosOf(g, dead).map((c) => ({ cards: [toInt(c[0]), toInt(c[1])] as [number, number], role: roleFor(g, bet), weight: g.weight ?? 1 })));
}

/** The hero's share of the pot at showdown against these hands (ties split). */
function share(hero: number[], others: number[][], board: number[]): number {
  const mine = score([...hero, ...board]);
  let best = 0;
  let ties = 0;
  for (const o of others) {
    const v = score([...o, ...board]);
    if (v > mine) return 0;
    if (v > best) [best, ties] = [v, 0];
    if (v === mine) ties++;
  }
  return 1 / (ties + 1);
}

export interface Spot {
  /** Your share of the pot if it went to showdown now against everyone still in. */
  equity: number;
  /** Facing a bet: the share you need to call, and what calling wins on average (in big blinds). */
  price?: number;
  evCall?: number;
  /** Your turn to check or bet: what checking wins (your share of the pot), and a bet of `amount`. */
  evCheck?: number;
  bet?: {
    id: OptionId;
    amount: number;
    /** How often everyone folds. */
    allFold: number;
    /** Your share of the pot when someone continues. */
    equityCalled: number;
    ev: number;
  };
}

/** Deals the opponents' hands (and the rest of the board) once per sample: every combination for one opponent, a large seeded sample for more. */
function deal(s: Scenario, r: Replay, visit: (hands: Entry[], board: number[], weight: number) => void, bet?: OptionId) {
  const dead = [...s.hero.cards, ...s.board];
  const opps = s.opponents.filter((o) => r.live.includes(o.pos)).map((o) => entries(o, dead, bet));
  const board = ints(s.board);
  const usedBy = (cards: number[]) => new Set(cards);
  const rest = (taken: Set<number>) => ints(fullDeck()).filter((c) => !taken.has(c));
  const heroInts = ints(s.hero.cards);
  if (opps.length === 1) {
    for (const e of opps[0]) {
      if (board.length === 5) visit([e], board, e.weight);
      else {
        const left = rest(usedBy([...heroInts, ...board, ...e.cards]));
        for (const x of left) visit([e], [...board, x], e.weight / left.length);
      }
    }
    return;
  }
  const random = rng(s.id);
  const cum = opps.map((list) => {
    let t = 0;
    return list.map((e) => (t += e.weight));
  });
  const pick = (k: number) => {
    const c = cum[k];
    const x = random() * c[c.length - 1];
    let lo = 0;
    let hi = c.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (c[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return opps[k][lo];
  };
  // Three or more opponents: half the deals (the hands are big, and the numbers settle by then).
  const N = opps.length >= 3 ? 20000 : 40000;
  let n = 0;
  while (n < N) {
    const hands = opps.map((_, k) => pick(k));
    const cards = hands.flatMap((h) => h.cards);
    // Two players can't hold the same card: deal again (this keeps the odds exact).
    if (new Set(cards).size !== cards.length) continue;
    let full = board;
    if (board.length < 5) {
      const left = rest(usedBy([...heroInts, ...board, ...cards]));
      full = [...board, left[Math.floor(random() * left.length)]];
    }
    visit(hands, full, 1);
    n++;
  }
}

/** The numbers behind the decision: your equity, and the EV of the best play and the one it's measured against. */
export function spotOf(s: Scenario, r: Replay = replay(s), betId?: OptionId): Spot {
  const hero = ints(s.hero.cards);
  const options = optionsFor(s, r);
  let total = 0;
  let eq = 0;
  if (r.toCall > 0) {
    deal(s, r, (hands, board, w) => {
      total += w;
      eq += w * share(hero, hands.map((h) => h.cards), board);
    });
    const equity = eq / total;
    const call = options.find((o) => o.id === 'call')!.amount;
    // All in for less than the bet: the part of it you can't match goes back to the bettor.
    const pot = r.pot - Math.max(0, r.toCall - call);
    return { equity, price: call / (pot + call), evCall: equity * (pot + call) - call };
  }
  const id = betId ?? (s.best.startsWith('bet') ? s.best : (s.compare ?? 'bet75'));
  const b = options.find((o) => o.id === id)!.amount;
  let folds = 0;
  let calledW = 0;
  let calledEq = 0;
  let ev = 0;
  // What each live opponent can put in to call (a short stack calls all in for less).
  const caps = s.opponents.filter((o) => r.live.includes(o.pos)).map((o) => Math.min(b, r.stacks[o.pos] ?? b));
  deal(s, r, (hands, board, w) => {
    total += w;
    eq += w * share(hero, hands.map((h) => h.cards), board);
    const go = hands.map((h, k) => ({ h, put: caps[k] })).filter((x) => x.h.role === 'calls' || x.h.role === 'raises');
    if (!go.length) {
      folds += w;
      ev += w * r.pot;
      return;
    }
    const sh = share(hero, go.map((x) => x.h.cards), board);
    // You risk only as much as the biggest call; the rest of your bet comes back.
    const risk = Math.max(...go.map((x) => x.put));
    calledW += w;
    calledEq += w * sh;
    ev += w * (sh * (r.pot + risk + go.reduce((t, x) => t + x.put, 0)) - risk);
  }, id);
  return {
    equity: eq / total,
    evCheck: (eq / total) * r.pot,
    bet: { id, amount: b, allFold: folds / total, equityCalled: calledW ? calledEq / calledW : 0, ev: ev / total },
  };
}
