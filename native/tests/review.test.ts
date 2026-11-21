import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-store-review', () => ({ hasAction: async () => true, requestReview: async () => {} }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-sqlite/localStorage/install', () => ({}));

const { reviewDue } = await import('../src/state/review');

// The rating prompt: once, after a good moment.
describe('rating prompt', () => {
  it('waits for three finished games or ten best plays', () => {
    expect(reviewDue(0, 0, false)).toBe(false);
    expect(reviewDue(2, 9, false)).toBe(false);
    expect(reviewDue(3, 0, false)).toBe(true);
    expect(reviewDue(0, 10, false)).toBe(true);
  });
  it('never asks twice', () => {
    expect(reviewDue(10, 100, true)).toBe(false);
  });
});
