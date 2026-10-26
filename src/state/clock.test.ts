import { expect, it } from 'vitest';
import { FAST, toTableTime } from './clock';

it('runs a fast table at twice the speed and leaves a normal one alone', () => {
  const t = Date.UTC(2026, 9, 26);
  expect(toTableTime(t)).toBe(t);
  expect(toTableTime(t, false)).toBe(t);
  expect(toTableTime(t + 1000, true) - toTableTime(t, true)).toBe(1000 * FAST);
});
