import type { BotMove } from '../game/botPlay';
import type { InformationSet } from './information';

/**
 * Bet sizes people use: the everyday bots' minimum bet into a real pot, mapped to a size a person would pick.
 *
 * Why this exists: the menu of sizes always holds the minimum bet, and the model scores it close to a check (it risks
 * little and wins a little), so it was picked a lot. Measured over 900 Casual hands before this, 30% of the bots' bets
 * after the flop were the minimum, often one big blind into ten or more. Real players at low stakes almost never do
 * that. (The hand that showed it: pocket fives on A-J-10, betting 20 into 210 and again into 270.)
 *
 * The rule: when no one has bet yet and the minimum is under a quarter of the pot, the bot keeps at most a small share
 * of its minimum bet (`MIN_BET_LEFT`, some players really do it). The rest is shared between the smallest real size on
 * the menu (about a third of the pot) and the check, by how the model rates the two: a hand that only wanted a cheap
 * look at the pot mostly checks, and a hand that wanted to bet bets a real size. It never touches a raise, a
 * bet into a small pot, a short stack's bet or the all-in, and reads nothing but the bot's own decision numbers.
 */

/** The most a bot keeps of a minimum bet into a real pot: bots bet about half the time they can, so about 3% of bets. */
export const MIN_BET_LEFT = 0.015;
/** A minimum bet under this share of the pot counts as a token bet. */
export const TOKEN_SHARE = 0.25;
/** The model's own temperature (a share of the pot): how sharply a better rating wins the token bet's share. */
export const SIZE_TEMPERATURE = 0.08;

export interface SizingResult {
  distribution: number[];
  /** What changed, for the decision trace; null when nothing did. */
  note: string | null;
}

export function applyBetSizing(i: InformationSet, actions: BotMove[], distribution: number[], values: number[] | null): SizingResult {
  const same: SizingResult = { distribution, note: null };
  if (i.street === 'preflop' || !i.legal.canCheck || i.currentBet > 0) return same;
  const hero = i.players.find((p) => p.id === i.heroId);
  if (!hero) return same;
  const pot = i.players.reduce((s, p) => s + p.total, 0);
  const allIn = hero.stack + hero.bet;
  const minIdx = actions.findIndex((a) => a.move === 'bet' && a.to === i.legal.minTo);
  if (minIdx < 0 || distribution[minIdx] <= MIN_BET_LEFT) return same;
  if (i.legal.minTo >= pot * TOKEN_SHARE || i.legal.minTo >= allIn) return same;
  const checkIdx = actions.findIndex((a) => a.move === 'check');
  // The smallest real size: at least a quarter of the pot and not the whole stack.
  let sizeIdx = -1;
  actions.forEach((a, n) => {
    if (a.move !== 'bet' || a.to === undefined || n === minIdx || a.to < pot * TOKEN_SHARE || a.to >= allIn) return;
    if (sizeIdx < 0 || a.to < actions[sizeIdx].to!) sizeIdx = n;
  });
  if (checkIdx < 0 && sizeIdx < 0) return same;
  // Share it between the real size and the check by how the model rates them (the same softmax it uses itself), so a
  // size it rates no better than a check gets at most half; with no ratings, half each.
  let shareToSize = sizeIdx < 0 ? 0 : checkIdx < 0 ? 1 : 0.5;
  if (sizeIdx >= 0 && checkIdx >= 0 && values) {
    const t = Math.max(i.bigBlind * 0.5, pot * SIZE_TEMPERATURE);
    shareToSize = 1 / (1 + Math.exp(Math.max(-40, Math.min(40, (values[checkIdx] - values[sizeIdx]) / t))));
  }
  const excess = distribution[minIdx] - MIN_BET_LEFT;
  const next = [...distribution];
  next[minIdx] -= excess;
  if (sizeIdx >= 0) next[sizeIdx] += excess * shareToSize;
  if (checkIdx >= 0) next[checkIdx] += excess * (1 - shareToSize);
  const toSize = shareToSize >= 0.5;
  return { distribution: next, note: `sizing:token-bet-mostly-to-${toSize ? 'third-pot' : 'check'}` };
}
