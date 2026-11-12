// The style-fit lab: how well a fitted style copies the numbers it was built from (legends are fitted this way). Run with
//   npx tsx scripts/twinLab.ts ref [hands]      measures the ten styles and writes src/game/twinRef.json
//   npx tsx scripts/twinLab.ts fit [hands]      fits a style to each style's measured numbers and compares the two
//   npx tsx scripts/twinLab.ts tune [hands]     the fit alone against the real thing, to tune the gains in FIT
//   npx tsx scripts/twinLab.ts legends [hands]  checks the legends play as their numbers say and ranks them
// Nothing here ships in the app. (The AI twin memory it once also measured, a bot copying what a person did in each
// spot, was removed with the feature.)

import { writeFileSync } from 'node:fs';
import { simulateTable } from '../src/game/botSim';
import { twinNumbers, type TwinNumbers, type TwinProfile } from '../src/game/twin';
import type { StyleId } from '../src/game/botStyles';
import { FIT, fitStyle } from '../src/game/twinFit';
import { existsSync, readFileSync } from 'node:fs';
import { heroProfile } from './twinHarness';

const MODE = process.argv[2] ?? 'fit';
if (process.env.FIT) Object.assign(FIT, JSON.parse(process.env.FIT));
const HANDS = Number(process.argv[3] ?? 600);
const ALL: StyleId[] = ['pro', 'shark', 'tag', 'lag', 'maniac', 'rock', 'station', 'gambler', 'trapper', 'nervous'];

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const KEYS: (keyof TwinNumbers)[] = ['vpip', 'pfr', 'limp', 'open', 'threeBet', 'foldToRaise', 'foldToBet', 'betFreq', 'cbet', 'bluff', 'aggression', 'showdown'];
const show = (k: keyof TwinNumbers, v: number) => (k === 'open' ? v.toFixed(1) : pct(v));
const started = Date.now();
const secs = () => `${Math.round((Date.now() - started) / 1000)}s`;

if (MODE === 'ref') {
  const ref: Record<string, TwinNumbers> = {};
  for (const style of ALL) {
    const p = heroProfile(style, HANDS, 5);
    ref[style] = twinNumbers(p, 0);
    console.log(style.padEnd(8), `${p.hands} hands`, KEYS.map((k) => `${k} ${show(k, ref[style][k])}`).join('  '), secs());
  }
  writeFileSync(new URL('../src/game/twinRef.json', import.meta.url), JSON.stringify(ref, (_, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v), 2) + '\n');
}

if (MODE === 'fit') {
  // Two gaps per number, averaged over the ten styles: the noise between two runs of the same style, and the fitted
  // style against the real one.
  const NAMES = ['noise', 'style only'] as const;
  const errs: Record<(typeof NAMES)[number], Record<string, number[]>> = { noise: {}, 'style only': {} };
  for (const style of ALL) {
    const learn = heroProfile(style, HANDS, 21);
    const brain = { style: fitStyle(learn) };
    const a = twinNumbers(heroProfile(style, HANDS, 77), 0);
    const again = twinNumbers(heroProfile(style, HANDS, 177), 0);
    const styleOnly = twinNumbers(heroProfile(style, HANDS, 77, brain), 0);
    console.log(`${style.padEnd(8)} fits as ${brain.style.id.padEnd(8)}`, KEYS.map((k) => `${k} ${show(k, a[k])}/${show(k, styleOnly[k])}`).join('  '), secs());
    for (const [name, b] of [['noise', again], ['style only', styleOnly]] as const) for (const k of KEYS) (errs[name][k] ??= []).push(Math.abs(a[k] - b[k]));
  }
  console.log('\nMean gap per number (you vs ...)'.padEnd(28), NAMES.map((n) => n.padStart(11)).join(''));
  for (const k of KEYS) console.log(k.padEnd(28), NAMES.map((n) => (errs[n][k].reduce((x, y) => x + y, 0) / errs[n][k].length).toFixed(3).padStart(11)).join(''));
}

if (MODE === 'tune') {
  // The fitted style alone against the real thing, at length, to tune the gains in FIT. What each style did is
  // kept in a cache file (TWIN_CACHE) so a run only has to play the twins. Run with FIT='{"sticky":1.5}' to try gains.
  const path = process.env.TWIN_CACHE ?? '/tmp/twin-cache.json';
  const cache: { learn: Record<string, TwinProfile>; orig: Record<string, TwinNumbers> } = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { learn: {}, orig: {} };
  for (const style of ALL) {
    if (!cache.learn[style]) cache.learn[style] = heroProfile(style, HANDS, 21);
    if (!cache.orig[style]) cache.orig[style] = twinNumbers(heroProfile(style, HANDS, 77), 0);
  }
  writeFileSync(path, JSON.stringify(cache));
  const gaps: Record<string, number[]> = {};
  for (const style of ALL) {
    const brain = { style: fitStyle(cache.learn[style]) };
    const got = twinNumbers(heroProfile(style, HANDS, 77, brain), 0);
    for (const k of KEYS) (gaps[k] ??= []).push(got[k] - cache.orig[style][k]);
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(JSON.stringify(FIT), `\n${'number'.padEnd(12)}${'bias'.padStart(8)}${'gap'.padStart(8)}`);
  for (const k of KEYS) console.log(k.padEnd(12), mean(gaps[k]).toFixed(3).padStart(7), mean(gaps[k].map(Math.abs)).toFixed(3).padStart(7));
}

if (MODE === 'legends') {
  // Do the legends play as their numbers say, and do they rank the way the ladder says? Prints, for each,
  // how far its play lands from its target (at six-handed tables), then heads-up results: a plain player
  // (abc) against each, and every legend against every other (bb/100 for the row).
  const { LEGENDS, legendBrain } = await import('../src/game/legends');
  const brains = Object.fromEntries(LEGENDS.map((l) => [l.id, legendBrain(l)]));
  const gaps: Record<string, number[]> = {};
  for (const l of LEGENDS) {
    const got = twinNumbers(heroProfile('pro', HANDS, 41, brains[l.id]), 0);
    const want = { ...twinNumbers({ ...(await import('../src/game/twin')).emptyTwin() }, 0), ...l.numbers };
    console.log(`${l.short.padEnd(9)} ${KEYS.map((k) => `${k} ${show(k, l.numbers[k] ?? want[k])}→${show(k, got[k])}`).join('  ')}`, secs());
    for (const k of KEYS) if (l.numbers[k] !== undefined) (gaps[k] ??= []).push(Math.abs(got[k] - (l.numbers[k] as number)));
  }
  console.log('\nMean gap from target', KEYS.filter((k) => gaps[k]).map((k) => `${k} ${(gaps[k].reduce((a, b) => a + b, 0) / gaps[k].length).toFixed(3)}`).join('  '));

  const hu = (a: string, b?: string) => {
    const runs = [501, 502, 503, 504].map((seed) => simulateTable(b ? ['pro', 'pro'] : ['pro', 'abc'], HANDS * 5, seed, 100, {}, { twins: b ? { 0: brains[a], 1: brains[b] } : { 0: brains[a] } }).seats[b ? 0 : 1].bbPer100);
    return runs.reduce((x, y) => x + y, 0) / runs.length;
  };
  console.log('\nA plain player (abc) against each, bb/100 for abc: the lower, the harder the legend');
  for (const l of LEGENDS) console.log(`  rung ${l.rung} ${l.short.padEnd(9)} ${hu(l.id).toFixed(0).padStart(6)}`, secs());
  console.log('\nHeads-up, bb/100 for the row against the column');
  console.log(''.padEnd(10), LEGENDS.map((l) => l.short.padStart(10)).join(''));
  for (const a of LEGENDS) console.log(a.short.padEnd(10), LEGENDS.map((b) => (a.id === b.id ? '-'.padStart(10) : hu(a.id, b.id).toFixed(0).padStart(10))).join(''), secs());
}
