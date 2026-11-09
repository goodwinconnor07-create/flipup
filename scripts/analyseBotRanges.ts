import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { calibrationContexts } from '../src/bot_engine/calibration';
import { EverydayProvider } from '../src/bot_engine/everydayProvider';

const destination = resolve(process.argv[2] ?? '/tmp/flipup-bot-ranges.json');
const provider = new EverydayProvider(96);
// Production-rule public contexts, not Range training's authored lesson ranges.
const all = calibrationContexts();
const contexts = (['flop', 'turn', 'river'] as const).flatMap((street) => [
  all.find((i) => i.street === street && i.legal.canCheck)!,
  all.find((i) => i.street === street && !i.legal.canCheck)!,
]);
const report = {
  protocol: 'bot-range-analysis-1',
  model: 'baseline-6',
  examples: contexts.map((information) => {
    const prediction = provider.predict(information);
    return {
      information,
      source: prediction.source,
      planning: prediction.planning ?? null,
      planningFallback: prediction.planningFallback ?? null,
      ranges: prediction.rangeReads,
      equity: prediction.equity,
      actions: prediction.actions.map((action, k) => ({
        action,
        probability: prediction.probabilities[k],
        rawValueBb: prediction.values ? prediction.values[k] / information.bigBlind : null,
      })),
    };
  }),
  limitations: [
    'Synthetic production-engine contexts; neither human hand histories nor training lesson answers.',
    'Range probabilities are untrained public-action estimates. The actual opposing cards and deck are unavailable.',
    'Action probabilities are the shared provider before individual identity, uncertainty and adaptation guards.',
    'Raw values describe the approximate continuation model, not certified solver EVs.',
    'Range groups cover all mass. The eight leading starting-hand classes cover only their own mass; effective combinations measure concentration.',
  ],
};
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ examples: report.examples.length, report: destination }));
