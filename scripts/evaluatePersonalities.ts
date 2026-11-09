import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { simulate, type SimulationOptions } from '../src/bot_engine/simulation';
import { PERSONALITIES, type PersonalityId } from '../src/bot_engine/personalities';
import { summarizeReturns } from '../src/bot_engine/evaluation';
import type { AgentKind } from '../src/bot_engine/scriptedOpponents';

const hands = Number(process.argv[2] ?? 200),
  destination = resolve(process.argv[3] ?? '/tmp/flipup-personalities.json');
if (!Number.isSafeInteger(hands) || hands < 20 || hands > 5000) throw new Error('Hands per session must be 20..5000');
const partition = process.argv[4] ?? 'holdout';
if (!['development', 'holdout'].includes(partition)) throw new Error('Partition must be development or holdout');
const seeds = partition === 'development' ? [72109, 83117, 94121] : [262111, 273127, 284131];
const scenarios: { name: string; agents: AgentKind[]; stacks: number[]; carry?: boolean }[] = [
  { name: 'competent', agents: ['bot', 'competent'], stacks: [65, 140] },
  { name: 'loose-aggressive', agents: ['bot', 'loose-aggressive'], stacks: [125, 45] },
  {
    name: 'mixed-six',
    agents: ['bot', 'competent', 'calling-station', 'loose-aggressive', 'tight-passive', 'loose-passive'],
    stacks: [75, 30, 140, 55, 110, 45],
  },
];
const ratio = (a: number, b: number) => (b ? a / b : null);
type Counts = ReturnType<typeof simulate>['behavior'];
function rates(b: Counts) {
  return {
    vpip: ratio(b.vpipHands, b.hands),
    pfr: ratio(b.pfrHands, b.hands),
    threeBet: ratio(b.threeBets, b.threeBetOpportunities),
    aggression: ratio(b.postflopAggressions, b.postflopDecisions),
    foldFacingBet: ratio(b.folds, b.foldOpportunities),
    drawCall: ratio(b.drawCalls, b.drawCallOpportunities),
    riverCall: ratio(b.riverCalls, b.riverCallOpportunities),
    weakBet: ratio(b.weakBets, b.weakBetOpportunities),
    meanBetPot: ratio(b.betSizeSum, b.betSizes),
  };
}
type Session = {
  seed: number;
  scenario: string;
  personality: PersonalityId;
  hands: number;
  rates: ReturnType<typeof rates>;
  counts: Counts;
  returns: ReturnType<typeof summarizeReturns>;
  coverage: ReturnType<typeof simulate>['preflopCoverage'];
  p95Ms: number | undefined;
};
const sessions: Session[] = [];
const sharedDeals = new Map<string, number[]>();
for (const seed of seeds)
  for (const scenario of scenarios)
    for (const personality of PERSONALITIES) {
      const options: SimulationOptions = {
        agents: scenario.agents,
        startingStacksBb: scenario.stacks,
        personality: personality.id,
        pairedDecks: true,
        reverseSeats: seed === seeds[1],
      };
      const result = simulate(hands, seed, scenario.agents.length, options);
      const dealKey = `${seed}:${scenario.name}`,
        priorDeals = sharedDeals.get(dealKey);
      if (priorDeals && result.dealChecksums.some((d, k) => d !== priorDeals[k])) throw new Error('Profile comparison decks diverged');
      sharedDeals.set(dealKey, result.dealChecksums);
      const session = {
        seed,
        scenario: scenario.name,
        personality: personality.id,
        hands,
        rates: rates(result.behavior),
        counts: result.behavior,
        returns: summarizeReturns(result.handReturnsBb),
        coverage: result.preflopCoverage,
        p95Ms: result.latencyMs.p95,
      };
      sessions.push(session);
      console.log(JSON.stringify({ seed, scenario: scenario.name, personality: personality.id, rates: session.rates }));
    }
const summaries = PERSONALITIES.map((p) => {
  const own = sessions.filter((s) => s.personality === p.id);
  const counts = own.reduce(
    (acc, s) => {
      for (const k of Object.keys(acc) as (keyof Counts)[]) acc[k] += s.counts[k];
      return acc;
    },
    Object.fromEntries(Object.keys(own[0].counts).map((k) => [k, 0])) as Counts,
  );
  return {
    personality: p.id,
    rates: rates(counts),
    counts,
    returnsByScenario: scenarios.map(({ name }) => {
      const matching = own.filter((s) => s.scenario === name);
      return {
        scenario: name,
        sessions: matching.length,
        hands: matching.reduce((sum, s) => sum + s.hands, 0),
        meanBbPer100: matching.reduce((sum, s) => sum + s.returns.bbPer100, 0) / matching.length,
      };
    }),
  };
});
const vector = (s: (typeof sessions)[number]) =>
  [s.rates.vpip, s.rates.pfr, s.rates.aggression, s.rates.foldFacingBet, s.rates.weakBet].map((v) => v ?? 0);
// Hold out an entire seed, including all opponents, before deriving the behavior-only classifier.
const recognition = sessions.map((session) => {
  const training = sessions.filter((s) => s.seed !== session.seed);
  const centroids = PERSONALITIES.map((p) => {
    const own = training.filter((s) => s.personality === p.id);
    return { personality: p.id, center: vector(own[0]).map((_, k) => own.reduce((sum, s) => sum + vector(s)[k], 0) / own.length) };
  });
  const v = vector(session);
  const predicted = centroids
    .map((c) => ({ id: c.personality, distance: c.center.reduce((sum, x, k) => sum + (x - v[k]) ** 2, 0) }))
    .sort((a, b) => a.distance - b.distance)[0].id;
  return { seed: session.seed, scenario: session.scenario, actual: session.personality, predicted };
});
const patient = summaries.find((s) => s.personality === 'patient')!.rates,
  curious = summaries.find((s) => s.personality === 'curious')!.rates,
  aggressive = summaries.find((s) => s.personality === 'aggressive')!.rates;
const gates = {
  curiousPlaysMore: curious.vpip! > patient.vpip! + 0.03,
  aggressiveRaisesMoreThanCaller: aggressive.pfr! > curious.pfr! + 0.03,
  aggressiveBetsMorePostflop: aggressive.aggression! > patient.aggression! + 0.03,
  patientFoldsMore: patient.foldFacingBet! > curious.foldFacingBet! + 0.03,
  aggressiveUsesMoreWeakBets: aggressive.weakBet! > patient.weakBet! + 0.03,
};
// Separate comparison of the new stack/caller model against the frozen v4 provider, with no new personality.
const coverageComparison = scenarios.map((scenario) => {
  const options = { agents: scenario.agents, startingStacksBb: scenario.stacks, pairedDecks: true };
  const candidate = simulate(hands, 102137, scenario.agents.length, options);
  const incumbent = simulate(hands, 102137, scenario.agents.length, { ...options, revision: 'baseline-4' });
  if (candidate.dealChecksums.some((d, k) => d !== incumbent.dealChecksums[k])) throw new Error('Paired decks diverged');
  return {
    scenario: scenario.name,
    hands: hands * 2,
    candidateCoverage: candidate.preflopCoverage,
    incumbentCoverage: incumbent.preflopCoverage,
    delta: summarizeReturns(candidate.handReturnsBb.map((r, k) => r - incumbent.handReturnsBb[k])),
  };
});
const sessionCheck = PERSONALITIES.map((p) => {
  const r = simulate(40, 115127, 6, {
    agents: scenarios[2].agents,
    startingStacksBb: scenarios[2].stacks,
    carryStacks: true,
    pairedDecks: true,
    personality: p.id,
  });
  return { personality: p.id, hands: r.hands, coverage: r.preflopCoverage, completed: true };
});
const report = {
  protocol: 'personality-behavior-1',
  model: 'baseline-5',
  partition,
  handsPerSession: hands,
  seeds,
  totalHands: sessions.length * hands + coverageComparison.length * hands * 2 + sessionCheck.length * 40,
  summaries,
  gates,
  allBehaviorGatesPassed: Object.values(gates).every(Boolean),
  blindRecognitionAccuracy: recognition.filter((r) => r.actual === r.predicted).length / recognition.length,
  recognition,
  sessions,
  coverageComparison,
  sessionCheck,
  limitations: [
    'Authored personalities and heuristic range/response models; no human-data realism calibration or solver exploitability guarantee.',
    'Recognition uses aggregate decisions from simulated sessions and holds out whole seeds; it does not establish recognition by humans in short live games.',
    'Weak-hand betting is a public-feature proxy, not a certified bluff count. Rates include explicit opportunity denominators; small conditional samples are uncertain.',
    'Fresh unequal stacks in comparison sessions; separate continuous-stack checks rebuy only busted seats. Adaptive memory makes return intervals descriptive.',
  ],
};
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify({
    totalHands: report.totalHands,
    summaries,
    gates,
    blindRecognitionAccuracy: report.blindRecognitionAccuracy,
    report: destination,
  }),
);
if (!report.allBehaviorGatesPassed || report.blindRecognitionAccuracy < 0.75) process.exitCode = 1;
