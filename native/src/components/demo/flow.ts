// Which coach step is up, worked out from the table (pure, so the tests play the demo through the same logic the
// coach uses). Steps go in order: a step comes up when its moment holds on the table (after its `wait`); one with
// Next waits for Next; one that asks for a tap is done once its moment has passed (you did it); one that's watched
// goes once its moment is over.
import type { CoachCtx, CoachStep } from './steps';

export interface Flow {
  index: number;
  /** When the current step's moment first held (table time), or null while it hasn't come yet. */
  since: number | null;
}

export const FLOW_START: Flow = { index: 0, since: null };

/**
 * The first step after the welcome comes up as the hand is dealt: it waits this long (ms) so the cards have flown in
 * and turned over before the dim lands on them (the recording of 23 Nov 2026 caught your cards mid-flip).
 */
export const AFTER_DEAL = 600;

export interface FlowView {
  flow: Flow;
  /** The step on screen, or null between steps. */
  step: CoachStep | null;
  /** Every step has been through: the finish card. */
  finished: boolean;
  /** The step is due but waiting out its `wait`, until this table time. */
  dueAt: number | null;
}

/** Moves the flow on as far as the table allows, and says what's on screen. */
export function coachView(steps: CoachStep[], flow: Flow, c: CoachCtx): FlowView {
  let f = flow;
  for (let guard = 0; guard < steps.length + 1; guard++) {
    const step = steps[f.index];
    if (!step) return { flow: f, step: null, finished: true, dueAt: null };
    const holds = step.when(c);
    if (f.since == null) {
      if (!holds) return { flow: f, step: null, finished: false, dueAt: null };
      f = { ...f, since: c.now };
    }
    // A tap step whose moment has passed (you tapped) and a watched one that's over are done.
    if (!holds && (step.tap || step.watch)) {
      f = { index: f.index + 1, since: null };
      continue;
    }
    const at = f.since! + Math.max(step.wait ?? 0, f.index === 1 ? AFTER_DEAL : 0);
    if (c.now < at) return { flow: f, step: null, finished: false, dueAt: at };
    return { flow: f, step, finished: false, dueAt: null };
  }
  return { flow: f, step: null, finished: false, dueAt: null };
}

/** Next on a step: on to the one after it. */
export const nextFlow = (flow: Flow): Flow => ({ index: flow.index + 1, since: null });
