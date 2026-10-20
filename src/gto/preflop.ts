// Preflop drills that run on the phone, from a solved 6-handed, 100bb game shipped as a static file
// (public/gto/preflop-6p-100bb.json, made by gto/scripts/export_preflop.py). This is a port of
// preflop_drill() in gto/flipup_gto/library.py, so a drill here reads the same as one from the
// coach service, but needs no connection.

import type { Colour, Drill, DrillOption, Grid, Scenario } from './types';

const FILE = '/gto/preflop-6p-100bb.json';
const PLAYERS = 6;
const STACK_BB = 100;
const MIN_LINE_FREQ = 0.02;

export const PREFLOP_SCENARIOS: Scenario[] = [
  { id: 'rfi', group: 'Preflop', title: 'Opening the pot', description: 'Everyone folds to you. Raise, or fold?' },
  { id: 'vs_open_ip', group: 'Preflop', title: 'Facing an open in position', description: 'Someone opened in front of you. 3-bet, call or fold?' },
  { id: 'vs_open_blinds', group: 'Preflop', title: 'Defending the blinds', description: "You're in the small or big blind facing an open." },
  { id: 'vs_3bet', group: 'Preflop', title: 'Facing a 3-bet', description: 'You opened and got re-raised.' },
  { id: 'vs_4bet', group: 'Preflop', title: 'Facing a 4-bet', description: 'You 3-bet and the opener came back over the top.' },
  { id: 'vs_limp', group: 'Preflop', title: 'Facing a limp', description: 'The small blind limped into your big blind.' },
].map((s) => ({ ...s, available: true, spots: null }));

export const isPreflopScenario = (id: string) => PREFLOP_SCENARIOS.some((s) => s.id === id);

export interface PNode {
  pos: number;
  /** Chips x100, so 2.5bb is 250. */
  pot: number;
  invested: number[];
  actions: { t: string; to: number }[];
  /** Percent, one per hand class. */
  reach: number[];
  strat: number[][];
  ev: number[][];
}

export interface PFile {
  classes: string[];
  names: string[];
  er: number[];
  nodes: Record<string, PNode>;
}

let loading: Promise<PFile> | null = null;

/** The parts the drills read, so a wrong file (a web page served in its place, say) is refused up front. */
function looksLikeFile(f: unknown): f is PFile {
  const x = f as Partial<PFile> | null;
  if (!x || !Array.isArray(x.classes) || !Array.isArray(x.names) || !Array.isArray(x.er) || !x.nodes || typeof x.nodes !== 'object') return false;
  const root = x.nodes[''];
  return !!root && Array.isArray(root.actions) && Array.isArray(root.reach) && root.reach.length === x.classes.length && Array.isArray(root.strat) && Array.isArray(root.ev);
}

/** Fetches the solved game once. Rejects if the file isn't there, so callers can fall back to the service. */
export function loadPreflop(): Promise<PFile> {
  if (!loading) {
    // A stalled download must not hold a drill up for ever: give up and let the caller ask the service.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    loading = fetch(FILE, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('No local preflop data.');
        const file: unknown = await res.json();
        if (!looksLikeFile(file)) throw new Error('The local preflop data is not in the expected shape.');
        return file;
      })
      .finally(() => clearTimeout(timer));
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

// ── Small helpers ───────────────────────────────────────────────────────────

type Rng = () => number;

/** A seeded random number generator, so the same seed deals the same drill. */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo));
const pick = <T,>(rng: Rng, items: T[]): T => items[Math.floor(rng() * items.length)];

function weighted(rng: Rng, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1;
}

const RANKS = '23456789TJQKA';
const SUITS = 'cdhs';

const comboCount = (cls: string) => (cls.length === 2 ? 6 : cls[2] === 's' ? 4 : 12);

/** Every two-card hand in a class, as "AhKd" with the higher rank first. */
function classCombos(cls: string): string[] {
  const r1 = RANKS.indexOf(cls[0]);
  const r2 = RANKS.indexOf(cls[1]);
  const kind = cls[2] ?? '';
  const out: string[] = [];
  for (let s1 = 0; s1 < 4; s1++) {
    for (let s2 = 0; s2 < 4; s2++) {
      if (r1 === r2 && s2 <= s1) continue;
      if (kind === 's' && s1 !== s2) continue;
      if (kind === 'o' && s1 === s2) continue;
      out.push(`${RANKS[r1]}${SUITS[s1]}${RANKS[r2]}${SUITS[s2]}`);
    }
  }
  return out;
}

const labelOf = (a: { t: string; to: number }) =>
  a.t === 'fold' || a.t === 'check' || a.t === 'call'
    ? a.t
    : a.t === 'allin'
      ? `all-in ${(a.to / 100).toFixed(1)}`
      : `raise ${(a.to / 100).toFixed(1)}`;

/** Turns "fold" / "raise" / "call" into an action index at a node, the way the service's resolve() does. */
function resolveStep(node: PNode, step: string): number | null {
  const cands = node.actions.map((a, i) => (a.t === step ? i : -1)).filter((i) => i >= 0);
  if (cands.length === 0 && step === 'raise') {
    const jam = node.actions.findIndex((a) => a.t === 'allin');
    return jam >= 0 ? jam : null;
  }
  return cands.length ? cands[0] : null;
}

function nodeAt(file: PFile, path: number[]): PNode | null {
  return file.nodes[path.join('.')] ?? null;
}

function rangeFreqs(node: PNode, combos: number[]): number[] {
  const w = node.reach.map((r, c) => (r / 100) * combos[c]);
  const total = w.reduce((a, b) => a + b, 0);
  return node.strat.map((row) => (total > 0 ? row.reduce((s, x, c) => s + (x / 100) * w[c], 0) / total : 0));
}

// ── Grading, as in library._answer and coach.colour_for ─────────────────────

function gradeOf(loss: number, pot: number, freq: number, isBest: boolean): string {
  const pct = pot > 0 ? (100 * loss) / pot : 0;
  if (isBest || pct <= 0.5) return 'best';
  if (freq >= 0.035 && pct <= 1.0) return 'correct';
  if (pct <= 2.5) return 'inaccuracy';
  if (pct <= 8) return 'mistake';
  return 'blunder';
}

function colourFor(grade: string): { colour: Colour; why: string } {
  if (grade === 'best' || grade === 'correct') return { colour: 'green', why: 'matches GTO' };
  if (grade === 'inaccuracy') return { colour: 'yellow', why: 'close to GTO, small EV loss' };
  return { colour: 'red', why: 'a clear mistake' };
}

function answerFor(labels: string[], strat: number[], evs: number[], pot: number) {
  let best = 0;
  evs.forEach((e, i) => {
    if (e > evs[best]) best = i;
  });
  const options: DrillOption[] = labels.map((action, i) => {
    const loss = Math.max(0, evs[best] - evs[i]);
    const { colour, why } = colourFor(gradeOf(loss, pot, strat[i], i === best));
    return {
      action,
      frequency: Math.round(strat[i] * 1000) / 1000,
      ev_bb: Math.round(evs[i] * 1000) / 1000,
      ev_loss_bb: Math.round(loss * 1000) / 1000,
      colour,
      why,
    };
  });
  return { options, best_action: labels[best] };
}

// ── The drill ───────────────────────────────────────────────────────────────

function buildDrill(file: PFile, scenario: string, rng: Rng): Drill | null {
  const names = file.names;
  const n = PLAYERS;
  const combos = file.classes.map(comboCount);
  const path: string[] = [];
  const history: string[] = [];
  let hero = -1;

  const foldTo = (target: number, start = 0) => {
    for (let i = start; i < target; i++) {
      path.push('fold');
      history.push(`${names[i]} folds`);
    }
  };

  if (scenario === 'rfi') {
    hero = randInt(rng, 0, n - 1);
    foldTo(hero);
  } else if (scenario === 'vs_open_ip' || scenario === 'vs_open_blinds') {
    const lastIp = n - 3;
    let opener: number;
    if (scenario === 'vs_open_ip') {
      opener = randInt(rng, 0, Math.max(1, lastIp));
      hero = randInt(rng, opener + 1, lastIp + 1);
    } else {
      opener = randInt(rng, 0, n - 2);
      hero = pick(rng, [n - 2, n - 1]);
    }
    foldTo(opener);
    path.push('raise');
    history.push(`${names[opener]} raises`);
    foldTo(hero, opener + 1);
  } else if (scenario === 'vs_3bet') {
    hero = randInt(rng, 0, n - 2);
    const threeBettor = randInt(rng, hero + 1, n);
    foldTo(hero);
    path.push('raise');
    history.push(`${names[hero]} (you) raises`);
    foldTo(threeBettor, hero + 1);
    path.push('raise');
    history.push(`${names[threeBettor]} 3-bets`);
    for (let i = threeBettor + 1; i < n; i++) {
      path.push('fold');
      history.push(`${names[i]} folds`);
    }
  } else if (scenario === 'vs_4bet') {
    const opener = randInt(rng, 0, n - 2);
    hero = randInt(rng, opener + 1, n);
    foldTo(opener);
    path.push('raise');
    history.push(`${names[opener]} raises`);
    foldTo(hero, opener + 1);
    path.push('raise');
    history.push(`${names[hero]} (you) 3-bets`);
    for (let i = hero + 1; i < n; i++) {
      path.push('fold');
      history.push(`${names[i]} folds`);
    }
    path.push('raise');
    history.push(`${names[opener]} 4-bets`);
  } else if (scenario === 'vs_limp') {
    hero = n - 1;
    foldTo(n - 2);
    path.push('call');
    history.push(`${names[n - 2]} completes (limps)`);
  } else {
    return null;
  }

  // Walk the line, turning each named step into an action index. A step GTO doesn't take (or that
  // wasn't kept in the file) means this line isn't worth drilling.
  const indices: number[] = [];
  for (let k = 0; k < path.length; k++) {
    const node = nodeAt(file, indices);
    if (!node) return null;
    const idx = resolveStep(node, path[k]);
    if (idx === null) return null;
    if (path[k] !== 'fold') {
      const want = path[k] === 'raise' ? ['raise', 'allin'] : [path[k]];
      const freq = rangeFreqs(node, combos).reduce((s, f, i) => s + (want.includes(node.actions[i].t) ? f : 0), 0);
      if (freq < MIN_LINE_FREQ) return null;
    }
    indices.push(idx);
  }
  const node = nodeAt(file, indices);
  if (!node || node.pos !== hero) return null;

  const reach = node.reach.map((r) => r / 100);
  let weights = reach.map((r, c) => r * combos[c]);
  // Half the time deal from hands GTO plays here, otherwise any hand that can reach the spot.
  if (scenario === 'rfi' && rng() < 0.5) {
    const raiseAt = node.actions.findIndex((a) => a.t === 'raise' || a.t === 'allin');
    if (raiseAt >= 0) weights = weights.map((w, c) => w * (0.15 + node.strat[raiseAt][c] / 100));
  }
  if (weights.reduce((a, b) => a + b, 0) <= 0) return null;
  const c = weighted(rng, weights);
  const cls = file.classes[c];
  const hand = pick(rng, classCombos(cls));

  const labels = node.actions.map(labelOf);
  const strat = node.strat.map((row) => row[c] / 100);
  const evs = node.ev.map((row) => row[c] / 100);
  const pot = node.pot / 100;
  const invested = node.invested.map((x) => x / 100);
  const toCall = Math.max(...invested) - invested[hero];
  const answer = answerFor(labels, strat, evs, pot);

  const rangeFreq = rangeFreqs(node, combos);
  const tips = [
    `${hand} (${cls}) has ${Math.round(file.er[c] / 10)}% equity against a random hand.`,
    `From the ${names[hero]} GTO plays: ${labels
      .map((l, i) => ({ l, f: rangeFreq[i] }))
      .filter((x) => x.f >= 0.005)
      .map((x) => `${x.l} ${Math.round(100 * x.f)}%`)
      .join(', ')}.`,
  ];
  if (toCall > 0 && Math.max(...invested) > 1) {
    tips.push(
      `You'd need ${Math.round((100 * toCall) / (pot + toCall))}% equity to call ${toCall.toFixed(1)}bb into ${pot.toFixed(1)}bb at showdown; position and playability move that threshold.`,
    );
  }

  const grid: Grid = {};
  file.classes.forEach((k, i) => {
    if (reach[i] <= 1e-4) return;
    const cell: Record<string, number> = { weight: Math.round(reach[i] * 1000) / 1000 };
    labels.forEach((l, a) => {
      cell[l] = node.strat[a][i] / 100;
    });
    grid[k] = cell;
  });

  return {
    scenario,
    street: 'preflop',
    position: names[hero],
    players: n,
    stack_bb: STACK_BB,
    history,
    board: [],
    pot_bb: Math.round(pot * 100) / 100,
    to_call_bb: Math.round(toCall * 100) / 100,
    hand,
    hand_class: cls,
    actions: labels,
    answer,
    tips,
    grid,
  };
}

/** A preflop drill dealt on the phone. Throws if the data isn't available, so the caller can ask the service. */
export async function localPreflopDrill(scenario: string, seed?: number): Promise<Drill> {
  return drillFromFile(await loadPreflop(), scenario, seed);
}

/** The same, from data already in hand (the unit tests read the file straight from disk). */
export function drillFromFile(file: PFile, scenario: string, seed?: number): Drill {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 31));
  for (let attempt = 0; attempt < 60; attempt++) {
    const drill = buildDrill(file, scenario, rng);
    if (drill) return drill;
  }
  throw new Error(`Couldn't find a ${scenario} spot to practise.`);
}
