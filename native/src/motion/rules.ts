// The numbers behind "The 20 rules" in docs/MOTION.md, as plain functions with no React or Reanimated in them, so
// they're unit-tested (native/tests/motion-rules.test.ts) and shared by every component that moves.
import { motion } from '@design/tokens';

/** Rule 15: an exit is 20% shorter than the entrance it undoes. */
export function exitMs(enterMs: number): number {
  return Math.round(enterMs * 0.8);
}

/** Rule 3 and 6: row `i` of a list (or detail `i` of a card) starts `i` × 30ms late, stopping at 8 so a long list doesn't crawl. */
export function stagger(i: number): number {
  return Math.min(Math.max(0, Math.floor(i)), 8) * motion.stagger;
}

/**
 * Rule 5: a knob that's moving stretches 12% along its travel and shrinks across it so its area stays the same.
 * `amount` is 0 (resting) to 1 (moving).
 */
export function knobStretch(amount: number): { x: number; y: number } {
  const k = 1 + motion.stretch * Math.min(1, Math.max(0, amount));
  return { x: k, y: 1 / k };
}

/**
 * Rule 19: past `limit` a drag meets diminishing resistance instead of a wall: inside the limit it follows the
 * finger exactly, beyond it each extra point of finger moves the thing less, and it never goes further than
 * `limit + room`. Apple's rubber-band curve.
 */
export function rubber(distance: number, limit: number, room = limit): number {
  const d = Math.abs(distance);
  if (d <= limit) return distance;
  const over = d - limit;
  const eased = (1 - 1 / ((over * 0.55) / room + 1)) * room;
  return Math.sign(distance) * (limit + eased);
}

/**
 * Rule 7: a point `t` (0 to 1) of the way along an arc from `from` to `to` that bows `bow` points to one side
 * (up, for a negative `bow` in screen space). Quadratic, so it eases the way a thrown thing does.
 */
export function arcPoint(t: number, from: { x: number; y: number }, to: { x: number; y: number }, bow: number = motion.arc): { x: number; y: number } {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - bow * 4 * t * (1 - t) };
}

/** Rule 13: a spring that arrives and stops, with no overshoot (critically damped: damping = 2 × √(stiffness × mass)). */
export function settleSpring(mass = 1, stiffness = 300): { mass: number; stiffness: number; damping: number } {
  return { mass, stiffness, damping: 2 * Math.sqrt(stiffness * mass) };
}
