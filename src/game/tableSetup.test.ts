import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, levelsFor, withStack, withVariant } from '.';

describe('table setup rules', () => {
  it('offers only blinds at least 10 big blinds deep, and no tiny blinds on big stacks', () => {
    expect(levelsFor(500)).toEqual([[1, 2], [5, 10], [10, 20], [25, 50]]);
    expect(levelsFor(10_000).map(([, bb]) => bb)).toEqual([20, 50, 100, 200]);
  });

  it('keeps the blinds when the new stack still fits them, else takes the biggest that fits', () => {
    expect(withStack({ ...DEFAULT_SETTINGS, smallBlind: 5, bigBlind: 10 }, 2000)).toMatchObject({ startingStack: 2000, smallBlind: 5, bigBlind: 10 });
    expect(withStack({ ...DEFAULT_SETTINGS, smallBlind: 1, bigBlind: 2 }, 10_000)).toMatchObject({ smallBlind: 100, bigBlind: 200 });
  });

  it('Ghost goes deep and Imposter plays for bigger blinds', () => {
    expect(withVariant(DEFAULT_SETTINGS, 'ghost')).toMatchObject({ variant: 'ghost', startingStack: 2000, smallBlind: 10, bigBlind: 20 });
    expect(withVariant(DEFAULT_SETTINGS, 'imposter')).toMatchObject({ variant: 'imposter', bigBlind: 20 });
    expect(withVariant(DEFAULT_SETTINGS, 'deuces')).toEqual({ ...DEFAULT_SETTINGS, variant: 'deuces' });
  });
});
