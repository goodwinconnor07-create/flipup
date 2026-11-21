import type { InformationSet } from './information';

/** Public commitments only. This is a heuristic context, never a solved chart projection. */
export function preflopContext(i: InformationSet) {
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const live = i.players.filter((p) => !p.folded && p.id !== i.heroId);
  const raises = i.actions.filter(
    (a) => a.street === 'preflop' && !a.outOfTurn && (a.move === 'raise' || a.move === 'bet' || (a.move === 'allin' && a.to > i.bigBlind)),
  );
  // An all-in call is logged as allin too: count only increases in the running price.
  let price = i.bigBlind,
    raiseCount = 0,
    lastRaiser: string | undefined,
    callers = new Set<string>();
  for (const a of i.actions.filter((a) => a.street === 'preflop' && !a.outOfTurn)) {
    if (raises.includes(a) && a.to > price) {
      price = a.to;
      raiseCount++;
      lastRaiser = a.playerId;
      callers = new Set();
    } else if ((a.move === 'call' || a.move === 'allin') && a.playerId !== lastRaiser) callers.add(a.playerId);
  }
  const maxOpponentTo = Math.max(0, ...live.map((p) => p.bet + p.stack));
  const effectiveTo = Math.min(hero.bet + hero.stack, maxOpponentTo);
  const seats = [...i.players].sort((a, b) => a.seat - b.seat);
  const button = seats.findIndex((p) => p.id === i.buttonId);
  const order = seats.map((_, k) => seats[(button + 1 + k) % seats.length]).filter((p) => !p.folded);
  const inPosition = order.at(-1)?.id === i.heroId;
  const raw =
    raiseCount === 0
      ? i.bigBlind * (2.5 + callers.size)
      : raiseCount === 1
        ? i.currentBet * (inPosition ? 3 : 4) + callers.size * i.currentBet
        : i.currentBet * (inPosition ? 2.2 : 2.4);
  const target = Math.round(Math.max(i.legal.minTo, raw));
  const raiseTo = Math.max(i.legal.minTo, Math.min(i.legal.maxTo, effectiveTo, target >= effectiveTo * 0.6 ? effectiveTo : target));
  const depthsBb = i.players.map((p) => (p.stack + p.total) / i.bigBlind);
  return {
    raiseCount,
    callers: callers.size,
    lastRaiser,
    inPosition,
    effectiveTo,
    depthsBb,
    unequalStacks: new Set(depthsBb).size > 1,
    coldCall: raiseCount > 0 && callers.size > 0,
    squeeze: raiseCount === 1 && callers.size > 0 && i.legal.canRaise,
    raiseTo,
    allInOpponents: live.filter((p) => p.allIn).length,
  };
}

/** Distinguishes limps/cold calls from repeated aggression, including the price faced. */
export function preflopLikelihood(i: InformationSet, playerId: string, quality: number, suited: boolean, pair: boolean) {
  let price = i.bigBlind,
    raises = 0,
    weight = 1;
  const bets = new Map(i.players.map((p) => [p.id, 0]));
  for (const a of i.actions.filter((a) => a.street === 'preflop' && !a.outOfTurn)) {
    const aggressive = (a.move === 'raise' || a.move === 'bet' || a.move === 'allin') && a.to > price;
    if (a.playerId === playerId) {
      if (aggressive) {
        const strengthRequired = raises === 0 ? 0.42 : raises === 1 ? 0.66 : 0.8;
        weight *= 0.015 + 0.985 / (1 + Math.exp(-(quality - strengthRequired) / 0.1));
      } else if (a.move === 'call' || a.move === 'allin') {
        const cost = Math.max(0, a.to - (bets.get(playerId) ?? 0));
        const start = i.players.find((p) => p.id === playerId)!;
        const fraction = cost / Math.max(i.bigBlind, start.stack + start.total);
        const threshold = raises === 0 ? 0.22 : Math.min(0.8, 0.35 + fraction * 0.9 + Math.max(0, raises - 1) * 0.12);
        weight *= 0.04 + 0.96 / (1 + Math.exp(-(quality + (suited || pair ? 0.08 : 0) - threshold) / 0.14));
      }
    }
    if (aggressive) {
      price = a.to;
      raises++;
    }
    if (a.move !== 'fold' && a.move !== 'check') bets.set(a.playerId, a.to);
  }
  return Math.max(1e-12, weight);
}
