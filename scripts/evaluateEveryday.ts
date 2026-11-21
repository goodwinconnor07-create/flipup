import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { simulate } from '../src/bot_engine/simulation';
import { EVERYDAY_FOCUSES, type EverydayFocus } from '../src/bot_engine/everyday';
import type { AgentKind } from '../src/bot_engine/scriptedOpponents';

const hands = Number(process.argv[2] ?? 200),
  destination = resolve(process.argv[3] ?? '/tmp/flipup-everyday.json');
const partition = process.argv[4] ?? 'holdout';
if (!Number.isSafeInteger(hands) || hands < 20 || hands > 2000) throw new Error('Hands must be 20..2000');
if (!['development', 'holdout'].includes(partition)) throw new Error('Invalid seed partition');
const seeds = partition === 'development' ? [312301, 323317, 334321] : [412303, 423319, 434323];
const table: AgentKind[] = ['bot', 'bot', 'bot', 'bot', 'competent', 'loose-passive'];
type Session = {
  seed: number;
  focus: EverydayFocus;
  hands: number;
  counts: ReturnType<typeof simulate>['behavior'];
  table: ReturnType<typeof simulate>['tableExperience'];
  vpip: number;
  pfr: number;
  aggression: number | null;
  foldRate: number | null;
  bbPer100: number;
  p95Ms: number | undefined;
};
const sessions: Session[] = [];
for (const seed of seeds)
  for (const focus of EVERYDAY_FOCUSES) {
    const r = simulate(hands, seed, 6, { agents: table, everyday: 'casual', everydayFocus: focus, pairedDecks: true });
    const b = r.behavior,
      t = r.tableExperience;
    const session = {
      seed,
      focus,
      hands,
      counts: b,
      table: t,
      vpip: b.vpipHands / hands,
      pfr: b.pfrHands / hands,
      aggression: b.postflopDecisions ? b.postflopAggressions / b.postflopDecisions : null,
      foldRate: b.foldOpportunities ? b.folds / b.foldOpportunities : null,
      bbPer100: r.bbPer100,
      p95Ms: r.latencyMs.p95,
    };
    sessions.push(session);
    console.log(JSON.stringify(session));
  }
const levels = seeds.flatMap((seed) =>
  ['casual', 'challenge'].map((level) => {
    const r = simulate(hands, seed + 17, 2, { agents: ['bot', 'competent'], everyday: level as 'casual' | 'challenge', pairedDecks: true });
    return { seed, level, hands, counts: r.behavior, table: r.tableExperience, bbPer100: r.bbPer100, p95Ms: r.latencyMs.p95 };
  }),
);
const summary = EVERYDAY_FOCUSES.map((focus) => {
  const own = sessions.filter((s) => s.focus === focus);
  return {
    focus,
    vpip: own.reduce((s, r) => s + r.vpip, 0) / own.length,
    pfr: own.reduce((s, r) => s + r.pfr, 0) / own.length,
    meanBbPer100: own.reduce((s, r) => s + r.bbPer100, 0) / own.length,
  };
});
const total = sessions.reduce(
  (acc, s) => ({
    hands: acc.hands + s.hands,
    flops: acc.flops + s.table.flops,
    walks: acc.walks + s.table.walks,
    raisedPots: acc.raisedPots + s.table.raisedPots,
    preflopAllIns: acc.preflopAllIns + s.table.preflopAllIns,
  }),
  { hands: 0, flops: 0, walks: 0, raisedPots: 0, preflopAllIns: 0 },
);
const rates = {
  flop: total.flops / total.hands,
  walk: total.walks / total.hands,
  raised: total.raisedPots / total.hands,
  preflopAllIn: total.preflopAllIns / total.hands,
};
const spread = Math.max(...summary.map((s) => s.vpip)) - Math.min(...summary.map((s) => s.vpip));
const gates = {
  participation: summary.every((s) => s.vpip >= 0.16 && s.vpip <= 0.45),
  subtleSpread: spread <= 0.12,
  seesFlops: rates.flop >= 0.35,
  limitedWalks: rates.walk <= 0.3,
  avoidsJamFest: rates.preflopAllIn <= 0.2,
  variedPots: rates.raised >= 0.35 && rates.raised <= 0.98,
};
const continuity = ['casual', 'challenge'].map((level) => {
  const r = simulate(60, seeds[0] + 77, 6, {
    agents: table,
    everyday: level as 'casual' | 'challenge',
    carryStacks: true,
    startingStacksBb: [60, 35, 100, 140, 80, 45],
    pairedDecks: true,
  });
  return { level, hands: r.hands, table: r.tableExperience, completed: true };
});
const report = {
  protocol: 'everyday-table-1',
  partition,
  handsPerSession: hands,
  seeds,
  totalHands: sessions.length * hands + levels.length * hands + continuity.reduce((s, r) => s + r.hands, 0),
  summary,
  spread,
  rates,
  gates,
  passed: Object.values(gates).every(Boolean),
  sessions,
  levels,
  continuity,
  limitations: [
    'Simulation quality gates are product hypotheses, not evidence of human enjoyment, retention or human realism.',
    'Session returns are descriptive, with uncalibrated opponents. Small differences in skill and subtle style require larger samples.',
    'Repeated hands across focus profiles are common-deal comparisons, not independent evidence. Difficulty remains fixed and dealing stays fair.',
  ],
};
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ totalHands: report.totalHands, summary, rates, gates, report: destination }));
if (!report.passed) process.exitCode = 1;
