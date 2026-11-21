import type { InformationSet } from './information';
import type { BotProfile } from './identity';
import type { BotMemory } from './memory';
import type { StrategyPrediction } from './strategy';
import { features } from './features';
import { planForHand } from './handPlan';
import { preflopContext } from './preflopContext';
import { sessionFeel } from './sessionFeel';
import { behaviorSnapshot } from './behaviorMemory';
import { opponentEvidence } from './opponentModel';
import { continuationView, PlanningRound } from './multiplayerPlanning';
import { handClass } from './rangeAnalysis';
import { confirmedHandStory, nextCardPlan, type NextCardPlan } from './handStory';

export interface ActionPhilosophy {
  actionIndex: number;
  move: string;
  to?: number;
  principle: string;
  factors: string[];
  preference: number;
  sizePreference: number;
  scoreGapBb: number | null;
  plausible: boolean;
  nextCard: NextCardPlan;
}
/** Exact public-board ties; possible flushes or improved kickers remain live. */
export function sharedUnbeatableBoard(board: string[]): boolean {
  if (board.length !== 5) return false;
  const broadway = ['T', 'J', 'Q', 'K', 'A'].every((r) => board.some((c) => c[0] === r));
  const suitMax = Math.max(...['s', 'h', 'd', 'c'].map((s) => board.filter((c) => c[1] === s).length));
  if (broadway && (suitMax <= 2 || suitMax === 5)) return true;
  const quad = board.find((c) => board.filter((d) => d[0] === c[0]).length === 4)?.[0];
  const kicker = board.find((c) => c[0] !== quad)?.[0];
  return !!quad && (kicker === 'A' || (quad === 'A' && kicker === 'K'));
}
export function decisionPhilosophy(i: InformationSet, p: StrategyPrediction, profile: BotProfile, m: BotMemory, learning = true) {
  const f = features(i),
    plan = i.street === 'preflop' ? null : planForHand(i, profile),
    pre = preflopContext(i);
  const active = i.players.filter((p) => p.id !== i.heroId && !p.folded && !p.allIn);
  const checkedTo =
    i.street !== 'preflop' &&
    i.currentBet === 0 &&
    active.length > 0 &&
    active.every((p) => i.actions.some((a) => a.street === i.street && a.playerId === p.id && a.move === 'check' && !a.outOfTurn));
  const coverage = !!plan && (plan.level >= 3 || plan.draw !== 'none');
  const sharedBoard = sharedUnbeatableBoard(i.board),
    hasAllIn = i.players.some((p) => p.id !== i.heroId && !p.folded && p.allIn);
  let lineStreet = 'preflop',
    linePrice = i.bigBlind,
    lastAggressor: string | null = null;
  for (const a of i.actions) {
    if (a.street !== lineStreet) {
      lineStreet = a.street;
      linePrice = 0;
    }
    if (!a.outOfTurn && ['bet', 'raise', 'allin'].includes(a.move) && a.to > linePrice) {
      lastAggressor = a.playerId;
      linePrice = a.to;
    }
  }
  const initiative = lastAggressor === i.heroId;
  const previousBoard = i.board.slice(0, i.street === 'river' ? 4 : i.street === 'turn' ? 3 : 0);
  const suits = (board: string[]) => Math.max(0, ...['s', 'h', 'd', 'c'].map((s) => board.filter((c) => c[1] === s).length));
  const scareCard = previousBoard.length >= 3 && ((suits(i.board) >= 3 && suits(previousBoard) < 3) || !!plan?.highCardChanged);
  const mood = sessionFeel(m, i.hand),
    hero = i.players.find((p) => p.id === i.heroId)!;
  const values = p.values,
    best = values ? Math.max(...values.filter((_, k) => p.probabilities[k] > 1e-9)) : null;
  const pot = i.players.reduce((n, p) => n + p.total, 0) + i.legal.toCall;
  const snapshot = learning
    ? behaviorSnapshot(
        m,
        i.hand,
        active.map((p) => p.id),
      )
    : undefined;
  const round = i.street === 'preflop' ? null : new PlanningRound(i);
  const uncertainty = values ? Math.min(2 * i.bigBlind, Math.max(0, ...(p.valueStandardErrors ?? []).map((v) => v ?? 0)) * 0.5) : 0;
  const contestablePot = f.eligiblePotBb * i.bigBlind + i.legal.toCall;
  const margin = Math.max(i.bigBlind * 0.75, contestablePot * 0.06) + uncertainty;
  const focus = profile.everyday?.focus ?? 'balanced';
  const story = confirmedHandStory(m, i);
  const actions: ActionPhilosophy[] = p.actions.map((a, k) => {
    const gap = values ? best! - values[k] : null;
    const plausible = sharedBoard ? ['check', 'call'].includes(a.move) : gap === null || gap <= margin;
    const factors: string[] = [];
    let principle = '',
      preference = 0,
      sizePreference = 0;
    if (i.street === 'preflop') {
      principle =
        a.move === 'fold'
          ? 'respect-entry-range'
          : a.move === 'check'
            ? 'take-free-option'
            : a.to !== undefined
              ? 'open-or-reopen-range'
              : 'defend-entry-range';
      factors.push(
        `holding-${handClass(i.hole)}`,
        pre.inPosition ? 'late-position' : 'earlier-position',
        pre.raiseCount ? 'prior-preflop-aggression' : 'unopened-or-limped-pot',
        `effective-depth-${Math.round(pre.effectiveTo / i.bigBlind)}bb`,
      );
    } else if (a.move === 'fold') {
      principle = 'decline-price';
      factors.push(
        'facing-bet',
        plan?.draw !== 'none'
          ? 'draw-price-not-compelling'
          : plan!.level >= 7
            ? 'strong-hand-facing-unfavorable-model-price'
            : 'preserve-stack-at-this-price',
      );
    } else if (a.move === 'check') {
      principle = plan?.intent === 'value' ? 'retain-showdown-and-trap-option' : plan?.missedDraw ? 'stop-missed-draw' : 'control-pot';
      factors.push('free-option');
      if (scareCard) factors.push('board-became-more-threatening');
      preference =
        (plan?.missedDraw ? 0.1 : scareCard && plan!.level < 7 ? 0.08 : 0) +
        (focus === 'patient' && plan!.level >= 3 && plan!.level <= 6 ? 0.06 : 0);
    } else if (a.move === 'call') {
      principle = plan?.draw !== 'none' ? 'continue-draw-at-price' : 'defend-showdown-at-model-price';
      factors.push('facing-bet', `price-${Number(f.simplifiedCallThreshold.toFixed(2))}`);
      preference = (focus === 'curious' ? 0.05 : 0) + (plan?.facingStrength ? -0.03 : 0);
      // A hero call: a curious bot that has been pushed around lately ("I don't believe you") looks a river bet up
      // with a hand that can beat a bluff. Only inside the close-choice band, so it never calls off with nothing.
      if (focus === 'curious' && i.street === 'river' && mood.pressure > 0.1 && plan!.level >= 1) {
        factors.push('hero-call-after-being-pushed-around');
        preference += 0.07;
      }
    } else {
      const thinValue = plan!.level >= 5 && plan!.level <= 6 && (p.equity ?? 0) > 0.65 && !plan!.facingStrength;
      principle =
        plan?.intent === 'value'
          ? 'build-value-pot'
          : thinValue
            ? 'seek-thin-value'
            : plan?.draw !== 'none'
              ? 'apply-pressure-with-draw'
              : plan!.level >= 3
                ? 'protect-made-hand-at-supported-price'
                : checkedTo && f.inPosition
                  ? 'probe-checks'
                  : initiative && plan!.selectivePressure
                    ? 'continue-selective-pressure'
                    : 'use-model-supported-fold-equity';
      if (hasAllIn && plan!.level <= 1 && plan!.draw === 'none') principle = 'pressure-active-side-contest';
      if (coverage) factors.push(plan?.draw !== 'none' ? 'own-hand-draw-coverage' : 'made-hand-showdown-value');
      if (checkedTo) factors.push('checked-to');
      if (f.inPosition) factors.push('last-to-act');
      if (initiative) factors.push('retained-initiative');
      if (plan?.completedDraw) factors.push('draw-completed');
      if (plan?.previousBet && !plan.missedDraw && !scareCard) {
        factors.push('continue-existing-line');
        preference += 0.06;
      }
      if (initiative && !plan!.previousBet && plan!.level >= 5 && (p.equity ?? 0) > 0.65 && !scareCard) {
        factors.push('resume-value-after-pot-control');
        preference += 0.04;
      }
      if (checkedTo && f.inPosition && coverage && f.opponents <= 2) preference += 0.08;
      if (plan?.missedDraw) {
        factors.push('missed-draw-pressure-is-selective');
        preference -= 0.12;
      }
      if ((scareCard || plan?.facingStrength) && plan!.level < 7) preference -= 0.1;
      if (focus === 'pressure' && plan!.level >= 5 && plan!.level <= 6 && (p.equity ?? 0) > 0.6) {
        factors.push('thin-value-preference');
        preference += 0.06;
      }
      const fraction = (a.to! - hero.bet - i.legal.toCall) / Math.max(i.bigBlind, pot);
      const after = round!.clone();
      after.apply(
        after.seats.findIndex((s) => s.playerId === i.heroId),
        a,
      );
      const reads = active.map((o) =>
        opponentEvidence(
          snapshot,
          o.id,
          continuationView(
            after,
            after.seats.findIndex((s) => s.playerId === o.id),
            [],
          ),
        ),
      );
      const readTrust = reads.length && reads.every((r) => r.samples >= 8) ? Math.min(...reads.map((r) => r.trust)) : 0;
      const callTendency = readTrust ? reads.reduce((n, r) => n + r.frequencies[1], 0) / reads.length : 0.6;
      const foldTendency = readTrust ? reads.reduce((n, r) => n + r.frequencies[0], 0) / reads.length : 0.3;
      let target = plan?.intent === 'value' ? 0.75 : 0.5;
      if (readTrust && plan!.level >= 5 && (p.equity ?? 0) > 0.65 && callTendency > 0.65) {
        target += Math.min(0.2, readTrust * 0.4);
        factors.push(fraction >= 0.65 ? 'established-calling-tendency' : 'calling-read-favors-a-larger-alternative');
      }
      if (readTrust && foldTendency > 0.4) {
        target -= Math.min(0.15, readTrust * 0.3);
        factors.push(fraction <= 0.75 ? 'established-folding-tendency' : 'folding-read-favors-a-smaller-alternative');
      }
      sizePreference = -Math.min(0.3, Math.abs(fraction - target) * 0.3) || 0;
      // After losing a big pot most players tighten up; a pressing one tilts instead and fires more for a few hands,
      // which the table can see and punish (it fades with the caution, about 0.7 a hand).
      const tilt = focus === 'pressure' ? 0.1 * mood.caution : 0;
      if (tilt > 0.01) factors.push('tilting-after-a-big-loss');
      preference +=
        (focus === 'pressure' ? 0.06 : 0.035) * mood.confidence -
        (focus === 'patient' ? 0.12 : focus === 'pressure' ? 0 : 0.1) * mood.caution +
        tilt -
        (focus === 'pressure' ? 0.03 : 0.05) * mood.pressure;
    }
    if (story && i.street !== story.street && plan) {
      if (story.nextCard === 'slow-down-without-improvement' && plan.level <= 1 && plan.draw === 'none') {
        factors.push('earlier-probe-was-called-without-improvement');
        preference += a.move === 'check' ? 0.08 : a.to !== undefined ? -0.08 : 0;
      }
      if (
        story.nextCard === 'continue-value-on-safe-card' &&
        plan.level >= (story.level ?? 0) &&
        !scareCard &&
        !plan.facingStrength &&
        a.to !== undefined
      ) {
        factors.push('follow-through-value-plan');
        preference += 0.04;
      }
      if (story.nextCard === 'realize-draw-at-price' && plan.completedDraw && a.to !== undefined) {
        factors.push('planned-draw-became-value');
        preference += 0.06;
      }
      if (story.nextCard === 'protect-showdown-value' && plan.level < 7 && a.to !== undefined) {
        factors.push('preserve-earlier-pot-control-plan');
        preference -= 0.04;
      }
    }
    if (sharedBoard) {
      principle = 'claim-shared-board-pot';
      factors.push('shared-unbeatable-board');
      preference = 0;
      sizePreference = 0;
    }
    if (i.street !== 'preflop' && mood.caution > 0.05) factors.push('temporary-caution-after-public-loss');
    if (i.street !== 'preflop' && mood.confidence > 0.05) factors.push('temporary-confidence-after-public-win');
    if (i.street !== 'preflop' && mood.pressure > 0.05) factors.push('recent-public-aggression');
    factors.push(plausible ? 'within-model-close-choice-band' : 'model-disfavored');
    if (!plausible) {
      preference = 0;
      sizePreference = 0;
    }
    return {
      actionIndex: k,
      move: a.move,
      ...(a.to === undefined ? {} : { to: a.to }),
      principle,
      factors,
      preference,
      sizePreference,
      scoreGapBb: gap === null ? null : gap / i.bigBlind,
      plausible,
      nextCard: nextCardPlan(i.street, a.move, principle, plan),
    };
  });
  return {
    version: 'decision-philosophy-1' as const,
    facts: {
      inPosition: f.inPosition,
      checkedTo,
      coverage,
      scareCard,
      sharedBoard,
      retainedInitiative: initiative,
      opponents: f.opponents,
      callThreshold: f.simplifiedCallThreshold,
    },
    plan,
    ...(story ? { story } : {}),
    session: mood,
    closeBandBb: margin / i.bigBlind,
    actions,
  };
}
export function describeChoice(philosophy: ReturnType<typeof decisionPhilosophy>, index: number, mixed: boolean, distribution?: number[]) {
  const p = philosophy.actions[index];
  const goals: Record<string, string> = {
    'respect-entry-range': 'I am respecting my entry-range mix at this position and price',
    'take-free-option': 'I can see the next card without paying',
    'open-or-reopen-range': 'this holding supports opening or reopening the betting',
    'defend-entry-range': 'this holding is a plausible defense at this price',
    'decline-price': 'preserving my stack is preferable at this price',
    'retain-showdown-and-trap-option': 'checking retains showdown value and leaves room to get paid later',
    'stop-missed-draw': 'the draw missed and further pressure is not compelling',
    'control-pot': 'I want to control the pot with this hand',
    'continue-draw-at-price': 'the draw is worth continuing at a model-supported price',
    'defend-showdown-at-model-price': 'the model supports a showdown defense at this price',
    'build-value-pot': 'I am trying to get value from weaker hands',
    'seek-thin-value': 'this is a supported thin-value opportunity',
    'apply-pressure-with-draw': 'my draw gives me a way to improve while applying pressure',
    'protect-made-hand-at-supported-price': 'a supported bet can protect my made hand',
    'probe-checks': 'the checks give me a plausible opportunity to take the pot',
    'continue-selective-pressure': 'this is a selective continuation of my earlier betting line',
    'use-model-supported-fold-equity': 'the model supports a chance to win without a showdown',
    'pressure-active-side-contest': 'pressure applies to players with chips while the all-in hand still contests its eligible pot',
    'claim-shared-board-pot': 'the public board guarantees the same best hand for everyone who stays in',
  };
  const details: Record<string, string> = {
    'last-to-act': 'I am last to act',
    'checked-to': 'The action has checked to me',
    'own-hand-draw-coverage': 'My hand has draw coverage on this board',
    'made-hand-showdown-value': 'My made hand has showdown value on this board',
    'resume-value-after-pot-control': 'The checked street did not erase my earlier value line',
    'retained-initiative': 'I took the betting lead earlier in the hand',
    'draw-completed': 'My draw completed',
    'board-became-more-threatening': 'The new card makes the board more threatening',
    'established-calling-tendency': 'Repeated public calls informed my value sizing',
    'established-folding-tendency': 'Repeated public folds informed my sizing',
    'earlier-probe-was-called-without-improvement': 'My earlier probe was called and this hand has not improved',
    'follow-through-value-plan': 'This follows the value plan from my earlier decision',
    'planned-draw-became-value': 'The draw I continued with has become a value hand',
    'preserve-earlier-pot-control-plan': 'My earlier pot-control plan argues for restraint',
  };
  const context = p.factors.filter((f) => details[f]).map((f) => details[f]);
  return {
    version: philosophy.version,
    actionIndex: index,
    principle: p.principle,
    factors: [...p.factors],
    mixedCloseChoice: mixed,
    nextCardPlan: p.nextCard,
    ifFacingNewBet: p.move === 'fold' ? 'hand-ended' : 'reassess-price-and-opposing-strength',
    scoreGapBb: p.scoreGapBb,
    closeBandBb: philosophy.closeBandBb,
    alternatives: distribution
      ? philosophy.actions
          .filter((a) => a.actionIndex !== index && distribution[a.actionIndex] > 1e-9 && a.plausible)
          .sort((a, b) => distribution[b.actionIndex] - distribution[a.actionIndex])
          .slice(0, 2)
          .map((a) => ({
            move: a.move,
            ...(a.to === undefined ? {} : { to: a.to }),
            principle: a.principle,
            probability: distribution[a.actionIndex],
            scoreGapBb: a.scoreGapBb,
          }))
      : [],
    summary: `I ${p.move}${p.to === undefined ? '' : ` to ${p.to}`} because ${goals[p.principle] ?? 'this remains a supported poker option'}.${context.length ? ' ' + context.join('. ') + '.' : ''}${mixed ? ' Other close lines were also viable.' : ''}`,
  };
}
/** Change size preferences without changing total aggressive probability. */
export function applySizingPreferences(distribution: number[], p: ReturnType<typeof decisionPhilosophy>): number[] {
  const indices = p.actions.filter((a) => ['bet', 'raise', 'allin'].includes(a.move)).map((a) => a.actionIndex);
  const before = indices.reduce((s, k) => s + distribution[k], 0);
  const weighted = indices.map((k) => distribution[k] * Math.exp(p.actions[k].sizePreference));
  const after = weighted.reduce((s, v) => s + v, 0);
  const result = [...distribution];
  if (after > 0) indices.forEach((k, j) => (result[k] = (weighted[j] * before) / after));
  return result;
}
