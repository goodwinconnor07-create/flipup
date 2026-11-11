import { hashString, rankOf, seededRng } from '../game/cards';
import { CLASS_INDEX, TOP } from '../game/botRange';
import { handBucket } from '../game/handBucket';
import type { BotProfile } from './identity';
import type { InformationSet } from './information';
import type { StrategyPrediction } from './strategy';
import { preflopContext } from './preflopContext';
import { ownHandBucket } from './handPlan';

export type BotDifficulty = 'casual' | 'challenge';
export const EVERYDAY_FOCUSES = ['balanced', 'patient', 'curious', 'pressure'] as const;
export type EverydayFocus = (typeof EVERYDAY_FOCUSES)[number];
export interface EverydayIdentity {
  version: 1;
  focus: EverydayFocus;
  difficulty: BotDifficulty;
  tempo: number;
}
export const isBotDifficulty = (v: unknown): v is BotDifficulty => v === 'casual' || v === 'challenge';
export const focusForName = (name: string): EverydayFocus => EVERYDAY_FOCUSES[hashString(name) % EVERYDAY_FOCUSES.length];

/** Prefer underrepresented tendencies; names determine identity, not seat order or recent results. */
export function balancedBotPool<T extends { name: string }>(pool: readonly T[], seated: readonly { name: string }[]): T[] {
  const counts = EVERYDAY_FOCUSES.map((f) => seated.filter((p) => focusForName(p.name) === f).length);
  const min = Math.min(...pool.map((p) => counts[EVERYDAY_FOCUSES.indexOf(focusForName(p.name))]));
  return pool.filter((p) => counts[EVERYDAY_FOCUSES.indexOf(focusForName(p.name))] === min);
}

export function everydayProfile(
  base: BotProfile,
  name: string,
  difficulty: BotDifficulty = 'casual',
  focus = focusForName(name),
): BotProfile {
  const rng = seededRng(hashString(`everyday-1:${name}`));
  const micro = () => (rng() - 0.5) * 0.08;
  const shift = focus === 'patient' ? -0.06 : focus === 'pressure' ? 0.06 : 0;
  return {
    ...base,
    seed: hashString(`everyday-1:${name}`),
    personality: undefined,
    everyday: { version: 1, focus, difficulty, tempo: 0.9 + rng() * 0.2 },
    traits: {
      aggression: 0.5 + shift + micro(),
      curiosity: 0.5 + (focus === 'curious' ? 0.07 : focus === 'patient' ? -0.04 : 0) + micro(),
      riverCaution: 0.5 + (focus === 'patient' ? 0.06 : 0) + micro(),
      adaptation: 0.55 + micro(),
    },
  };
}
const normalized = (p: number[]) => {
  const sum = p.reduce((s, v) => s + v, 0);
  return p.map((v) => v / sum);
};

/** Shared public-information reference. Preflop uses combination-weighted hand percentiles,
 * position, price, stacks and action history; it is an authored range model, not a solve. */
export function everydayReference(i: InformationSet, p: StrategyPrediction, profile: BotProfile): number[] {
  const e = profile.everyday!;
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const pot = i.players.reduce((s, p) => s + p.total, 0) + i.legal.toCall;
  const context = preflopContext(i);
  if (i.street === 'preflop') {
    const hole = [...i.hole].sort((a, b) => rankOf(b) - rankOf(a));
    const cls = hole[0][0] + hole[1][0] + (hole[0][0] === hole[1][0] ? '' : hole[0][1] === hole[1][1] ? 's' : 'o');
    const top = TOP[CLASS_INDEX.get(cls)!];
    const live = i.players.filter((p) => !p.folded).length;
    const late = context.inPosition;
    const shift = (profile.traits.curiosity - 0.5) * 0.3;
    let width =
      context.raiseCount === 0
        ? live === 2
          ? 0.62
          : late
            ? 0.38
            : 0.28
        : context.raiseCount === 1
          ? late
            ? 0.23
            : 0.19
          : context.raiseCount === 2
            ? 0.1
            : 0.045;
    width += shift + (e.difficulty === 'casual' ? 0.025 : 0);
    if (i.legal.toCall > context.effectiveTo * 0.25) width *= 0.6;
    const play = top <= 0.01 ? 1 : 1 / (1 + Math.exp((top - width) / 0.045));
    const raiseShare = context.raiseCount === 0 ? 0.78 : Math.max(0.12, Math.min(0.8, (0.1 - top) * 7 + 0.2));
    const raises = p.actions.map((a, k) => ({ a, k })).filter(({ a }) => a.to !== undefined);
    const target = context.raiseTo;
    const chosen = raises.length ? raises.reduce((a, b) => (Math.abs(a.a.to! - target) <= Math.abs(b.a.to! - target) ? a : b)).k : -1;
    const raise = chosen >= 0 ? play * raiseShare : 0;
    const weights = p.actions.map((a, k) =>
      k === chosen ? raise : a.to !== undefined ? 0 : a.move === 'check' ? 1 - raise : a.move === 'fold' ? 1 - play : play - raise,
    );
    // Retain an anchor to the shipped frequencies only for supported exact chart states.
    const anchor = p.source === 'shipped-preflop-frequency' ? 0.25 : 0;
    return normalized(weights.map((v, k) => v * (1 - anchor) + p.probabilities[k] * anchor));
  }
  // Keep ordinary deep-stack bets in familiar pot-sized ranges; short stacks may commit.
  const effective = Math.min(
    hero.stack,
    Math.max(0, ...i.players.filter((p) => !p.folded && p.id !== i.heroId).map((p) => p.stack + p.bet - hero.bet)),
  );
  const allowed = p.actions.map((a) => a.to === undefined || effective <= 3 * pot || a.to - hero.bet - i.legal.toCall <= pot * 1.5);
  let weights = p.probabilities.map((v, k) => (allowed[k] ? v : 0));
  if (weights.reduce((s, v) => s + v, 0) < 1e-12) weights = p.actions.map((_, k) => (allowed[k] ? 1 : 0));
  weights = normalized(weights);
  const bucket = p.modelVersion === 'baseline-7' ? ownHandBucket(i.hole, i.board) : handBucket(i.hole, i.board);
  if (bucket === 'air' || bucket === 'weak') {
    const cap = (i.players.filter((p) => !p.folded).length > 2 ? 0.11 : 0.23) + (profile.traits.aggression - 0.5) * 0.25;
    const aggressive = weights.reduce((s, v, k) => s + (p.actions[k].to !== undefined ? v : 0), 0);
    if (aggressive > cap) {
      const passive = p.actions.map((a, k) => ({ a, k })).filter(({ a }) => a.to === undefined);
      const best = passive.sort((a, b) => (p.values?.[b.k] ?? 0) - (p.values?.[a.k] ?? 0))[0].k;
      weights = weights.map((v, k) => (p.actions[k].to !== undefined ? (v * cap) / aggressive : v));
      weights[best] += aggressive - cap;
    }
  }
  return weights;
}

export function everydayWeights(i: InformationSet, p: StrategyPrediction, profile: BotProfile): number[] {
  const pot = i.players.reduce((s, p) => s + p.total, 0) + i.legal.toCall;
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const a = profile.traits.aggression - 0.5,
    c = profile.traits.curiosity - 0.5;
  return p.actions.map((move) =>
    move.to !== undefined
      ? a * 4 - Math.min(1.5, Math.abs((move.to - hero.bet - i.legal.toCall) / Math.max(i.bigBlind, pot) - (0.6 + a))) * 0.3
      : move.move === 'call'
        ? c * 5 - (i.street === 'river' ? (profile.traits.riverCaution - 0.5) * 2 : 0)
        : move.move === 'fold'
          ? -c * 2
          : 0,
  );
}

/** Small, bounded exploratory mistakes. Difficulty is fixed by the host, never by results. */
export function everydaySupport(i: InformationSet, p: StrategyPrediction, profile: BotProfile): number[] {
  if (i.street === 'preflop' || !p.values) return p.probabilities;
  const best = Math.max(...p.values),
    tolerance = Math.max(i.bigBlind * 0.3, i.players.reduce((s, p) => s + p.total, 0) * 0.05);
  const near = p.values.map((v) => (v >= best - tolerance ? 1 : 0)),
    count = near.reduce<number>((s, v) => s + v, 0);
  const mix = profile.everyday?.difficulty === 'challenge' ? 0.035 : 0.12;
  return p.probabilities.map((v, k) => v * (1 - mix) + (mix * near[k]) / count);
}

/** Decision difficulty plus an independent timing draw; neither move nor strength sets the clock. */
export function everydayThinkMs(
  info: InformationSet,
  profile: BotProfile,
  seed: number,
  feel?: { caution: number; confidence: number; pressure: number },
): number {
  const rng = seededRng(hashString(`${seed}:timing`));
  const pot = info.players.reduce((s, p) => s + p.total, 0);
  const hard = info.legal.toCall > Math.max(info.bigBlind * 3, pot * 0.3);
  const active = info.players.filter((p) => !p.folded && !p.allIn).length;
  const raises = info.actions.filter((a) => a.street === info.street && !a.outOfTurn && ['bet', 'raise', 'allin'].includes(a.move)).length;
  const complexity = Math.min(180, Math.max(0, active - 2) * 25 + Math.min(2, raises) * 40);
<<<<<<< HEAD
  return Math.min(
    1900,
    Math.round(
      (550 + rng() * 350 + complexity + (hard ? 250 + rng() * 500 : 0)) *
=======
  // A tank: a big bet against a real share of the stack, or an all-in to answer. People take their time there, and
  // the table feels it. Public information only, so the wait never says what the bot holds.
  const hero = info.players.find((p) => p.id === info.heroId);
  const stack = hero ? hero.stack : 0;
  const tank = info.legal.toCall > Math.max(pot * 0.55, info.bigBlind * 8) && info.legal.toCall >= stack * 0.25;
  return Math.min(
    tank ? 5200 : 1900,
    Math.round(
      (550 + rng() * 350 + complexity + (hard ? 250 + rng() * 500 : 0) + (tank ? 1800 + rng() * 2400 : 0)) *
>>>>>>> origin/main
        (profile.everyday?.tempo ?? 1) *
        (1 + (feel?.caution ?? 0) * 0.06 + (feel?.pressure ?? 0) * 0.02 - (feel?.confidence ?? 0) * 0.03),
    ),
  );
}
