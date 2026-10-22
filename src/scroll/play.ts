// A card in play: the graded moves so far, and how a finished card turns into a pass or miss and one to three stars.

import type { Card } from '../game';
import type { Judged } from '../game/judge';
import type { CardRef, Decision, Goal, Outcome, Template } from './types';

/** The card you're on. Lives with the table, so closing the app mid-card picks up where you were. */
export interface ScrollRun {
  ref: CardRef;
  /** Start was tapped: the cards are out. */
  started: boolean;
  decisions: Decision[];
  over: Outcome | null;
}

export const newRun = (ref: CardRef): ScrollRun => ({ ref, started: false, decisions: [], over: null });

export function toDecision(j: Judged, hero: Card[], board: Card[], to: number | undefined, bigBlind: number): Decision {
  return {
    street: j.street,
    grade: j.grade,
    mine: j.mine,
    best: j.best,
    bestSize: j.bestSize,
    loss: j.loss,
    easy: j.easy,
    how: j.how,
    bucket: j.bucket,
    eq: j.eq,
    need: j.need,
    folds: j.folds,
    freq: j.freq,
    size: j.size,
    hand: hero.join(''),
    board: board.join(''),
    to: to !== undefined ? to / bigBlind : undefined,
  };
}

/** How the graded moves went, 0 to 1: Good is a point, a close call half. Moves with nothing to choose between don't count. */
export function scoreOf(decisions: Decision[]): number {
  const counted = decisions.filter((d) => !d.easy);
  if (!counted.length) return 1;
  return counted.reduce((a, d) => a + (d.grade === 'green' ? 1 : d.grade === 'yellow' ? 0.5 : 0), 0) / counted.length;
}

export function starsOf(decisions: Decision[]): 1 | 2 | 3 {
  const score = scoreOf(decisions);
  const costly = decisions.some((d) => !d.easy && d.grade === 'red');
  if (!costly && score >= 0.85) return 3;
  if (score >= 0.5) return 2;
  return 1;
}

/** What the table looked like at the end, for the goal. */
export interface Ending {
  /** Chips won or lost, in big blinds. */
  net: number;
  showdown: boolean;
  /** You held a weak hand (nothing, or a bare overcard or draw) when it ended. */
  weak: boolean;
}

export function passed(goal: Goal, decisions: Decision[], end: Ending): boolean {
  switch (goal.kind) {
    case 'win':
      return end.net > 0;
    case 'profit':
      return end.net >= goal.bb;
    case 'bluff':
      return end.net > 0 && !end.showdown && end.weak;
    case 'right':
      return !decisions.some((d) => !d.easy && d.grade === 'red');
    case 'save':
      return end.net >= -goal.bb;
  }
}

const needsBet = (goal: Goal) => goal.kind === 'bluff' || goal.kind === 'profit';

export function finish(t: Template, decisions: Decision[], end: Ending): Outcome {
  const score = scoreOf(decisions);
  const ok = t.quick ? !decisions.some((d) => !d.easy && d.grade === 'red') : passed(t.goal, decisions, end);
  return {
    passed: ok,
    stars: starsOf(decisions),
    net: t.quick ? 0 : Math.round(end.net * 10) / 10,
    showdown: end.showdown,
    score,
    // A goal that needs a bet (a bluff, a big win) isn't bad luck if nothing was ever bet.
    miss: ok
      ? undefined
      : score >= 0.75 && (needsBet(t.goal) ? decisions.some((d) => d.mine === 'bet' || d.mine === 'raise' || d.mine === 'allin') : true)
        ? 'goal'
        : 'play',
  };
}

export function goalText(t: Template): string {
  if (t.quick) return 'Make the right call.';
  const g = t.goal;
  switch (g.kind) {
    case 'win':
      return 'Win the pot.';
    case 'profit':
      return `Win at least ${g.bb} big blinds.`;
    case 'bluff':
      return 'Win the pot without a showdown, holding nothing.';
    case 'right':
      return 'Make every move count: no costly mistakes.';
    case 'save':
      return `Lose no more than ${g.bb} big blinds.`;
  }
}
