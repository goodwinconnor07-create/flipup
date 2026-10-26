// Turns what a twin has learned about a person into something that plays: a bot style fitted to
// their numbers (how many hands they play, how often they raise, fold to bets, bluff, how big they
// bet), plus the memory of what they did in each spot (see twinMix.ts, which copies it).
//
// The fit starts from the ten bot styles. Each is weighted by how close its numbers are to the
// person's (twinRef.json holds how each one really plays, measured by scripts/twinLab.ts), the
// weighted styles are blended, and what's left of the gap is closed by nudging the knobs that move
// each number.

import { POST_BUCKETS, twinNumbers, type SpotCounts, type TwinNumbers, type TwinProfile } from './twin';
import { NO_CRAFT, STYLES, type Style, type StyleId } from './botStyles';
import ref from './twinRef.json';

/** What a bot needs to play like a person: the fitted style and the memory of their spots. Lives on the player at the table; never sent to a phone. */
export interface TwinBrain {
  style: Style;
  /** The memory: counts per spot, in `TWIN_MOVES` order. */
  spots: Record<string, SpotCounts>;
  /** Hands it learned from. */
  hands: number;
}

const REF = ref as unknown as Record<StyleId, TwinNumbers>;
const IDS = Object.keys(STYLES) as StyleId[];

/** How far apart two numbers have to be to count as clearly different, for picking the closest styles. */
const SCALE: Partial<Record<keyof TwinNumbers, number>> = { vpip: 0.08, pfr: 0.06, foldToBet: 0.1, betFreq: 0.1, bluff: 0.1, cbet: 0.15, aggression: 0.12 };
/** How sharply the closest style wins over the rest (bigger blends more styles). */
const SPREAD = 1.5;

/** How hard each knob is nudged per point of gap between the person's number and the blend's. Tuned with scripts/twinLab.ts. */
export const FIT = { loose: 1.6, aggro: 1, limp: 1.2, sticky: 0.9, scared: 0.6, bet: 0.4, bluff: 0.35, raise: 0.2 };

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Each style's weight, from how close its numbers are to these. They add up to 1. */
function closeness(n: TwinNumbers): Record<StyleId, number> {
  const raw = {} as Record<StyleId, number>;
  for (const id of IDS) {
    let d2 = 0;
    for (const [k, scale] of Object.entries(SCALE) as [keyof TwinNumbers, number][]) d2 += ((n[k] - REF[id][k]) / scale) ** 2;
    raw[id] = Math.exp(-d2 / (2 * SPREAD));
  }
  const total = IDS.reduce((a, id) => a + raw[id], 0) || 1;
  for (const id of IDS) raw[id] /= total;
  return raw;
}

/** Numbers blend; words and lists come from the first part (the closest style). */
function blend<T extends object>(parts: { w: number; v: T }[]): T {
  const out: Record<string, unknown> = {};
  const first = parts[0].v as Record<string, unknown>;
  for (const k of Object.keys(first)) {
    const sample = first[k];
    if (typeof sample === 'number') out[k] = parts.reduce((a, p) => a + p.w * ((p.v as Record<string, number>)[k] ?? 0), 0);
    else if (sample && typeof sample === 'object' && !Array.isArray(sample)) out[k] = blend(parts.map((p) => ({ w: p.w, v: (p.v as Record<string, object>)[k] })));
    else out[k] = Array.isArray(sample) ? [...sample] : sample;
  }
  return out as T;
}

/** Moves a style's looseness by `by`, first undoing whatever tightness (or looseness) it has. */
function shiftLoose(pre: Style['pre'], by: number): void {
  if (by >= 0) {
    const fromTight = Math.min(pre.tight, by);
    pre.tight -= fromTight;
    pre.loose = clamp(pre.loose + (by - fromTight), 0, 0.8);
  } else {
    const fromLoose = Math.min(pre.loose, -by);
    pre.loose -= fromLoose;
    pre.tight = clamp(pre.tight + (-by - fromLoose), 0, 0.95);
  }
}

/** The mean bet size (a share of the pot) over some buckets, or null with too few bets. */
function meanSize(twin: TwinProfile, buckets: string[]): number | null {
  let sum = 0;
  let n = 0;
  for (const b of buckets) {
    const i = POST_BUCKETS.indexOf(b as (typeof POST_BUCKETS)[number]);
    sum += twin.stats.sizeSum[i];
    n += twin.stats.sizeN[i];
  }
  return n >= 3 ? sum / n : null;
}

/** A bot style that plays the way this person's numbers say they play. */
export function fitStyle(twin: TwinProfile): Style {
  const n = twinNumbers(twin);
  const w = closeness(n);
  const order = [...IDS].sort((a, b) => w[b] - w[a]);
  const style = blend(order.map((id) => ({ w: w[id], v: STYLES[id] })));
  style.id = order[0];
  // A twin plays its person's own habits (the spots it remembers), not a bot's techniques.
  style.craft = { ...NO_CRAFT, pets: [] };
  const base = REF;
  // Where the blend of the styles' own numbers sits, and how far the person is from it.
  const at = (k: keyof TwinNumbers) => IDS.reduce((a, id) => a + w[id] * base[id][k], 0);
  const gap = (k: keyof TwinNumbers) => n[k] - at(k);
  const ratio = (x: TwinNumbers) => x.pfr / Math.max(0.05, x.vpip);
  const refRatio = IDS.reduce((a, id) => a + w[id] * ratio(base[id]), 0);

  const pre = style.pre;
  const post = style.post;
  shiftLoose(pre, gap('vpip') * FIT.loose);
  pre.aggro = clamp(pre.aggro + (ratio(n) - refRatio) * FIT.aggro, -1, 1);
  pre.limp = clamp(pre.limp + gap('limp') * FIT.limp, 0, 1);
  pre.open = clamp(n.open, 1.8, 5);
  post.sticky = clamp(post.sticky - gap('foldToBet') * FIT.sticky, -0.5, 0.3);
  post.scared = clamp(post.scared + gap('foldToBet') * FIT.scared, 0, 2.5);
  post.bet = clamp(post.bet + ((gap('betFreq') + gap('cbet')) / 2) * FIT.bet, -0.2, 0.2);
  post.bluff = clamp(post.bluff + gap('bluff') * FIT.bluff, -0.12, 0.12);
  post.raise = clamp(post.raise + gap('aggression') * FIT.raise, -0.2, 0.2);
  // Its own habits come first: less leaning on GTO's mix than the bots it was blended from.
  post.gto *= 0.5;

  // Bet sizes the way they bet them, and whether the size gives their hand away.
  const { smallN, smallSum, bigN, bigSum } = twin.stats;
  const small = smallN >= 3 ? smallSum / smallN : null;
  const big = bigN >= 3 ? bigSum / bigN : null;
  if (small !== null && big !== null && big > small * 1.2) post.sizes = [small, big].map((x) => Math.round(clamp(x, 0.2, 2) * 100) / 100);
  else if (small !== null || big !== null) post.sizes = [Math.round(clamp((small ?? big)!, 0.2, 2) * 100) / 100];
  const strong = meanSize(twin, ['top', 'strong', 'monster']);
  const weak = meanSize(twin, ['air', 'weak', 'draw', 'mid']);
  if (strong !== null && weak !== null) post.tell = clamp((strong - weak) * 1.2, 0, 0.8);
  return style;
}

/** Everything a bot needs to play as this person. */
export function buildBrain(twin: TwinProfile): TwinBrain {
  const spots: Record<string, SpotCounts> = {};
  for (const [key, counts] of Object.entries(twin.spots)) if (counts.some((c) => c > 0)) spots[key] = [...counts];
  return { style: fitStyle(twin), spots, hands: twin.hands };
}
