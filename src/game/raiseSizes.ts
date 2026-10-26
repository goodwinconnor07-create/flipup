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
