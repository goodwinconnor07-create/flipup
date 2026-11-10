import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { specifiedWorlds } from '../src/bot_engine/specifiedWorlds';
import { legalActions, validateInformation } from '../src/bot_engine/information';
import { estimateMultiplayer } from '../src/bot_engine/multiplayerPlanning';
import { seededRng } from '../src/game/cards';
import { EverydayProvider } from '../src/bot_engine/everydayProvider';
import { CalibratedProvider } from '../src/bot_engine/calibratedProvider';
import { BotService } from '../src/bot_engine/service';
import { BotFactory } from '../src/bot_engine/identity';
import { everydayProfile } from '../src/bot_engine/everyday';
import { emptyMemory } from '../src/bot_engine/memory';
const destination = resolve(process.argv[2] ?? '/tmp/heads-up-decisions.json');
const rows = specifiedWorlds().map((world, k) => {
  const i = world.information;
  validateInformation(i);
  const actions = legalActions(i, true, true);
  const reference = estimateMultiplayer(i, world.ranges, actions, seededRng(971011 + k), 16, undefined, world.response);
  if (reference.standardErrors.some((e) => e > 1e-6)) throw new Error('Specified river utility unexpectedly stochastic');
  const profile = everydayProfile(new BotFactory().generate(i.heroId, 1001), 'Review');
  const providers = [
    new EverydayProvider(96, 'baseline-7'),
    new CalibratedProvider(96),
    new CalibratedProvider(96, 'opponents'),
    new CalibratedProvider(96, 'guarded'),
    new CalibratedProvider(96, 'nonlinear'),
    new CalibratedProvider(96, 'robust'),
  ];
  const results = providers.map((p, n) => {
    const t = new BotService(p).decide(i, profile, emptyMemory(i.heroId, i.tableId), 31);
    const value = t.finalDistribution.reduce((s, p, a) => {
      const at = actions.findIndex((x) => JSON.stringify(x) === JSON.stringify(t.prediction.actions[a]));
      if (at < 0) throw new Error('Action mismatch');
      return s + p * reference.values[at];
    }, 0);
    return {
      model: ['baseline-7', 'combined-1', 'opponents-only-2', 'guarded-2', 'nonlinear-3', 'robust-4'][n],
      distribution: t.finalDistribution,
      expectedUtilityBb: value / i.bigBlind,
      modelValuesBb: t.prediction.rolloutValues?.map((v) => v / i.bigBlind),
      equity: t.prediction.equity,
      modelAgreement: t.prediction.modelAgreement,
    };
  });
  return {
    id: world.id,
    information: i,
    specifiedRange: world.ranges,
    actions,
    referenceUtilitiesBb: reference.values.map((v) => v / i.bigBlind),
    results,
  };
});
await mkdir(dirname(destination), { recursive: true });
await writeFile(
  destination,
  JSON.stringify(
    {
      protocol: 'specified-heads-up-worlds-1',
      rows,
      limitations: [
        'Exact river utilities under specified single-holding, call/fold response hypotheses. Bot predictions receive neither the specified holding nor the response rule.',
        'These are sensitivity/regression probes, not evidence that a bot should know an unknown opponent has that exact holding. No solver or human-ground-truth claim.',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    report: destination,
    results: rows.map((r) => ({ id: r.id, results: r.results.map((x) => ({ model: x.model, value: x.expectedUtilityBb })) })),
  }),
);
