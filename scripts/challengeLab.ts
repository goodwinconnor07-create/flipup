// The challenge lab: plays real challenge tables (the engine, the bots, the same between-hands rules as the phone)
// with a scripted player in your seat. Nothing here ships in the app; it's how the challenges were tuned (see
// docs/CHALLENGES.md).
//
//   npx tsx scripts/challengeLab.ts short [runs]     Short Stack: hands survived by each scripted player
//   npx tsx scripts/challengeLab.ts detective [runs] Style Detective: how far public stats alone get you
//   npx tsx scripts/challengeLab.ts rewind [spots]   Rewind: how long "how it usually goes" takes per run
//
// Short Stack players: fold (always folds, checks when it's free), shove (all in every hand), chart (a simple
// push/fold chart by stack and position), strong (the bots' own brain playing a shark).

import {
  applyAction,
  beforeDeal,
  challengeRng,
  dealDue,
  DETECTIVE,
  heroOf,
  LABELS,
  openChallenge,
  options,
  publicStats,
  runOver,
  seededRng,
  shortStackStats,
  STYLE_LABEL,
  strengthVsRandom,
  truthOf,
  usuallyGoes,
  rewindChoices,
  decisionPoint,
  detectiveScore,
  type ChallengeId,
  type ChallengeRun,
  type DecisionPoint,
  type Game,
  type Hand,
  type HandRecord,
  type Label,
  type Move,
  type Seat,
  type StyleId,
} from '../src/game';
import { decide } from '../src/game/botPlay';

type Agent = 'fold' | 'shove' | 'chart' | 'strong';
const AGENTS: Agent[] = ['fold', 'shove', 'chart', 'strong'];
const ME = 'me';

/** Equity against one random hand, which is close enough to rank starting hands for a chart. */
function evr(cards: string[], board: string[], rng: () => number): number {
  return strengthVsRandom(cards, board, 1, rng, 300);
}

/** A simple push/fold chart: shove first in with a range that widens as the stack shrinks and fewer players are behind; call a shove with a tighter one. */
function chartMove(game: Game, hand: Hand, seat: Seat, rng: () => number): { move: Move; to?: number } {
  const o = options(game, hand, seat);
  const me = game.players.find((p) => p.id === seat.playerId)!;
  const bb = game.settings.bigBlind;
  const stackBb = (me.stack + seat.bet) / bb;
  const e = evr(seat.cards, hand.board, rng);
  if (hand.street !== 'preflop') {
    if (e > 0.7) return o.canRaise ? { move: 'allin' } : o.canCheck ? { move: 'check' } : { move: 'call' };
    return o.canCheck ? { move: 'check' } : { move: 'fold' };
  }
  const i = hand.seats.findIndex((s) => s.playerId === seat.playerId);
  const bbIdx = hand.seats.findIndex((s) => s.playerId === hand.bbId);
  const behind = (bbIdx - i + hand.seats.length) % hand.seats.length;
  const raised = hand.currentBet > bb;
  if (!raised) {
    const cut = (stackBb <= 4 ? 0.46 : stackBb <= 7 ? 0.51 : stackBb <= 10 ? 0.55 : 0.58) + Math.max(0, behind - 2) * 0.012;
    if (e >= cut && o.canRaise) return { move: 'allin' };
    return o.canCheck ? { move: 'check' } : { move: 'fold' };
  }
  // Calling an all-in needs a hand well ahead of a shoving range, more so the more of your stack it costs.
  const cost = o.toCall / Math.max(1, me.stack);
  const need = Number(process.env.CALL ?? 0.6) + 0.04 * Math.min(1, cost);
  if (e >= need) return o.callIsAllIn || !o.canRaise ? { move: 'call' } : { move: 'allin' };
  return o.canCheck ? { move: 'check' } : { move: 'fold' };
}


function agentMove(agent: Agent, game: Game, hand: Hand, seat: Seat, rng: () => number): { move: Move; to?: number } {
  const o = options(game, hand, seat);
  if (agent === 'fold') return o.canCheck ? { move: 'check' } : { move: 'fold' };
  if (agent === 'shove') return o.canRaise ? { move: 'allin' } : o.canCheck ? { move: 'check' } : { move: 'call' };
  if (agent === 'chart') return chartMove(game, hand, seat, rng);
  return decide(game, hand, seat, rng).move;
}

/** Plays one challenge table to its end with `agent` in your seat. Returns the table and the run. */
export function playRun(id: ChallengeId, agent: Agent, seed: number, onDecision?: (game: Game) => void): { game: Game; run: ChallengeRun } {
  let clock = 1_000_000;
  const opened = openChallenge(id, { deviceId: ME, name: 'Me', emoji: '🙂', now: clock, seed });
  let game = opened.game;
  const run = opened.run;
  if (agent === 'strong') heroOf(game)!.style = 'shark';
  const agentRng = seededRng(seed * 7 + 1);
  const step = (deviceId: string, action: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(game, action, { deviceId, now: clock, rng: challengeRng(game, run.seed) });
    if (r.ok) game = r.game;
    return r.ok;
  };
  step(ME, { type: 'start' });
  for (let guard = 0; guard < 400_000 && game.status === 'playing'; guard++) {
    const hand = game.hand;
    const me = heroOf(game)!;
    if (hand && !hand.result && !hand.runout && hand.toAct === me.id) {
      onDecision?.(game);
      const seat = hand.seats.find((s) => s.playerId === me.id)!;
      const m = agentMove(agent, game, hand, seat, agentRng);
      if (!step(ME, { type: 'act', hand: hand.number, seq: hand.seq, move: m.move, to: m.to })) step(ME, { type: 'act', hand: hand.number, seq: hand.seq, move: options(game, hand, seat).canCheck ? 'check' : 'fold' });
      continue;
    }
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    if (dealDue(game, clock)) {
      if (id === 'detective' && run.checks && hand?.result && DETECTIVE.checks.includes(hand.number)) run.checks.push(guessLabels(game));
      if (runOver(game, run)) {
        step(ME, { type: 'end' });
        break;
      }
      game = beforeDeal(game, run, challengeRng(game, run.seed));
    }
    step('clock', { type: 'tick' });
  }
  return { game, run };
}

const records = (game: Game): HandRecord[] => game.logs.flatMap((l) => (l.record ? [l.record] : []));

function pct(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

function shortLab(runs: number): void {
  console.log(`Short Stack, ${runs} runs each`);
  console.log('agent   mean  p10  median  p90  at cap  shoves  won  folded-to  peak bb');
  for (const agent of AGENTS) {
    const survived: number[] = [];
    let shoves = 0;
    let won = 0;
    let folded = 0;
    let peak = 0;
    let cap = 0;
    for (let i = 0; i < runs; i++) {
      const { game } = playRun('shortStack', agent, 1000 + i);
      const s = shortStackStats(records(game), heroOf(game)!.id);
      survived.push(s.survived);
      shoves += s.shoves;
      won += s.shovesWon;
      folded += s.foldedTo;
      peak += s.peakBb;
      if (s.survived >= 100) cap++;
    }
    const mean = survived.reduce((a, b) => a + b, 0) / runs;
    console.log(
      `${agent.padEnd(7)} ${mean.toFixed(1).padStart(5)} ${String(pct(survived, 0.1)).padStart(4)} ${String(pct(survived, 0.5)).padStart(7)} ${String(pct(survived, 0.9)).padStart(4)} ${`${Math.round((cap / runs) * 100)}%`.padStart(7)} ${(shoves / runs).toFixed(1).padStart(7)} ${(won / runs).toFixed(1).padStart(4)} ${(folded / runs).toFixed(1).padStart(10)} ${(peak / runs).toFixed(1).padStart(8)}`,
    );
  }
}

/**
 * A reader that only looks at the public numbers: plays a lot of hands and raises a lot is a Maniac, plays a lot and
 * rarely raises a Calling Station, plays few a Rock, and so on. How far that gets is how hard the challenge is.
 */
function guessLabels(game: Game): Record<string, Label> {
  const out: Record<string, Label> = {};
  const recs = records(game);
  for (const p of game.players) {
    if (!p.bot) continue;
    const s = publicStats(recs, p.id);
    out[p.id] = s.played > 0.42 ? (s.raised > 0.2 ? 'maniac' : 'station') : s.played < 0.17 ? 'rock' : s.raised / Math.max(s.played, 0.01) < 0.55 ? 'trapper' : 'shark';
  }
  return out;
}

function detectiveLab(runs: number): void {
  const byStyle = new Map<StyleId, { n: number; played: number; raised: number; right: number }>();
  let total = 0;
  for (let i = 0; i < runs; i++) {
    const { game, run } = playRun('detective', 'chart', 2000 + i);
    const truth = truthOf(game);
    const last = run.checks?.at(-1) ?? {};
    const recs = records(game);
    for (const p of game.players) {
      if (!p.bot || !p.style) continue;
      const s = publicStats(recs, p.id);
      const row = byStyle.get(p.style as StyleId) ?? { n: 0, played: 0, raised: 0, right: 0 };
      row.n++;
      row.played += s.played;
      row.raised += s.raised;
      if (last[p.id] === truth[p.id]) row.right++;
      byStyle.set(p.style as StyleId, row);
    }
    total += detectiveScore(run.checks ?? [], truth);
  }
  console.log(`Style Detective, ${runs} runs: a stats-only reader averages ${(total / runs).toFixed(0)} of 150`);
  console.log('style     label            n   played  raised  read right');
  for (const [style, r] of [...byStyle].sort()) console.log(`${style.padEnd(9)} ${LABELS.find((l) => l.id === STYLE_LABEL[style])!.name.padEnd(16)} ${String(r.n).padStart(3)} ${`${Math.round((r.played / r.n) * 100)}%`.padStart(8)} ${`${Math.round((r.raised / r.n) * 100)}%`.padStart(7)} ${`${Math.round((r.right / r.n) * 100)}%`.padStart(11)}`);
}

function rewindLab(spots: number, runs: number): void {
  const points: DecisionPoint[] = [];
  playRun('rewind', 'strong', 3000, (game) => {
    if (points.length >= spots) return;
    const me = heroOf(game)!;
    const p = decisionPoint(game, me.id, { move: 'call' });
    if (p) points.push(p);
  });
  console.log(`Rewind: "how it usually goes", ${runs} runs a line, two lines, ${points.length} spots`);
  const times: number[] = [];
  for (const p of points) {
    const me = p.snapshot.players.find((x) => !x.bot)!;
    const choices = rewindChoices(p, me.id);
    const lines = [p.did, ...(choices[0] ? [{ move: choices[0].move, to: choices[0].to }] : [])];
    const t0 = performance.now();
    const sim = usuallyGoes(p, me.id, ME, lines, runs, 9);
    const r = sim.step(runs);
    const ms = performance.now() - t0;
    times.push(ms);
    console.log(`  hand ${p.hand} ${p.street.padEnd(7)} ${ms.toFixed(0).padStart(6)} ms  ${r.avg.map((a) => a.toFixed(1)).join(' vs ')} bb`);
  }
  console.log(`  median ${pct(times, 0.5).toFixed(0)} ms, slowest ${Math.max(...times).toFixed(0)} ms`);
}

// Overrides for tuning, from the environment: GROWTH=2 EVERY=5 STYLES=rock,tag REFILL=10 START=10
import { SHORT_STACK } from '../src/game/challenges';
if (process.env.GROWTH) SHORT_STACK.growth = Number(process.env.GROWTH);
if (process.env.EVERY) SHORT_STACK.every = Number(process.env.EVERY);
if (process.env.REFILL) SHORT_STACK.refillBb = Number(process.env.REFILL);
if (process.env.DULL) SHORT_STACK.dull = Number(process.env.DULL);
if (process.env.STYLES) SHORT_STACK.styles = process.env.STYLES.split(',') as StyleId[];

const [mode = 'short', n] = process.argv.slice(2);
if (mode === 'short') shortLab(Number(n ?? 200));
else if (mode === 'detective') detectiveLab(Number(n ?? 100));
else if (mode === 'rewind') rewindLab(Number(n ?? 12), Number(process.argv[4] ?? 100));
else console.log('Modes: short, detective, rewind');
