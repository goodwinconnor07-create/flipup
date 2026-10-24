// The bot lab: plays thousands of bot hands and scores how the bots play and how much fun a table
// with them is likely to be. Run with `npx tsx scripts/botLab.ts [hands] [out.md]`.
// Nothing here ships in the app; it's how the bots were tuned (see docs/BOTS.md).

import { writeFileSync } from 'node:fs';
import { simulateTable, type Agent, type Brain, type SimResult, type StyleReport } from '../src/game/botSim';
import type { StyleId } from '../src/game/botStyles';
import { decide as oldDecide } from './legacy/botPlay';

const HANDS = Number(process.argv[2] ?? 1500);
const OUT = process.argv[3];
const brains: Record<string, Brain> = { old: (g, h, s, r) => oldDecide(g, h, s, r).move };

const ALL: StyleId[] = ['pro', 'shark', 'tag', 'lag', 'maniac', 'rock', 'station', 'gambler', 'trapper', 'nervous'];
const STRONG: StyleId[] = ['pro', 'shark', 'tag', 'lag', 'trapper'];
const SOFT: StyleId[] = ['station', 'gambler', 'maniac', 'nervous'];
const TABLES: StyleId[][] = [
  ['pro', 'rock', 'maniac', 'station', 'tag', 'lag'],
  ['shark', 'gambler', 'trapper', 'nervous', 'rock', 'maniac'],
  ['pro', 'shark', 'tag', 'lag', 'station', 'nervous'],
  ['gambler', 'trapper', 'pro', 'shark', 'maniac', 'station', 'rock', 'tag', 'nervous'],
];
const SCRIPTS = ['callBot', 'raiseBot', 'shoveBot', 'foldBot', 'bluffBot'] as const;

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const f1 = (x: number) => x.toFixed(1);
const lines: string[] = [];
const out = (s = '') => {
  lines.push(s);
  console.log(s);
};

/** How close a number is to a band: 1 inside it, falling to 0 at `soft` outside it. */
function band(x: number, lo: number, hi: number, soft: number): number {
  if (x >= lo && x <= hi) return 1;
  const d = x < lo ? lo - x : x - hi;
  return Math.max(0, 1 - d / soft);
}

const started = Date.now();
const runs: SimResult[] = [];
TABLES.forEach((t, i) => {
  for (const seed of [11, 12]) runs.push(simulateTable(t, HANDS, seed + i * 10));
});
const short: SimResult[] = [simulateTable(TABLES[0], Math.round(HANDS / 2), 77, 25), simulateTable(TABLES[1], Math.round(HANDS / 2), 78, 12)];
/** Heads-up: the first agent's bb/100, averaged over both seats' luck with two seeds. */
const hu = (a: Agent, b: Agent, seed: number) => {
  const r = [0, 1000, 2000].map((k) => simulateTable([a, b], HANDS, seed + k, 100, brains));
  return r.reduce((x, res) => x + res.seats[0].bbPer100, 0) / r.length;
};

// ── How each style plays ──────────────────────────────────────────────────
const byStyle = new Map<string, StyleReport[]>();
for (const r of runs) for (const s of r.seats) byStyle.set(s.style, [...(byStyle.get(s.style) ?? []), s]);
const avg = (rs: StyleReport[], k: keyof StyleReport) => rs.reduce((a, r) => a + (r[k] as number) * r.hands, 0) / Math.max(1, rs.reduce((a, r) => a + r.hands, 0));
const avgThink = (rs: StyleReport[], k: 'thinkMs' | 'thinkSpread') => {
  const xs = rs.filter((r) => r.thinkMs > 0);
  return xs.reduce((a, r) => a + r[k], 0) / Math.max(1, xs.length);
};
const st = (style: string, k: keyof StyleReport) => avg(byStyle.get(style) ?? [], k);

out(`# Bot lab: ${HANDS} hands a table`);
out();
out('## Styles (100bb, mixed tables)');
out();
out('| Style | VPIP | PFR | 3-bet | AF | Fold to bet | Saw flop | WTSD | W$SD | C-bet | Bluff share | bb/100 | Think ms | Think spread | Variety | Talk/100 | Shows |');
out('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const style of ALL) {
  const rs = byStyle.get(style) ?? [];
  if (!rs.length) continue;
  const hands = rs.reduce((a, r) => a + r.hands, 0);
  const talk = rs.reduce((a, r) => a + r.comments, 0);
  const shows = rs.reduce((a, r) => a + r.shows, 0);
  out(
    `| ${style} | ${pct(avg(rs, 'vpip'))} | ${pct(avg(rs, 'pfr'))} | ${pct(avg(rs, 'threeBet'))} | ${f1(avg(rs, 'aggression'))} | ${pct(avg(rs, 'foldToBet'))} | ${pct(avg(rs, 'sawFlop'))} | ${pct(avg(rs, 'wtsd'))} | ${pct(avg(rs, 'wsd'))} | ${pct(avg(rs, 'cbet'))} | ${pct(avg(rs, 'bluffShare'))} | ${f1(avg(rs, 'bbPer100'))} | ${avgThink(rs, 'thinkMs').toFixed(0)} | ${avgThink(rs, 'thinkSpread').toFixed(2)} | ${avg(rs, 'variety').toFixed(2)} | ${f1((talk / hands) * 100)} | ${shows} |`,
  );
}

// ── The table as a whole ──────────────────────────────────────────────────
const tableAvg = (rs: SimResult[], k: Exclude<keyof SimResult['table'], 'talk'>) => rs.reduce((a, r) => a + r.table[k], 0) / rs.length;
out();
out('## Tables');
out();
out('| Tables | Flops | Showdowns | Avg pot (bb) | Big pots/100 | All-ins/100 | Bluffs shown | Talk/hand |');
out('|---|---|---|---|---|---|---|---|');
const tableRow = (name: string, rs: SimResult[]) =>
  out(`| ${name} | ${pct(tableAvg(rs, 'flops'))} | ${pct(tableAvg(rs, 'showdowns'))} | ${f1(tableAvg(rs, 'avgPotBb'))} | ${f1(tableAvg(rs, 'bigPots'))} | ${f1(tableAvg(rs, 'allIns'))} | ${pct(tableAvg(rs, 'bluffsShown'))} | ${tableAvg(rs, 'talkPerHand').toFixed(2)} |`);
tableRow('100bb', runs);
tableRow('25bb', [short[0]]);
tableRow('12bb', [short[1]]);

// ── New against old ───────────────────────────────────────────────────────
out();
out('## New bots against the old ones, heads-up (bb/100 for the new style)');
out();
out('| Style | New vs old |');
out('|---|---|');
const vsOld: Record<string, number> = {};
for (const style of ALL) {
  vsOld[style] = hu(style, `old:${style}`, 400 + ALL.indexOf(style));
  out(`| ${style} | ${f1(vsOld[style])} |`);
}

// ── Simple strategies a person might try ──────────────────────────────────
// Heads-up against each strong style: every one of these should lose, and the worst case counts.
out();
out('## Simple strategies heads-up against the strong styles (bb/100 for the script)');
out();
out(`| Script | ${STRONG.join(' | ')} | Worst |`);
out(`|---|${STRONG.map(() => '---').join('|')}|---|`);
const exploits: Record<string, number> = {};
const exploitAvg: Record<string, number> = {};
for (const script of SCRIPTS) {
  const res = STRONG.map((style, i) => -hu(style, script, 500 + i * 7 + SCRIPTS.indexOf(script)));
  exploits[script] = Math.max(...res);
  exploitAvg[script] = res.reduce((a, b) => a + b, 0) / res.length;
  out(`| ${script} | ${res.map(f1).join(' | ')} | ${f1(exploits[script])} |`);
}

out();
out('## Heads-up: a decent honest player (abc) against each style (bb/100 for abc)');
out();
out('| Style | abc bb/100 |');
out('|---|---|');
const abc: Record<string, number> = {};
for (const style of ALL) {
  abc[style] = -hu(style, 'abc', 300 + ALL.indexOf(style));
  out(`| ${style} | ${f1(abc[style])} |`);
}

// How the bots treat a player who folds too much, and one who bets every street (against the old
// bots, so a change shows up): what they win from each, heads-up.
out();
out('## Reading the table: a player who folds too much, and one who bets every street');
out();
out('| Style | Wins from a player who folds to every bet (bb/100) | Fold to bet against the constant bluffer | Against an honest player |');
out('|---|---|---|---|');
for (const style of STRONG) {
  const i = STRONG.indexOf(style);
  const folder = hu(style, 'foldBot', 600 + i);
  const rb = [0, 1000, 2000].map((k) => simulateTable([style, 'bluffBot'], HANDS, 650 + i + k));
  const foldB = rb.reduce((a, r) => a + r.seats[0].foldToBet, 0) / rb.length;
  const ra = [0, 1000, 2000].map((k) => simulateTable([style, 'abc'], HANDS, 700 + i + k));
  const foldA = ra.reduce((a, r) => a + r.seats[0].foldToBet, 0) / ra.length;
  out(`| ${style} | ${f1(folder)} | ${pct(foldB)} | ${pct(foldA)} |`);
}

// ── Fun score ─────────────────────────────────────────────────────────────
// An estimate of what makes a home game fun and the bots feel like people: enough action, big pots
// and all-ins now and then, bluffs that get shown, table talk that isn't constant, styles you can
// tell apart, nobody playing like a machine or acting at machine speed, simple tricks that don't
// work, strong bots that beat a decent player and soft ones a decent player can beat.
const allSeats = [...byStyle.values()].flat();
const spread = (k: keyof StyleReport) => Math.max(...ALL.map((s) => st(s, k))) - Math.min(...ALL.map((s) => st(s, k)));
const ordered = (k: keyof StyleReport, order: StyleId[]) => order.every((s, i) => i === 0 || st(order[i - 1], k) < st(s, k));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const parts: [string, number, number][] = [
  ['Flops seen (45–65%)', band(tableAvg(runs, 'flops'), 0.45, 0.65, 0.2), 1],
  ['Showdowns (22–32%)', band(tableAvg(runs, 'showdowns'), 0.22, 0.32, 0.12), 1],
  ['Big pots (10–25 per 100)', band(tableAvg(runs, 'bigPots'), 10, 25, 12), 1],
  ['All-ins (4–12 per 100)', band(tableAvg(runs, 'allIns'), 4, 12, 8), 1],
  ['Bluffs shown (6–20% of showdowns)', band(tableAvg(runs, 'bluffsShown'), 0.06, 0.2, 0.1), 1],
  ['Table talk (0.5–1.1 a hand)', band(tableAvg(runs, 'talkPerHand'), 0.5, 1.1, 0.6), 1],
  ['Styles: VPIP spread ≥ 40 pts', band(spread('vpip'), 0.4, 1, 0.25), 1],
  ['Styles: aggression spread ≥ 2.5', band(spread('aggression'), 2.5, 99, 2), 1],
  ['Styles: fold-to-bet spread ≥ 30 pts', band(spread('foldToBet'), 0.3, 1, 0.2), 1],
  ['Styles: rock < tag < pro < lag < maniac (VPIP)', ordered('vpip', ['rock', 'tag', 'pro', 'lag', 'maniac']) ? 1 : 0, 1],
  ['Styles: station < pro < nervous (fold to bet)', ordered('foldToBet', ['station', 'pro', 'nervous']) ? 1 : 0, 1],
  ['Styles: station < tag < maniac (aggression)', ordered('aggression', ['station', 'tag', 'maniac']) ? 1 : 0, 1],
  ['Not robotic: variety ≥ 0.5', band(avg(allSeats, 'variety'), 0.5, 1, 0.3), 1],
  ['Think time 1.5–3.5 s', band(avgThink(allSeats, 'thinkMs') / 1000, 1.5, 3.5, 1.5), 1],
  ['Think time varies (spread ≥ 0.4)', band(avgThink(allSeats, 'thinkSpread'), 0.4, 9, 0.3), 1],
  ['Smarter than before: new beats old (avg ≥ +15 bb/100)', band(mean(ALL.map((s) => vsOld[s])), 15, 1e9, 30), 2],
  ['Strong styles beat old strong styles (each ≥ 0)', band(Math.min(...STRONG.map((s) => vsOld[s])), 0, 1e9, 40), 1.5],
  ['Call-everything loses to all strong styles (≤ -40)', band(-exploits.callBot, 40, 1e9, 40), 1.5],
  ['Raise-everything loses to all strong styles (≤ -40)', band(-exploits.raiseBot, 40, 1e9, 40), 1.5],
  ['Shove-everything loses to all strong styles (≤ -40)', band(-exploits.shoveBot, 40, 1e9, 40), 1.5],
  ['Fold-to-bets loses to all strong styles (≤ -15)', band(-exploits.foldBot, 15, 1e9, 25), 1.5],
  // A constant bluffer is a real hand part of the time, so it's beaten on average rather than every time.
  ['A constant bluffer loses to the strong styles (avg ≤ -10)', band(-exploitAvg.bluffBot, 10, 1e9, 30), 1.5],
  ['The nervous bot is soft: it doesn\'t win at mixed tables (≤ +30 bb/100)', band(-st('nervous', 'bbPer100'), -30, 1e9, 60), 1],
  ['Strong styles beat an honest player (avg ≥ +20)', band(-mean(STRONG.map((s) => abc[s])), 20, 1e9, 30), 1.5],
  ['An honest player beats the soft styles (avg ≥ +15)', band(mean(SOFT.map((s) => abc[s])), 15, 1e9, 25), 1],
  ['Soft styles lose, but not absurdly (≥ -250 bb/100)', band(Math.min(...SOFT.map((s) => st(s, 'bbPer100'))), -250, 1e9, 250), 1],
];
const total = parts.reduce((a, p) => a + p[1] * p[2], 0) / parts.reduce((a, p) => a + p[2], 0);
out();
out(`## Fun score: ${(total * 100).toFixed(0)} / 100`);
out();
out('| Part | Score |');
out('|---|---|');
for (const [name, s] of parts) out(`| ${name} | ${(s * 100).toFixed(0)} |`);
out();
out(`_Ran in ${((Date.now() - started) / 1000).toFixed(0)}s._`);

if (OUT) writeFileSync(OUT, lines.join('\n') + '\n');
