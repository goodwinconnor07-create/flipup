import type { InformationSet } from './information';
import type { BotMove } from '../game/botPlay';

/** Explicit heuristic reserve for uncertainty, future betting and large commitments.
 * These scores are not solver EVs or calibrated estimates of future betting losses. */
export function decisionRisk(i: InformationSet, actions: BotMove[], values: number[], errors: (number | null)[], equity: number) {
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const opponents = i.players.filter((p) => !p.folded && p.id !== i.heroId);
  const effective = Math.min(hero.stack, Math.max(0, ...opponents.map((p) => p.stack + p.bet - hero.bet)));
  return values.map((v, k) => {
    const a = actions[k];
    if (a.move === 'fold' || a.move === 'check') return v;
    const cost = Math.min(effective, a.to === undefined ? i.legal.toCall : a.to - hero.bet);
    const aggressive = a.to !== undefined;
    const commitment = cost / Math.max(i.bigBlind, effective);
    const reserve = aggressive
      ? cost * ((1 - equity) ** 2 * 0.06 * Math.sqrt(opponents.length) + Math.max(0, commitment - 0.25) * (1 - equity) * 0.12)
      : i.street === 'river'
        ? 0
        : cost * (1 - equity) * 0.025;
    return v - reserve - (aggressive ? 1 : 0.35) * (errors[k] ?? 0);
  });
}
