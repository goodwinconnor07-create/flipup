import { describe, expect, it } from 'vitest';
import { simulateTable } from './botSim';
import { emptyTwin } from './twin';
import { fitStyle, type TwinBrain } from './twinFit';

// Fitting a bot style to a set of poker numbers (legends are fitted this way). The AI twin memory that used to sit
// beside it (a bot copying what a person did in each spot) was removed with the feature.

describe('fitting a style', () => {
  const stats = (o: Record<string, number>) => {
    const t = emptyTwin();
    t.hands = 300;
    Object.assign(t.stats, o);
    return t;
  };

  it('fits a loose, aggressive player looser than a tight one', () => {
    const loose = fitStyle(stats({ vpip: 135, pfr: 90, firstIn: 120, opens: 80, limps: 5, betsFaced: 100, foldsToBet: 30, betOpps: 120, bets: 80, postAgg: 90, postBluffs: 40 }));
    const tight = fitStyle(stats({ vpip: 45, pfr: 36, firstIn: 120, opens: 36, limps: 0, betsFaced: 100, foldsToBet: 55, betOpps: 120, bets: 40, postAgg: 40, postBluffs: 5 }));
    const looseness = (s: typeof loose) => s.pre.loose - s.pre.tight;
    expect(looseness(loose) - looseness(tight)).toBeGreaterThan(0.3);
    expect(loose.post.bluff).toBeGreaterThan(tight.post.bluff);
    expect(loose.post.sticky).toBeGreaterThan(tight.post.sticky);
  });

  it('copies their usual bet sizes and whether the size gives the hand away', () => {
    const t = stats({ smallN: 10, smallSum: 3.3, bigN: 10, bigSum: 8, opens: 20, openBb: 60 });
    t.stats.sizeN = [4, 4, 0, 0, 4, 4, 4];
    t.stats.sizeSum = [1.2, 1.2, 0, 0, 3.2, 3.2, 3.2];
    const s = fitStyle(t);
    expect(s.post.sizes).toEqual([0.33, 0.8]);
    expect(s.post.tell).toBeGreaterThan(0.3);
  });

  it('is fine with a player it has barely seen', () => {
    const s = fitStyle(emptyTwin());
    expect(Number.isFinite(s.pre.open)).toBe(true);
    for (const v of Object.values(s.post)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
  });
});

describe('playing as a fitted style', () => {
  const profile = (o: Record<string, number>) => {
    const t = emptyTwin();
    t.hands = 300;
    Object.assign(t.stats, o);
    return t;
  };

  it('plays tighter as a fit to a tight player than as a fit to a loose one', () => {
    const tight: TwinBrain = { style: fitStyle(profile({ vpip: 45, pfr: 36, firstIn: 120, opens: 36, limps: 0, betsFaced: 100, foldsToBet: 55, betOpps: 120, bets: 40, postAgg: 40, postBluffs: 5 })) };
    const loose: TwinBrain = { style: fitStyle(profile({ vpip: 135, pfr: 90, firstIn: 120, opens: 80, limps: 5, betsFaced: 100, foldsToBet: 30, betOpps: 120, bets: 80, postAgg: 90, postBluffs: 40 })) };
    const vpip = (brain: TwinBrain) => simulateTable(['pro', 'rock', 'maniac', 'station', 'tag', 'lag'], 250, 9, 100, {}, { twins: { 0: brain } }).seats[0].vpip;
    expect(vpip(loose) - vpip(tight)).toBeGreaterThan(0.08);
  }, 90_000);
});
