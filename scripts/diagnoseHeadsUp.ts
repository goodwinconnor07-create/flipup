import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { simulate, type SimulationOptions } from '../src/bot_engine/simulation';
import { RealismAudit } from '../src/bot_engine/realism';
import { DecisionQualityAudit } from '../src/bot_engine/decisionQuality';
import type { DecisionTrace } from '../src/bot_engine/service';
const hands = Number(process.argv[2] ?? 300);
const destination = resolve(process.argv[3] ?? '/tmp/heads-up-ablation.json');
const stage = process.argv[4] ?? 'ablation';
if (!Number.isSafeInteger(hands) || hands < 20 || hands > 2000) throw new Error('Hands must be 20..2000');
if (!['ablation', 'fixes', 'nonlinear', 'robust'].includes(stage)) throw new Error('Invalid diagnosis stage');
const seeds = [941011, 941033];
const variants: { name: string; calibrated?: SimulationOptions['calibrated'] }[] =
  stage === 'robust'
    ? [
        { name: 'baseline-7' },
        { name: 'combined-1', calibrated: 'combined' },
        { name: 'nonlinear-3', calibrated: 'nonlinear' },
        { name: 'robust-4', calibrated: 'robust' },
      ]
    : stage === 'nonlinear'
      ? [
          { name: 'baseline-7' },
          { name: 'combined-1', calibrated: 'combined' },
          { name: 'guarded-2', calibrated: 'guarded' },
          { name: 'nonlinear-3', calibrated: 'nonlinear' },
        ]
      : stage === 'fixes'
        ? [
            { name: 'baseline-7' },
            { name: 'combined-1', calibrated: 'combined' },
            { name: 'opponents-only-2', calibrated: 'opponents' },
            { name: 'guarded-2', calibrated: 'guarded' },
          ]
        : [
            { name: 'baseline-7' },
            { name: 'ranges-only', calibrated: 'ranges' },
            { name: 'responses-only', calibrated: 'responses' },
            { name: 'combined-1', calibrated: 'combined' },
          ];
function snapshot(t: DecisionTrace) {
  return {
    information: t.information,
    action: t.action,
    intent: t.handPlan?.intent,
    equity: t.prediction.equity,
    actions: t.prediction.actions,
    rolloutValues: t.prediction.rolloutValues,
    decisionScores: t.prediction.values,
    standardErrors: t.prediction.valueStandardErrors,
    distribution: t.finalDistribution,
    modelAgreement: t.prediction.modelAgreement,
  };
}
type Simulation = ReturnType<typeof simulate>;
type Session = {
  opponent: string;
  seed: number;
  deltas: { variant: string; deltaBbPer100: number; descriptive95Interval: number[] }[];
  runs: {
    name: string;
    bbPer100: number;
    returns: number[];
    behavior: Simulation['behavior'];
    quality: ReturnType<DecisionQualityAudit['report']>;
    realism: Pick<ReturnType<RealismAudit['report']>, 'passed' | 'flags' | 'repetition'>;
    latency: Simulation['latencyMs'];
  }[];
  costlyHands: { hand: number; deltaBb: number; traces: Record<string, ReturnType<typeof snapshot>[]> }[];
};
const sessions: Session[] = [];
for (const opponent of ['competent', 'calling-station', 'loose-aggressive'] as const)
  for (const seed of seeds) {
    const runs = variants.map((v) => {
      const audit = new RealismAudit(),
        quality = new DecisionQualityAudit();
      const traces = new Map<number, ReturnType<typeof snapshot>[]>();
      const result = simulate(hands, seed, 2, {
        agents: ['bot', opponent],
        everyday: 'casual',
        pairedDecks: true,
        calibrated: v.calibrated,
        onDecision: (t) => {
          audit.observe(t);
          quality.observe(t);
          if (t.information.street !== 'preflop') {
            const rows = traces.get(t.information.hand) ?? [];
            rows.push(snapshot(t));
            traces.set(t.information.hand, rows);
          }
        },
      });
      console.log(JSON.stringify({ opponent, seed, variant: v.name, bbPer100: result.bbPer100 }));
      return { name: v.name, result, traces, realism: audit.report(), quality: quality.report() };
    });
    if (runs.some((r) => r.result.dealChecksums.some((d, k) => d !== runs[0].result.dealChecksums[k]))) throw new Error('Deal mismatch');
    const deltas = runs.slice(1).map((r) => {
      const differences = r.result.handReturnsBb.map((v, k) => v - runs[0].result.handReturnsBb[k]);
      const mean = differences.reduce((s, v) => s + v, 0) / hands;
      const half = 196 * Math.sqrt(differences.reduce((s, v) => s + (v - mean) ** 2, 0) / (hands - 1) / hands);
      return { variant: r.name, deltaBbPer100: mean * 100, descriptive95Interval: [mean * 100 - half, mean * 100 + half] };
    });
    const losses = runs[3].result.handReturnsBb
      .map((v, k) => ({ hand: k + 1, deltaBb: v - runs[0].result.handReturnsBb[k] }))
      .sort((a, b) => a.deltaBb - b.deltaBb)
      .slice(0, 4);
    sessions.push({
      opponent,
      seed,
      deltas,
      runs: runs.map((r) => ({
        name: r.name,
        bbPer100: r.result.bbPer100,
        returns: r.result.handReturnsBb,
        behavior: r.result.behavior,
        quality: r.quality,
        realism: { passed: r.realism.passed, flags: r.realism.flags, repetition: r.realism.repetition },
        latency: r.result.latencyMs,
      })),
      costlyHands: losses.map((l) => ({ ...l, traces: Object.fromEntries(runs.map((r) => [r.name, r.traces.get(l.hand) ?? []])) })),
    });
  }
const summary = ['competent', 'calling-station', 'loose-aggressive'].map((opponent) => ({
  opponent,
  deltas: variants.slice(1).map((v) => ({
    variant: v.name,
    deltaBbPer100:
      sessions
        .filter((s) => s.opponent === opponent)
        .reduce((sum, s) => sum + s.deltas.find((d) => d.variant === v.name)!.deltaBbPer100, 0) / seeds.length,
  })),
}));
await mkdir(dirname(destination), { recursive: true });
await writeFile(
  destination,
  JSON.stringify(
    {
      protocol: 'heads-up-ablation-1',
      stage,
      partition: 'development',
      seeds,
      handsPerSession: hands,
      totalHands: hands * seeds.length * 3 * variants.length,
      summary,
      sessions,
      limitations: [
        'Development evidence, used to diagnose and select changes. These seeds cannot serve as fresh promotion holdouts.',
        'Counterfactual traces have only actor-local cards and public history. Costly hand return differences include runout/action variance, not certified mistakes.',
        'Fixed synthetic opponents and descriptive intervals; no human realism or general strength certification.',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ summary, report: destination }));
