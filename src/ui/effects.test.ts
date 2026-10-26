import { describe, expect, it } from 'vitest';
import { stepSpring, type SpringState } from './effects';

/** Runs a spring at 60 frames a second for a while and returns every position it passed through. */
function run(from: number, velocity: number, to: number, seconds = 2): SpringState[] {
  let state: SpringState = { value: from, velocity };
  const path = [state];
  for (let i = 0; i < seconds * 600; i++) {
    state = stepSpring(state, to, 1 / 600);
    path.push(state);
  }
  return path;
}

describe('spring', () => {
  it('settles on its target without overshooting', () => {
    const path = run(300, 0, 0);
    expect(Math.min(...path.map((p) => p.value))).toBeGreaterThanOrEqual(-0.01);
    expect(Math.abs(path[path.length - 1].value)).toBeLessThan(0.3);
  });

  it('carries the speed it already has: a flick down goes further down before it turns', () => {
    const still = Math.max(...run(40, 0, 0).map((p) => p.value));
    const flicked = Math.max(...run(40, 1500, 0).map((p) => p.value));
    expect(still).toBeCloseTo(40, 1);
    expect(flicked).toBeGreaterThan(still + 10);
  });

  it('turns around from where it is when its target changes', () => {
    // Heading down to 100, grabbed at its current spot, then sent back to 0: it starts from there, not from the old start.
    let state: SpringState = { value: 0, velocity: 0 };
    for (let i = 0; i < 60; i++) state = stepSpring(state, 100, 1 / 600);
    expect(state.value).toBeGreaterThan(0);
    const turned = stepSpring(state, 0, 1 / 600);
    expect(Math.abs(turned.value - state.value)).toBeLessThan(5);
    expect(turned.velocity).toBeLessThan(state.velocity);
  });
});
