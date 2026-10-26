import { describe, expect, it } from 'vitest';
import { nearestStop, raiseStep, raiseStops } from './raiseSizes';

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
});
