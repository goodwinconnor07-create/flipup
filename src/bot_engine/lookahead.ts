import type { BotMove } from '../game/botPlay';
import type { Card } from '../game/cards';
import { scoreHand } from '../game/evaluate';
import { handBucket } from '../game/handBucket';
import type { InformationSet } from './information';
import { continuationProbability, showdownReturn } from './actionValues';
import { sampleDeal, type OpponentRange } from './ranges';

export function lookaheadCoverage(i: InformationSet): { eligible: boolean; reason: string } {
  const opponents = i.players.filter((p) => p.id !== i.heroId && !p.folded);
  if (i.street !== 'flop' && i.street !== 'turn') return { eligible: false, reason: 'not-flop-or-turn' };
  if (opponents.length !== 1) return { eligible: false, reason: 'multiway' };
  if (opponents[0].allIn || i.players.find((p) => p.id === i.heroId)!.allIn) return { eligible: false, reason: 'all-in' };
  return { eligible: true, reason: 'heads-up-one-street' };
}

/** A continuation policy sees its own cards, the board NOW and public betting context.
 * It never receives the opposing hole cards or the unseen runout used for settlement. */
export function streetIntent(hole: Card[], board: Card[], inPosition: boolean, aggressor: boolean) {
  const bucket = handBucket(hole, board);
  const base = { monster: 0.84, strong: 0.74, top: 0.56, mid: 0.23, draw: 0.38, weak: 0.1, air: 0.06 }[bucket];
  const pressure = (inPosition ? 0.04 : 0) + (aggressor ? 0.035 : 0);
  return {
    betProbability: Math.min(0.9, base + pressure),
    fraction: bucket === 'monster' || bucket === 'strong' ? 0.75 : bucket === 'draw' ? 0.5 : 0.33,
    reason:
      bucket === 'monster' || bucket === 'strong' || bucket === 'top'
        ? 'value'
        : bucket === 'draw'
          ? 'draw'
          : bucket === 'mid'
            ? 'pot-control'
            : 'selective-pressure',
  } as const;
}

/** Current round, one possible re-raise, then one future betting round and showdown.
 * Conditional actions use fixed public-information policies, not per-world perfect play.
 * Common deals and random draws are reused across all root candidates. */
export function estimateLookahead(i: InformationSet, ranges: OpponentRange[], actions: BotMove[], rng: () => number, samples: number) {
  if (!lookaheadCoverage(i).eligible) throw new Error('Unsupported planning state');
  if (!Number.isSafeInteger(samples) || samples < 2 || samples > 512) throw new Error('Invalid planning sample count');
  const hero = i.players.findIndex((p) => p.id === i.heroId);
  const villain = i.players.findIndex((p) => p.id !== i.heroId && !p.folded);
  const seats = [...i.players].sort((a, b) => a.seat - b.seat);
  const button = seats.findIndex((p) => p.id === i.buttonId);
  const order = seats.map((_, k) => seats[(button + k + 1) % seats.length]).filter((p) => !p.folded);
  const heroIp = order.at(-1)?.id === i.heroId;
  const sums = actions.map(() => 0),
    squares = actions.map(() => 0);
  const futureBets = actions.map(() => 0),
    raises = actions.map(() => 0),
    futureCosts = actions.map(() => 0);
  let equitySum = 0,
    equitySquares = 0;
  for (let sample = 0; sample < samples; sample++) {
    const deal = sampleDeal(i, ranges, rng);
    const holes = i.players.map((p) => (p.id === i.heroId ? i.hole : p.id === i.players[villain].id ? deal.opponents[0] : []));
    const scores = i.players.map((p, k) => (p.folded ? -1 : scoreHand([...holes[k], ...deal.board])));
    const share = scores[hero] === scores[villain] ? 0.5 : scores[hero] > scores[villain] ? 1 : 0;
    equitySum += share;
    equitySquares += share * share;
    const draws = Array.from({ length: 8 }, () => rng());
    // Only the next public card is exposed to continuation policies; the remaining
    // river on a flop decision stays hidden until the hypothetical showdown.
    const nextBoard = deal.board.slice(0, i.board.length + 1);
    const nextHero = streetIntent(i.hole, nextBoard, heroIp, false);
    const nextVillain = streetIntent(holes[villain], nextBoard, !heroIp, false);
    const currentVillain = streetIntent(holes[villain], i.board, !heroIp, false);
    actions.forEach((action, at) => {
      if (action.move === 'fold') return;
      const contributions = i.players.map((p) => p.total),
        folded = i.players.map((p) => p.folded);
      const remaining = i.players.map((p) => p.stack);
      let heroCost = 0;
      let lead = action.to !== undefined ? hero : action.move === 'call' ? villain : -1;
      const pot = () => contributions.reduce((s, v) => s + v, 0);
      const put = (who: number, amount: number) => {
        const paid = Math.max(0, Math.min(remaining[who], amount));
        contributions[who] += paid;
        remaining[who] -= paid;
        if (who === hero) heroCost += paid;
        return paid;
      };
      const respond = (who: number, cost: number, board: Card[], draw: number) => {
        const capped = Math.min(remaining[who], cost);
        if (capped <= 0) return;
        const eligible = contributions.reduce((s, v) => s + Math.min(v, contributions[who] + capped), 0);
        if (draw < continuationProbability(holes[who], board, capped, eligible)) put(who, capped);
        else folded[who] = true;
      };
      const rootTo = action.to ?? i.currentBet;
      put(hero, action.move === 'call' ? i.legal.toCall : action.to !== undefined ? action.to - i.players[hero].bet : 0);
      const call = Math.min(remaining[villain], Math.max(0, rootTo - i.players[villain].bet));
      if (call > 0) {
        const eligible = contributions.reduce((s, v) => s + Math.min(v, contributions[villain] + call), 0);
        const canRaise = action.to !== undefined && remaining[villain] > call && remaining[hero] > 0;
        const bucket = handBucket(holes[villain], i.board);
        const raiseChance = bucket === 'monster' ? 0.36 : bucket === 'strong' ? 0.16 : bucket === 'draw' ? 0.035 : 0;
        if (canRaise && draws[1] < raiseChance) {
          const min = rootTo + Math.max(i.bigBlind, rootTo - i.currentBet);
          const maximum = i.players[villain].bet + remaining[villain];
          const target = Math.min(maximum, Math.max(min, Math.round(rootTo * 2.5)));
          put(villain, target - i.players[villain].bet);
          lead = villain;
          raises[at]++;
          respond(hero, Math.max(0, target - rootTo), i.board, draws[2]);
        } else if (draws[0] < continuationProbability(holes[villain], i.board, call, eligible)) put(villain, call);
        else folded[villain] = true;
      } else if (
        action.move === 'check' &&
        !heroIp &&
        !i.currentBet &&
        remaining[hero] > 0 &&
        remaining[villain] > 0 &&
        draws[1] < currentVillain.betProbability
      ) {
        // Checking out of position can face a stab before the next street.
        const amount = Math.min(
          remaining[villain],
          Math.max(i.bigBlind, Math.min(remaining[hero], Math.round(pot() * currentVillain.fraction))),
        );
        lead = villain;
        put(villain, amount);
        respond(hero, amount, i.board, draws[2]);
      }
      if (!folded[hero] && !folded[villain] && remaining[hero] > 0 && remaining[villain] > 0) {
        const before = heroCost;
        const first = heroIp ? villain : hero,
          second = heroIp ? hero : villain;
        const intent = (who: number) => {
          const base = who === hero ? nextHero : nextVillain;
          const retainedLead = who === lead;
          return { ...base, betProbability: Math.min(0.9, base.betProbability + (retainedLead ? 0.035 : 0)) };
        };
        const bet = (who: number, other: number, responseDraw: number) => {
          const amount = Math.min(
            remaining[who],
            Math.max(i.bigBlind, Math.min(remaining[other], Math.round(pot() * intent(who).fraction))),
          );
          put(who, amount);
          if (who === hero) futureBets[at]++;
          respond(other, amount, nextBoard, responseDraw);
        };
        if (draws[3] < intent(first).betProbability) bet(first, second, draws[5]);
        else if (draws[4] < intent(second).betProbability) bet(second, first, draws[6]);
        futureCosts[at] += heroCost - before;
      }
      const value = showdownReturn(i, contributions, folded, scores) - heroCost;
      sums[at] += value;
      squares[at] += value * value;
    });
  }
  const se = (sum: number, square: number) => Math.sqrt(Math.max(0, (square - (sum * sum) / samples) / (samples - 1)) / samples);
  return {
    values: sums.map((s) => s / samples),
    standardErrors: sums.map((s, k) => se(s, squares[k])),
    equity: equitySum / samples,
    equityStandardError: se(equitySum, equitySquares),
    planning: {
      version: 'one-street-1' as const,
      street: i.street,
      nextStreet: i.street === 'flop' ? 'turn' : 'river',
      samples,
      futureBetShare: futureBets.map((n) => n / samples),
      reRaiseShare: raises.map((n) => n / samples),
      futureCostBb: futureCosts.map((n) => n / samples / i.bigBlind),
    },
  };
}
