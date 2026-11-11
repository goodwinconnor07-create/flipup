import { describe, expect, it } from 'vitest';

import { analyse, replay, type OptionId } from '@train/ranges/model';
import { SCENARIOS } from '@train/ranges/scenarios';

import { cheersRun, pileBet, pilesOf } from '../src/state/range-result';

// The result card's three piles (src/state/range-result.ts): every opponent's range folded into a few parts that add
// up to the whole, from the same numbers the breakdown shows.
describe('Range training result', () => {
  const groupsOf = (s: (typeof SCENARIOS)[number]) => {
    const r = replay(s);
    return { r, views: analyse(s, r).map((v) => v.groups.map((g, i) => ({ group: s.opponents.find((o) => o.pos === v.opponent.pos)!.range[i], weight: g.weight, equity: g.equity }))) };
  };

  it('splits every hand into piles that add up to all of their range', { timeout: 120_000 }, () => {
    for (const s of SCENARIOS.filter((x) => x.opponents.length === 1).slice(0, 12)) {
      const { r, views } = groupsOf(s);
      const facing = r.toCall > 0;
      const piles = pilesOf(views, facing, [...s.hero.cards, ...s.board], pileBet(s));
      expect(piles.length, s.id).toBeGreaterThan(0);
      expect(piles.reduce((n, p) => n + p.share, 0), s.id).toBeCloseTo(1, 3);
      const keys = piles.map((p) => p.key);
      if (facing) expect(keys.every((k) => ['beats', 'beaten', 'bluffs'].includes(k)), s.id).toBe(true);
      else expect(keys.every((k) => ['folds', 'ahead', 'behind'].includes(k)), s.id).toBe(true);
    }
  });

  it('measures a check against the bet the hand compares it with', () => {
    const check = SCENARIOS.find((s) => s.best === 'check');
    if (check) expect(pileBet(check)).toBe((check.compare ?? 'bet75') as OptionId);
    const bet = SCENARIOS.find((s) => s.best.startsWith('bet'));
    if (bet) expect(pileBet(bet)).toBe(bet.best);
  });

  it('throws confetti only for runs worth marking', () => {
    expect([1, 2, 3, 4, 5, 6, 9, 10, 15, 20].filter(cheersRun)).toEqual([3, 5, 10, 20]);
  });
});

describe('Range training sets', async () => {
  const { SET_SIZE, setVerdict } = await import('../src/state/range-result');
  it('are five hands, with a word for each result', () => {
    expect(SET_SIZE).toBe(5);
    expect([5, 4, 3, 2, 1, 0].map((n) => setVerdict(n))).toEqual(['Perfect set', 'Strong set', 'Good set', 'Keep at it', 'Keep at it', 'Keep at it']);
  });
});
