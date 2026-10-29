// European roulette: one zero, 37 pockets. Pure, so the payouts can be tested and the phone just draws it.
// Rules are in docs/RULES.md (Roulette).

/** The pockets in the order they sit round a European wheel, clockwise from the zero. */
export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type Pocket = 'red' | 'black' | 'green';

export function pocketColour(n: number): Pocket {
  return n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';
}

/**
 * A spot on the layout. Straight up on a number is `n0` to `n36`; the rest are the outside bets:
 * red, black, odd, even, low (1 to 18), high (19 to 36), the dozens `d1` to `d3` and the columns `c1` to `c3`
 * (`c1` is 1, 4, 7 … 34, the column along the bottom of a real table).
 */
export type Spot =
  | `n${number}`
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high'
  | 'd1'
  | 'd2'
  | 'd3'
  | 'c1'
  | 'c2'
  | 'c3';

/** Chips on each spot. */
export type Bets = Partial<Record<Spot, number>>;

export const OUTSIDE: Spot[] = ['red', 'black', 'odd', 'even', 'low', 'high', 'd1', 'd2', 'd3', 'c1', 'c2', 'c3'];

export function isSpot(s: string): s is Spot {
  if ((OUTSIDE as string[]).includes(s)) return true;
  const m = /^n(\d{1,2})$/.exec(s);
  return !!m && Number(m[1]) <= 36 && String(Number(m[1])) === m[1];
}

/** Whether a spot wins when the ball lands on `n`. The zero loses every outside bet. */
export function covers(spot: Spot, n: number): boolean {
  if (spot.startsWith('n')) return Number(spot.slice(1)) === n;
  if (n === 0) return false;
  switch (spot) {
    case 'red':
      return REDS.has(n);
    case 'black':
      return !REDS.has(n);
    case 'odd':
      return n % 2 === 1;
    case 'even':
      return n % 2 === 0;
    case 'low':
      return n <= 18;
    case 'high':
      return n >= 19;
    case 'd1':
    case 'd2':
    case 'd3':
      return Math.ceil(n / 12) === Number(spot[1]);
    case 'c1':
    case 'c2':
    case 'c3':
      return ((n - 1) % 3) + 1 === Number(spot[1]);
  }
  return false;
}

/** What a winning bet pays, as a multiple of the stake (the stake comes back on top). */
export function pays(spot: Spot): number {
  if (spot.startsWith('n')) return 35;
  if (spot[0] === 'd' || spot[0] === 'c') return 2;
  return 1;
}

export const totalBet = (bets: Bets): number => Object.values(bets).reduce<number>((sum, x) => sum + (x ?? 0), 0);

/** Everything the table hands back when the ball lands on `n`: each winning stake plus what it pays. */
export function payout(bets: Bets, n: number): number {
  let back = 0;
  for (const [spot, amount] of Object.entries(bets) as [Spot, number][]) {
    if (amount > 0 && covers(spot, n)) back += amount * (pays(spot) + 1);
  }
  return back;
}

/** One spin: a pocket from 0 to 36, each as likely as the others. */
export function spinWheel(rng: () => number): number {
  return Math.min(36, Math.floor(rng() * 37));
}
