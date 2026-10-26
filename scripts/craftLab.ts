// The craft lab: do the techniques (c-bets by board, barrels, floats, probes, donks, check-raises, river
// overbets, 4-bets, signature hands) show up in play the way each style and legend's craft says, and do they
// make it stronger? Nothing here ships in the app; it's how the techniques were tuned (see docs/BOTS.md).
//
//   npx tsx scripts/craftLab.ts freq [hands]    how often each uses each technique, six-handed
//   npx tsx scripts/craftLab.ts ab [hands]      each style and legend with its craft against the same without it
//   npx tsx scripts/craftLab.ts ladder [hands]  the legends against a plain player and each other
//   npx tsx scripts/craftLab.ts big 0 [matches] [name] [handsPerMatch]  one style or legend with its craft against the same without it, heads-up, over many short fresh matches
//   npx tsx scripts/craftLab.ts single [handsPerMatch] [names] [style] [matches]  each technique on its own (pro by default) against the plain style, heads-up

import { simulateTable, TECHNIQUES } from '../src/game/botSim';
import { NO_CRAFT, STYLES, type StyleId } from '../src/game/botStyles';
import { LEGENDS, legendBrain } from '../src/game/legends';
import type { TwinBrain } from '../src/game/twinFit';

const MODE = process.argv[2] ?? 'freq';
const HANDS = Number(process.argv[3] ?? 1500);
const SEEDS = [11, 12, 13];
const started = Date.now();
const secs = () => `${Math.round((Date.now() - started) / 1000)}s`;
const ALL = Object.keys(STYLES) as StyleId[];
const FIELD: StyleId[] = ['pro', 'shark', 'tag', 'lag', 'station'];

const plain = (id: StyleId): TwinBrain => ({ style: { ...STYLES[id], craft: { ...NO_CRAFT, pets: [] } }, spots: {}, hands: 0 });
const withCraft = (id: StyleId): TwinBrain => ({ style: STYLES[id], spots: {}, hands: 0 });
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

if (MODE === 'freq') {
  const rows: { name: string; craft: Record<string, number>; n: Record<string, number> }[] = [];
  const run = (name: string, brain?: TwinBrain, style: StyleId = 'pro') => {
    const sum: Record<string, number[]> = {};
    const count: Record<string, number> = {};
    for (const seed of SEEDS) {
      const r = simulateTable([style, ...FIELD], HANDS, seed, 100, {}, brain ? { twins: { 0: brain } } : {}).seats[0];
      for (const k of TECHNIQUES) {
        (sum[k] ??= []).push(r.craft[k]);
        count[k] = (count[k] ?? 0) + r.craftN[k];
      }
    }
    rows.push({ name, craft: Object.fromEntries(TECHNIQUES.map((k) => [k, avg(sum[k])])), n: count });
    console.log('.', name, secs());
  };
  for (const id of ALL) run(id, undefined, id);
  for (const l of LEGENDS) run(l.short, legendBrain(l));
  console.log(`\n${HANDS} hands x ${SEEDS.length} seeds, six-handed against pro, shark, tag, lag and a station. Share of the chances each technique was used.\n`);
  console.log('name'.padEnd(10), TECHNIQUES.map((k) => k.padStart(10)).join(''));
  for (const r of rows) console.log(r.name.padEnd(10), TECHNIQUES.map((k) => (r.n[k] < 20 ? '-'.padStart(10) : `${(r.craft[k] * 100).toFixed(0)}%`.padStart(10))).join(''));
}

if (MODE === 'ab') {
  // Each with its craft against the same without it: heads-up (many hands, so the gap is clear) and in a six-handed field.
  console.log('bb/100 for the one with its craft against the same style without it (positive: the craft helps)\n');
  console.log('name'.padEnd(10), 'heads-up'.padStart(10), 'six-max'.padStart(10));
  const test = (name: string, on: TwinBrain, off: TwinBrain) => {
    const hu = avg(SEEDS.map((seed) => simulateTable(['pro', 'pro'], HANDS * 3, seed, 100, {}, { twins: { 0: on, 1: off }, evAdjust: true }).seats[0].bbPer100));
    // Six-handed: the one with craft and the one without, both against the same four.
    const six = avg(
      SEEDS.map((seed) => {
        const r = simulateTable(['pro', 'pro', 'shark', 'tag', 'lag', 'station'], HANDS * 2, seed, 100, {}, { twins: { 0: on, 1: off }, evAdjust: true }).seats;
        return r[0].bbPer100 - r[1].bbPer100;
      }),
    );
    console.log(name.padEnd(10), hu.toFixed(0).padStart(10), six.toFixed(0).padStart(10), secs());
  };
  for (const id of ALL) test(id, withCraft(id), plain(id));
  for (const l of LEGENDS) {
    const on = legendBrain(l);
    test(l.short, on, { ...on, style: { ...on.style, craft: { ...NO_CRAFT, pets: [] } } });
  }
}

if (MODE === 'ladder') {
  const brains = Object.fromEntries(LEGENDS.map((l) => [l.id, legendBrain(l)]));
  const hu = (a: string, b?: string) =>
    avg([501, 502, 503, 504].map((seed) => simulateTable(['pro', 'pro'], HANDS * 3, seed, 100, {}, { twins: b ? { 0: brains[a], 1: brains[b] } : { 0: brains[a] } }).seats[b ? 0 : 1].bbPer100));
  console.log('\nA plain player (abc) against each, bb/100 for abc: the lower, the harder the legend');
  for (const l of LEGENDS) console.log(`  rung ${l.rung} ${l.short.padEnd(9)} ${hu(l.id).toFixed(0).padStart(6)}`, secs());
  console.log('\nHeads-up, bb/100 for the row against the column');
  console.log(''.padEnd(10), LEGENDS.map((l) => l.short.padStart(10)).join(''));
  for (const a of LEGENDS) console.log(a.short.padEnd(10), LEGENDS.map((b) => (a.id === b.id ? '-'.padStart(10) : hu(a.id, b.id).toFixed(0).padStart(10))).join(''), secs());
}

if (MODE === 'single') {
  // One technique at a time on top of a plain style, against that plain style, heads-up on many hands: which ones
  // help (positive), which cost chips. The values are what the styles and legends use.
  const style = (process.argv[5] ?? 'pro') as StyleId;
  const variants: Record<string, Partial<typeof NO_CRAFT>> = {
    cbetDry: { cbetDry: 0.05 },
    cbetWet: { cbetWet: 0.05 },
    barrel: { barrel: 0.05 },
    barrelNeg: { barrel: -0.05 },
    float: { float: 0.5 },
    probe: { probe: 0.3 },
    donkNeg: { donk: -0.04 },
    donkPos: { donk: 0.05 },
    checkRaise: { checkRaise: 0.4 },
    polar: { polar: 0.6 },
    thin: { thin: 0.4 },
    hero: { hero: 0.3 },
    layDown: { layDown: 0.5 },
    fourBet: { fourBet: 0.3 },
    threeBet: { threeBet: 0.3 },
    texture: { texture: 0.5 },
    exploit: { exploit: 1 },
  };
  const names = (process.argv[4] ?? '').split(',').filter(Boolean);
  const todo = names.length ? names : Object.keys(variants);
  const matches = Number(process.argv[6] ?? 200);
  console.log(`${style} with one technique against the plain ${style}, heads-up, bb/100 over ${matches} fresh matches of ${HANDS} hands\n`);
  for (const name of todo) {
    const on: TwinBrain = { style: { ...STYLES[style], craft: { ...NO_CRAFT, pets: [], ...variants[name] } }, spots: {}, hands: 0 };
    const runs: number[] = [];
    for (let i = 0; i < matches; i++) {
      const flip = i % 2 === 1;
      const r = simulateTable(['pro', 'pro'], HANDS, 3000 + i, 100, {}, { twins: flip ? { 0: plain(style), 1: on } : { 0: on, 1: plain(style) }, evAdjust: true }).seats;
      runs.push(r[flip ? 1 : 0].bbPer100);
    }
    const m = avg(runs);
    const sd = Math.sqrt(avg(runs.map((x) => (x - m) ** 2)));
    console.log(name.padEnd(12), m.toFixed(1).padStart(7), ` +-${(sd / Math.sqrt(runs.length)).toFixed(1)}`, secs());
  }
}

if (MODE === 'big') {
  // The craft against no craft over many short, fresh matches (how the app plays them: a heads-up game lasts tens to
  // a couple of hundred hands, and bots start each one knowing nothing). A long session isn't a fair test: the
  // adaptive bots work each other out and the result follows who did that first.
  const matches = Number(process.argv[4] ?? 300);
  const name = process.argv[5] ?? 'pro';
  const per = Number(process.argv[6] ?? 150);
  const legend = LEGENDS.find((l) => l.id === name);
  const on = legend ? legendBrain(legend) : withCraft(name as StyleId);
  const off: TwinBrain = legend ? { ...on, style: { ...on.style, craft: { ...NO_CRAFT, pets: [] } } } : plain(name as StyleId);
  const runs: number[] = [];
  for (let i = 0; i < matches; i++) {
    // Alternate who sits where, so the order of the seats never matters.
    const flip = i % 2 === 1;
    const r = simulateTable(['pro', 'pro'], per, 1000 + i, 100, {}, { twins: flip ? { 0: off, 1: on } : { 0: on, 1: off }, evAdjust: true }).seats;
    runs.push(r[flip ? 1 : 0].bbPer100);
    if ((i + 1) % 50 === 0 || i + 1 === matches) {
      const m = avg(runs);
      const sd = Math.sqrt(avg(runs.map((x) => (x - m) ** 2)));
      console.log(`${name} after ${i + 1} matches of ${per} hands: ${m.toFixed(1)} bb/100, +-${(sd / Math.sqrt(runs.length)).toFixed(1)}`, secs());
    }
  }
}
