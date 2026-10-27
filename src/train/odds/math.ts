// The sums behind the odds and outs trainer. Everything here is exact: outs and combos are counted card by
// card with the app's own hand evaluator, so no answer in the trainer is typed in by hand.

import { fullDeck, rankOf, suitOf, RANKS, type Card } from '../../game/cards';
import { scoreHand } from '../../game/evaluate';

/** The cards still unseen once these are out. */
export function unseen(...known: Card[][]): Card[] {
  const used = new Set(known.flat());
  return fullDeck().filter((c) => !used.has(c));
}

/**
 * Your outs against a hand you've put them on: the next cards that put you ahead if the board stopped there.
 * `splits` are the cards that leave you tied.
 */
export function countOuts(hero: Card[], villain: Card[], board: Card[]): { outs: Card[]; splits: Card[] } {
  const outs: Card[] = [];
  const splits: Card[] = [];
  for (const c of unseen(hero, villain, board)) {
    const b = board.concat(c);
    const me = scoreHand(hero.concat(b));
    const them = scoreHand(villain.concat(b));
    if (me > them) outs.push(c);
    else if (me === them) splits.push(c);
  }
  return { outs, splits };
}

/** Whether you're winning right now (the board as it is). */
export function ahead(hero: Card[], villain: Card[], board: Card[]): boolean {
  return scoreHand(hero.concat(board)) > scoreHand(villain.concat(board));
}

/** Your exact share of the pot against a known hand by the river (ties count half). */
export function exactEquity(hero: Card[], villain: Card[], board: Card[]): number {
  const rest = unseen(hero, villain, board);
  const need = 5 - board.length;
  let total = 0;
  let won = 0;
  const run = (extra: Card[]) => {
    const b = board.concat(extra);
    const me = scoreHand(hero.concat(b));
    const them = scoreHand(villain.concat(b));
    won += me > them ? 1 : me === them ? 0.5 : 0;
    total++;
  };
  const pick: Card[] = [];
  const deal = (from: number) => {
    if (pick.length === need) return run(pick);
    for (let i = from; i <= rest.length - (need - pick.length); i++) {
      pick.push(rest[i]);
      deal(i + 1);
      pick.pop();
    }
  };
  deal(0);
  return won / total;
}

/** n choose k. */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/** The chance of hitting one of `outs` cards with `cards` to come from `left` unseen cards. */
export function hitChance(outs: number, left: number, cards: 1 | 2): number {
  return cards === 1 ? outs / left : 1 - choose(left - outs, 2) / choose(left, 2);
}

/** The rule of 2 and 4: outs × 2 with one card to come, × 4 with two (as a share, capped at 100%). */
export const ruleOf = (outs: number, cards: 1 | 2) => Math.min(1, (outs * (cards === 1 ? 2 : 4)) / 100);

// Pot maths. `pot` is what's in the middle before the bet, `bet` the bet you face (or make).

/** The equity you need to call: what you put in over the pot you'd win including your call. */
export const potOddsNeed = (pot: number, bet: number) => bet / (pot + 2 * bet);
/** How often you must defend so a bluff with any two cards doesn't profit. */
export const mdf = (pot: number, bet: number) => pot / (pot + bet);
/** How often a pure bluff must work to break even (alpha). */
export const alpha = (pot: number, bet: number) => bet / (pot + bet);
/** On the river, the share of a betting range that can be bluffs so a bluff-catcher breaks even. */
export const bluffShare = (pot: number, bet: number) => bet / (pot + 2 * bet);
/** What else you must win later so a call with this equity breaks even. */
export const impliedNeed = (pot: number, bet: number, eq: number) => ((1 - eq) * bet) / eq - (pot + bet);
/** A call's EV in chips: you win the pot and their bet `eq` of the time, lose your call the rest. */
export const callEV = (pot: number, bet: number, eq: number) => eq * (pot + bet) - (1 - eq) * bet;
/** A pure bluff's EV: win the pot when they fold, lose the bet when they call. */
export const bluffEV = (pot: number, bet: number, fold: number) => fold * pot - (1 - fold) * bet;
/** A semi-bluff all-in's EV: win the pot when they fold; when they call, your equity in the bigger pot minus the bet. */
export const semiBluffEV = (pot: number, bet: number, fold: number, eq: number) => fold * pot + (1 - fold) * (eq * (pot + 2 * bet) - bet);

// Hand classes: "AA", "AKs", "AKo", "AK" (suited and offsuit), optionally both cards of one suit.

export interface HandClass {
  cls: string;
  /** Only combos with both cards of this suit (a flush draw, say). */
  suit?: string;
}

export function combosOf(h: HandClass, dead: Card[]): [Card, Card][] {
  const [a, b, kind] = [h.cls[0], h.cls[1], h.cls[2] as 's' | 'o' | undefined];
  if (!RANKS.includes(a) || !RANKS.includes(b)) throw new Error(`Bad hand class ${h.cls}`);
  const live = unseen(dead);
  const out: [Card, Card][] = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const [x, y] = [live[i], live[j]];
      const hit = (x[0] === a && y[0] === b) || (x[0] === b && y[0] === a);
      if (!hit) continue;
      const suited = suitOf(x) === suitOf(y);
      if (a === b && kind) continue;
      if (kind === 's' && !suited) continue;
      if (kind === 'o' && suited) continue;
      if (h.suit && (suitOf(x) !== h.suit || suitOf(y) !== h.suit)) continue;
      out.push(rankOf(x) >= rankOf(y) ? [x, y] : [y, x]);
    }
  }
  return out;
}

export const countCombos = (classes: HandClass[], dead: Card[]) => classes.reduce((n, h) => n + combosOf(h, dead).length, 0);

/** Starting-hand combos with nothing dead: 6 for a pair, 4 suited, 12 offsuit, 16 either. */
export const baseCombos = (h: HandClass) => combosOf(h, []).length;
