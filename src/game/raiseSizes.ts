/** How many notches the raise slider has, at most, however big the stack is. */
const NOTCHES = 100;

/**
 * The step between raise sizes: a multiple of the big blind (1, 2 or 5 times, then 10 times and so on),
 * the smallest that keeps the slider to about a hundred notches. A 1,000 stack at 10/20 moves in 10s;
 * a 20,000 stack moves in 200s.
 */
export function raiseStep(span: number, bigBlind: number): number {
  const base = Math.max(1, bigBlind);
  for (let scale = 1; ; scale *= 10) {
    for (const factor of [1, 2, 5]) {
      const step = base * scale * factor;
      if (span / step <= NOTCHES) return step;
    }
  }
}

/**
 * Every amount you can raise to, in order: Min, then the multiples of the step in between, then All in.
 * Min and All in are always there even when they aren't a multiple, so the edges of the slider stay exact.
 */
export function raiseStops(minTo: number, maxTo: number, bigBlind: number): number[] {
  const step = raiseStep(maxTo - minTo, bigBlind);
  const stops = [minTo];
  for (let v = (Math.floor(minTo / step) + 1) * step; v < maxTo; v += step) stops.push(v);
  if (maxTo > minTo) stops.push(maxTo);
  return stops;
}

/** The stop closest to an amount, for presets like half the pot that don't land on a notch. */
export function nearestStop(stops: number[], amount: number): number {
  return stops.reduce((best, s) => (Math.abs(s - amount) < Math.abs(best - amount) ? s : best));
}

/**
 * Where an amount sits on the slider, from 0 to 1. The preset marks (`anchors`: Min, half pot, pot, All in,
 * each one of the stops) are spaced evenly along the line, whatever they're worth, so they never crowd each
 * other. Between two marks the stops share that stretch of line.
 */
export function trackPosition(stops: number[], anchors: number[], to: number): number {
  const n = anchors.length;
  if (n < 2) return 0;
  const idx = Math.max(0, stops.indexOf(to));
  const at = anchors.map((a) => stops.indexOf(a));
  let s = 0;
  while (s < n - 2 && idx > at[s + 1]) s++;
  const span = at[s + 1] - at[s];
  return (s + (span > 0 ? (idx - at[s]) / span : 0)) / (n - 1);
}

/** The amount at a place on the slider (0 to 1): the other way round from `trackPosition`. */
export function stopAt(stops: number[], anchors: number[], pos: number): number {
  const at = anchors.map((a) => stops.indexOf(a));
  if (anchors.length < 2) return stops[at[0] ?? 0];
  const scaled = Math.min(Math.max(pos, 0), 1) * (anchors.length - 1);
  const s = Math.min(Math.floor(scaled), anchors.length - 2);
  return stops[Math.round(at[s] + (at[s + 1] - at[s]) * (scaled - s))];
}
