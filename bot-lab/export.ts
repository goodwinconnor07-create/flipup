// Writes results.csv (one row per session x seat, every phase) and results.json (metadata plus per-style metrics).
// Usage: npx tsx bot-lab/export.ts
import { existsSync, writeFileSync } from 'node:fs';
import { boot, botStyle, group, load, METRICS, STYLES, archetype, ARCH, csv } from './analyze';
import type { SessionResult } from './sim';

const files: { file: string; phase: string }[] = [
  { file: 'pilot-baseline.jsonl', phase: 'pilot' },
  { file: 'dev-baseline.jsonl', phase: 'baseline-study' },
  { file: 'dev-baseline-v2-hu.jsonl', phase: 'baseline-study-rerun-v2-counters' },
  { file: 'probe-baseline.jsonl', phase: '3bet-probe' },
  { file: 'r1.jsonl', phase: 'round-1' },
  { file: 'r2.jsonl', phase: 'round-2' },
  { file: 'r3.jsonl', phase: 'round-3' },
  { file: 'confirm-baseline.jsonl', phase: 'confirmation' },
  { file: 'confirm-candidate.jsonl', phase: 'confirmation' },
].filter((f) => existsSync(`bot-lab/data/${f.file}`));

const all: SessionResult[] = [];
const sessions: Record<string, unknown>[] = [];
let rows = '';
files.forEach(({ file, phase }, i) => {
  const s = load(`bot-lab/data/${file}`);
  all.push(...s);
  for (const r of s) sessions.push({ phase, file, engine: r.engine, id: r.config.id, scenario: r.config.scenario, chanceSeed: r.config.seed, decisionSeed: r.config.decisionSeed, hands: r.handsPlayed, stackBb: r.config.stack / r.config.bigBlind, blinds: [r.config.smallBlind, r.config.bigBlind], seats: r.config.seats, wallMs: Math.round(r.wallMs), chipLeaks: r.chipLeaks, illegal: r.illegal, table: r.table });
  const text = csv(s).split('\n');
  rows += (i === 0 ? text[0] + ',phase\n' : '') + text.slice(1).filter(Boolean).map((l) => `${l},${phase}`).join('\n') + '\n';
});
writeFileSync('bot-lab/results.csv', rows);

const summary = (list: SessionResult[]) => {
  const out: Record<string, Record<string, unknown>> = {};
  for (const style of STYLES) {
    const per = group(list, botStyle(style));
    out[style] = {};
    for (const m of ['bb100', 'vpip', 'pfr', 'threeBet', 'agg', 'foldToBet', 'wtsd', 'bluffShare', 'overfold']) out[style][m] = boot(per, METRICS[m].f);
  }
  for (const a of ARCH) out[`archetype:${a}`] = { bb100: boot(group(list, archetype(a)), METRICS.bb100.f) };
  return out;
};
const pick = (file: string) => (existsSync(`bot-lab/data/${file}`) ? load(`bot-lab/data/${file}`) : []);
writeFileSync(
  'bot-lab/results.json',
  JSON.stringify(
    {
      about: 'Session-level metadata for every simulated session plus per-style summaries (value and 95% bootstrap interval over sessions). Session counters are in results.csv and data/*.jsonl.',
      baselineCommit: 'e61aa8c',
      seeds: { pilot: '500000+', development: '1000+', probe: '300000+', confirmation: '900000+' },
      budgetHands: { pilot: 2010, baselineStudy: 20000, rerunV2: 4200, probe: 4000, round1: 7100, round2: 8300, round3: 6200, confirmationBaseline: 14880, confirmationCandidate: 14880 },
      summaries: {
        baselineStudy: summary(pick('dev-baseline.jsonl')),
        confirmationBaseline: summary(pick('confirm-baseline.jsonl')),
        confirmationCandidate: summary(pick('confirm-candidate.jsonl')),
      },
      sessions,
    },
    null,
    1,
  ),
);
console.log(`${sessions.length} sessions from ${files.length} files`);
