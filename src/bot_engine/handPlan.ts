import { hashString, seededRng, rankOf, type Card } from '../game/cards';
import type { HandAction, Street } from '../game/types';
import { classify } from '../train/ranges/classify';
import { score, categoryOf, toInt } from '../game/botEval';
import { handBucket } from '../game/handBucket';
import type { InformationSet } from './information';
import type { BotProfile } from './identity';
import type { StrategyPrediction } from './strategy';

const length = { preflop: 0, flop: 3, turn: 4, river: 5 };
export type HandIntent = 'value' | 'semi-bluff' | 'pot-control' | 'pressure' | 'give-up' | 'bluff-catch';

/** Preserve the trainer's vocabulary, while recognizing private improvements to a
 * made river board (for example the ace of its flush suit or a higher straight). */
export function ownHandKind(hole: Card[], board: Card[], before?: Card[]) {
  const kind = classify(hole, board, before);
  if (board.length !== 5) return kind;
  const own = score([...hole, ...board].map(toInt)),
    shared = score(board.map(toInt));
  if (own <= shared) return kind;
  const cat = categoryOf(own),
    sharedCat = categoryOf(shared);
  if (cat === 8 || (cat >= 6 && (cat > sharedCat || cat === 6)))
    return { ...kind, level: 11 as const, label: cat === 7 ? 'Quads' : cat === 8 ? 'Straight flushes' : 'Full houses' };
  if (cat === 5) return { ...kind, level: 10 as const, label: 'Flushes' };
  if (cat === 4) return { ...kind, level: 9 as const, label: 'Straights' };
  if (cat === 7 && sharedCat === 7) return { ...kind, level: 6 as const, label: 'Board quads, improved kicker' };
  return kind;
}
export function ownHandBucket(hole: Card[], board: Card[]) {
  return board.length === 5 && ownHandKind(hole, board).level >= 9 ? ('monster' as const) : handBucket(hole, board);
}

/** Reconstructible, hand-scoped context. No private opponent information or hidden runout. */
export function publicLine(actions: HandAction[], playerId: string, street: Street, bigBlind = 0) {
  let price = street === 'preflop' ? bigBlind : 0,
    raises = 0,
    lastAggressor: string | null = null;
  let heroBet = false,
    heroCalled = false,
    checkedThrough = true;
  for (const a of actions) {
    if (a.street !== street || a.outOfTurn) continue;
    const aggressive = ['bet', 'raise', 'allin'].includes(a.move) && a.to > price;
    if (aggressive) {
      price = a.to;
      raises++;
      lastAggressor = a.playerId;
      checkedThrough = false;
    }
    if (a.playerId === playerId) {
      if (aggressive) heroBet = true;
      else if (a.move === 'call' || a.move === 'allin') heroCalled = true;
    }
  }
  return { raises, lastAggressor, heroBet, heroCalled, checkedThrough };
}

/** Both the live policy and hypothetical continuation use these same own-card concepts. */
export function handIntent(hole: Card[], board: Card[], previousBoard: Card[], previousBet: boolean, facingStrength: boolean) {
  const now = ownHandKind(hole, board);
  const before = previousBoard.length >= 3 ? ownHandKind(hole, previousBoard) : null;
  const completedDraw =
    !!before && before.draw !== 'none' && now.level > before.level && [4, 5, 8].includes(categoryOf(score([...hole, ...board].map(toInt))));
  const missedDraw = !!before && before.draw !== 'none' && board.length === 5 && now.level <= 1;
  const improved = !!before && now.level > before.level;
  let intent: HandIntent;
  if (now.level >= 7 || completedDraw) intent = 'value';
  else if (now.draw !== 'none' && now.level < 7) intent = 'semi-bluff';
  else if (missedDraw || (facingStrength && now.level <= 1)) intent = 'give-up';
  else if (now.level >= 3) intent = facingStrength ? 'bluff-catch' : 'pot-control';
  else intent = previousBet ? 'pressure' : 'give-up';
  return { intent, level: now.level, draw: now.draw, completedDraw, missedDraw, improved };
}

export function planForHand(i: InformationSet, profile: BotProfile) {
  const previousStreet: Street = i.street === 'river' ? 'turn' : i.street === 'turn' ? 'flop' : 'preflop';
  const previous = publicLine(i.actions, i.heroId, previousStreet, i.bigBlind);
  const current = publicLine(i.actions, i.heroId, i.street, i.bigBlind);
  const before = i.board.slice(0, length[previousStreet]);
  const strength = current.raises >= 2 || (previous.heroBet && current.lastAggressor !== null && current.lastAggressor !== i.heroId);
  const kind = handIntent(i.hole, i.board, before, previous.heroBet, strength);
  const lineId = hashString(JSON.stringify([profile.seed, i.tableId, i.hand, 'hand-plan-1']));
  const willingness = seededRng(lineId)(); // Stable through streets, retries and reloads.
  const opponents = i.players.filter((p) => p.id !== i.heroId && !p.folded).length;
  const highCardChanged = before.length > 0 && Math.max(...i.board.map(rankOf)) > Math.max(...before.map(rankOf));
  return {
    version: 'hand-plan-1' as const,
    lineId,
    ...kind,
    previousStreet,
    previousBet: previous.heroBet,
    previousCalled: previous.heroCalled,
    retainedInitiative: previous.lastAggressor === i.heroId,
    facingStrength: strength,
    opponents,
    highCardChanged,
    selectivePressure: willingness < 0.16 + (profile.traits.aggression - 0.5) * 0.25,
    reason: kind.completedDraw
      ? 'draw-completed'
      : kind.missedDraw
        ? 'draw-missed'
        : strength
          ? 'opponent-strength'
          : kind.improved
            ? 'hand-improved'
            : kind.intent,
  };
}

/** A preference among plausible actions; the service's value-cost guard bounds its effect. */
export function handPlanWeights(i: InformationSet, p: StrategyPrediction, profile: BotProfile) {
  if (i.street === 'preflop') return null;
  const plan = planForHand(i, profile);
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const pot = i.players.reduce((s, p) => s + p.total, 0) + i.legal.toCall;
  const logWeights = p.actions.map((a) => {
    if (a.to === undefined) {
      if (a.move === 'check') return plan.intent === 'pot-control' || plan.intent === 'give-up' ? 0.35 : 0;
      if (a.move === 'call') return plan.intent === 'bluff-catch' ? 0.15 : plan.intent === 'give-up' ? -0.25 : 0;
      return 0;
    }
    const fraction = (a.to - hero.bet - i.legal.toCall) / Math.max(i.bigBlind, pot);
    const sizing = -Math.min(0.3, Math.abs(fraction - (plan.intent === 'value' ? 0.75 : 0.5)) * 0.2);
    if (plan.intent === 'value') return 0.3 + sizing;
    if (plan.intent === 'semi-bluff') return (plan.facingStrength ? -0.35 : 0.1) + sizing;
    if (plan.intent === 'pot-control' || plan.intent === 'bluff-catch') return -0.35 + sizing;
    if (plan.intent === 'pressure')
      return (plan.selectivePressure && plan.retainedInitiative && plan.opponents === 1 && !plan.facingStrength ? 0.2 : -0.65) + sizing;
    // Missed draws usually stop; a small, hand-stable subset can bluff when unopposed.
    return (plan.missedDraw && plan.selectivePressure && plan.opponents === 1 && !plan.facingStrength ? -0.3 : -1) + sizing;
  });
  return { plan, logWeights };
}
