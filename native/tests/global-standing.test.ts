import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));

const { cutLine, cutState, handsLeft, playLabel, tickerLines } = await import('../src/components/global/standing');

const view = (over: Record<string, unknown> = {}) =>
  ({ season: '2026-11', bankroll: 2000, peak: 2000, rebuyUsed: false, status: 'alive', day: '2026-11-06', handsToday: 12, dayStart: 2000, dayRank: null, hands: 30, seated: false, rank: 5, alive: 100, players: 120, ...over }) as never;

// Friday 6 November 2026, noon UTC: the next cut is Sunday 8 November at midnight.
const NOW = Date.UTC(2026, 10, 6, 12);

describe('Global standing', () => {
  it('places a rank against the cut', () => {
    expect(cutState(5, 100)).toBe('safe');
    expect(cutState(85, 100)).toBe('close');
    expect(cutState(95, 100)).toBe('zone');
    expect(cutState(9, 9)).toBe('safe');
    expect(cutState(null, 100)).toBeNull();
  });

  it('says when the cut is and whether you are safe', () => {
    expect(cutLine(NOW, view())).toEqual({ text: 'Next cut in 2 days · you’re safe', warn: false });
    expect(cutLine(NOW, view({ rank: 95 }))!.warn).toBe(true);
    expect(cutLine(NOW, view({ status: 'busted' }))).toBeNull();
    expect(cutLine(NOW, null)).toEqual({ text: 'Next cut in 2 days', warn: false });
  });

  it('labels Play by hands left', () => {
    expect(handsLeft(view())).toBe(38);
    expect(playLabel(view())).toBe('Play · 38 left');
    expect(playLabel(view({ handsToday: 50 }))).toBe('Back tomorrow');
    expect(playLabel(view({ status: 'cut' }))).toBe('Cut');
    expect(playLabel(null)).toBe('Play · 50 left');
  });

  it('cycles the season, the cut, today and the leader', () => {
    const board = { top: [{ code: 'A', username: 'ana', emoji: '🦊', score: 9400, peak: 9400, rebuy: false, status: 'alive', pos: 1 }], me: null, friends: [], players: 120, alive: 100 } as never;
    const lines = tickerLines(NOW, view(), board, 'B');
    expect(lines[0]).toMatch(/^NOVEMBER SEASON ENDS IN \d+ DAYS$/);
    expect(lines).toContain('NEXT CUT IN 2 DAYS');
    expect(lines).toContain('38 HANDS LEFT TODAY');
    expect(lines).toContain('@ANA LEADS WITH 9,400');
    expect(tickerLines(NOW, view(), board, 'A')).toContain('YOU’RE NUMBER 1 IN THE WORLD');
  });
});
