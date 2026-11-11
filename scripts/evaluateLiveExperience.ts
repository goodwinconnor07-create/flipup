import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { simulate, type SimulationOptions } from '../src/bot_engine/simulation';
import { RealismAudit } from '../src/bot_engine/realism';
const destination = resolve(process.argv[2] ?? '/tmp/live-experience.json');
const policyFiles = [
  'philosophy.ts',
  'sessionFeel.ts',
  'tableCast.ts',
  'everyday.ts',
  'everydayLive.ts',
  'live.ts',
  'service.ts',
  'simulation.ts',
  'handPlan.ts',
  'memory.ts',
  'handStory.ts',
  'decisionRisk.ts',
];
const fingerprint = async () => {
  const h = createHash('sha256');
  for (const f of policyFiles) h.update(f).update(await readFile(resolve('src/bot_engine', f)));
  return h.digest('hex');
};
const sourceFingerprint = await fingerprint();
const cases: { id: string; hands: number; seats: number; seed: number; options: SimulationOptions }[] = [
  { id: 'heads-up-caller', hands: 160, seats: 2, seed: 1711011, options: { agents: ['bot', 'calling-station'], everyday: 'casual' } },
  { id: 'heads-up-competent', hands: 80, seats: 2, seed: 1711033, options: { agents: ['bot', 'competent'], everyday: 'casual' } },
  {
    id: 'short-three',
    hands: 80,
    seats: 3,
    seed: 1711057,
    options: { agents: ['bot', 'loose-passive', 'competent'], everyday: 'casual', startingStacksBb: [60, 12, 100] },
  },
  {
    id: 'six-casual',
    hands: 100,
    seats: 6,
    seed: 1711071,
    options: {
      agents: ['bot', 'bot', 'competent', 'loose-passive', 'bot', 'calling-station'],
      everyday: 'casual',
      startingStacksBb: [60, 35, 100, 140, 80, 45],
    },
  },
  {
    id: 'nine-challenge',
    hands: 80,
    seats: 9,
    seed: 1711093,
    options: {
      agents: ['bot', 'loose-passive', 'bot', 'competent', 'loose-aggressive', 'bot', 'tight-passive', 'loose-passive', 'bot'],
      everyday: 'challenge',
      startingStacksBb: [45, 20, 100, 160, 65, 30, 100, 75, 50],
    },
  },
];
const pooled = new RealismAudit();
let decisions = 0,
  explained = 0,
  supported = 0,
  publicReads = 0,
  moods = 0,
  followUps = 0,
  decisionsWithBotObservations = 0,
  decisionsWithScriptObservations = 0;
const principles: Record<string, number> = {};
const examples: { principle: string; summary: string; action: unknown; hand: number }[] = [];
const sessions = cases.map((c) => {
  const baseline = simulate(c.hands, c.seed, c.seats, { ...c.options, pairedDecks: true });
  const audit = new RealismAudit();
  const live = simulate(c.hands, c.seed, c.seats, {
    ...c.options,
    pairedDecks: true,
    experience: true,
    onDecision: (t) => {
      decisions++;
      // Evaluator-only role labels. They are never passed to a bot policy or learner.
      const observed = Object.keys(t.memory.behavior?.opponents ?? {});
      if (observed.some((id) => c.options.agents?.[Number(id.slice(4)) - 1] === 'bot')) decisionsWithBotObservations++;
      if (observed.some((id) => c.options.agents?.[Number(id.slice(4)) - 1] !== 'bot')) decisionsWithScriptObservations++;
      pooled.observe(t, c.id);
      audit.observe(t);
      const reason = t.rationale,
        k = reason.actionIndex;
      if (reason.principle && reason.summary && JSON.stringify(t.prediction.actions[k]) === JSON.stringify(t.action)) explained++;
      if (t.philosophy.actions[k].plausible) supported++;
      if (reason.factors.some((f) => f.startsWith('established-'))) publicReads++;
      if (Object.values(t.philosophy.session).some((v) => v > 0.05)) moods++;
      if (
        reason.factors.some((f) =>
          [
            'earlier-probe-was-called-without-improvement',
            'follow-through-value-plan',
            'planned-draw-became-value',
            'preserve-earlier-pot-control-plan',
          ].includes(f),
        )
      )
        followUps++;
      principles[reason.principle] = (principles[reason.principle] ?? 0) + 1;
      if (examples.length < 12 && !examples.some((e) => e.principle === reason.principle))
        examples.push({ principle: reason.principle, summary: reason.summary, action: t.action, hand: t.information.hand });
    },
  });
  const identicalDeals = live.dealChecksums.every((d, k) => d === baseline.dealChecksums[k]);
  const row = {
    id: c.id,
    hands: c.hands,
    seats: c.seats,
    seed: c.seed,
    identicalDeals,
    baseline: { bbPer100: baseline.bbPer100, behavior: baseline.behavior },
    live: {
      bbPer100: live.bbPer100,
      behavior: live.behavior,
      coverage: live.postflopCoverage,
      latency: live.latencyMs,
      realism: audit.report(),
    },
  };
  console.log(JSON.stringify({ case: c.id, identicalDeals, p95: live.latencyMs.p95, flags: row.live.realism.flags }));
  return row;
});
const r = pooled.report();
const gates = {
  identicalDeals: sessions.every((s) => s.identicalDeals),
  everyDecisionExplained: explained === decisions && decisions > 0,
  onlySupportedChoices: supported === decisions,
  realism: sessions.every((s) => s.live.realism.passed) && r.passed,
  boundedExecutorLatency: sessions.every((s) => (s.live.latency.p95 ?? Infinity) < 250),
  publicReadsExercised: publicReads > 0,
  sessionDynamicsExercised: moods > 0,
  confirmedPlansExercised: followUps > 0,
  bothOpponentOriginsObserved: decisionsWithBotObservations > 0 && decisionsWithScriptObservations > 0,
};
const report = {
  protocol: 'live-human-table-1',
  productionEnabled: true,
  sourceFingerprint,
  totalHands: cases.reduce((s, c) => s + c.hands * 2, 0),
  gates,
  passed: Object.values(gates).every(Boolean),
  decisions,
  explained,
  supported,
  publicReads,
  moods,
  followUps,
  decisionsWithBotObservations,
  decisionsWithScriptObservations,
  principles,
  examples,
  sessions,
  pooledRealism: r,
  limitations: [
    'Focused release regression of a bounded experience layer on V7, not a fitted-policy promotion or a strength/enjoyment certificate.',
    'Synthetic opponents, short sessions and descriptive returns. Table identities change in the experience leg; returns do not isolate one component.',
    'Sparse sizing and rare-event cells remain explicitly unassessed. Private rationales record policy rules and model facts, not knowledge of opposing cards.',
  ],
};
if ((await fingerprint()) !== sourceFingerprint) throw new Error('Live policy changed during release check');
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ gates, decisions, explained, supported, publicReads, moods, report: destination }));
if (!report.passed) process.exitCode = 1;
