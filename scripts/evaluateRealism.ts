import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { simulate, type SimulationOptions } from '../src/bot_engine/simulation';
import { RealismAudit } from '../src/bot_engine/realism';

const hands = Number(process.argv[2] ?? 100),
  destination = resolve(process.argv[3] ?? '/tmp/flipup-realism-v7.json');
const partition = process.argv[4] ?? 'holdout';
if (!Number.isSafeInteger(hands) || hands < 20 || hands > 1000) throw new Error('Hands must be 20..1000');
if (!['development', 'holdout'].includes(partition)) throw new Error('Invalid seed partition');
const seeds = partition === 'development' ? [741311, 752333, 763339] : [841319, 852337, 863341];
const situations: { id: string; seats: number; options: SimulationOptions }[] = [
  { id: 'heads-up', seats: 2, options: { agents: ['bot', 'competent'], everyday: 'casual' } },
  {
    id: 'three-way-short-stack',
    seats: 3,
    options: { agents: ['bot', 'loose-passive', 'competent'], everyday: 'casual', startingStacksBb: [60, 12, 100] },
  },
  {
    id: 'six-way-unequal',
    seats: 6,
    options: {
      agents: ['bot', 'bot', 'bot', 'bot', 'competent', 'loose-passive'],
      everyday: 'casual',
      startingStacksBb: [60, 35, 100, 140, 80, 45],
    },
  },
  {
    id: 'nine-way-unequal',
    seats: 9,
    options: {
      agents: ['bot', 'loose-passive', 'bot', 'competent', 'loose-passive', 'bot', 'competent', 'loose-passive', 'bot'],
      everyday: 'challenge',
      startingStacksBb: [45, 20, 100, 160, 65, 30, 100, 75, 50],
    },
  },
];
const sessions = [];
const aggregates = { 'baseline-6': new RealismAudit(), 'baseline-7': new RealismAudit() };
const grouped = { 'baseline-6': new Map<string, RealismAudit>(), 'baseline-7': new Map<string, RealismAudit>() };
for (const situation of situations)
  for (const seed of seeds) {
    const run = (revision: 'baseline-6' | 'baseline-7') => {
      const audit = new RealismAudit();
      const group = grouped[revision].get(situation.id) ?? new RealismAudit();
      grouped[revision].set(situation.id, group);
      const result = simulate(hands, seed, situation.seats, {
        ...situation.options,
        revision,
        pairedDecks: true,
        onDecision: (t) => {
          audit.observe(t);
          group.observe(t);
          aggregates[revision].observe(t, situation.id);
        },
      });
      return { result, audit: audit.report() };
    };
    const previous = run('baseline-6'),
      current = run('baseline-7');
    const paired = previous.result.dealChecksums.every((v, k) => v === current.result.dealChecksums[k]);
    if (!paired) throw new Error('Comparison deals differ');
    const differences = current.result.handReturnsBb.map((v, k) => v - previous.result.handReturnsBb[k]);
    const mean = differences.reduce((s, v) => s + v, 0) / hands;
    const variance = differences.reduce((s, v) => s + (v - mean) ** 2, 0) / (hands - 1);
    const describe = (r: ReturnType<typeof run>) => ({
      behavior: r.result.behavior,
      coverage: r.result.postflopCoverage,
      table: r.result.tableExperience,
      latencyMs: r.result.latencyMs,
      bbPer100: r.result.bbPer100,
      handReturnsBb: r.result.handReturnsBb,
      audit: r.audit,
    });
    const session = {
      situation: situation.id,
      seed,
      hands,
      seats: situation.seats,
      identicalDeals: paired,
      previous: describe(previous),
      current: describe(current),
      pairedDeltaBbPer100: mean * 100,
      descriptive95Interval: [mean * 100 - 196 * Math.sqrt(variance / hands), mean * 100 + 196 * Math.sqrt(variance / hands)],
    };
    sessions.push(session);
    console.log(
      JSON.stringify({
        situation: situation.id,
        seed,
        delta: session.pairedDeltaBbPer100,
        coverage: session.current.coverage,
        flags: session.current.audit.flags,
        p95Ms: session.current.latencyMs.p95,
      }),
    );
  }
const current = sessions.map((s) => s.current);
const bySituation = situations.map((s) => ({
  situation: s.id,
  previous: grouped['baseline-6'].get(s.id)!.report(),
  current: grouped['baseline-7'].get(s.id)!.report(),
}));
const combined = { previous: aggregates['baseline-6'].report(), current: aggregates['baseline-7'].report() };
const gates = {
  identicalDeals: sessions.every((s) => s.identicalDeals),
  allPostflopModelled: current.every((s) => s.coverage.plannedDecisions === s.coverage.decisions),
  wholeHandPlansUsed: current.every((s) => s.audit.plannedDecisions === s.coverage.decisions),
  multiplayerExercised: current.some((s) => s.coverage.multiwayPlans > 0),
  allInContextsExercised: current.some((s) => s.coverage.allInOpponentModels > 0),
  realismProductChecks: current.every((s) => s.audit.passed) && bySituation.every((s) => s.current.passed) && combined.current.passed,
  repetitionCoverage: combined.current.repetition.qualifyingHands >= 30,
  optionalChoiceCoverage: combined.current.optionalDecisions >= 100,
  boundedExecutorLatency: current.every((s) => (s.latencyMs.p95 ?? Infinity) < 250),
};
const report = {
  protocol: 'multiplayer-continuity-7',
  partition,
  seeds,
  handsPerSession: hands,
  totalHands: sessions.length * hands * 2,
  gates,
  passed: Object.values(gates).every(Boolean),
  sessions,
  combined,
  bySituation,
  limitations: [
    'Product hypotheses, not evidence of human realism, enjoyment, retention or GTO strength.',
    'Paired deals and serial learning make intervals descriptive. Mixed-table changes affect all ordinary bot seats together.',
    'Sizing comparisons with insufficient context-matched bets remain explicitly unassessed.',
    'No parameters are fitted to these held-out returns or automatically promoted by this report.',
  ],
};
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ totalHands: report.totalHands, gates, report: destination }));
if (!report.passed) process.exitCode = 1;
