import { describe, expect, it } from 'vitest';

import { dismissUndo, insertAt, offerUndo, UNDO_MS } from '../src/state/undo';

describe('insertAt', () => {
  it('puts an item back where it was', () => {
    expect(insertAt(['a', 'c'], 'b', 1)).toEqual(['a', 'b', 'c']);
  });
  it('clamps to the ends when the list changed meanwhile', () => {
    expect(insertAt(['a'], 'z', 5)).toEqual(['a', 'z']);
    expect(insertAt(['a'], 'z', -3)).toEqual(['z', 'a']);
  });
  it("doesn't change the list it was given", () => {
    const list = ['a'];
    insertAt(list, 'b', 0);
    expect(list).toEqual(['a']);
  });
});

describe('the undo offer', () => {
  it('lasts a few seconds', () => {
    expect(UNDO_MS).toBeGreaterThanOrEqual(4000);
    expect(UNDO_MS).toBeLessThanOrEqual(8000);
  });
  it('dismissing an old offer does not close a newer one', () => {
    offerUndo('first', () => undefined);
    offerUndo('second', () => undefined);
    dismissUndo(1_000_000);
    dismissUndo();
  });
});
