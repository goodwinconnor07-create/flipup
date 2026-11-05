import { describe, expect, it } from 'vitest';

(globalThis as Record<string, unknown>).__DEV__ = false;
const { fillerRows, withFiller } = await import('@/state/board-filler');

describe('filler rows', () => {
  it('are never in a release build', () => {
    expect(fillerRows(false)).toEqual([]);
    expect(withFiller([], false)).toEqual([]);
  });

  it('are about 200 fixed rows in development, ranked with the real ones', () => {
    const rows = fillerRows(true);
    expect(rows.length).toBe(200);
    expect(fillerRows(true)).toBe(rows);
    const board = withFiller([{ code: '111111', username: 'me', emoji: '😎', score: 999999, peak: 999999, rebuy: false, status: 'alive', pos: null }], true);
    expect(board[0]).toMatchObject({ username: 'me', pos: 1 });
    expect(board.at(-1)?.status).toBe('busted');
  });
});
