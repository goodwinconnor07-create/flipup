import { describe, expect, it } from 'vitest';

import { autoScroll, gapAt, heldTop, moveItem, ROW, shuffled, slotOfTop, slotTop } from '../src/components/party/playlist-math';

describe('dragging games around the playlist', () => {
  it('a held row takes the slot nearest its top edge, never outside the list', () => {
    expect(slotOfTop(0, 6)).toBe(0);
    expect(slotOfTop(ROW * 2.4, 6)).toBe(2);
    expect(slotOfTop(ROW * 2.6, 6)).toBe(3);
    expect(slotOfTop(-500, 6)).toBe(0);
    expect(slotOfTop(5000, 6)).toBe(5);
  });
  it('a held row follows the finger by where it was grabbed and stops at the ends', () => {
    expect(heldTop(200, 20, 6)).toBe(180);
    expect(heldTop(-40, 0, 6)).toBe(0);
    expect(heldTop(9999, 0, 6)).toBe(5 * ROW);
  });
  it('moves an item and keeps the rest in order', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
    const before = ['a', 'b', 'c'];
    moveItem(before, 0, 2);
    expect(before).toEqual(['a', 'b', 'c']);
  });
  it('a carried game opens a gap between the rows nearest it, and none far off the list', () => {
    expect(gapAt(0, 4)).toBe(0);
    expect(gapAt(ROW * 1.4, 4)).toBe(1);
    expect(gapAt(ROW * 1.6, 4)).toBe(2);
    expect(gapAt(ROW * 4, 4)).toBe(4);
    expect(gapAt(-ROW, 4)).toBeNull();
    expect(gapAt(ROW * 4 + ROW, 4)).toBeNull();
    expect(gapAt(20, 0)).toBe(0);
  });
  it('rows below a gap move down one place', () => {
    expect(slotTop(0, 2)).toBe(0);
    expect(slotTop(1, 2)).toBe(ROW);
    expect(slotTop(2, 2)).toBe(3 * ROW);
    expect(slotTop(3, null)).toBe(3 * ROW);
  });
  it('scrolls only near the edges, faster the closer the finger gets, and up is negative', () => {
    expect(autoScroll(300, 700)).toBe(0);
    expect(autoScroll(0, 700)).toBeLessThan(0);
    expect(autoScroll(700, 700)).toBeGreaterThan(0);
    expect(Math.abs(autoScroll(20, 700))).toBeGreaterThan(Math.abs(autoScroll(80, 700)));
    expect(autoScroll(-50, 700)).toBe(-16);
  });
  it('shuffles into the same games in some order', () => {
    const out = shuffled([1, 2, 3, 4, 5], () => 0.3);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
