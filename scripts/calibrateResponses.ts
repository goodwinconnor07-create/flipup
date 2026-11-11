import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { simulate } from '../src/bot_engine/simulation';
import { PlanningRound, continuationView, continuationIntent } from '../src/bot_engine/multiplayerPlanning';
import {
  fitResponses,
  responseProbabilities,
  responseScores,
  RESPONSE_FEATURES,
  type ResponseExample,
} from '../src/bot_engine/responseModel';

const hands = Number(process.argv[2] ?? 100),
  out = resolve(process.argv[3] ?? '/tmp/response-calibration.json');
if (!Number.isInteger(hands) || hands < 10 || hands > 1000) throw new Error('Hands must be 10..1000');
const partitions = { training: [192031, 192037], validation: [293021], test: [394033] };
const data = {} as Record<keyof typeof partitions, ResponseExample[]>;
for (const partition of Object.keys(partitions) as (keyof typeof partitions)[]) {
  const rows: ResponseExample[] = [];
  for (const seed of partitions[partition])
    for (const seats of [2, 3, 6]) {
      const roster = Array.from({ length: seats }, (_, n) => (n % 3 === 0 ? 'bot' : n % 3 === 1 ? 'competent' : 'loose-passive')) as (
        'bot' | 'competent' | 'loose-passive'
      )[];
      simulate(hands, seed, seats, {
        revision: 'baseline-7',
        everyday: 'casual',
        agents: roster,
        pairedDecks: true,
        startingStacksBb: Array.from({ length: seats }, (_, n) => [60, 20, 100][n % 3]),
        onAction: (i, a) => {
          if (i.street === 'preflop') return;
          const round = new PlanningRound(i),
            at = round.seats.findIndex((s) => s.playerId === i.heroId);
          rows.push({ view: continuationView(round, at, i.hole), label: a.to !== undefined ? 2 : a.move === 'fold' ? 0 : 1 });
        },
      });
    }
  data[partition] = rows;
  console.log(JSON.stringify({ partition, observations: rows.length }));
}
const weights = fitResponses(data.training);
const baseline = (v: ResponseExample['view']) => {
  const p = continuationIntent(v),
    a = v.canRaise ? (v.toCall ? p.raiseProbability : p.betProbability) : 0;
  return v.toCall ? [1 - Math.max(a, p.callProbability), Math.max(0, p.callProbability - a), a] : [0, 1 - a, a];
};
const scores = Object.fromEntries(
  (['training', 'validation', 'test'] as const).map((name) => [
    name,
    {
      baseline: responseScores(data[name], baseline),
      candidate: responseScores(data[name], (v) => responseProbabilities(v, weights)),
    },
  ]),
);
const passed = ['validation', 'test'].every(
  (p) => scores[p].candidate.logLoss < scores[p].baseline.logLoss && scores[p].candidate.brier < scores[p].baseline.brier,
);
const report = {
  protocol: 'response-calibration-1',
  seeds: partitions,
  handsPerSession: hands,
  scores,
  passed,
  limitations: [
    'Synthetic bot/script mixture; not human data. Own cards are actor-local input, never opposing private cards.',
    'Candidate selection uses training only; validation/test do not update weights. Playing-strength and realism gates remain separate.',
  ],
};
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(report, null, 2) + '\n');
if (!passed) throw new Error('Response calibration gate failed; weights not installed');
await writeFile(
  resolve('src/bot_engine/responseWeights.json'),
  JSON.stringify({ revision: 'response-1', features: RESPONSE_FEATURES, weights }, null, 2) + '\n',
);
console.log(JSON.stringify(report));
