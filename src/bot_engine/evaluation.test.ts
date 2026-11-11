import { describe, expect, it } from 'vitest';
import { evaluateMatchup, summarizeReturns } from './evaluation';
import { simulate } from './simulation';

describe('Paired real-engine evaluation', () => {
  it('swaps identities without changing the physical seat deals', () => {
    const config = { agents: ['bot', 'random'] as const, pairedDecks: true };
    const a = simulate(8, 4, 2, { ...config, agents: [...config.agents] });
    const b = simulate(8, 4, 2, { ...config, agents: [...config.agents], reverseSeats: true });
    expect(a.dealChecksums).toEqual(b.dealChecksums);
    expect(a.handReturnsBb).toHaveLength(8);
    const repeat = simulate(8, 4, 2, { ...config, agents: [...config.agents] });
    expect(repeat.handReturnsBb).toEqual(a.handReturnsBb);
    expect(repeat.actionCounts).toEqual(a.actionCounts);
  });
  it('counts pairs as the uncertainty unit rather than pretending duplicated deals are independent', () => {
    const result = evaluateMatchup(8, 'calling-station', 9);
    expect(result.hands).toBe(16);
    expect(result.dealPairs).toBe(8);
    expect(result.approximate95CI).toHaveLength(2);
    expect(summarizeReturns([1, 1, 1])).toEqual({ dealPairs: 3, bbPer100: 100, approximate95CI: [100, 100] });
    expect(summarizeReturns([1]).approximate95CI).toBeNull();
  });
});
