import { describe, expect, it } from 'vitest';
import { calibrationContexts } from './calibration';
import { betRead, potsBeforeActions, publicRangeLikelihood, summarizeRange } from './rangeAnalysis';
import { inferRanges } from './ranges';

const fixture = () => {
  const i = structuredClone(calibrationContexts().find((i) => i.street === 'turn')!);
  i.hole = ['Ts', '9s'];
  i.board = ['7s', '7h', '2c', '4d'];
  i.actions = [];
  return { i, opponent: i.players.find((p) => p.id !== i.heroId)!.id };
};

describe('Internal public-action range analysis', () => {
  it('recognizes private improvements to a made river board only in the new range revision', () => {
    const { i, opponent } = fixture();
    i.street = 'river';
    i.hole = ['2c', '3c'];
    i.board = ['Kh', 'Jh', '9h', '7h', '4h'];
    i.actions = [{ playerId: opponent, street: 'river', move: 'bet', to: 30 }];
    const old = inferRanges(i, 'public-range')[0],
      current = inferRanges(i, 'public-range-v2')[0];
    const weight = (r: typeof current) => r.holdings.find((h) => h.cards.includes('Ah') && h.cards.includes('5c'))!.weight;
    expect(weight(current)).toBeGreaterThan(weight(old));
    expect(summarizeRange(i, current).groups.some((g) => g.label === 'Flushes')).toBe(true);
    expect(current.source).toBe('public-action-range-model-2');
  });
  it('removes visible blockers and partitions all posterior mass using Range training hand groups', () => {
    const { i } = fixture();
    const range = inferRanges(i, 'public-range')[0],
      read = summarizeRange(i, range);
    const visible = new Set([...i.hole, ...i.board]);
    expect(range.holdings).toHaveLength(1035);
    expect(range.holdings.every((h) => h.cards.every((c) => !visible.has(c)))).toBe(true);
    expect(read.groups.reduce((s, g) => s + g.probability, 0)).toBeCloseTo(1, 10);
    expect(read.groups.reduce((s, g) => s + g.combinations, 0)).toBe(1035);
    expect(read.effectiveCombinations).toBeCloseTo(1035, 6);
    expect(read.groups.some((g) => g.label === 'Trips')).toBe(true);
    expect(read.topClasses).toHaveLength(8);
  });

  it('narrows raises more than calls and retains possible bluffs', () => {
    const { i, opponent } = fixture();
    const odds = () => publicRangeLikelihood(i, opponent, ['As', 'Ah']) / publicRangeLikelihood(i, opponent, ['8d', '3c']);
    i.actions = [{ playerId: opponent, street: 'preflop', move: 'call', to: i.bigBlind }];
    const callOdds = odds();
    i.actions = [{ playerId: opponent, street: 'preflop', move: 'raise', to: i.bigBlind * 3 }];
    expect(odds()).toBeGreaterThan(callOdds);
    const range = inferRanges(i, 'public-range')[0];
    expect(summarizeRange(i, range).effectiveCombinations).toBeLessThan(range.holdings.length);
    expect(range.holdings.every((h) => h.weight > 0)).toBe(true);
  });

  it('does not reinterpret a short all-in call as a raise', () => {
    const { i, opponent } = fixture();
    i.actions = [
      { playerId: i.heroId, street: 'flop', move: 'bet', to: 100 },
      { playerId: opponent, street: 'flop', move: 'call', to: 70 },
    ];
    const called = publicRangeLikelihood(i, opponent, ['7c', 'Ac']);
    i.actions[1].move = 'allin';
    expect(publicRangeLikelihood(i, opponent, ['7c', 'Ac'])).toBe(called);
  });

  it('uses only the board visible when an action happened and ignores out-of-turn actions', () => {
    const { i, opponent } = fixture();
    i.actions = [{ playerId: opponent, street: 'flop', move: 'bet', to: 20 }];
    const before = publicRangeLikelihood(i, opponent, ['As', 'Ah']);
    i.board[3] = 'Ac';
    expect(publicRangeLikelihood(i, opponent, ['As', 'Ah'])).toBe(before);
    i.actions.push({ playerId: opponent, street: 'turn', move: 'raise', to: 100, outOfTurn: true });
    expect(publicRangeLikelihood(i, opponent, ['As', 'Ah'])).toBe(before);
    const set = publicRangeLikelihood(i, opponent, ['7c', '7d']);
    expect(set).toBeGreaterThan(before);
  });
});

describe('bet size reads (the owner\'s recorded hand: a one big blind bet into 210 read as a strong hand)', () => {
  it('reads a smaller bet as wider and an overbet as stronger, with half to three quarters of a pot unchanged', () => {
    const shares = [0.05, 0.15, 0.25, 0.33, 0.45, 0.5, 0.75, 1, 1.25, 3];
    const reads = shares.map(betRead);
    for (let n = 1; n < reads.length; n++) {
      expect(reads[n].threshold).toBeGreaterThanOrEqual(reads[n - 1].threshold);
      expect(reads[n].floor).toBeLessThanOrEqual(reads[n - 1].floor);
    }
    expect(betRead(0.5)).toEqual({ threshold: 0.42, floor: 0.06 });
    expect(betRead(0.75)).toEqual({ threshold: 0.42, floor: 0.06 });
    expect(betRead(0.1).threshold).toBeLessThan(0.3);
    expect(betRead(2).threshold).toBeGreaterThan(0.45);
  });

  it('works out the pot before each postflop move from the chips in now', () => {
    const { i, opponent } = fixture();
    i.street = 'turn';
    i.actions = [
      { playerId: opponent, street: 'flop', move: 'bet', to: 20 },
      { playerId: i.heroId, street: 'flop', move: 'raise', to: 60 },
      { playerId: opponent, street: 'flop', move: 'call', to: 60 },
      { playerId: opponent, street: 'turn', move: 'bet', to: 50 },
    ];
    // 200 before the flop; the bet of 20, the raise to 60 and the call of 40 more; then the turn bet.
    i.players = i.players.map((p) => ({ ...p, total: 100 + 60 + (p.id === opponent ? 50 : 0), bet: p.id === opponent ? 50 : 0 }));
    expect(potsBeforeActions(i, i.actions)).toEqual([200, 220, 280, 320]);
  });

  it('keeps a weak pair in the range of a tiny bet far more than of a pot-sized one', () => {
    const { i, opponent } = fixture();
    i.street = 'turn';
    i.board = ['Ac', 'Js', 'Td', '8c'];
    const players = (bet: number) => i.players.map((p) => ({ ...p, total: 105 + (p.id === opponent ? bet : 0), bet: p.id === opponent ? bet : 0 }));
    const weight = (bet: number, hole: [string, string]) => {
      i.actions = [{ playerId: opponent, street: 'turn', move: 'bet', to: bet }];
      i.players = players(bet);
      return publicRangeLikelihood(i, opponent, hole);
    };
    // Pocket fives on A-J-10-8 (a weak pair) stay in a tenth-of-the-pot bet's range more than twice as much as in a pot-sized one's.
    expect(weight(20, ['5h', '5c'])).toBeGreaterThan(2 * weight(210, ['5h', '5c']));
    // The made straight is likely either way.
    expect(weight(20, ['Kh', 'Qh'])).toBeGreaterThan(0.9);
    expect(weight(210, ['Kh', 'Qh'])).toBeGreaterThan(0.9);
  });
});
