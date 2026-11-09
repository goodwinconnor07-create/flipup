import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { simulate } from '../src/bot_engine/simulation';
import { evaluateMatchup, summarizeReturns } from '../src/bot_engine/evaluation';
import type { AgentKind, ScriptedOpponent } from '../src/bot_engine/scriptedOpponents';

const pairs = Number(process.argv[2] ?? 250);
if (!Number.isSafeInteger(pairs) || pairs < 2 || pairs > 10000) throw new Error('Pairs must be from 2 to 10000');
const destination = resolve(process.argv[3] ?? '/tmp/flipup-preflop-evaluation.json');
const seed = 91031;
const opponents: ScriptedOpponent[] = ['competent', 'loose-aggressive', 'calling-station', 'tight-passive'];
const matchups = opponents.map((opponent) => {
  const run = (hero: AgentKind) =>
    [false, true].map((reverseSeats) => simulate(pairs, seed, 2, { agents: [hero, opponent], reverseSeats, pairedDecks: true }));
  const candidate = run('bot'),
    incumbent = run('incumbent');
  if (candidate.some((leg, k) => leg.dealChecksums.some((d, n) => d !== incumbent[k].dealChecksums[n])))
    throw new Error('Comparison decks diverged');
  const differences = candidate[0].handReturnsBb.map(
    (value, n) => (value + candidate[1].handReturnsBb[n] - incumbent[0].handReturnsBb[n] - incumbent[1].handReturnsBb[n]) / 2,
  );
  const summarize = (legs: typeof candidate) => ({
    ...summarizeReturns(legs[0].handReturnsBb.map((r, n) => (r + legs[1].handReturnsBb[n]) / 2)),
    coverageByLeg: legs.map((l) => l.preflopCoverage),
    p95MsByLeg: legs.map((l) => l.latencyMs.p95),
  });
  const result = {
    opponent,
    hands: pairs * 4,
    candidate: summarize(candidate),
    incumbent: summarize(incumbent),
    delta: summarizeReturns(differences),
  };
  console.log(JSON.stringify({ opponent, delta: result.delta }));
  return result;
});
const headToHead = evaluateMatchup(pairs, 'incumbent', seed + 1);
const multiway = [false, true].map((reverseSeats) => {
  const result = simulate(Math.max(20, Math.floor(pairs / 5)), seed + 2, 6, {
    agents: ['bot', 'incumbent', 'competent', 'loose-aggressive', 'calling-station', 'tight-passive'],
    reverseSeats,
    pairedDecks: true,
  });
  return { hands: result.hands, preflopCoverage: result.preflopCoverage, p95Ms: result.latencyMs.p95, completed: true };
});
const report = {
  protocol: 'preflop-coverage-1',
  candidate: 'baseline-4',
  incumbent: 'baseline-3',
  seed,
  pairsPerOpponent: pairs,
  hands: matchups.reduce((sum, m) => sum + m.hands, headToHead.hands) + multiway.reduce((sum, m) => sum + m.hands, 0),
  matchups,
  headToHead,
  multiway,
  limitations: [
    'Fresh equal 100bb stacks each hand; ordinary sessions quickly reach unequal stacks and fall back. Only exact shipped 20/40/100bb banks are used.',
    'Seat-swapped common deals and matching personalities/learning; intervals are descriptive because beliefs adapt across hands. No statistical strength or exploitability certification.',
    'Coverage expansion, not newly trained chart frequencies. Raise/jam proportions were lost during chart export; the combined mass uses one rounded default solver size.',
  ],
};
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ hands: report.hands, report: destination, headToHead }));
