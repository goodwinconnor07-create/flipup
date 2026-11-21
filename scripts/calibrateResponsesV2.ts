import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { simulate } from '../src/bot_engine/simulation';
import { PlanningRound, continuationView } from '../src/bot_engine/multiplayerPlanning';
import { fitResponses, responseProbabilities, responseScores, type ResponseExample } from '../src/bot_engine/responseModel';
import { responseFeaturesV2, responseProbabilitiesV2, RESPONSE_FEATURES_V2 } from '../src/bot_engine/responseModelV2';
import { priorResponse } from '../src/bot_engine/guardedResponse';
const hands = Number(process.argv[2] ?? 150);
const destination = resolve(process.argv[3] ?? '/tmp/response-v2-fit.json');
if (!Number.isSafeInteger(hands) || hands < 20 || hands > 1000) throw new Error('Hands must be 20..1000');
const seeds = { training: [991011, 991033], validation: [992021], test: [993031] };
const data = {} as Record<keyof typeof seeds, ResponseExample[]>;
for (const partition of Object.keys(seeds) as (keyof typeof seeds)[]) {
  const rows: ResponseExample[] = [];
  for (const seed of seeds[partition])
    for (const seats of [2, 3, 6]) {
      simulate(hands, seed, seats, {
        revision: 'baseline-7',
        everyday: 'casual',
        pairedDecks: true,
        agents: Array.from({ length: seats }, (_, n) => (n % 3 === 0 ? 'bot' : n % 3 === 1 ? 'competent' : 'loose-passive')),
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
const weights = fitResponses(data.training, 180, responseFeaturesV2);
const predictor = (v: ResponseExample['view']) => responseProbabilitiesV2(v, weights);
const scores = Object.fromEntries(
  (Object.keys(seeds) as (keyof typeof seeds)[]).map((partition) => {
    const rows = data[partition];
    const models = [priorResponse, responseProbabilities, predictor];
    return [
      partition,
      {
        models: Object.fromEntries(
          models.map((m, k) => [
            ['baseline-7', 'response-1', 'nonlinear-3'][k],
            {
              ...responseScores(rows, m),
              byObservedAction: [0, 1, 2].map((label) => ({
                label,
                ...responseScores(
                  rows.filter((r) => r.label === label),
                  m,
                ),
              })),
              aggressiveOpportunities: responseScores(
                rows.filter((r) => r.view.canRaise),
                m,
              ),
            },
          ]),
        ),
      },
    ];
  }),
);
const passed = ['validation', 'test'].every((partition) => {
  const s = scores[partition].models;
  return (
    s['nonlinear-3'].logLoss < s['response-1'].logLoss &&
    s['nonlinear-3'].brier < s['response-1'].brier &&
    s['nonlinear-3'].byObservedAction[2].observations >= 20 &&
    s['nonlinear-3'].byObservedAction[2].logLoss < s['response-1'].byObservedAction[2].logLoss
  );
});
const report = {
  protocol: 'nonlinear-response-fit-1',
  seeds,
  handsPerSession: hands,
  totalHands: hands * 12,
  scores,
  passed,
  limitations: [
    'Fixed synthetic training mixture, with independent training/validation/test seeds. No gameplay returns fit these weights.',
    'Observed-aggression loss is checked separately from aggregate loss; neither establishes range accuracy, human realism or playing strength.',
    'Hand-group basis and regularization were fixed before reserved response scoring. A single candidate, not a held-out parameter search.',
  ],
};
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
if (!passed) throw new Error('Nonlinear prediction gates failed; candidate weights not installed');
await writeFile(
  resolve('src/bot_engine/responseWeightsV2.json'),
  JSON.stringify({ revision: 'response-3', features: RESPONSE_FEATURES_V2, weights }, null, 2) + '\n',
);
console.log(JSON.stringify({ passed, scores, report: destination }));
