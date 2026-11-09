import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { evaluateLearning } from '../src/bot_engine/learningBench';
import {
  fullPokerLearningCheck,
  initialTrainingState,
  learningGate,
  learningSeeds,
  trainingCycle,
  type TrainingState,
} from '../src/bot_engine/training';
import { validateLearningConfig } from '../src/bot_engine/learningConfig';

const cycles = Number(process.argv[2] ?? 2),
  out = resolve(process.argv[3] ?? '/tmp/flipup-bot-training');
const pokerPairs = Number(process.env.BOT_TRAIN_PAIRS ?? 100);
if (!Number.isSafeInteger(pokerPairs) || pokerPairs < 1 || pokerPairs > 1000) throw new Error('BOT_TRAIN_PAIRS must be from 1 to 1000');
if (!Number.isSafeInteger(cycles) || cycles < 1 || cycles > 20) throw new Error('Training cycles must be from 1 to 20');
await mkdir(out, { recursive: true });
const checkpoint = `${out}/checkpoint.json`;
let state: TrainingState = initialTrainingState();
try {
  state = JSON.parse(await readFile(checkpoint, 'utf8')) as TrainingState;
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
if (state.protocol !== 'river-learning-2' || state.cycles.length !== state.nextCycle) throw new Error('Incompatible training checkpoint');
validateLearningConfig(state.champion);
const save = async (path: string, value: unknown) => {
  await writeFile(path + '.tmp', JSON.stringify(value, null, 2) + '\n');
  await rename(path + '.tmp', path);
};
for (let n = 0; n < cycles; n++) {
  const result = trainingCycle(state);
  await save(`${out}/cycle-${state.nextCycle}.json`, result);
  state = result.next;
  await save(checkpoint, state);
  console.log(JSON.stringify(result.record));
}
// No test-set feedback enters candidate ranking or the next cycle's seed partition.
const testSeeds = learningSeeds('test', state.nextCycle, 12);
const holdout = evaluateLearning(state.champion, testSeeds);
const poker = fullPokerLearningCheck(state.champion, pokerPairs, learningSeeds('poker-test', state.nextCycle, 1)[0]);
const report = {
  protocol: state.protocol,
  completedCycles: state.nextCycle,
  candidate: state.champion,
  syntheticGatePassed: learningGate(holdout),
  holdout,
  poker,
  productionConfigChanged: false,
  limitation:
    'Parameter calibration and Bayesian online learning, not neural-network training. New weights remain offline until broader representative validation. Historical checkpoints and reports can be resumed.',
};
await save(`${out}/report.json`, report);
console.log(
  JSON.stringify({
    completedCycles: state.nextCycle,
    holdoutGain: holdout.meanGain,
    syntheticGatePassed: report.syntheticGatePassed,
    fullPokerHands: poker.hands,
    report: `${out}/report.json`,
    productionConfigChanged: false,
  }),
);
