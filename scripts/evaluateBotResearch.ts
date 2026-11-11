import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { startResearch, stepResearch, researchHero, researchOptions, completeResearchHand, nextResearchHand } from '../src/research/engine';
import { replayResearchHand } from '../src/research/replay';
import { reviewResearch } from '../src/research/review';
const output = resolve(process.argv[2] ?? '/tmp/bot-research-validation.json');
const run = startResearch('00000000-0000-4000-8000-000000000120', 20261110, 120, 1000);
const hands = [];
let decisions = 0,
  mismatches = 0,
  conserved = true,
  maxPayloadBytes = 0;
for (let index = 0; index < 120; index++) {
  const chips = run.game.players.reduce((s, p) => s + p.stack, 0) + run.game.hand!.seats.reduce((s, p) => s + p.total, 0);
  for (let guard = 0; !run.game.hand!.result && guard < 500; guard++) {
    if (run.game.hand!.toAct === researchHero(run.game).id) {
      const o = researchOptions(run);
      stepResearch(run, { move: o.canCheck ? 'check' : 'call' });
    } else stepResearch(run);
  }
  const hand = completeResearchHand(run),
    replay = replayResearchHand(JSON.parse(JSON.stringify(hand)));
  conserved &&= run.game.players.reduce((s, p) => s + p.stack, 0) === chips;
  maxPayloadBytes = Math.max(maxPayloadBytes, Buffer.byteLength(JSON.stringify({ revision: 1, hand })));
  decisions += replay.decisions;
  mismatches += replay.mismatches + Number(!replay.resultMatches);
  hands.push(hand);
  if (index % 20 === 19) console.log(JSON.stringify({ hands: index + 1, decisions, mismatches, maxPayloadBytes }));
  if (index < 119) nextResearchHand(run);
}
const summary = reviewResearch({
  metadata: { protocol: run.protocol, engine: run.engine, seed: run.seed, limit: run.limit, startedAt: run.startedAt },
  expiresAt: 0,
  hands,
});
const gates = {
  completedExtendedSession: hands.length === 120,
  identicalReplay: mismatches === 0,
  chipConservation: conserved,
  uploadPayloadsFit: maxPayloadBytes < 1024 * 1024,
  everyDecisionExplained: summary.explained === summary.botDecisions,
  onlySupportedChoices: summary.unsupportedChoices === 0,
};
const report = {
  participant: 'scripted-check-call',
  seed: run.seed,
  gates,
  passed: Object.values(gates).every(Boolean),
  maxPayloadBytes,
  replayedDecisions: decisions,
  ...summary,
  note: 'Automated mechanical stress test, not human-participant realism evidence. Active timing and ratings are intentionally absent.',
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ gates, output }));
if (!report.passed) process.exitCode = 1;
