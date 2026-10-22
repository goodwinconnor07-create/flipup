// Turns session files into tables, with session-level bootstrap intervals.
//   npx tsx bot-lab/analyze.ts report  <file.jsonl> [--title T]                    one engine, markdown on stdout
//   npx tsx bot-lab/analyze.ts compare <baseline.jsonl> <candidate.jsonl> [--title T]   paired by session id
//   npx tsx bot-lab/analyze.ts csv     <file.jsonl> <out.csv>                       one row per session x seat
// Intervals are 95% percentile bootstrap over SESSIONS (a session is the independent unit: hands inside a
// table share stacks, moods and reads, so they are not treated as independent).

import { readFileSync, writeFileSync } from 'node:fs';
import { seededRng } from '../src/game/cards';
import { newVs, type Counters, type SeatReport, type SessionResult } from './sim';

export const STRONG = ['pro', 'shark', 'tag', 'lag', 'trapper'];
export const SOFT = ['station', 'gambler', 'maniac', 'nervous'];
export const STYLES = ['pro', 'shark', 'tag', 'lag', 'trapper', 'rock', 'station', 'gambler', 'maniac', 'nervous'];
export const ARCH = ['casual', 'station', 'tightPassive', 'bluffer', 'valueBettor', 'timid', 'aggressive'];

export const load = (file: string): SessionResult[] =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

// ── Counters arithmetic ─────────────────────────────────────────────────────
function empty(): Counters {
  return JSON.parse(JSON.stringify({ ...ZERO }));
}
const ZERO: Counters = {
  hands: 0, net: 0, netH1: 0, netH2: 0, handsH1: 0, handsH2: 0, vpip: 0, pfr: 0, limp: 0, rfiOpp: 0, rfi: 0, threeBetOpp: 0, threeBet: 0, faced3: 0, foldTo3: 0,
  sawFlop: 0, wtsd: 0, wsd: 0, cbetOpp: 0, cbet: 0, bets: 0, raises: 0, calls: 0, checks: 0, folds: 0, facedBet: 0, foldedToBet: 0, facedBig: 0, foldedToBig: 0,
  sizeBins: [0, 0, 0, 0, 0], sizeAllIn: 0, bluffBets: 0, valueBets: 0, absurdFolds: 0, absurdSpots: 0, monsterFolds: 0, monsterFacing: 0, noPairBigCalls: 0, noPairBigFacing: 0, resp: {}, strongFacingBet: 0, strongFoldedSmall: 0, weakCallsBig: 0, weakFacingBig: 0,
  shortPush: 0, shortSpots: 0, netByPos: [0, 0, 0, 0], handsByPos: [0, 0, 0, 0], decisions: 0, latSumMs: 0, latMaxMs: 0, latBins: [0, 0, 0, 0, 0, 0, 0], vs: {},
};
export function add(a: Counters, b: Counters): Counters {
  const out = a;
  for (const k of Object.keys(ZERO) as (keyof Counters)[]) {
    if (k === 'vs') continue;
    const x = out[k];
    const y = b[k];
    if (k === 'resp') continue;
    if (Array.isArray(x) && Array.isArray(y)) for (let i = 0; i < x.length; i++) x[i] += y[i] ?? 0;
    else if (k === 'latMaxMs') (out as unknown as Record<string, number>)[k] = Math.max(x as number, y as number);
    else (out as unknown as Record<string, number>)[k] = ((x as number) ?? 0) + ((y as number) ?? 0);
  }
  if (b.resp) {
    const o = (out.resp ??= {});
    for (const [key, v] of Object.entries(b.resp)) {
      const t = (o[key] ??= [0, 0, 0, 0, 0, 0, 0, 0]);
      for (let i = 0; i < 8; i++) t[i] += v[i];
    }
  }
  for (const [key, v] of Object.entries(b.vs)) {
    const t = (out.vs[key] ??= newVs());
    for (const f of Object.keys(t) as (keyof typeof t)[]) t[f] = (t[f] ?? 0) + (v[f] ?? 0);
  }
  return out;
}

// ── Metrics ─────────────────────────────────────────────────────────────────
const r = (a: number, b: number) => (b > 0 ? a / b : NaN);
const MID = [0.2, 0.4, 0.65, 1.0, 1.5];
export const METRICS: Record<string, { label: string; f: (c: Counters) => number; pct?: boolean }> = {
  bb100: { label: 'bb/100', f: (c) => r(c.net, c.hands) * 100 },
  vpip: { label: 'VPIP', f: (c) => r(c.vpip, c.hands), pct: true },
  pfr: { label: 'PFR', f: (c) => r(c.pfr, c.hands), pct: true },
  limp: { label: 'Limp', f: (c) => r(c.limp, c.hands), pct: true },
  rfi: { label: 'First-in raise', f: (c) => r(c.rfi, c.rfiOpp), pct: true },
  threeBet: { label: '3-bet', f: (c) => r(c.threeBet, c.threeBetOpp), pct: true },
  foldTo3: { label: 'Opener folds to 3-bet', f: (c) => r(c.foldTo3, c.faced3), pct: true },
  cbet: { label: 'C-bet', f: (c) => r(c.cbet, c.cbetOpp), pct: true },
  agg: { label: 'Aggression (bets+raises per call)', f: (c) => r(c.bets + c.raises, c.calls) },
  foldToBet: { label: 'Fold to bet', f: (c) => r(c.foldedToBet, c.facedBet), pct: true },
  foldToBig: { label: 'Fold to 3/4-pot+ bet', f: (c) => r(c.foldedToBig, c.facedBig), pct: true },
  wtsd: { label: 'Went to showdown', f: (c) => r(c.wtsd, c.sawFlop), pct: true },
  wsd: { label: 'Won at showdown', f: (c) => r(c.wsd, c.wtsd), pct: true },
  bluffShare: { label: 'Bluff share of bets', f: (c) => r(c.bluffBets, c.bluffBets + c.valueBets), pct: true },
  size: { label: 'Avg bet size (x pot)', f: (c) => r(c.sizeBins.reduce((a, n, i) => a + n * MID[i], 0), c.sizeBins.reduce((a, n) => a + n, 0)) },
  absurdFold: { label: 'Folds a made hand at 6-to-1 or better', f: (c) => r(c.absurdFolds ?? 0, c.absurdSpots ?? 0), pct: true },
  monsterFold: { label: 'Folds a monster to any bet', f: (c) => r(c.monsterFolds ?? 0, c.monsterFacing ?? 0), pct: true },
  noPairCall: { label: 'Calls a 3/4-pot+ river bet with no pair', f: (c) => r(c.noPairBigCalls ?? 0, c.noPairBigFacing ?? 0), pct: true },
  overfold: { label: 'Strong hand folds to small bet', f: (c) => r(c.strongFoldedSmall, c.strongFacingBet), pct: true },
  heroCall: { label: 'Weak hand calls big bet (turn/river)', f: (c) => r(c.weakCallsBig, c.weakFacingBig), pct: true },
  shortPush: { label: 'Short-stack first-in shove', f: (c) => r(c.shortPush, c.shortSpots), pct: true },
  latency: { label: 'ms per decision', f: (c) => r(c.latSumMs, c.decisions) },
};
const fmt = (m: string, x: number) => (Number.isNaN(x) ? '–' : METRICS[m]?.pct ? `${(x * 100).toFixed(0)}%` : Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2));

// ── Bootstrap over sessions ─────────────────────────────────────────────────
type PerSession = Map<string, Counters>;
export function boot(per: PerSession, f: (c: Counters) => number, B = 400, seed = 1): { v: number; lo: number; hi: number; n: number } {
  const ids = [...per.keys()];
  const total = empty();
  for (const c of per.values()) add(total, c);
  const v = f(total);
  if (ids.length < 3) return { v, lo: NaN, hi: NaN, n: ids.length };
  const rng = seededRng(seed);
  const xs: number[] = [];
  for (let b = 0; b < B; b++) {
    const t = empty();
    for (let i = 0; i < ids.length; i++) add(t, per.get(ids[Math.floor(rng() * ids.length)])!);
    const x = f(t);
    if (!Number.isNaN(x)) xs.push(x);
  }
  xs.sort((a, b) => a - b);
  return { v, lo: xs[Math.floor(xs.length * 0.025)] ?? NaN, hi: xs[Math.floor(xs.length * 0.975)] ?? NaN, n: ids.length };
}
/** Paired: resample session ids that exist in both, difference of the metric (candidate - baseline). */
export function bootDiff(a: PerSession, b: PerSession, f: (c: Counters) => number, B = 400, seed = 2): { d: number; lo: number; hi: number; n: number; va: number; vb: number } {
  const ids = [...a.keys()].filter((k) => b.has(k));
  const sum = (src: PerSession, pick: string[]) => {
    const t = empty();
    for (const id of pick) add(t, src.get(id)!);
    return t;
  };
  const va = f(sum(a, ids));
  const vb = f(sum(b, ids));
  if (ids.length < 3) return { d: vb - va, lo: NaN, hi: NaN, n: ids.length, va, vb };
  const rng = seededRng(seed);
  const xs: number[] = [];
  for (let i = 0; i < B; i++) {
    const pick = Array.from({ length: ids.length }, () => ids[Math.floor(rng() * ids.length)]);
    const d = f(sum(b, pick)) - f(sum(a, pick));
    if (!Number.isNaN(d)) xs.push(d);
  }
  xs.sort((x, y) => x - y);
  return { d: vb - va, lo: xs[Math.floor(xs.length * 0.025)] ?? NaN, hi: xs[Math.floor(xs.length * 0.975)] ?? NaN, n: ids.length, va, vb };
}

// ── Grouping ────────────────────────────────────────────────────────────────
/** Counters summed per session for the seats that pass `pick`. */
export function group(sessions: SessionResult[], pick: (s: SeatReport, r: SessionResult) => boolean, sessionFilter: (r: SessionResult) => boolean = () => true): PerSession {
  const out: PerSession = new Map();
  for (const ses of sessions) {
    if (!sessionFilter(ses)) continue;
    for (const seat of ses.seats) {
      if (!pick(seat, ses)) continue;
      const t = out.get(ses.config.id) ?? empty();
      add(t, seat.c);
      out.set(ses.config.id, t);
    }
  }
  return out;
}
export const botStyle = (style: string) => (s: SeatReport) => s.kind === 'bot' && s.style === style;
export const archetype = (name: string) => (s: SeatReport) => s.kind === 'archetype' && s.style === name;

const ci = (m: string, o: { v: number; lo: number; hi: number }) => `${fmt(m, o.v)} [${fmt(m, o.lo)}, ${fmt(m, o.hi)}]`;
const hands = (per: PerSession) => [...per.values()].reduce((a, c) => a + c.hands, 0);

// ── Personality distinctness ────────────────────────────────────────────────
export const VECTOR = ['vpip', 'pfr', 'threeBet', 'agg', 'foldToBet', 'cbet', 'wtsd', 'bluffShare', 'size', 'limp'];
export function styleVector(sessions: SessionResult[], style: string, sessionFilter?: (r: SessionResult) => boolean, ids?: Set<string>): number[] {
  const per = group(sessions, botStyle(style), sessionFilter);
  const t = empty();
  for (const [id, c] of per) if (!ids || ids.has(id)) add(t, c);
  return VECTOR.map((m) => METRICS[m].f(t));
}
/** Standardise with fixed scales so before/after runs are comparable. */
export const SCALE: Record<string, number> = { vpip: 0.12, pfr: 0.08, threeBet: 0.05, agg: 0.8, foldToBet: 0.12, cbet: 0.15, wtsd: 0.1, bluffShare: 0.12, size: 0.25, limp: 0.05 };
const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + ((x - b[i]) / SCALE[VECTOR[i]]) ** 2, 0) / a.length);

export function distinctness(sessions: SessionResult[]): { matrix: number[][]; mean: number; min: number; nearest: Record<string, [string, number]>; within: number; ratio: number } {
  const ids = [...new Set(sessions.map((s) => s.config.id))].sort();
  const half = (k: number) => new Set(ids.filter((_, i) => i % 2 === k));
  const vecs = STYLES.map((s) => styleVector(sessions, s));
  const matrix = vecs.map((a) => vecs.map((b) => dist(a, b)));
  const pairs: number[] = [];
  const nearest: Record<string, [string, number]> = {};
  STYLES.forEach((s, i) => {
    let best: [string, number] = ['', Infinity];
    STYLES.forEach((t, j) => {
      if (i === j) return;
      if (j > i) pairs.push(matrix[i][j]);
      if (matrix[i][j] < best[1]) best = [t, matrix[i][j]];
    });
    nearest[s] = best;
  });
  // Noise floor: the same style measured on two disjoint halves of the sessions.
  const within = STYLES.map((s) => dist(styleVector(sessions, s, undefined, half(0)), styleVector(sessions, s, undefined, half(1)))).filter((x) => !Number.isNaN(x));
  const w = within.reduce((a, b) => a + b, 0) / Math.max(1, within.length);
  const mean = pairs.reduce((a, b) => a + b, 0) / pairs.length;
  return { matrix, mean, min: Math.min(...pairs), nearest, within: w, ratio: mean / w };
}

// ── Report sections ─────────────────────────────────────────────────────────
export function exposure(sessions: SessionResult[]): string {
  const names = new Map<string, { sessions: number; hands: number; decisions: number; style: string }>();
  for (const ses of sessions)
    for (const seat of ses.seats) {
      if (seat.kind === 'archetype') continue;
      const e = names.get(seat.name) ?? { sessions: 0, hands: 0, decisions: 0, style: seat.style };
      e.sessions++;
      e.hands += seat.c.hands;
      e.decisions += seat.c.decisions;
      names.set(seat.name, e);
    }
  const byStyle = new Map<string, { bots: number; hands: number; decisions: number }>();
  for (const [, e] of names) {
    const s = byStyle.get(e.style) ?? { bots: 0, hands: 0, decisions: 0 };
    s.bots++;
    s.hands += e.hands;
    s.decisions += e.decisions;
    byStyle.set(e.style, s);
  }
  const counts = [...names.values()].map((e) => e.hands);
  let out = `Bots that appeared: ${names.size} of 40. Seat-hands per bot: min ${Math.min(...counts)}, median ${counts.sort((a, b) => a - b)[Math.floor(counts.length / 2)]}, max ${Math.max(...counts)}.\n\n`;
  out += '| Style | Bots seen | Seat-hands | Bot decisions |\n|---|---|---|---|\n';
  for (const s of STYLES) {
    const e = byStyle.get(s);
    out += `| ${s} | ${e?.bots ?? 0}/4 | ${e?.hands ?? 0} | ${e?.decisions ?? 0} |\n`;
  }
  const arch = new Map<string, { sessions: number; hands: number }>();
  for (const ses of sessions)
    for (const seat of ses.seats) if (seat.kind === 'archetype') {
      const e = arch.get(seat.style) ?? { sessions: 0, hands: 0 };
      e.sessions++;
      e.hands += seat.c.hands;
      arch.set(seat.style, e);
    }
  out += '\n| Archetype | Sessions | Seat-hands |\n|---|---|---|\n';
  for (const a of ARCH) out += `| ${a} | ${arch.get(a)?.sessions ?? 0} | ${arch.get(a)?.hands ?? 0} |\n`;
  out += '\nPer bot name: ' + [...names.entries()].sort().map(([n, e]) => `${n} (${e.style}) ${e.hands}`).join(', ') + '\n';
  return out;
}

export function scenarioTable(sessions: SessionResult[]): string {
  const by = new Map<string, SessionResult[]>();
  for (const s of sessions) by.set(s.config.scenario, [...(by.get(s.config.scenario) ?? []), s]);
  let out = '| Scenario | Sessions | Hands | Seats | Stack (bb) | Flops | Showdowns | Raised pots, 3+ players | Limped flops | 3-bet pots | Checked all the way | Avg pot (bb) | All-in hands | Hands/s |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  for (const [id, list] of by) {
    const h = list.reduce((a, s) => a + s.handsPlayed, 0);
    const w = (k: keyof SessionResult['table']) => list.reduce((a, s) => a + s.table[k] * s.handsPlayed, 0) / h;
    const ms = list.reduce((a, s) => a + s.wallMs, 0);
    const p = (x: number) => `${(x * 100).toFixed(0)}%`;
    out += `| ${id} | ${list.length} | ${h} | ${list[0].config.seats.length} | ${list[0].config.stack / list[0].config.bigBlind} | ${p(w('flops'))} | ${p(w('showdowns'))} | ${p(w('raisedMultiway'))} | ${p(w('limpedFlops'))} | ${p(w('threeBetPots'))} | ${p(w('checkedDown'))} | ${w('avgPotBb').toFixed(0)} | ${p(w('allIns'))} | ${(h / (ms / 1000)).toFixed(0)} |\n`;
  }
  return out;
}

export function styleTable(sessions: SessionResult[], metrics: string[], filter?: (r: SessionResult) => boolean): string {
  let out = `| Style | Seat-hands | ${metrics.map((m) => METRICS[m].label).join(' | ')} |\n|---|---|${metrics.map(() => '---').join('|')}|\n`;
  for (const s of STYLES) {
    const per = group(sessions, botStyle(s), filter);
    out += `| ${s} | ${hands(per)} | ${metrics.map((m) => ci(m, boot(per, METRICS[m].f))).join(' | ')} |\n`;
  }
  return out;
}

export function archetypeTable(sessions: SessionResult[]): string {
  const metrics = ['bb100', 'vpip', 'pfr', 'agg', 'foldToBet', 'wtsd'];
  let out = `| Archetype | Seat-hands | ${metrics.map((m) => METRICS[m].label).join(' | ')} |\n|---|---|${metrics.map(() => '---').join('|')}|\n`;
  for (const a of ARCH) {
    const per = group(sessions, archetype(a));
    out += `| ${a} | ${hands(per)} | ${metrics.map((m) => ci(m, boot(per, METRICS[m].f))).join(' | ')} |\n`;
  }
  return out;
}

/** What the bots win (bb/100 per bot seat) heads-up against each archetype, by style. Sessions are tiny, so read rows, not cells. */
export function huMatrix(sessions: SessionResult[]): string {
  const hu = (r: SessionResult) => r.config.scenario === 'hu-archetype';
  let out = `| Bot style \\ opponent | ${ARCH.join(' | ')} | All 7 |\n|---|${ARCH.map(() => '---').join('|')}|---|\n`;
  for (const s of STYLES) {
    const cells = ARCH.map((a) => {
      const per = group(sessions, botStyle(s), (r) => hu(r) && r.seats.some((x) => x.kind === 'archetype' && x.style === a));
      return fmt('bb100', METRICS.bb100.f([...per.values()].reduce((t, c) => add(t, c), empty())));
    });
    const per = group(sessions, botStyle(s), hu);
    out += `| ${s} | ${cells.join(' | ')} | ${ci('bb100', boot(per, METRICS.bb100.f))} |\n`;
  }
  out += '\nBots as a field, heads-up against each archetype (bb/100 won by the bot; negative means the archetype is ahead):\n\n| Opponent | Sessions | Hands | Bot bb/100 | Bot folds to bet | Bot bluffs folded out | Value bets taken when checked to |\n|---|---|---|---|---|---|---|\n';
  for (const a of ARCH) {
    const per = group(sessions, (s) => s.kind === 'bot', (r) => hu(r) && r.seats.some((x) => x.kind === 'archetype' && x.style === a));
    const t = [...per.values()].reduce((x, c) => add(x, c), empty());
    const v = t.vs[a];
    out += `| ${a} | ${per.size} | ${t.hands} | ${ci('bb100', boot(per, METRICS.bb100.f))} | ${fmt('foldToBet', METRICS.foldToBet.f(t))} | ${v ? `${v.bluffFolded}/${v.bluffs} (${((v.bluffFolded / Math.max(1, v.bluffs)) * 100).toFixed(0)}%)` : '–'} | ${v ? `${v.valueBets}/${v.valueSpots} (${((v.valueBets / Math.max(1, v.valueSpots)) * 100).toFixed(0)}%)` : '–'} |\n`;
  }
  return out;
}

export function positionTable(sessions: SessionResult[]): string {
  let out = '| Style | Late (BTN, CO) | Middle | Early | Blinds | Late minus early |\n|---|---|---|---|---|---|\n';
  for (const s of STYLES) {
    const t = empty();
    for (const ses of sessions) for (const seat of ses.seats) if (botStyle(s)(seat)) add(t, seat.c);
    const bb = t.netByPos.map((n, i) => (t.handsByPos[i] ? (n / t.handsByPos[i]) * 100 : NaN));
    out += `| ${s} | ${bb.map((x) => x.toFixed(0)).join(' | ')} | ${(bb[0] - bb[2]).toFixed(0)} |\n`;
  }
  return out;
}

export function adaptationTable(sessions: SessionResult[]): string {
  // Bots' bb/100 in the first and second half of long tables against each archetype seat (one archetype among 8 bots).
  let out = '| Archetype at the table | Sessions | Archetype bb/100, 1st half | 2nd half | Change [95% CI] |\n|---|---|---|---|---|\n';
  for (const a of ARCH) {
    const sel = sessions.filter((s) => s.config.scenario === 'full9-one-archetype' && s.seats[0].style === a);
    const per: PerSession = new Map();
    for (const ses of sel) {
      const c = empty();
      add(c, ses.seats[0].c);
      per.set(ses.config.id, c);
    }
    const h1 = (c: Counters) => r(c.netH1, c.handsH1) * 100;
    const h2 = (c: Counters) => r(c.netH2, c.handsH2) * 100;
    const ch = (c: Counters) => h2(c) - h1(c);
    const t = [...per.values()].reduce((x, c) => add(x, c), empty());
    out += `| ${a} | ${per.size} | ${h1(t).toFixed(0)} | ${h2(t).toFixed(0)} | ${ci('bb100', boot(per, ch))} |\n`;
  }
  return out;
}

export function latencyTable(sessions: SessionResult[]): string {
  const t = empty();
  for (const ses of sessions) for (const seat of ses.seats) if (seat.kind !== 'archetype') add(t, seat.c);
  const labels = ['<1 ms', '1–2', '2–5', '5–10', '10–20', '20–50', '≥50'];
  const total = t.latBins.reduce((a, b) => a + b, 0);
  const wall = sessions.reduce((a, s) => a + s.wallMs, 0) / 1000;
  const h = sessions.reduce((a, s) => a + s.handsPlayed, 0);
  return `Bot/host decisions: ${total}. Mean ${(t.latSumMs / total).toFixed(2)} ms per step that produced an action (includes the engine's own bookkeeping); slowest ${t.latMaxMs.toFixed(0)} ms.\n\n| ${labels.join(' | ')} |\n|${labels.map(() => '---').join('|')}|\n| ${t.latBins.map((n) => `${((n / total) * 100).toFixed(1)}%`).join(' | ')} |\n\nSimulation throughput: ${h} hands in ${wall.toFixed(0)} CPU-seconds (${(h / wall).toFixed(1)} hands per CPU-second).\n`;
}

export function fidelityTable(sessions: SessionResult[]): string {
  let out = '| Style | Bot seat VPIP | Host-brain seat VPIP | Bot PFR | Host-brain PFR | Host-brain seat-hands |\n|---|---|---|---|---|---|\n';
  for (const s of STYLES) {
    const bot = group(sessions, botStyle(s));
    const brain = group(sessions, (x) => x.kind === 'brain' && x.style === s);
    const tb = [...bot.values()].reduce((a, c) => add(a, c), empty());
    const th = [...brain.values()].reduce((a, c) => add(a, c), empty());
    out += `| ${s} | ${fmt('vpip', METRICS.vpip.f(tb))} | ${fmt('vpip', METRICS.vpip.f(th))} | ${fmt('pfr', METRICS.pfr.f(tb))} | ${fmt('pfr', METRICS.pfr.f(th))} | ${th.hands} |\n`;
  }
  return out;
}

export function distinctnessTable(sessions: SessionResult[]): string {
  const d = distinctness(sessions);
  let out = `Behavioural distance between styles, using ${VECTOR.join(', ')} (each scaled by a fixed amount, so runs are comparable). Mean pairwise distance ${d.mean.toFixed(2)}, closest pair ${d.min.toFixed(2)}; the same style measured on two halves of the sessions differs by ${d.within.toFixed(2)} (noise floor). Separation ratio ${d.ratio.toFixed(1)}.\n\n`;
  out += `| | ${STYLES.join(' | ')} | Nearest |\n|---|${STYLES.map(() => '---').join('|')}|---|\n`;
  STYLES.forEach((s, i) => {
    out += `| ${s} | ${d.matrix[i].map((x, j) => (i === j ? '·' : x.toFixed(2))).join(' | ')} | ${d.nearest[s][0]} (${d.nearest[s][1].toFixed(2)}) |\n`;
  });
  return out;
}

const wilson = (k: number, n: number): string => {
  if (!n) return '–';
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return `${(p * 100).toFixed(0)}% [${(Math.max(0, c - h) * 100).toFixed(0)}, ${(Math.min(1, c + h) * 100).toFixed(0)}]`;
};

/** How bot seats answered raises and bets, by who made them. Wilson intervals treat spots as independent, so they are optimistic. */
export function responseTable(sessions: SessionResult[], prefix: string): string {
  const rows = new Map<string, number[]>();
  for (const ses of sessions)
    for (const seat of ses.seats)
      if (seat.kind === 'bot') for (const [k, v] of Object.entries(seat.c.resp ?? {})) if (k.startsWith(prefix)) {
        const t = rows.get(k) ?? [0, 0, 0, 0, 0, 0, 0, 0];
        v.forEach((x, i) => (t[i] += x));
        rows.set(k, t);
      }
  let out = '| Spot | Spots | Fold [95% CI] | Call | Raise | Fold, 1st half | Fold, 2nd half |\n|---|---|---|---|---|---|---|\n';
  for (const [k, v] of [...rows].sort()) {
    const n = v[0] + v[4];
    out += `| ${k} | ${n} | ${wilson(v[1] + v[5], n)} | ${wilson(v[2] + v[6], n)} | ${wilson(v[3] + v[7], n)} | ${wilson(v[1], v[0])} | ${wilson(v[5], v[4])} |\n`;
  }
  return out;
}

/** Probes that only exist in sessions run with the second set of counters. */
export function probeTable(sessions: SessionResult[]): string {
  let out = '| Style | Absurd folds (made hand, price 6-to-1 or better) | Monster folds to a bet | No-pair calls of big river bets |\n|---|---|---|---|\n';
  for (const st of STYLES) {
    const t = [...group(sessions, botStyle(st)).values()];
    const sum = (k: 'absurdFolds' | 'absurdSpots' | 'monsterFolds' | 'monsterFacing' | 'noPairBigCalls' | 'noPairBigFacing') => t.reduce((a, c) => a + (c[k] ?? 0), 0);
    out += `| ${st} | ${sum('absurdFolds')}/${sum('absurdSpots')} | ${sum('monsterFolds')}/${sum('monsterFacing')} | ${sum('noPairBigCalls')}/${sum('noPairBigFacing')} |\n`;
  }
  return out;
}

export function report(sessions: SessionResult[], title: string): string {
  const total = sessions.reduce((a, s) => a + s.handsPlayed, 0);
  const leaks = sessions.reduce((a, s) => a + s.chipLeaks, 0);
  const illegal = sessions.reduce((a, s) => a + s.illegal, 0);
  const stuck = sessions.filter((s) => s.stuck).length;
  let out = `# ${title}\n\n${sessions.length} sessions, ${total} hands. Chip leaks: ${leaks}. Illegal moves from scripts or host brain: ${illegal}. Stuck sessions: ${stuck}.\n\n`;
  out += `## Exposure\n\n${exposure(sessions)}\n## Tables\n\n${scenarioTable(sessions)}\n`;
  out += `## How each style played (bot seats only; 95% bootstrap over sessions)\n\n${styleTable(sessions, ['vpip', 'pfr', 'limp', 'threeBet', 'foldTo3', 'cbet', 'agg', 'foldToBet', 'wtsd', 'wsd', 'bluffShare', 'size'])}\n`;
  out += `## Results by style (bb/100, all scenarios, bot seats only)\n\n${styleTable(sessions, ['bb100'])}\n`;
  out += `## Scripted archetypes (all scenarios)\n\n${archetypeTable(sessions)}\n`;
  out += `## Heads-up against each archetype\n\n${huMatrix(sessions)}\n`;
  out += `## Decision-quality probes (bot seats; hidden cards used only for this analysis)\n\n${styleTable(sessions, ['overfold', 'heroCall', 'foldToBig', 'shortPush'])}\n`;
  if (sessions.some((x) => x.seats.some((y) => y.c.resp && Object.keys(y.c.resp).length))) {
    out += `## How bots answered raises and bets, by who made them (sessions with the second counter set)\n\n${responseTable(sessions, 'pre|')}\n${responseTable(sessions, 'post|')}\n## Probes\n\n${probeTable(sessions)}\n`;
  }
  out += `## Position\n\nbb/100 by seat relative to the button, pooled over scenarios.\n\n${positionTable(sessions)}\n`;
  out += `## Adaptation over a session\n\n${adaptationTable(sessions)}\n`;
  out += `## Do personalities stay distinct?\n\n${distinctnessTable(sessions)}\n`;
  out += `## Does the host-brain seat match a real bot seat?\n\n${fidelityTable(sessions)}\n`;
  out += `## Speed\n\n${latencyTable(sessions)}\n`;
  return out;
}

// ── Compare ─────────────────────────────────────────────────────────────────
export function compare(baseline: SessionResult[], cand: SessionResult[], title: string): string {
  const ids = new Set(baseline.map((s) => s.config.id));
  const paired = cand.filter((s) => ids.has(s.config.id));
  const base = baseline.filter((s) => paired.some((p) => p.config.id === s.config.id));
  const hs = paired.reduce((a, s) => a + s.handsPlayed, 0);
  let out = `# ${title}\n\n${paired.length} matched sessions, ${hs} hands per arm. Differences are candidate minus baseline, paired by session (same cards, same seats, same bot names), 95% bootstrap over sessions.\n\n`;
  const row = (label: string, a: PerSession, b: PerSession, m: string) => {
    const o = bootDiff(a, b, METRICS[m].f);
    const pct = METRICS[m].pct;
    const dd = (x: number) => (Number.isNaN(x) ? '–' : pct ? `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)} pts` : `${x >= 0 ? '+' : ''}${x.toFixed(Math.abs(x) >= 10 ? 0 : 2)}`);
    const sig = !Number.isNaN(o.lo) && (o.lo > 0 || o.hi < 0) ? ' *' : '';
    return `| ${label} | ${fmt(m, o.va)} | ${fmt(m, o.vb)} | ${dd(o.d)} [${dd(o.lo)}, ${dd(o.hi)}]${sig} |`;
  };
  const metrics = ['bb100', 'vpip', 'pfr', 'threeBet', 'foldTo3', 'agg', 'foldToBet', 'wtsd', 'bluffShare', 'overfold', 'heroCall', 'shortPush'];
  for (const m of metrics) {
    out += `## ${METRICS[m].label}, by style\n\n| Style | Baseline | Candidate | Difference |\n|---|---|---|---|\n`;
    for (const s of STYLES) out += row(s, group(base, botStyle(s)), group(paired, botStyle(s)), m) + '\n';
    out += '\n';
  }
  out += '## Archetypes: their bb/100 (negative means the bots beat them)\n\n| Archetype | Baseline | Candidate | Difference |\n|---|---|---|---|\n';
  for (const a of ARCH) out += row(a, group(base, archetype(a)), group(paired, archetype(a)), 'bb100') + '\n';
  out += '\n## Tables\n\n| Scenario | Flops base → cand | Showdowns | Raised pots, 3+ players | Avg pot (bb) |\n|---|---|---|---|---|\n';
  const scen = [...new Set(paired.map((s) => s.config.scenario))];
  for (const sc of scen) {
    const pick = (list: SessionResult[], k: keyof SessionResult['table']) => {
      const l = list.filter((s) => s.config.scenario === sc);
      const h = l.reduce((a, s) => a + s.handsPlayed, 0);
      return l.reduce((a, s) => a + s.table[k] * s.handsPlayed, 0) / h;
    };
    const f = (k: keyof SessionResult['table'], pct = true) => `${pct ? (pick(base, k) * 100).toFixed(0) + '%' : pick(base, k).toFixed(0)} → ${pct ? (pick(paired, k) * 100).toFixed(0) + '%' : pick(paired, k).toFixed(0)}`;
    out += `| ${sc} | ${f('flops')} | ${f('showdowns')} | ${f('raisedMultiway')} | ${f('avgPotBb', false)} |\n`;
  }
  const db = distinctness(base);
  const dc = distinctness(paired);
  out += `\n## Distinct personalities\n\nMean pairwise distance ${db.mean.toFixed(2)} → ${dc.mean.toFixed(2)}; closest pair ${db.min.toFixed(2)} → ${dc.min.toFixed(2)}; separation ratio ${db.ratio.toFixed(1)} → ${dc.ratio.toFixed(1)}.\n\nNearest style: ${STYLES.map((s) => `${s}: ${db.nearest[s][0]} ${db.nearest[s][1].toFixed(2)} → ${dc.nearest[s][0]} ${dc.nearest[s][1].toFixed(2)}`).join('; ')}.\n`;
  out += `\n## Speed\n\nBaseline: ${latencyTable(base).split('\n')[0]}\n\nCandidate: ${latencyTable(paired).split('\n')[0]}\n`;
  return out;
}

export function csv(sessions: SessionResult[]): string {
  const cols = ['hands', 'net', 'vpip', 'pfr', 'limp', 'rfiOpp', 'rfi', 'threeBetOpp', 'threeBet', 'faced3', 'foldTo3', 'sawFlop', 'wtsd', 'wsd', 'cbetOpp', 'cbet', 'bets', 'raises', 'calls', 'checks', 'folds', 'facedBet', 'foldedToBet', 'facedBig', 'foldedToBig', 'bluffBets', 'valueBets', 'strongFacingBet', 'strongFoldedSmall', 'weakCallsBig', 'weakFacingBig', 'shortSpots', 'shortPush', 'decisions', 'latSumMs'] as const;
  const rows = ['engine,session,scenario,chance_seed,decision_seed,stack_bb,seat,agent,kind,style,' + cols.join(',')];
  for (const ses of sessions)
    for (const seat of ses.seats)
      rows.push([ses.engine, ses.config.id, ses.config.scenario, ses.config.seed, ses.config.decisionSeed, ses.config.stack / ses.config.bigBlind, seat.seatIndex, seat.label, seat.kind, seat.style, ...cols.map((c) => (seat.c[c] as number).toFixed(c === 'net' || c === 'latSumMs' ? 2 : 0))].join(','));
  return rows.join('\n') + '\n';
}

// ── CLI ─────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith('analyze.ts')) {
  const [cmd, a, b] = process.argv.slice(2);
  const t = process.argv.indexOf('--title');
  const title = t >= 0 ? process.argv[t + 1] : 'Bot lab';
  if (cmd === 'report') console.log(report(load(a), title));
  else if (cmd === 'compare') console.log(compare(load(a), load(b), title));
  else if (cmd === 'csv') writeFileSync(b, csv(load(a)));
  else console.error('usage: analyze.ts report|compare|csv ...');
}
