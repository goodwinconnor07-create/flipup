import { rankOf } from '../game/cards';
import { category, flushDraw } from '../game/handBucket';
import { legalActions, type InformationSet } from './information';

export const SCRIPTED_OPPONENTS = [
  'random',
  'tight-passive',
  'loose-passive',
  'loose-aggressive',
  'competent',
  'river-overfolder',
  'calling-station',
  'changing',
] as const;
export type ScriptedOpponent = (typeof SCRIPTED_OPPONENTS)[number];
export type AgentKind = 'bot' | 'baseline' | 'previous' | ScriptedOpponent;

/** Intentionally simple public-information reference opponents, not strength-certified agents. */
export function scriptedMove(i: InformationSet, kind: ScriptedOpponent, rng: () => number, changed = false) {
  const actions = legalActions(i);
  const passive = actions.find((a) => a.move === (i.legal.canCheck ? 'check' : 'call'))!;
  const fold = actions.find((a) => a.move === 'fold') ?? passive;
  const raises = actions.filter((a) => a.to !== undefined);
  if (kind === 'random') return actions[Math.floor(rng() * actions.length)];
  if (kind === 'calling-station') return passive;
  if (kind === 'changing') kind = changed ? 'calling-station' : 'river-overfolder';
  const ranks = i.hole.map(rankOf);
  const preStrength =
    ((ranks[0] + ranks[1] - 4) / 24) * 0.65 + (ranks[0] === ranks[1] ? 0.35 : 0) + (i.hole[0][1] === i.hole[1][1] ? 0.05 : 0);
  const made = category([...i.hole, ...i.board]);
  const boardMade = category(i.board);
  const strength = i.street === 'preflop' ? preStrength : made > boardMade ? Math.min(1, 0.35 + made * 0.14) : 0.12;
  if (kind === 'river-overfolder' && i.street === 'river' && !i.legal.canCheck) return strength < 0.9 ? fold : passive;
  const tight = kind === 'tight-passive';
  if (kind === 'loose-aggressive' && raises.length && rng() < 0.55) return raises[Math.min(1, raises.length - 1)];
  if (kind === 'competent' && raises.length && strength > 0.7) return raises[Math.min(1, raises.length - 1)];
  const draw = i.board.length >= 3 && i.board.length < 5 && flushDraw(i.hole, i.board);
  return i.legal.canCheck || strength > (tight ? 0.64 : kind === 'loose-passive' ? 0.2 : 0.42) || draw ? passive : fold;
}
