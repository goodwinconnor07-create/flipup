import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { simulate, type SimulationOptions } from '../src/bot_engine/simulation';
import { RealismAudit } from '../src/bot_engine/realism';
import { DecisionQualityAudit } from '../src/bot_engine/decisionQuality';
import type { CalibrationMode } from '../src/bot_engine/calibratedProvider';
const hands = Number(process.argv[2] ?? 100),
  destination = resolve(process.argv[3] ?? '/tmp/calibrated-comparison.json'),
  partition = process.argv[4] ?? 'holdout';
const candidateMode = (process.argv[5] ?? 'combined') as CalibrationMode | 'behavior';
const partitions: Record<string, number[]> = {
  development: [511011],
  holdout: [611021, 622037, 633049],
  confirmation: [711031, 722051, 733063],
  'repair-development': [941011, 941033],
  'repair-holdout': [1101011, 1101033, 1101057],
  'repair-confirmation': [1201019, 1201037, 1201061],
  'behavior-development': [1311011],
  'behavior-holdout': [1411011, 1411033, 1411057],
  'behavior-confirmation': [1511019, 1511037, 1511061],
};
if (
  !Number.isInteger(hands) ||
  hands < 20 ||
  hands > 1000 ||
  !partitions[partition] ||
  !['combined', 'guarded', 'nonlinear', 'robust', 'behavior'].includes(candidateMode)
)
  throw new Error('Invalid comparison arguments');
const seeds = partitions[partition];
const candidateName =
  candidateMode === 'behavior'
    ? 'public-behavior-1'
    : candidateMode === 'combined'
      ? 'calibrated-1'
      : candidateMode === 'guarded'
        ? 'guarded-2'
        : candidateMode === 'robust'
          ? 'robust-4'
          : 'nonlinear-3';
const frozenFiles = [
  'calibratedProvider.ts',
  'multiplayerPlanning.ts',
  'responseModel.ts',
  'responseModelV2.ts',
  'responseWeights.json',
  'responseWeightsV2.json',
  'responseRanges.ts',
  'guardedResponse.ts',
  'strategy.ts',
  'service.ts',
  'decisionRisk.ts',
  'behavioralProvider.ts',
  'behaviorMemory.ts',
  'publicBehavior.ts',
  'opponentModel.ts',
  'memory.ts',
  'simulation.ts',
  'scriptedOpponents.ts',
  'everydayLive.ts',
  'live.ts',
];
const fingerprint = async () => {
  const h = createHash('sha256');
  for (const file of frozenFiles) h.update(file).update(await readFile(resolve('src/bot_engine', file)));
  return h.digest('hex');
};
const candidateFingerprint = await fingerprint();
const cases: { id: string; seats: number; options: SimulationOptions }[] = [
  { id: 'HU', seats: 2, options: { agents: ['bot', 'competent'], everyday: 'casual' } },
  {
    id: 'short-three',
    seats: 3,
    options: { agents: ['bot', 'loose-passive', 'competent'], everyday: 'casual', startingStacksBb: [60, 12, 100] },
  },
  {
    id: 'six',
    seats: 6,
    options: {
      agents: ['bot', 'bot', 'competent', 'loose-passive', 'bot', 'calling-station'],
      everyday: 'casual',
      startingStacksBb: [60, 35, 100, 140, 80, 45],
    },
  },
  {
    id: 'nine',
    seats: 9,
    options: {
      agents: ['bot', 'loose-passive', 'bot', 'competent', 'loose-aggressive', 'bot', 'tight-passive', 'loose-passive', 'bot'],
      everyday: 'challenge',
      startingStacksBb: [45, 20, 100, 160, 65, 30, 100, 75, 50],
    },
  },
];
if (partition.startsWith('repair-') || partition.startsWith('behavior-'))
  cases.push(
    { id: 'HU-station', seats: 2, options: { agents: ['bot', 'calling-station'], everyday: 'casual' } },
    { id: 'HU-aggressive', seats: 2, options: { agents: ['bot', 'loose-aggressive'], everyday: 'casual' } },
  );
if (partition.startsWith('behavior-'))
  cases.push(
    { id: 'HU-changing-calls', seats: 2, options: { agents: ['bot', 'changing'], everyday: 'casual' } },
    { id: 'HU-changing-aggression', seats: 2, options: { agents: ['bot', 'changing-aggression'], everyday: 'casual' } },
  );
type Run = {
  version: string;
  returns: number[];
  deals: number[];
  bbPer100: number;
  coverage: ReturnType<typeof simulate>['postflopCoverage'];
  latency: ReturnType<typeof simulate>['latencyMs'];
  behavior: ReturnType<typeof simulate>['behavior'];
  realism: ReturnType<RealismAudit['report']>;
  quality: ReturnType<DecisionQualityAudit['report']>;
};
type Session = {
  situation: string;
  seed: number;
  hands: number;
  identicalDeals: boolean;
  runs: Omit<Run, 'deals'>[];
  differences: { reference: string; deltaBbPer100: number; descriptive95Interval: number[] }[];
};
const sessions: Session[] = [];
const pooled = new RealismAudit();
const grouped = new Map<string, RealismAudit>();
for (const c of cases)
  for (const seed of seeds) {
    const runs: Run[] = [];
    for (const version of ['baseline-6', 'baseline-7', candidateName]) {
      const realism = new RealismAudit(),
        quality = new DecisionQualityAudit();
      const group = grouped.get(c.id) ?? new RealismAudit();
      if (version === candidateName) grouped.set(c.id, group);
      const r = simulate(hands, seed, c.seats, {
        ...c.options,
        pairedDecks: true,
        revision: version === 'baseline-6' ? 'baseline-6' : 'baseline-7',
        calibrated: version === candidateName ? candidateMode : false,
        onDecision: (t) => {
          realism.observe(t);
          quality.observe(t);
          if (version === candidateName) {
            group.observe(t);
            pooled.observe(t, c.id);
          }
        },
      });
      runs.push({
        version,
        returns: r.handReturnsBb,
        deals: r.dealChecksums,
        bbPer100: r.bbPer100,
        coverage: r.postflopCoverage,
        latency: r.latencyMs,
        behavior: r.behavior,
        realism: realism.report(),
        quality: quality.report(),
      });
    }
    const same = runs.every((r) => r.deals.every((d, k) => d === runs[0].deals[k]));
    if (!same) throw new Error('Comparison deals differ');
    const candidate = runs[2];
    const differences = runs.slice(0, 2).map((base) => {
      const delta = candidate.returns.map((v, k) => v - base.returns[k]),
        mean = delta.reduce((s, v) => s + v, 0) / hands;
      const variance = delta.reduce((s, v) => s + (v - mean) ** 2, 0) / (hands - 1),
        half = 196 * Math.sqrt(variance / hands);
      return { reference: base.version, deltaBbPer100: mean * 100, descriptive95Interval: [mean * 100 - half, mean * 100 + half] };
    });
    sessions.push({ situation: c.id, seed, hands, identicalDeals: same, runs: runs.map(({ deals, ...r }) => r), differences });
    console.log(JSON.stringify({ situation: c.id, seed, differences, flags: candidate.realism.flags, p95: candidate.latency.p95 }));
  }
const summary = cases.map((c) => {
  const rows = sessions.filter((s) => s.situation === c.id);
  return { situation: c.id, deltaVersusV7: rows.reduce((s, r) => s + r.differences[1].deltaBbPer100, 0) / rows.length };
});
const gates = {
  identicalDeals: sessions.every((s) => s.identicalDeals),
  realism:
    sessions.every((s) => s.runs[2].realism.passed) && [...grouped.values()].every((a) => a.report().passed) && pooled.report().passed,
  repetitionCoverage: pooled.report().repetition.qualifyingHands >= 30,
  optionalChoiceCoverage: pooled.report().optionalDecisions >= 100,
  latency: sessions.every((s) => (s.runs[2].latency.p95 ?? Infinity) < 250),
};
const promotionCandidate = Object.values(gates).every(Boolean) && summary.every((s) => s.deltaVersusV7 >= 0);
const report = {
  protocol: 'response-comparison-1',
  partition,
  candidateMode,
  candidateFingerprint,
  seeds,
  handsPerSession: hands,
  totalHands: sessions.length * hands * 3,
  gates,
  passed: Object.values(gates).every(Boolean),
  summary,
  promotionCandidate,
  productionDefaultChanged: false,
  pooledRealism: pooled.report(),
  realismBySituation: Object.fromEntries([...grouped].map(([k, v]) => [k, v.report()])),
  sessions,
  limitations: [
    'Synthetic opponents and descriptive intervals; no human realism or general strength certification.',
    'Quality flags measure disagreements with approximate model values, not ground-truth poker errors.',
    'Training, response test and gameplay holdout seeds are disjoint. No gameplay returns fit response weights.',
    'Promotion eligibility is a conservative review screen, not automatic deployment.',
  ],
};
if ((await fingerprint()) !== candidateFingerprint) throw new Error('Policy source changed during comparison; report rejected');
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ summary, gates, promotionCandidate, report: destination }));
if (!report.passed) process.exitCode = 1;
