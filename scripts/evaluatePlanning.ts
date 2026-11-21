import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { simulate, type SimulationOptions } from '../src/bot_engine/simulation';

const hands = Number(process.argv[2] ?? 100);
const destination = resolve(process.argv[3] ?? '/tmp/flipup-planning.json');
const partition = process.argv[4] ?? 'holdout';
if (!Number.isSafeInteger(hands) || hands < 20 || hands > 1000) throw new Error('Hands must be 20..1000');
if (!['development', 'holdout'].includes(partition)) throw new Error('Invalid seed partition');
const seeds = partition === 'development' ? [523301, 534307, 545311] : [623309, 634313, 645329];
const situations: { id: string; seats: number; options: SimulationOptions }[] = [
  { id: 'heads-up-casual', seats: 2, options: { agents: ['bot', 'competent'], everyday: 'casual' } },
  { id: 'heads-up-challenge', seats: 2, options: { agents: ['bot', 'competent'], everyday: 'challenge' } },
  {
    id: 'unequal-mixed-table',
    seats: 6,
    options: {
      agents: ['bot', 'bot', 'bot', 'bot', 'competent', 'loose-passive'],
      everyday: 'casual',
      startingStacksBb: [60, 35, 100, 140, 80, 45],
    },
  },
];
const sessions = [];
for (const situation of situations)
  for (const seed of seeds) {
    const run = (revision: 'baseline-5' | 'baseline-6') =>
      simulate(hands, seed, situation.seats, {
        ...situation.options,
        pairedDecks: true,
        revision,
      });
    const previous = run('baseline-5'),
      current = run('baseline-6');
    const paired = previous.dealChecksums.every((checksum, n) => checksum === current.dealChecksums[n]);
    if (!paired) throw new Error('Comparison decks differ');
    const differences = current.handReturnsBb.map((value, n) => value - previous.handReturnsBb[n]);
    const mean = differences.reduce((s, v) => s + v, 0) / hands;
    const variance = differences.reduce((s, v) => s + (v - mean) ** 2, 0) / (hands - 1);
    const describe = (r: ReturnType<typeof simulate>) => ({
      bbPer100: r.bbPer100,
      behavior: r.behavior,
      table: r.tableExperience,
      coverage: r.postflopCoverage,
      latencyMs: r.latencyMs,
    });
    const session = {
      situation: situation.id,
      seed,
      hands,
      identicalDeals: paired,
      previous: describe(previous),
      current: describe(current),
      pairedDeltaBbPer100: mean * 100,
      descriptive95CI: [mean * 100 - 196 * Math.sqrt(variance / hands), mean * 100 + 196 * Math.sqrt(variance / hands)],
      previousReturnsBb: previous.handReturnsBb,
      currentReturnsBb: current.handReturnsBb,
    };
    sessions.push(session);
    console.log(
      JSON.stringify({
        situation: situation.id,
        seed,
        pairedDeltaBbPer100: session.pairedDeltaBbPer100,
        coverage: session.current.coverage,
        p95Ms: current.latencyMs.p95,
      }),
    );
  }
const gates = {
  identicalDeals: sessions.every((s) => s.identicalDeals),
  planningExercised: sessions.filter((s) => s.situation.startsWith('heads-up')).every((s) => s.current.coverage.plannedDecisions > 0),
  rangesExercised: sessions.every((s) => s.current.coverage.rangeAnalysedDecisions === s.current.coverage.decisions),
  historicalComparatorFrozen: sessions.every(
    (s) => s.previous.coverage.plannedDecisions === 0 && s.previous.coverage.rangeAnalysedDecisions === 0,
  ),
  boundedExecutorLatency: sessions.every((s) => (s.current.latencyMs.p95 ?? Infinity) < 250),
};
const report = {
  protocol: 'one-street-planning-1',
  partition,
  seeds,
  handsPerSession: hands,
  totalHands: sessions.length * hands * 2,
  gates,
  passed: Object.values(gates).every(Boolean),
  sessions,
  limitations: [
    'Untrained public-action range and continuation heuristics. No full-game solver or human-data calibration.',
    'Paired hand returns share session memories. Normal intervals are descriptive, not independent-sample significance tests.',
    'Heads-up compares the primary bot with the same scripted opponent. Mixed-table comparisons change all ordinary bot seats together.',
    'Runtime is measured on this executor; phone latency and human enjoyment are not established by this benchmark.',
    'No parameters are selected or updated using holdout returns. Gates check mechanics and coverage, not superior playing strength.',
  ],
};
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ totalHands: report.totalHands, gates, report: destination }));
if (!report.passed) process.exitCode = 1;
