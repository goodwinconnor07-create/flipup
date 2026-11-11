import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { calibrationContexts } from '../src/bot_engine/calibration';
import { legalActions } from '../src/bot_engine/information';
import { inferRanges } from '../src/bot_engine/ranges';
import { estimateMultiplayer, type ResponsePredictor } from '../src/bot_engine/multiplayerPlanning';
import { seededRng } from '../src/game/cards';
import { category, flushDraw } from '../src/game/handBucket';
import { EverydayProvider } from '../src/bot_engine/everydayProvider';
import { CalibratedProvider } from '../src/bot_engine/calibratedProvider';
import { BotService } from '../src/bot_engine/service';
import { BotFactory } from '../src/bot_engine/identity';
import { everydayProfile } from '../src/bot_engine/everyday';
import { emptyMemory } from '../src/bot_engine/memory';
const destination = resolve(process.argv[2] ?? '/tmp/decision-quality-probes.json');
const teacher: ResponsePredictor = (v) => {
  const made = category([...v.hole, ...v.board]),
    board = category(v.board);
  const strength = made > board ? Math.min(1, 0.35 + made * 0.14) : 0.12;
  if (v.canRaise && strength > 0.7) return [0, 0, 1];
  return !v.toCall || strength > 0.42 || flushDraw(v.hole, v.board) ? [0, 1, 0] : [1, 0, 0];
};
const contexts = calibrationContexts()
  .filter((i) => i.street !== 'preflop')
  .slice(0, 12);
const rows = contexts.map((i, k) => {
  const actions = legalActions(i, true, true),
    ranges = inferRanges({ ...i, actions: i.actions.filter((a) => a.street === 'preflop') }, 'public-range-v2');
  const reference = estimateMultiplayer(i, ranges, actions, seededRng(918031 + k), 256, undefined, teacher);
  const best = Math.max(...reference.values);
  const profiles = everydayProfile(new BotFactory().generate(i.heroId, 1001), 'Probe');
  const results = [new EverydayProvider(96, 'baseline-6'), new EverydayProvider(96, 'baseline-7'), new CalibratedProvider(96)].map(
    (provider, n) => {
      const trace = new BotService(provider).decide(i, profiles, emptyMemory(i.heroId, i.tableId), 31);
      const value = trace.finalDistribution.reduce((s, p, a) => {
        const at = actions.findIndex((x) => JSON.stringify(x) === JSON.stringify(trace.prediction.actions[a]));
        if (at < 0) throw new Error('Probe action spaces differ');
        return s + p * reference.values[at];
      }, 0);
      return {
        model: ['baseline-6', 'baseline-7', 'calibrated-1'][n],
        referenceScoreLossBb: (best - value) / i.bigBlind,
        distribution: trace.finalDistribution,
      };
    },
  );
  return {
    information: i,
    actions,
    referenceValuesBb: reference.values.map((v) => v / i.bigBlind),
    standardErrorsBb: reference.standardErrors.map((v) => v / i.bigBlind),
    results,
  };
});
const report = {
  protocol: 'decision-quality-probes-1',
  contexts: rows.length,
  rows,
  limitations: [
    'Common specified preflop prior and competent-style own-card response model for all candidates; approximate future sizing, not a solver or human ground truth.',
    "Independent of each candidate's own value estimates; scores have Monte Carlo uncertainty. Controlled exact-payoff unit tests separately cover value, bluffing and bad calls.",
    'These fixed regression contexts were not used to fit response weights. No probe result selects parameters.',
  ],
};
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ contexts: rows.length, report: destination }));
