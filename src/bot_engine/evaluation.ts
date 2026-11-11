import { simulate } from './simulation';
import { SCRIPTED_OPPONENTS, type ScriptedOpponent } from './scriptedOpponents';

export function summarizeReturns(values: number[]) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1) : null;
  const half = variance === null ? null : 196 * Math.sqrt(variance / n);
  return { dealPairs: n, bbPer100: mean * 100, approximate95CI: half === null ? null : [mean * 100 - half, mean * 100 + half] };
}

/** Each pair uses the same deck/button twice with the two identities exchanging physical seats. */
export function evaluateMatchup(pairs: number, opponent: ScriptedOpponent | 'baseline' | 'bot' | 'previous' | 'incumbent', seed = 17) {
  const legs = [false, true].map((reverseSeats) =>
    simulate(pairs, seed, 2, { agents: ['bot', opponent], reverseSeats, pairedDecks: true }),
  );
  if (legs[0].dealChecksums.some((d, n) => d !== legs[1].dealChecksums[n])) throw new Error('Paired decks diverged');
  const averagedReturns = legs[0].handReturnsBb.map((r, n) => (r + legs[1].handReturnsBb[n]) / 2);
  return {
    opponent,
    seed,
    hands: pairs * 2,
    ...summarizeReturns(averagedReturns),
    p95DecisionMsByLeg: legs.map((l) => l.latencyMs.p95),
    actionCountsByLeg: legs.map((l) => l.actionCounts),
    warnings: [
      'Normal interval uses deal-pair means; adaptive memory creates serial dependence, so the interval is descriptive, not a formal strength claim. Scripted opponents are uncalibrated.',
    ],
  };
}

export function evaluatePopulation(pairs = 100, seed = 17) {
  return {
    protocolVersion: 1,
    pairsPerOpponent: pairs,
    matchups: [...SCRIPTED_OPPONENTS, 'baseline', 'bot'].map((opponent) =>
      evaluateMatchup(pairs, opponent as ScriptedOpponent | 'baseline' | 'bot' | 'previous', seed),
    ),
    limitations: [
      'Heads-up paired deals only; no certified exploitability or human realism measure.',
      'Runs do not share bot beliefs. Changing opponent switches halfway through each leg.',
    ],
  };
}
