import { boardTexture, handBucket, type Bucket } from '../game/handBucket';
import type { BotMove } from '../game/botPlay';
import type { InformationSet } from './information';
import { sharedUnbeatableBoard } from './philosophy';

/**
 * Everyday habits: what ordinary players at a pub game or home tournament do without thinking, applied to the
 * everyday bots' postflop decisions after the model has had its say.
 *
 * Why this exists: the model prices every bet against an imagined range with a reserve for its own uncertainty, so a
 * bet that is only a little better than checking is a check. Real players don't work like that. They bet when it's
 * checked to them, they c-bet as the raiser, they don't slowplay a big hand and they don't fold a pair to a small bet.
 * Measured on Casual tables before this layer: a checked-to flop was bet 32% of the time (top pair 43%, a monster 70%)
 * and one flop bet was folded to 51% of the time (middle pair 53%). `feel.ts` measures it and holds the numbers.
 *
 * It is deliberately small and bounded:
 * - It only ever moves probability TOWARDS a habit (more betting when checked to, fewer folds to a small bet).
 * - A bet is only added when the model's own value for it is within a margin of the best option, so a stab on a board
 *   where it would be a disaster is still left alone. Big hands have no margin: a value bet is never a mistake.
 * - Nothing here adds all-ins: only bets up to about a pot, plus the all-in when the stack is that small anyway.
 * - It reads the same public information as the rest of the bot, never anyone's hidden cards.
 *
 * Sources for the numbers are in docs/BOTS.md ("Everyday habits").
 */

type Street = 'flop' | 'turn' | 'river';
const AGGRESSIVE = ['bet', 'raise', 'allin'];
const VALUE: readonly Bucket[] = ['monster', 'strong', 'top'];
const isValue = (b: Bucket) => VALUE.includes(b);

/** How often a heads-up hand that has the chance to bet (everyone checked to it, or it took the lead) does. */
const BET_HU: Record<Street, Record<Bucket, number>> = {
  flop: { monster: 0.9, strong: 0.9, top: 0.86, mid: 0.64, draw: 0.74, weak: 0.46, air: 0.4 },
  turn: { monster: 0.9, strong: 0.9, top: 0.78, mid: 0.46, draw: 0.62, weak: 0.22, air: 0.24 },
  river: { monster: 0.92, strong: 0.9, top: 0.7, mid: 0.3, draw: 0.1, weak: 0.1, air: 0.16 },
};
/** Against two or more players, big hands bet nearly as often and everything else a lot less. */
const MULTIWAY: Record<Bucket, number> = { monster: 0.96, strong: 0.96, top: 0.82, mid: 0.52, draw: 0.75, weak: 0.32, air: 0.28 };

/** The most a hand folds to a single bet, by price (small up to 45% of the pot, medium up to 80%, then big). */
const FOLD_CAP: Record<Street, Partial<Record<Bucket, [number, number, number]>>> = {
  flop: { top: [0.03, 0.06, 0.15], mid: [0.2, 0.32, 0.5], draw: [0.08, 0.2, 0.4], weak: [0.45, 0.58, 0.72] },
  turn: { top: [0.05, 0.1, 0.22], mid: [0.3, 0.42, 0.6], draw: [0.15, 0.3, 0.5], weak: [0.55, 0.68, 0.8] },
  river: { top: [0.08, 0.15, 0.3], mid: [0.4, 0.55, 0.72], weak: [0.65, 0.78, 0.88] },
};

export interface HabitContext {
  /** 1 for Casual, less for Challenge. */
  strength: number;
  inPosition: boolean;
  /** What the bot has seen of a lone opponent: how likely they are to fold to a bet. */
  foldRead?: { mean: number; confidence: number } | null;
  /** Estimated chip value of each action (the model's own), used to keep a habit from becoming a blunder. */
  values?: number[] | null;
}
export interface HabitResult {
  distribution: number[];
  /** What changed, for the decision trace; null when nothing did. */
  note: string | null;
}

const sum = (v: number[]) => v.reduce((s, x) => s + x, 0);

export function applyHabits(i: InformationSet, actions: BotMove[], distribution: number[], ctx: HabitContext): HabitResult {
  const same: HabitResult = { distribution, note: null };
  if (i.street === 'preflop' || ctx.strength <= 0 || sharedUnbeatableBoard(i.board)) return same;
  const hero = i.players.find((p) => p.id === i.heroId);
  if (!hero) return same;
  const opponents = i.players.filter((p) => p.id !== i.heroId && !p.folded);
  const live = opponents.filter((p) => !p.allIn);
  if (!live.length) return same;
  const street = i.street as Street;
  const bucket = handBucket(i.hole, i.board);
  const pot = i.players.reduce((s, p) => s + p.total, 0);
  const acts = i.actions.filter((a) => a.street === street && !a.outOfTurn);
  const value = isValue(bucket);
  return i.legal.canCheck ? bet(i, actions, distribution, ctx, { hero, live, street, bucket, pot, acts, value }) : facing(i, actions, distribution, ctx, { hero, opponents, street, bucket, pot, acts });
}

interface OpenSpot {
  hero: InformationSet['players'][number];
  live: InformationSet['players'];
  street: Street;
  bucket: Bucket;
  pot: number;
  acts: InformationSet['actions'];
  value: boolean;
}

/** Nobody has bet: how often to, and how big. */
function bet(i: InformationSet, actions: BotMove[], dist: number[], ctx: HabitContext, s: OpenSpot): HabitResult {
  const { hero, live, street, bucket, pot, acts, value } = s;
  const opps = live.length;
  const checkedTo = acts.length > 0 && live.every((p) => acts.some((a) => a.playerId === p.id && a.move === 'check'));
  const preAgg = [...i.actions].reverse().find((a) => a.street === 'preflop' && AGGRESSIVE.includes(a.move) && !a.outOfTurn);
  const pfa = preAgg?.playerId === hero.id;
  const order = ['preflop', 'flop', 'turn', 'river'] as const;
  const prev = order[order.indexOf(street) - 1];
  const prevActs = i.actions.filter((a) => a.street === prev && !a.outOfTurn);
  const prevCheckedThrough = street !== 'flop' && prevActs.length > 0 && !prevActs.some((a) => AGGRESSIVE.includes(a.move));
  const bettingBefore = prevActs.some((a) => a.playerId === hero.id && AGGRESSIVE.includes(a.move));
  const initiative = pfa || bettingBefore;
  const texture = boardTexture(i.board);
  const wet = texture === 'wet' || texture === 'mono';

  let target = BET_HU[street][bucket];
  if (opps >= 2) target *= MULTIWAY[bucket];
  if (opps >= 3 && !value) target *= 0.8;
  if (!value) {
    if (wet && street === 'flop' && (bucket === 'air' || bucket === 'weak')) target *= 0.75;
    // A street checked through shows weakness: the next one is the place to take the pot (a delayed c-bet or a probe).
    if (prevCheckedThrough) target = Math.min(0.95, target + 0.08);
  }
  const kind = checkedTo ? 'checked-to' : initiative ? 'initiative' : 'lead';
  if (!checkedTo) {
    // Someone still has to act behind. The raiser keeps betting, with its good hands and a share of the rest, but not
    // on autopilot after the flop. Everyone else leads only with a real hand.
    if (initiative) {
      if (street !== 'flop' && !value) target *= 0.6;
      if (!ctx.inPosition && !value) target *= 0.9;
    } else target = value ? (bucket === 'top' ? 0.35 : 0.5) : 0;
  }
  // A player who has been seen to call a lot is not bluffed.
  if (!value && ctx.foldRead && ctx.foldRead.confidence >= 0.3 && (bucket === 'air' || bucket === 'weak')) target *= 0.5 + ctx.foldRead.mean;
  target = Math.min(0.97, target);

  const bets = actions.map((a, k) => ({ a, k })).filter(({ a }) => AGGRESSIVE.includes(a.move) && a.to !== undefined);
  const current = sum(bets.map(({ k }) => dist[k]));
  if (target <= current + 0.005) return { distribution: dist, note: null };

  // Sizes people actually use: a third to three quarters of the pot, or the all in when that's about a pot anyway.
  const big = hero.stack + hero.bet;
  const wanted = value && wet ? 0.75 : value && bucket !== 'top' ? 0.55 : bucket === 'top' || bucket === 'draw' ? 0.5 : 0.33;
  const values = ctx.values ?? null;
  const best = values ? Math.max(...values) : null;
  // How far a habit may fall short of the model's best option: none for a hand that bets for value; a little for the rest.
  const margin = value ? Infinity : bucket === 'mid' || bucket === 'draw' ? pot * 0.35 : pot * 0.3;
  const options = bets
    .map(({ a, k }) => ({ k, f: (a.to! - hero.bet) / Math.max(1, pot), to: a.to! }))
    .filter((o) => (o.f >= 0.2 && o.f <= 1.0) || (o.to >= big && o.to - hero.bet <= pot * 1.3))
    .filter((o) => (value ? true : best !== null && values![o.k] >= best - margin));
  if (!options.length) return { distribution: dist, note: null };
  const weight = options.map((o) => Math.exp(-Math.abs(o.f - wanted) * 5) * (o.to >= big ? 0.5 : 1));
  const total = sum(weight);
  const checkIdx = actions.findIndex((a) => a.move === 'check');
  if (checkIdx < 0) return { distribution: dist, note: null };
  const add = Math.min(dist[checkIdx], (target - current) * ctx.strength);
  if (add <= 0.002) return { distribution: dist, note: null };
  const next = [...dist];
  next[checkIdx] -= add;
  options.forEach((o, n) => (next[o.k] += (add * weight[n]) / total));
  return { distribution: next, note: `habit:${kind}-${bucket}-bet` };
}

interface FacingSpot {
  hero: InformationSet['players'][number];
  opponents: InformationSet['players'];
  street: Street;
  bucket: Bucket;
  pot: number;
  acts: InformationSet['actions'];
}

/** Facing one bet: a pair is not thrown away for a small price, though a raise or a big river bet is respected. */
function facing(i: InformationSet, actions: BotMove[], dist: number[], ctx: HabitContext, s: FacingSpot): HabitResult {
  const { hero, opponents, street, bucket, pot, acts } = s;
  const caps = FOLD_CAP[street][bucket];
  if (!caps || i.legal.callIsAllIn) return { distribution: dist, note: null };
  // Only a single bet that nobody has raised, and that the bot hasn't already acted on (a raise back is respected).
  const aggressive = acts.filter((a) => AGGRESSIVE.includes(a.move));
  if (aggressive.length !== 1 || acts.some((a) => a.playerId === hero.id)) return { distribution: dist, note: null };
  const foldIdx = actions.findIndex((a) => a.move === 'fold');
  const callIdx = actions.findIndex((a) => a.move === 'call');
  if (foldIdx < 0 || callIdx < 0) return { distribution: dist, note: null };
  const toCall = i.legal.toCall;
  // Never a habit that risks a big part of the stack on one pair.
  if (toCall > hero.stack * (bucket === 'top' ? 0.6 : 0.4)) return { distribution: dist, note: null };
  const price = toCall / Math.max(1, pot - toCall);
  let cap = caps[price <= 0.45 ? 0 : price <= 0.8 ? 1 : 2];
  // A bet into several players means more than a bet into one.
  const others = opponents.length - 1;
  cap = Math.min(1, cap + (bucket === 'top' ? 0.04 : 0.08) * Math.min(2, others));
  const values = ctx.values ?? null;
  // The model's own value for calling against folding, measured against the call: a call it gives next to no chance (a board
  // that beats us, the other hand has us crushed) is not made because it is a pair.
  if (values && values[callIdx] - values[foldIdx] < -toCall * 0.95) return { distribution: dist, note: null };
  const excess = (dist[foldIdx] - cap) * ctx.strength;
  if (excess <= 0.002) return { distribution: dist, note: null };
  const next = [...dist];
  next[foldIdx] -= excess;
  next[callIdx] += excess;
  return { distribution: next, note: `habit:${street}-${bucket}-calls-small-bet` };
}
