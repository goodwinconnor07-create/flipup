// The sums behind dragging games around the party playlist, kept apart from the screen so they can be tested.
// Rows are a fixed height (`ROW`), so a row's place is just its index times that.

/** One playlist row's height, hairline included. */
export const ROW = 64;
/** How long a finger rests on a game before it comes up off the list. */
export const HOLD_MS = 280;
/** Moving further than this before the hold is up means the finger is scrolling, not picking up. */
export const HOLD_SLOP = 10;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The row slot nearest a held row's top edge (`top` in list points, `count` rows). */
export function slotOfTop(top: number, count: number): number {
  return clamp(Math.round(top / ROW), 0, Math.max(0, count - 1));
}

/** Where a held row's top edge sits: under the finger (`fingerY`, list points) by the spot it was grabbed at. */
export function heldTop(fingerY: number, grabDy: number, count: number): number {
  return clamp(fingerY - grabDy, 0, Math.max(0, count - 1) * ROW);
}

/** Moves one item to another place, leaving the others in order. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = items.slice();
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(clamp(to, 0, next.length), 0, item);
  return next;
}

/**
 * Where a game carried over the list would land: the gap between rows nearest its centre, or null once it's too
 * far above or below the list to mean it (half a row of slack at each end).
 */
export function gapAt(fingerY: number, count: number): number | null {
  if (fingerY < -ROW / 2 || fingerY > count * ROW + ROW / 2) return null;
  return clamp(Math.round(fingerY / ROW), 0, count);
}

/** The top of row `index` once a gap is open at `gap` (null: no gap). */
export function slotTop(index: number, gap: number | null): number {
  return (gap !== null && index >= gap ? index + 1 : index) * ROW;
}

/** How fast to scroll (points a frame, negative up) while a finger is held `fromTop` below the top edge of a view `height` tall. */
export function autoScroll(fromTop: number, height: number, edge = 96, max = 16): number {
  if (fromTop < edge) return -max * clamp((edge - fromTop) / edge, 0, 1) ** 2;
  if (fromTop > height - edge) return max * clamp((fromTop - (height - edge)) / edge, 0, 1) ** 2;
  return 0;
}

/** A fresh random order of the same items (Fisher–Yates; `rng` is for tests). */
export function shuffled<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
