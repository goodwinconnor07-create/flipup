import type { BotMove } from '../game/botPlay';
import { rankOf, type Card } from '../game/cards';
import { scoreHand } from '../game/evaluate';
import { category, flushDraw, straightOuts } from '../game/handBucket';
import { buildPots } from '../game/holdem';
import type { Seat } from '../game/types';
import type { InformationSet } from './information';
import { sampleDeal, type OpponentRange } from './ranges';

/** A deliberately untrained response model, using hypothetical cards and the current board only. */
export function continuationProbability(hole: Card[], board: Card[], cost: number, pot: number): number {
  if (cost <= 0) return 1;
  const ranks = hole.map(rankOf);
  let strength = ((ranks[0] + ranks[1] - 4) / 24) * 0.55 + (ranks[0] === ranks[1] ? 0.35 : 0);
  if (board.length >= 3) {
    const made = category([...hole, ...board]);
    const boardMade = category(board);
    const pocketPair = ranks[0] === ranks[1];
    const pairedHole = ranks.some((r) => board.some((c) => rankOf(c) === r));
    // A pair entirely on the board is not a made hand in the opponent's private range.
    strength = made > boardMade || pairedHole || pocketPair ? [0.12, 0.48, 0.68, 0.82, 0.9, 0.94, 0.98, 0.995, 0.999][made] : 0.12;
    if (board.length < 5) strength = Math.max(strength, flushDraw(hole, board) ? 0.43 : 0, straightOuts(hole, board) >= 2 ? 0.35 : 0);
  }
  const odds = cost / (pot + cost);
  return Math.max(0.02, Math.min(0.995, 1 / (1 + Math.exp(-(strength - odds - 0.12) / 0.12))));
}

/** Reuse production pot construction, including folded money and unmatched contributions. */
export function showdownReturn(i: InformationSet, contributions: number[], folded: boolean[], scores: number[]): number {
  const seats: Seat[] = i.players.map((p, n) => ({
    playerId: p.id,
    cards: [],
    bet: 0,
    total: contributions[n],
    folded: folded[n],
    allIn: false,
    acted: true,
    shown: false,
    last: null,
  }));
  let payout = 0;
  for (const pot of buildPots(seats)) {
    if (!pot.eligible.includes(i.heroId)) continue;
    const best = Math.max(...pot.eligible.map((id) => scores[i.players.findIndex((p) => p.id === id)]));
    const winners = pot.eligible.filter((id) => scores[i.players.findIndex((p) => p.id === id)] === best);
    if (winners.includes(i.heroId)) payout += pot.amount / winners.length;
  }
  return payout;
}

/** Same hypothetical deals/response draws across candidates reduce comparison noise.
 * Evaluates one betting round followed by showdown; never claims future-street solver EVs.
 */
export function estimateActionValues(
  i: InformationSet,
  ranges: OpponentRange[],
  actions: BotMove[],
  rng: () => number,
  samples: number,
  commitmentAware = false,
) {
  const hero = i.players.findIndex((p) => p.id === i.heroId);
  const sums = actions.map(() => 0),
    squares = actions.map(() => 0);
  let equitySum = 0,
    equitySquares = 0;
  for (let sample = 0; sample < samples; sample++) {
    const deal = sampleDeal(i, ranges, rng);
    const holes = new Map(ranges.map((r, n) => [r.playerId, deal.opponents[n]]));
    const scores = i.players.map((p) => (p.folded ? -1 : scoreHand([...(p.id === i.heroId ? i.hole : holes.get(p.id)!), ...deal.board])));
    const best = Math.max(...scores);
    const equity = scores[hero] === best ? 1 / scores.filter((s) => s === best).length : 0;
    equitySum += equity;
    equitySquares += equity * equity;
    const responseDraws = i.players.map(() => rng());
    actions.forEach((action, at) => {
      if (action.move === 'fold') return;
      const cost = action.move === 'call' ? i.legal.toCall : action.to !== undefined ? action.to - i.players[hero].bet : 0;
      const contributions = i.players.map((p) => p.total);
      const folded = i.players.map((p) => p.folded);
      contributions[hero] += cost;
      i.players.forEach((p, n) => {
        if (n === hero || p.folded || p.allIn) return;
        const call = Math.min(p.stack, Math.max(0, (action.to ?? i.currentBet) - p.bet));
        if (!call) return;
        const offeredPot = contributions.reduce((sum, total) => sum + Math.min(total, p.total + call), 0);
        let probability = continuationProbability(holes.get(p.id)!, i.board, call, offeredPot);
        if (commitmentAware && i.street === 'preflop') {
          // Already committed callers/raisers are harder to fold than untouched blinds.
          // Also account for the fraction of their starting stack the new price costs.
          const invested = p.bet / Math.max(i.bigBlind, p.stack + p.total);
          const price = call / Math.max(i.bigBlind, p.stack + p.total);
          const logit = Math.log(probability / (1 - probability)) + Math.min(1.4, invested * 5) - Math.max(0, price - 0.2) * 1.5;
          probability = Math.max(0.02, Math.min(0.995, 1 / (1 + Math.exp(-logit))));
        }
        if (responseDraws[n] < probability) contributions[n] += call;
        else folded[n] = true;
      });
      const value = showdownReturn(i, contributions, folded, scores) - cost;
      sums[at] += value;
      squares[at] += value * value;
    });
  }
  const standardError = (sum: number, square: number) =>
    samples > 1 ? Math.sqrt(Math.max(0, (square - (sum * sum) / samples) / (samples - 1)) / samples) : null;
  return {
    values: sums.map((sum) => sum / samples),
    standardErrors: sums.map((sum, n) => standardError(sum, squares[n])),
    equity: equitySum / samples,
    equityStandardError: standardError(equitySum, equitySquares),
  };
}
