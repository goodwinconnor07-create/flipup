// Win and tie chances for hands that are face up, given the board so far.
// Shown only once every live hand is exposed (an all-in run-out), so it never gives anything away.

import { fullDeck, hashString, seededRng, type Card } from './cards';
import { scoreHand } from './evaluate';

export interface Equity {
  /** Chance each hand wins outright, 0 to 1, in the order given. */
  win: number[];
  /** Chance each hand splits the pot. */
  tie: number[];
}

/** Above this many possible run-outs, sample instead of counting every one. */
const EXACT_LIMIT = 3000;
const SAMPLES = 6000;

export function equity(hands: Card[][], board: Card[], samples = SAMPLES): Equity {
  const used = new Set([...hands.flat(), ...board]);
  const rest = fullDeck().filter((c) => !used.has(c));
  const need = 5 - board.length;
  const win = new Array<number>(hands.length).fill(0);
  const tie = new Array<number>(hands.length).fill(0);
  let total = 0;

  const score = (extra: Card[]) => {
    const full = extra.length ? board.concat(extra) : board;
    let best = -1;
    let count = 0;
    let winner = -1;
    const scores = hands.map((h) => scoreHand(h.concat(full)));
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > best) {
        best = scores[i];
        count = 1;
        winner = i;
      } else if (scores[i] === best) count++;
    }
    if (count === 1) win[winner]++;
    else for (let i = 0; i < scores.length; i++) if (scores[i] === best) tie[i]++;
    total++;
  };

  if (need <= 0) score([]);
  else if (combinations(rest.length, need) <= EXACT_LIMIT) {
    forEachCombo(rest, need, score);
  } else {
    // Seeded from the cards, so every phone at the table shows the same numbers.
    const rng = seededRng(hashString(hands.flat().join('') + board.join('')));
    const pickFrom = rest.slice();
    for (let s = 0; s < samples; s++) {
      // Partial shuffle: just the cards we need.
      for (let i = 0; i < need; i++) {
        const j = i + Math.floor(rng() * (pickFrom.length - i));
        [pickFrom[i], pickFrom[j]] = [pickFrom[j], pickFrom[i]];
      }
      score(pickFrom.slice(0, need));
    }
  }

  return { win: win.map((w) => w / total), tie: tie.map((t) => t / total) };
}

function combinations(n: number, k: number): number {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c;
}

function forEachCombo(items: Card[], k: number, fn: (combo: Card[]) => void): void {
  const combo: Card[] = [];
  const walk = (start: number) => {
    if (combo.length === k) {
      fn(combo.slice());
      return;
    }
    for (let i = start; i <= items.length - (k - combo.length); i++) {
      combo.push(items[i]);
      walk(i + 1);
      combo.pop();
    }
  };
  walk(0);
}

/**
 * A rough chance of winning against `opponents` random hands, for the bots.
 * Uses the given random source, so it's not repeatable (and doesn't need to be).
 */
export function strengthVsRandom(hole: Card[], board: Card[], opponents: number, rng: () => number, samples = 250): number {
  const used = new Set([...hole, ...board]);
  const rest = fullDeck().filter((c) => !used.has(c));
  const needBoard = 5 - board.length;
  const need = needBoard + opponents * 2;
  let wins = 0;
  for (let s = 0; s < samples; s++) {
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (rest.length - i));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const full = board.concat(rest.slice(0, needBoard));
    const mine = scoreHand(hole.concat(full));
    let beaten = false;
    let ties = 0;
    for (let o = 0; o < opponents; o++) {
      const theirs = scoreHand([rest[needBoard + o * 2], rest[needBoard + o * 2 + 1], ...full]);
      if (theirs > mine) {
        beaten = true;
        break;
      }
      if (theirs === mine) ties++;
    }
    if (!beaten) wins += ties ? 1 / (ties + 1) : 1;
  }
  return wins / samples;
}
