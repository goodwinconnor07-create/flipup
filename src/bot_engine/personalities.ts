import type { BotProfile } from './identity';
import type { InformationSet } from './information';
import type { StrategyPrediction } from './strategy';
import { rankOf } from '../game/cards';
import { handBucket } from '../game/handBucket';
import { preflopContext } from './preflopContext';

export const PERSONALITIES = [
  {
    id: 'patient',
    label: 'Patient',
    description: 'Selective hands, smaller pots, cautious river calls.',
    traits: { aggression: 0.25, curiosity: 0.12, riverCaution: 0.9, adaptation: 0.65 },
  },
  {
    id: 'curious',
    label: 'Curious',
    description: 'Sees more flops, chases draws, likes to see your cards.',
    traits: { aggression: 0.32, curiosity: 0.95, riverCaution: 0.2, adaptation: 0.35 },
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'Raises for pressure, uses bigger bets, finds more bluffs.',
    traits: { aggression: 0.9, curiosity: 0.55, riverCaution: 0.35, adaptation: 0.8 },
  },
] as const;
export type PersonalityId = (typeof PERSONALITIES)[number]['id'];
export const isPersonality = (v: unknown): v is PersonalityId => PERSONALITIES.some((p) => p.id === v);
export function withPersonality(profile: BotProfile, id: PersonalityId): BotProfile {
  const spec = PERSONALITIES.find((p) => p.id === id);
  if (!spec) throw new Error('Unknown personality');
  return { ...profile, personality: id, traits: { ...spec.traits } };
}

/** Explicit, authored tendencies. Differences are tested behavior, not calibrated human realism. */
export function personalityWeights(i: InformationSet, prediction: StrategyPrediction, profile: BotProfile) {
  const id = profile.personality;
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const pot = i.players.reduce((s, p) => s + p.total, 0);
  const ranks = i.hole.map(rankOf);
  const quality = Math.min(
    1,
    ((ranks[0] + ranks[1] - 4) / 24) * 0.65 + (ranks[0] === ranks[1] ? 0.35 : 0) + (i.hole[0][1] === i.hole[1][1] ? 0.06 : 0),
  );
  const bucket = i.street === 'preflop' ? null : handBucket(i.hole, i.board);
  const weak = i.street === 'preflop' ? quality < 0.55 : bucket === 'air' || bucket === 'weak';
  const draw = bucket === 'draw';
  return prediction.actions.map((a) => {
    if (a.move === 'check') return id === 'patient' ? 0.5 : id === 'curious' ? 0.2 : -0.3;
    if (a.move === 'fold') return id === 'patient' ? (weak ? 1.5 : 0.5) : id === 'curious' ? -1.1 : -0.35;
    if (a.move === 'call')
      return id === 'curious' ? (draw ? 2.6 : 2.2) : id === 'patient' ? (i.street === 'river' || weak ? -1.2 : -0.2) : -0.7;
    const fraction = (a.to! - hero.bet - i.legal.toCall) / Math.max(i.bigBlind, pot + i.legal.toCall);
    const preferred = id === 'aggressive' ? 0.85 : id === 'patient' ? 0.35 : 0.5;
    const sizing = -Math.min(2, Math.abs(fraction - preferred));
    let pressure = id === 'aggressive' ? (draw || weak ? 1.7 : 1.2) : id === 'patient' ? (weak ? -1.7 : -0.3) : -1.4;
    // No personality gets a preference for stacking off with air into several players.
    if (weak && a.to! - hero.bet > hero.stack * 0.6) pressure -= 2;
    if (weak && i.players.filter((p) => !p.folded).length > 2) pressure -= 0.6;
    return Math.max(-4, Math.min(2, pressure + sizing));
  });
}

/** A small probability floor only among near-best model actions permits consistent human mistakes.
 * The service subsequently applies its expected-cost budget against the original policy. */
export function personalitySupport(i: InformationSet, p: StrategyPrediction): number[] {
  if (!p.values) return p.probabilities;
  const best = Math.max(...p.values),
    tolerance = Math.max(i.bigBlind * 0.5, i.players.reduce((s, p) => s + p.total, 0) * 0.12);
  const near = p.values.map((v) => (v >= best - tolerance ? 1 : 0)),
    count = near.reduce<number>((a, b) => a + b, 0);
  return p.probabilities.map((v, k) => v * 0.65 + (0.35 * near[k]) / count);
}

/** Authored sizing and bluff priors, explicitly separate from estimated action payoffs. */
export function plausiblePersonalityPolicy(i: InformationSet, p: StrategyPrediction, weights: number[], profile: BotProfile): number[] {
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const pot = i.players.reduce((s, p) => s + p.total, 0) + i.legal.toCall;
  const effective = Math.min(
    hero.stack,
    Math.max(0, ...i.players.filter((p) => !p.folded && p.id !== i.heroId).map((p) => p.stack + p.bet - hero.bet)),
  );
  const context = i.street === 'preflop' ? preflopContext(i) : null;
  const allowed = p.actions.map(
    (a) =>
      a.to === undefined || effective <= pot * 3 || (context && context.raiseCount >= 2) || a.to - hero.bet - i.legal.toCall <= pot * 2,
  );
  let result = weights.map((v, k) => (allowed[k] ? v : 0));
  if (result.reduce((s, v) => s + v, 0) < 1e-12) {
    const best = Math.max(...(p.values ?? result).filter((_, k) => allowed[k]));
    result = result.map((_, k) =>
      allowed[k] ? Math.exp(Math.max(-40, ((p.values?.[k] ?? 0) - best) / Math.max(i.bigBlind, pot * 0.1))) : 0,
    );
  }
  const total = result.reduce((s, v) => s + v, 0);
  result = result.map((v) => v / total);
  if (context && !i.legal.canCheck) {
    const ranks = i.hole.map(rankOf);
    const quality = Math.min(
      1,
      ((ranks[0] + ranks[1] - 4) / 24) * 0.65 + (ranks[0] === ranks[1] ? 0.35 : 0) + (i.hole[0][1] === i.hole[1][1] ? 0.06 : 0),
    );
    const threshold =
      (profile.personality === 'patient' ? 0.48 : profile.personality === 'curious' ? 0.2 : 0.36) +
      Math.max(0, i.players.filter((p) => !p.folded).length - 2) * 0.025 +
      context.raiseCount * 0.04;
    const cap = quality >= 0.9 ? 1 : 1 / (1 + Math.exp(-(quality - threshold) / 0.09));
    const voluntary = result.reduce((s, v, k) => s + (p.actions[k].move !== 'fold' ? v : 0), 0);
    const fold = p.actions.findIndex((a) => a.move === 'fold');
    if (fold >= 0 && voluntary > cap) {
      result = result.map((v, k) => (k === fold ? v + voluntary - cap : (v * cap) / voluntary));
    }
  }
  const bucket = i.street === 'preflop' ? null : handBucket(i.hole, i.board);
  if (bucket === 'air' || bucket === 'weak') {
    const cap = profile.personality === 'patient' ? 0.18 : profile.personality === 'curious' ? 0.25 : 0.55;
    const aggression = result.reduce((s, v, k) => s + (p.actions[k].to !== undefined ? v : 0), 0);
    if (aggression > cap) {
      const passive = p.actions.map((a, k) => ({ a, k })).filter(({ a }) => a.to === undefined);
      const bestPassive = passive.sort((a, b) => (p.values?.[b.k] ?? 0) - (p.values?.[a.k] ?? 0))[0].k;
      result = result.map((v, k) => (p.actions[k].to !== undefined ? (v * cap) / aggression : v));
      result[bestPassive] += aggression - cap;
    }
  }
  return result;
}
