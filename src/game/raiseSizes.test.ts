import { describe, expect, it } from 'vitest';
import { nearestStop, raiseStep, raiseStops, stopAt, trackPosition } from './raiseSizes';

describe('raise sizes', () => {
  it('moves in multiples of the big blind on a normal stack', () => {
    // 1,000 chips at 10/20: 98 steps of 10, so 316 is never offered.
    const stops = raiseStops(20, 1000, 20);
    expect(stops[0]).toBe(20);
    expect(stops.at(-1)).toBe(1000);
    expect(stops.slice(1, -1).every((s) => s % 20 === 0)).toBe(true);
    expect(stops).not.toContain(316);
  });

  it('gets coarser as the stack grows, to keep about a hundred notches', () => {
    expect(raiseStep(990, 10)).toBe(10);
    expect(raiseStep(19_900, 100)).toBe(200);
    expect(raiseStops(200, 20_000, 100).length).toBeLessThanOrEqual(102);
  });

  it('keeps Min and All in exact even when they are not multiples', () => {
    const stops = raiseStops(37, 1005, 10);
    expect(stops[0]).toBe(37);
    expect(stops.at(-1)).toBe(1005);
  });

  it('is just Min and All in when there is only one size', () => {
    expect(raiseStops(500, 500, 10)).toEqual([500]);
    expect(raiseStops(40, 45, 10)).toEqual([40, 45]);
  });

  it('snaps a preset to the nearest stop', () => {
    const stops = raiseStops(20, 1000, 10);
    expect(nearestStop(stops, 43)).toBe(40);
    expect(nearestStop(stops, 47)).toBe(50);
    expect(nearestStop(stops, 5000)).toBe(1000);
  });

  it('spaces the preset marks evenly along the slider', () => {
    const stops = raiseStops(20, 1000, 10);
    const anchors = [20, 40, 500, 1000];
    expect(anchors.map((a) => trackPosition(stops, anchors, a))).toEqual([0, 1 / 3, 2 / 3, 1]);
  });

  it('maps every stop to the slider and back to the same stop', () => {
    const stops = raiseStops(20, 1000, 10);
    const anchors = [20, 150, 500, 1000];
    for (const stop of stops) expect(stopAt(stops, anchors, trackPosition(stops, anchors, stop))).toBe(stop);
    // And it only ever goes up as you drag right.
    let last = -Infinity;
    for (let v = 0; v <= 1000; v++) {
      const amount = stopAt(stops, anchors, v / 1000);
      expect(amount).toBeGreaterThanOrEqual(last);
      last = amount;
    }
    expect(stopAt(stops, anchors, 0)).toBe(20);
    expect(stopAt(stops, anchors, 1)).toBe(1000);
  });

  it('copes with one or two marks', () => {
    const stops = raiseStops(40, 45, 10);
    expect(stopAt(stops, [40, 45], 0)).toBe(40);
    expect(stopAt(stops, [40, 45], 1)).toBe(45);
    expect(trackPosition([500], [500], 500)).toBe(0);
    expect(stopAt([500], [500], 0.7)).toBe(500);
  });
});
