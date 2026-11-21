// The Demo, played through as a person would: every game's demo hand (src/game/demo.ts) runs on the engine while the
// coach's steps (components/demo/steps.ts) come up through the same flow the screen uses (flow.ts), and each tap the
// coach asks for is made. It fails when a change to a game stops a step from coming up, leaves your turn with no step
// asking for a move, or puts "undefined" in a caption: a changed game needs its demo looked at.
import { describe, expect, it } from 'vitest';

import { applyAction, createDemoTable, redactForDevice, VARIANTS, type Action, type Game, type Variant } from '@game/index';

import { coachView, FLOW_START, nextFlow, type Flow } from '../src/components/demo/flow';
import { actionFor, DEMO_STEPS, myTurn, textOf, type CoachCtx } from '../src/components/demo/steps';

const ME = 'device-me-000001';

interface Shown {
  id: string;
  title: string;
  text: string;
}

function playThrough(variant: Variant): { shown: Shown[]; game: Game } {
  const steps = DEMO_STEPS[variant];
  let clock = 2_000_000;
  let game = createDemoTable({ variant, deviceId: ME, name: 'You', emoji: '😎', now: clock });
  const apply = (action: Action, device = ME) => {
    const r = applyAction(game, action, { deviceId: device, now: clock, rng: () => 0.5 });
    if (!r.ok) throw new Error(`${variant}: ${action.type} was refused: ${r.error}`);
    game = r.game;
  };
  apply({ type: 'start' });
  let started = false;
  let open = new Set<string>();
  let flow: Flow = FLOW_START;
  const shown: Shown[] = [];
  for (let i = 0; i < 3000; i++) {
    const view = redactForDevice(game, ME);
    const me = view.players.find((p) => p.deviceId === ME);
    const c: CoachCtx = { game: view, me, hand: view.hand, seat: view.hand?.seats.find((s) => s.playerId === me?.id), started, now: clock, open };
    const v = coachView(steps, flow, c);
    flow = v.flow;
    if (v.finished) return { shown, game };
    if (v.step) {
      const step = v.step;
      if (shown.at(-1)?.id !== step.id) shown.push({ id: step.id, title: textOf(step.title, c), text: textOf(step.text, c) });
      if (step.tap) {
        const act = actionFor(step.tap, c);
        if (!act) throw new Error(`${variant}: step ${step.id} asks for a tap on ${step.tap}, which does nothing`);
        if (act === 'raisePanel') open = new Set([...open, 'raise.go', 'raise.panel']);
        else if (act === 'powerPanel') open = new Set([...open, 'power.go']);
        else {
          apply(act);
          open = new Set();
        }
        continue;
      }
      if (!step.watch) {
        if (step.id === 'welcome') started = true;
        flow = nextFlow(flow);
        continue;
      }
    }
    // Nothing to do on screen: time passes (a step's wait, a card landing, a power on show, the bots' turns).
    if (myTurn(c) && !v.step && v.dueAt == null) throw new Error(`${variant}: it's your turn on the ${c.hand?.street} but no step asks for a move (after "${shown.at(-1)?.id}")`);
    const moment = game.hand?.moment;
    const next = [v.dueAt, moment && clock < moment.until ? moment.until : null, game.wakeAt].filter((t): t is number => t != null && t >= clock);
    if (!started) throw new Error(`${variant}: the welcome never came up`);
    if (!next.length) throw new Error(`${variant}: stuck at step ${steps[flow.index]?.id ?? 'end'} with nothing due`);
    clock = Math.min(...next) + 1;
    if (game.wakeAt != null && clock > game.wakeAt) apply({ type: 'tick' }, 'clock');
  }
  throw new Error(`${variant}: the demo never finished`);
}

export const _play = playThrough;
describe("the Demo", () => {
  it('has steps for every game in the app', () => {
    expect(Object.keys(DEMO_STEPS).sort()).toEqual(VARIANTS.map((v) => v.id).sort());
  });

  for (const { id: variant } of VARIANTS) {
    describe(variant, () => {
      const { shown, game } = playThrough(variant);

      it('shows every step, in order, once', () => {
        expect(shown.map((s) => s.id)).toEqual(DEMO_STEPS[variant].map((s) => s.id));
      });

      it('starts with the welcome and ends on the showdown', () => {
        expect(shown[0].id).toBe('welcome');
        expect(shown.at(-1)!.id).toBe('showdown');
        expect(game.hand?.result?.showdown).toBe(true);
      });

      it('fills in every caption from the hand', () => {
        for (const s of shown) {
          for (const words of [s.title, s.text]) {
            expect(words.trim(), `${s.id}`).not.toBe('');
            expect(words, `${s.id}: ${words}`).not.toMatch(/undefined|NaN|null|\ba \.|\ban? $|\s{2}|\(\)|:\s*$/);
          }
        }
      });

      it('keeps the captions short', () => {
        for (const s of shown) {
          expect(s.title.split(' ').length, s.title).toBeLessThanOrEqual(5);
          expect(s.text.length, s.text).toBeLessThanOrEqual(140);
        }
      });

      it('asks for at most one move a street before the showdown, so the hand keeps moving', () => {
        const taps = DEMO_STEPS[variant].filter((s) => s.tap).length;
        expect(taps).toBeLessThanOrEqual(7);
      });
    });
  }
});
