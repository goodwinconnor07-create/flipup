import type { BotMove } from '../game/botPlay';
import { hashString, seededRng } from '../game/cards';
import { scoreHand } from '../game/evaluate';
import type { InformationSet } from './information';
import { inferRanges, sampleDeal } from './ranges';

/**
 * The pot-odds check: the last word on a fold, after the model, the bot's style and the everyday habits.
 *
 * Why this exists: the look-ahead model prices a call as if the bot will keep paying on every later street, so a cheap
 * call with a hand that wins often enough can score as a big loss. A real player doesn't think like that. Facing 20 to
 * win 250 they need to win about 7% of the time, and a pair that wins 12 to 16% of the time calls. (The hand that
 * showed it: pocket nines on A-J-10, a one big blind bet into 210, folded nearly every time.)
 *
 * The rule: work out the share of the time a call has to win (the price), estimate how often the hand wins against the
 * public ranges of everyone still in, discount that for streets still to come and players still to act behind, and when
 * the hand clears the price with room to spare, take away nearly all of the fold. The fold goes to the call, never a
 * raise. It only ever lowers a fold, it reads only public information and the bot's own cards, and it leaves big
 * commitments (over a third of the bot's chips, or a price over 30%) to the model, which has more to go on there.
 */

/** The dearest price this checks: a bet of about three quarters of the pot. */
export const MAX_PRICE = 0.3;
/** Calls bigger than this share of the bot's chips are left to the model. */
export const MAX_STACK_SHARE = 1 / 3;
/** How far over the price the hand must be before the check steps in, in equity. */
export const MARGIN = 0.025;
/** The fold left when the hand clears the price just barely, and when it clears it twice over. */
export const FOLD_LEFT: [number, number] = [0.08, 0.01];
const SAMPLES = 400;

export interface PotOddsResult {
  distribution: number[];
  /** What changed, for the decision trace; null when nothing did. */
  note: string | null;
  /** The numbers behind it, when the check ran. */
  check?: { price: number; equity: number; realised: number };
}

/** How much of its raw equity a hand gets to keep: all of it on the river, less with streets to come or players behind. */
export function realisation(street: InformationSet['street'], behind: number): number {
  const base = street === 'river' ? 1 : street === 'turn' ? 0.9 : 0.85;
  return Math.max(0.6, base - 0.08 * behind);
}

/** Showdown equity against the public ranges of every live opponent. Seeded by what's visible only. */
export function rangeEquity(i: InformationSet, samples = SAMPLES): number {
  const physical = [...i.players].sort((a, b) => a.seat - b.seat),
    button = physical.findIndex((p) => p.id === i.buttonId);
  const publicOrder = physical.map((_, n) => physical[(button + n + 1) % physical.length]);
  const ranges = inferRanges({ ...i, players: publicOrder }, 'public-range-v2');
  if (!ranges.length) return 1;
  const rng = seededRng(hashString(JSON.stringify([i.hole, i.board, i.actions, 'pot-odds-1'])));
  let won = 0;
  for (let n = 0; n < samples; n++) {
    const deal = sampleDeal(i, ranges, rng);
    const mine = scoreHand([...i.hole, ...deal.board]);
    let ties = 0,
      beaten = false;
    for (const hole of deal.opponents) {
      const s = scoreHand([...hole, ...deal.board]);
      if (s > mine) {
        beaten = true;
        break;
      }
      if (s === mine) ties++;
    }
    if (!beaten) won += 1 / (ties + 1);
  }
  return won / samples;
}

export function applyPotOdds(i: InformationSet, actions: BotMove[], distribution: number[]): PotOddsResult {
  const same: PotOddsResult = { distribution, note: null };
  if (i.street === 'preflop') return same;
  const foldIdx = actions.findIndex((a) => a.move === 'fold'),
    callIdx = actions.findIndex((a) => a.move === 'call');
  if (foldIdx < 0 || callIdx < 0 || distribution[foldIdx] <= FOLD_LEFT[1]) return same;
  const hero = i.players.find((p) => p.id === i.heroId);
  const toCall = i.legal.toCall;
  if (!hero || toCall <= 0) return same;
  const pot = i.players.reduce((s, p) => s + p.total, 0);
  const price = toCall / (pot + toCall);
  if (price > MAX_PRICE || toCall > (hero.stack + hero.bet) * MAX_STACK_SHARE) return same;
  // Opponents who still have to answer the bet after us could raise and take the rest of the hand away.
  const behind = i.players.filter((p) => p.id !== hero.id && !p.folded && !p.allIn && p.bet < i.currentBet).length;
  const equity = rangeEquity(i);
  const realised = equity * realisation(i.street, behind);
  const check = { price, equity, realised };
  if (realised < price + MARGIN) return { ...same, check };
  // From just clearing the price to twice the price, the fold left shrinks from FOLD_LEFT[0] to FOLD_LEFT[1].
  const t = Math.min(1, (realised - price - MARGIN) / Math.max(1e-9, price));
  const cap = FOLD_LEFT[0] + (FOLD_LEFT[1] - FOLD_LEFT[0]) * t;
  const excess = distribution[foldIdx] - cap;
  if (excess <= 0.002) return { ...same, check };
  const next = [...distribution];
  next[foldIdx] -= excess;
  next[callIdx] += excess;
  return {
    distribution: next,
    note: `pot-odds:${i.street}-${Math.round(realised * 100)}%-vs-${Math.round(price * 100)}%`,
    check,
  };
}
