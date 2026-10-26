// The AI twin lab: how well a twin copies the player it was built from. Run with
//   npx tsx scripts/twinLab.ts ref [hands]   measures the ten styles and writes src/game/twinRef.json
//   npx tsx scripts/twinLab.ts fit [hands]   builds a twin from each style's play and compares the two
// Nothing here ships in the app (see docs/TWINS.md).

import { writeFileSync } from 'node:fs';
import { twinNumbers, type TwinNumbers, type TwinProfile } from '../src/game/twin';
import type { StyleId } from '../src/game/botStyles';
import { buildBrain, FIT } from '../src/game/twinFit';
import { existsSync, readFileSync } from 'node:fs';
import { TWIN_TUNING } from '../src/game/twinMix';
import { heroProfile } from './twinHarness';

const MODE = process.argv[2] ?? 'fit';
if (process.env.TWIN_K) TWIN_TUNING.k = Number(process.env.TWIN_K);
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
  // Three gaps per number, averaged over the ten styles: the noise between two runs of the same style,
  // the fitted style alone, and the full twin (fitted style plus the memory).
  const NAMES = ['noise', 'style only', 'full twin'] as const;
  const errs: Record<(typeof NAMES)[number], Record<string, number[]>> = { noise: {}, 'style only': {}, 'full twin': {} };
  for (const style of ALL) {
    const learn = heroProfile(style, HANDS, 21);
    const brain = buildBrain(learn);
    const a = twinNumbers(heroProfile(style, HANDS, 77), 0);
    const again = twinNumbers(heroProfile(style, HANDS, 177), 0);
    TWIN_TUNING.copy = false;
    const styleOnly = twinNumbers(heroProfile(style, HANDS, 77, brain), 0);
    TWIN_TUNING.copy = true;
    const full = twinNumbers(heroProfile(style, HANDS, 77, brain), 0);
    console.log(`${style.padEnd(8)} fits as ${brain.style.id.padEnd(8)}`, KEYS.map((k) => `${k} ${show(k, a[k])}/${show(k, styleOnly[k])}/${show(k, full[k])}`).join('  '), secs());
    for (const [name, b] of [['noise', again], ['style only', styleOnly], ['full twin', full]] as const) for (const k of KEYS) (errs[name][k] ??= []).push(Math.abs(a[k] - b[k]));
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
  TWIN_TUNING.copy = false;
  const gaps: Record<string, number[]> = {};
  for (const style of ALL) {
    const brain = buildBrain(cache.learn[style]);
    const got = twinNumbers(heroProfile(style, HANDS, 77, brain), 0);
    for (const k of KEYS) (gaps[k] ??= []).push(got[k] - cache.orig[style][k]);
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(JSON.stringify(FIT), `\n${'number'.padEnd(12)}${'bias'.padStart(8)}${'gap'.padStart(8)}`);
  for (const k of KEYS) console.log(k.padEnd(12), mean(gaps[k]).toFixed(3).padStart(7), mean(gaps[k].map(Math.abs)).toFixed(3).padStart(7));
}
