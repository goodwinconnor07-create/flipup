import type { BehaviorSnapshot, Triple } from './behaviorMemory';
import { priorResponse } from './guardedResponse';
import { behaviorKey } from './publicBehavior';
import type { ResponseView } from './responseModel';
export function opponentEvidence(s: BehaviorSnapshot | undefined, id: string, v: ResponseView) {
  const key = behaviorKey(v),
    parts = key.split('|');
  const counts: Triple = [0, 0, 0],
    sizes: Triple = [0, 0, 0];
  for (const [k, c] of Object.entries(Object.hasOwn(s?.opponents ?? {}, id) ? s!.opponents[id] : {})) {
    const p = k.split('|');
    // Partial pooling within the same player-count/response context; no preflop transfer.
    const w = k === key ? 1 : p[1] === parts[1] && p[2] === parts[2] ? 0.2 : 0;
    for (let n = 0; n < 3; n++) {
      counts[n] += c.counts[n] * w;
      sizes[n] += c.sizes[n] * w;
    }
  }
  const samples = counts.reduce((a, b) => a + b, 0),
    sizeSamples = sizes.reduce((a, b) => a + b, 0);
  const prior: Triple = v.toCall ? [0.3, 0.6, 0.1] : [0, 0.82, 0.18];
  const frequencies = counts.map((n, k) => (n + 8 * prior[k]) / (samples + 8)) as Triple;
  const trust = (0.65 * samples) / (samples + 20);
  const sizeTrust = (0.5 * sizeSamples) / (sizeSamples + 12);
  const sizeFraction = sizeSamples ? sizes.reduce((a, n, k) => a + n * [0.33, 0.67, 1.1][k], 0) / sizeSamples : 0.67;
  return { context: key, samples, trust, frequencies, sizeSamples, sizeTrust, sizeFraction };
}
/** Bounded odds adjustment retains hand ordering while public frequencies revise the population prior. */
export function opponentResponse(v: ResponseView, s: BehaviorSnapshot | undefined, id: string): Triple {
  const base = priorResponse(v),
    e = opponentEvidence(s, id, v);
  if (e.trust === 0) return base;
  if (
    v.board.length === 5 &&
    ['T', 'J', 'Q', 'K', 'A'].every((r) => v.board.some((c) => c[0] === r)) &&
    v.board.every((c) => c[1] === v.board[0][1])
  )
    return [0, 1, 0];
  const allowed = [v.toCall > 0, true, v.canRaise];
  const population: Triple = v.toCall ? [0.3, 0.6, 0.1] : [0, 0.82, 0.18];
  const legal = allowed.filter(Boolean).length;
  const weighted = base.map((p, k) =>
    allowed[k]
      ? (p * (1 - 0.1 * e.trust) + (0.1 * e.trust) / legal) *
        Math.pow(Math.max(0.05, Math.min(8, e.frequencies[k] / population[k])), e.trust)
      : 0,
  );
  const sum = weighted.reduce((a, b) => a + b, 0);
  return weighted.map((p) => p / sum) as Triple;
}
export function opponentSizing(v: ResponseView, s: BehaviorSnapshot | undefined, id: string, fraction: number): number {
  const e = opponentEvidence(s, id, v);
  return fraction * (1 - e.sizeTrust) + e.sizeFraction * e.sizeTrust;
}
