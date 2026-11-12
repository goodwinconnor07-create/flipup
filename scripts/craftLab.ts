// The craft lab: do the techniques (c-bets by board, barrels, floats, probes, donks, check-raises, river
// overbets, 4-bets, signature hands) show up in play the way each style's craft says, and do they
// make it stronger? Nothing here ships in the app; it's how the techniques were tuned (see docs/BOTS.md).
//
//   npx tsx scripts/craftLab.ts freq [hands]    how often each uses each technique, six-handed
//   npx tsx scripts/craftLab.ts ab [hands]      each style with its craft against the same without it
//   npx tsx scripts/craftLab.ts big 0 [matches] [name] [handsPerMatch]  one style with its craft against the same without it, heads-up, over many short fresh matches
//   npx tsx scripts/craftLab.ts single [handsPerMatch] [names] [style] [matches]  each technique on its own (pro by default) against the plain style, heads-up

import { simulateTable, TECHNIQUES } from '../src/game/botSim';
import { NO_CRAFT, STYLES, type Style, type StyleId } from '../src/game/botStyles';

const MODE = process.argv[2] ?? 'freq';
const HANDS = Number(process.argv[3] ?? 1500);
const SEEDS = [11, 12, 13];
const started = Date.now();
const secs = () => `${Math.round((Date.now() - started) / 1000)}s`;
const ALL = Object.keys(STYLES) as StyleId[];
const FIELD: StyleId[] = ['pro', 'shark', 'tag', 'lag', 'station'];

const plain = (id: StyleId): Style => ({ ...STYLES[id], craft: { ...NO_CRAFT, pets: [] } });
const withCraft = (id: StyleId): Style => STYLES[id];
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

if (MODE === 'freq') {
  const rows: { name: string; craft: Record<string, number>; n: Record<string, number> }[] = [];
  const run = (name: string, labStyle?: Style, style: StyleId = 'pro') => {
    const sum: Record<string, number[]> = {};
    const count: Record<string, number> = {};
    for (const seed of SEEDS) {
      const r = simulateTable([style, ...FIELD], HANDS, seed, 100, {}, labStyle ? { styles: { 0: labStyle } } : {}).seats[0];
      for (const k of TECHNIQUES) {
        (sum[k] ??= []).push(r.craft[k]);
        count[k] = (count[k] ?? 0) + r.craftN[k];
      }
    }
    rows.push({ name, craft: Object.fromEntries(TECHNIQUES.map((k) => [k, avg(sum[k])])), n: count });
    console.log('.', name, secs());
  };
  for (const id of ALL) run(id, undefined, id);
  console.log(`\n${HANDS} hands x ${SEEDS.length} seeds, six-handed against pro, shark, tag, lag and a station. Share of the chances each technique was used.\n`);
  console.log('name'.padEnd(10), TECHNIQUES.map((k) => k.padStart(10)).join(''));
  for (const r of rows) console.log(r.name.padEnd(10), TECHNIQUES.map((k) => (r.n[k] < 20 ? '-'.padStart(10) : `${(r.craft[k] * 100).toFixed(0)}%`.padStart(10))).join(''));
}

if (MODE === 'ab') {
  // Each with its craft against the same without it: heads-up (many hands, so the gap is clear) and in a six-handed field.
  console.log('bb/100 for the one with its craft against the same style without it (positive: the craft helps)\n');
  console.log('name'.padEnd(10), 'heads-up'.padStart(10), 'six-max'.padStart(10));
  const test = (name: string, on: Style, off: Style) => {
    const hu = avg(SEEDS.map((seed) => simulateTable(['pro', 'pro'], HANDS * 3, seed, 100, {}, { styles: { 0: on, 1: off }, evAdjust: true }).seats[0].bbPer100));
    // Six-handed: the one with craft and the one without, both against the same four.
    const six = avg(
      SEEDS.map((seed) => {
        const r = simulateTable(['pro', 'pro', 'shark', 'tag', 'lag', 'station'], HANDS * 2, seed, 100, {}, { styles: { 0: on, 1: off }, evAdjust: true }).seats;
        return r[0].bbPer100 - r[1].bbPer100;
      }),
    );
    console.log(name.padEnd(10), hu.toFixed(0).padStart(10), six.toFixed(0).padStart(10), secs());
  };
  for (const id of ALL) test(id, withCraft(id), plain(id));
}

if (MODE === 'single') {
  // One technique at a time on top of a plain style, against that plain style, heads-up on many hands: which ones
  // help (positive), which cost chips. The values are what the styles use.
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
    const on: Style = { ...STYLES[style], craft: { ...NO_CRAFT, pets: [], ...variants[name] } };
    const runs: number[] = [];
    for (let i = 0; i < matches; i++) {
      const flip = i % 2 === 1;
      const r = simulateTable(['pro', 'pro'], HANDS, 3000 + i, 100, {}, { styles: flip ? { 0: plain(style), 1: on } : { 0: on, 1: plain(style) }, evAdjust: true }).seats;
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
  const on = withCraft(name as StyleId);
  const off = plain(name as StyleId);
  const runs: number[] = [];
  for (let i = 0; i < matches; i++) {
    // Alternate who sits where, so the order of the seats never matters.
    const flip = i % 2 === 1;
    const r = simulateTable(['pro', 'pro'], per, 1000 + i, 100, {}, { styles: flip ? { 0: off, 1: on } : { 0: on, 1: off }, evAdjust: true }).seats;
    runs.push(r[flip ? 1 : 0].bbPer100);
    if ((i + 1) % 50 === 0 || i + 1 === matches) {
      const m = avg(runs);
      const sd = Math.sqrt(avg(runs.map((x) => (x - m) ** 2)));
      console.log(`${name} after ${i + 1} matches of ${per} hands: ${m.toFixed(1)} bb/100, +-${(sd / Math.sqrt(runs.length)).toFixed(1)}`, secs());
    }
  }
}
