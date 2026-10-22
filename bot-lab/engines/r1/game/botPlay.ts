// How the bots decide. Each one thinks like a person at a real table, with a style that bends it:
//
// - Before the flop: GTO charts solved with the coach's engine (botCharts.json) as the backbone,
//   bent by style (tight, loose, limpy, raisey), sized like that kind of player sizes, and
//   adjusted to whoever raised. Short-stacked it moves all in or folds, and when someone moves in
//   or makes a big raise it works out its chances against what they'd do that with.
// - After the flop: it pictures what each opponent could hold given everything they've done
//   (botRange.ts), counts how often it wins, how often a bet would make them fold and what it wins
//   when they call, and weighs checking, each bet size it likes, calling, raising and folding.
//   Its style decides how much it reads the others (a calling station only looks at its own cards),
//   what it over- or underrates, and how much its choices wobble. A slice of GTO's own mix
//   (botPostflop.json) keeps the better players balanced.
// - Its mood (botMind.ts) and grudges shift all of that, and how long it takes depends on how hard
//   the decision is and on its tempo.
//
// Everything here is public information plus the bot's own two cards, and it never calls a server.

import { rankOf, suitOf, type Card } from './cards';
import { drawLevelWith, boardInfo, tierWith, toInt } from './botEval';
import { inTheMoment, mindOf } from './botMind';
import { betOutcome, boardCards, CHARTS, CLASS_INDEX, DIGITS, equityOf, imagine, jamOutcome, opponentsOf, PRIOR, preflopOrder, preflopRange, readOf, shoveWidth, STRENGTH, TOP, type Card2, type Opponent, type Read } from './botRange';
import trained from './botPostflop.json';
import { styleOf, type Style } from './botStyles';
import { potTotal } from './holdem';
import { options } from './selectors';
import type { Game, Hand, Move, PlayerRead, Seat } from './types';

export interface BotMove {
  move: Move;
  to?: number;
}

type Rng = () => number;

// ── Hand and board features (keep in step with gto/scripts/train_bots.py) ───

/** 0 high card, 1 pair, 2 two pair, 3 trips, 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush. */
export function category(cards: Card[]): number {
  const ranks = cards.map(rankOf);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const suits = new Map<string, number[]>();
  for (const c of cards) suits.set(suitOf(c), [...(suits.get(suitOf(c)) ?? []), rankOf(c)]);
  const flushRanks = [...suits.values()].find((rs) => rs.length >= 5);
  const hasStraight = (rs: number[]) => {
    const u = new Set(rs);
    if (u.has(14)) u.add(1);
    for (let lo = 1; lo <= 10; lo++) {
      let ok = true;
      for (let r = lo; r < lo + 5; r++) if (!u.has(r)) ok = false;
      if (ok) return true;
    }
    return false;
  };
  if (flushRanks && hasStraight(flushRanks)) return 8;
  const c = [...counts.values()].sort((a, b) => b - a);
  if (c[0] >= 4) return 7;
  if (c[0] === 3 && c.length > 1 && c[1] >= 2) return 6;
  if (flushRanks) return 5;
  if (hasStraight(ranks)) return 4;
  if (c[0] === 3) return 3;
  if (c[0] === 2 && c.length > 1 && c[1] === 2) return 2;
  if (c[0] === 2) return 1;
  return 0;
}

function boardOnly(board: Card[]): number {
  const counts = new Map<number, number>();
  for (const c of board) counts.set(rankOf(c), (counts.get(rankOf(c)) ?? 0) + 1);
  const c = [...counts.values()].sort((a, b) => b - a);
  if (c[0] >= 3) return 3;
  if (c[0] === 2 && c.length > 1 && c[1] === 2) return 2;
  return c[0] === 2 ? 1 : 0;
}

/** How many ranks would make a straight that uses a hole card (2 or more: open-ended or double gutter). */
export function straightOuts(hole: Card[], board: Card[]): number {
  if (category([...hole, ...board]) >= 4) return 0;
  const have = new Set([...hole, ...board].map(rankOf));
  const boardRanks = board.map(rankOf);
  let outs = 0;
  for (let r = 2; r <= 14; r++) {
    if (have.has(r)) continue;
    const u = new Set([...have, r]);
    if (u.has(14)) u.add(1);
    const bu = new Set([...boardRanks, r]);
    if (bu.has(14)) bu.add(1);
    for (let lo = 1; lo <= 10; lo++) {
      let inU = true;
      let inB = true;
      for (let x = lo; x < lo + 5; x++) {
        if (!u.has(x)) inU = false;
        if (!bu.has(x)) inB = false;
      }
      if (inU && !inB) {
        outs++;
        break;
      }
    }
  }
  return outs;
}

export function flushDraw(hole: Card[], board: Card[]): boolean {
  if (board.length >= 5) return false;
  for (const s of ['s', 'h', 'd', 'c']) {
    const n = [...hole, ...board].filter((c) => suitOf(c) === s).length;
    if (n === 4 && hole.some((c) => suitOf(c) === s)) return true;
  }
  return false;
}

export type Bucket = 'monster' | 'strong' | 'top' | 'mid' | 'draw' | 'weak' | 'air';

export function handBucket(hole: Card[], board: Card[]): Bucket {
  const cat = category([...hole, ...board]);
  const boardCat = board.length >= 5 ? category(board) : boardOnly(board);
  const top = Math.max(...board.map(rankOf));
  if (cat >= 3 && cat > boardCat) return 'monster';
  if (cat === 2 && boardCat === 0) return 'strong';
  if ((cat >= 1 && cat > boardCat) || (cat === 2 && boardCat === 1)) {
    const h = hole.map(rankOf).sort((a, b) => b - a);
    const boardRanks = new Set(board.map(rankOf));
    if (h[0] === h[1] && !boardRanks.has(h[0])) return h[0] > top ? 'top' : 'mid';
    const mine = h.filter((r) => boardRanks.has(r));
    if (mine.length) return Math.max(...mine) === top ? 'top' : 'mid';
  }
  const overcards = hole.every((c) => rankOf(c) > top);
  if (board.length < 5) {
    if (flushDraw(hole, board) || straightOuts(hole, board) >= 2) return 'draw';
    if (straightOuts(hole, board) === 1 || overcards) return 'weak';
  } else if (overcards) return 'weak';
  return 'air';
}

export type Texture = 'dry' | 'wet' | 'paired' | 'mono';

export function boardTexture(board: Card[]): Texture {
  const ranks = [...new Set(board.map(rankOf))].sort((a, b) => a - b);
  if (ranks.length < board.length) return 'paired';
  const suitMax = Math.max(...['s', 'h', 'd', 'c'].map((s) => board.filter((c) => suitOf(c) === s).length));
  if (suitMax >= 3) return 'mono';
  const u = [...new Set(ranks.includes(14) ? [1, ...ranks] : ranks)].sort((a, b) => a - b);
  let connected = false;
  for (let lo = 1; lo <= 10; lo++) if (u.filter((r) => r >= lo && r < lo + 5).length >= 3) connected = true;
  let close = false;
  for (let i = 1; i < u.length; i++) if (u[i] - u[i - 1] <= 2) close = true;
  return connected || (suitMax === 2 && close) ? 'wet' : 'dry';
}

/** "AKs", "T9o", "77": the hand class the charts are indexed by. */
export function handClass(hole: Card[]): string {
  const RANKS = '23456789TJQKA';
  const [a, b] = [...hole].sort((x, y) => rankOf(y) - rankOf(x));
  const ra = RANKS[rankOf(a) - 2];
  const rb = RANKS[rankOf(b) - 2];
  if (ra === rb) return ra + rb;
  return ra + rb + (suitOf(a) === suitOf(b) ? 's' : 'o');
}

// ── Reading the table ───────────────────────────────────────────────────────

const AGGRESSIVE: Move[] = ['bet', 'raise', 'allin'];

/** Last to act after the flop among the players still in. */
export function inPosition(hand: Hand, playerId: string): boolean {
  const n = hand.seats.length;
  const button = hand.seats.findIndex((s) => s.playerId === hand.buttonId);
  let last: string | null = null;
  for (let i = 1; i <= n; i++) {
    const s = hand.seats[(button + i) % n];
    if (!s.folded) last = s.playerId;
  }
  return last === playerId;
}

const chipsOf = (game: Game, id: string) => game.players.find((p) => p.id === id)?.stack ?? 0;

/** Effective stack in big blinds: the bot's chips against the biggest opponent still in. */
export function effectiveBb(game: Game, hand: Hand, seat: Seat): number {
  const bb = game.settings.bigBlind;
  const mine = chipsOf(game, seat.playerId) + seat.total;
  const theirs = Math.max(0, ...hand.seats.filter((s) => s !== seat && !s.folded).map((s) => chipsOf(game, s.playerId) + s.total));
  return Math.min(mine, theirs) / bb;
}

/** The average of the reads on everyone still in. */
function averageRead(opps: Opponent[]): Read {
  if (!opps.length) return readOf(undefined);
  const avg = (k: keyof Read) => opps.reduce((a, o) => a + o.read[k], 0) / opps.length;
  return { vpip: avg('vpip'), pfr: avg('pfr'), foldToBet: avg('foldToBet'), aggression: avg('aggression'), shove: avg('shove'), bluffy: avg('bluffy'), betFreq: avg('betFreq'), known: avg('known') };
}

/** Bet sizes people actually say: 85, 120, 250, 1,250 (not 83 or 1,237). */
function niceAmount(x: number, bb: number): number {
  if (x <= bb * 2) return Math.max(1, Math.round(x / Math.max(1, bb / 2)) * Math.max(1, bb / 2));
  const unit = Math.max(1, 10 ** Math.floor(Math.log10(x)) / 4, bb / 2);
  return Math.round(x / unit) * unit;
}

// ── Before the flop ─────────────────────────────────────────────────────────

function chartFor(players: number, stackBb: number) {
  const n = Math.max(2, Math.min(6, players));
  const depths = [100, 40, 20];
  const s = Math.log(Math.max(stackBb, 5));
  const depth = depths.reduce((best, d) => (Math.abs(Math.log(d) - s) < Math.abs(Math.log(best) - s) ? d : best));
  return CHARTS.charts[`${n}p${depth}`] ?? CHARTS.charts['6p100'];
}

/** A seat in an n-handed game, as the matching seat of the chart (7 to 9 handed fold into the 6-handed chart). */
function chartSeat(index: number, players: number): number {
  if (players <= 6) return index;
  const early = players - 3;
  if (index >= early) return index - (players - 6);
  return Math.min(2, Math.floor((index * 3) / early));
}

function spotFreq(chart: { spots: Record<string, string> }, key: string, cls: string): { call: number; raise: number } | null {
  const s = chart.spots[key];
  const i = CLASS_INDEX.get(cls);
  if (!s || i === undefined) return null;
  return { call: DIGITS.indexOf(s[i * 2]) / 35, raise: DIGITS.indexOf(s[i * 2 + 1]) / 35 };
}

export interface PreSpot {
  call: number;
  raise: number;
  spot: 'rfi' | 'limp' | 'open' | '3bet' | '4bet' | '5bet';
  /** Who made the last raise, if anyone. */
  raiser: string | null;
  limpers: number;
  /** The last raise in big blinds. */
  raiseBb: number;
}

/** Call and raise chances for the bot's hand before the flop, straight from GTO. */
export function preflopGto(game: Game, hand: Hand, seat: Seat, cls: string = handClass(seat.cards)): PreSpot {
  const bb = game.settings.bigBlind;
  const order = preflopOrder(hand);
  const n = order.length;
  const me = order.indexOf(seat.playerId);
  const chart = chartFor(n, effectiveBb(game, hand, seat));
  const at = (id: string) => chartSeat(order.indexOf(id), n);
  const pre = (hand.actions ?? []).filter((a) => a.street === 'preflop');
  const raisers = pre.filter((a) => a.move === 'raise' || a.move === 'bet' || (a.move === 'allin' && a.to > bb));
  const limpers = pre.filter((a) => a.move === 'call' && raisers.length === 0).length;
  const mySeat = chartSeat(me, n);
  const get = (key: string) => spotFreq(chart, key, cls);
  let f: { call: number; raise: number } | null = null;
  let spot: PreSpot['spot'] = 'rfi';
  if (raisers.length === 0) {
    if (limpers > 0 && me === n - 1) {
      f = get('limp');
      spot = 'limp';
    }
    f ??= get(`rfi.${mySeat}`);
    if (limpers > 0 && f) f = { call: Math.max(f.call, f.raise * 0.5), raise: f.raise * 0.75 };
  } else if (raisers.length === 1) {
    spot = 'open';
    f = get(`open.${at(raisers[0].playerId)}.${mySeat}`);
    // Callers in between: call a little more, 3-bet a little less.
    const callers = pre.filter((a) => a.move === 'call' && pre.indexOf(a) > pre.indexOf(raisers[0])).length;
    if (f && callers) f = { call: Math.min(1, f.call * 1.1), raise: f.raise * 0.75 };
  } else if (raisers.length === 2) {
    spot = '3bet';
    if (raisers[0].playerId === seat.playerId) f = get(`3bet.${mySeat}.${at(raisers[1].playerId)}`);
  } else if (raisers.length === 3) {
    spot = '4bet';
    if (raisers[1].playerId === seat.playerId) f = get(`4bet.${mySeat}.${at(raisers[0].playerId)}`);
  } else spot = '5bet';
  if (!f) {
    // Cold facing a 3-bet or more, or a line the chart doesn't have: only strong hands go on.
    const st = STRENGTH.get(cls) ?? 0;
    const need = spot === '3bet' ? 0.9 : spot === '4bet' ? 0.95 : 0.97;
    f = st >= need ? { call: 0.35, raise: 0.65 } : st >= need - 0.04 ? { call: 0.7, raise: 0.05 } : { call: 0, raise: 0 };
    if (raisers.length === 0) f = { call: 0, raise: st > 0.6 ? 0.8 : 0 };
  }
  const last = raisers[raisers.length - 1];
  return { ...f, spot, raiser: last?.playerId ?? null, limpers, raiseBb: last ? last.to / bb : 1 };
}

/** Bends the GTO chart by the bot's style and what it has seen of the raiser (or the table). */
function styledPreflop(style: Style, cls: string, g: PreSpot, read: Read, canLimp: boolean) {
  const st = STRENGTH.get(cls) ?? 0;
  let call = g.call;
  let raise = g.raise;
  const p = style.pre;
  // Tight: drop the weaker part of the range.
  if (p.tight > 0 && st < p.tight) {
    // A soft edge, so hands just under the line still get played now and then.
    const k = Math.max(0, 1 - (p.tight - st) / 0.08);
    call *= k;
    raise *= k;
  }
  // Loose: play some hands GTO folds (the better of them first).
  const fold = Math.max(0, 1 - call - raise);
  if (p.loose > 0 && fold > 0) {
    const reach = Math.min(1, Math.max(0, (st - (0.55 - p.loose * 0.5)) / 0.25));
    const add = fold * p.loose * reach;
    const toRaise = Math.max(0, p.aggro) * 0.5;
    raise += add * toRaise;
    call += add * (1 - toRaise);
  }
  // Aggression moves calls into raises (or the other way for passive styles).
  if (p.aggro > 0) {
    const move = call * p.aggro * 0.6;
    call -= move;
    raise += move;
  } else if (p.aggro < 0) {
    const move = raise * -p.aggro * (st > 0.93 ? 0.3 : 0.8);
    raise -= move;
    call += move;
  }
  // Limpers limp the hands they'd otherwise open or fold.
  if (canLimp && p.limp > 0 && g.spot === 'rfi') {
    const move = raise * p.limp * (st > 0.9 ? 0.2 : 0.7);
    raise -= move;
    call += move + Math.max(0, 1 - call - raise) * p.limp * (st > 0.35 ? 0.5 : 0);
  }
  // Someone limped: punish it with a raise, more so the looser the limpers are.
  if (g.limpers > 0 && g.spot === 'rfi' && p.iso > 0 && st > 0.55) {
    const move = Math.min(call, call * p.iso * (0.4 + Math.max(0, read.vpip - PRIOR.vpip) * 2));
    call -= move;
    raise += move;
  }
  // A big open (5bb and up from most people) means a big hand: give it more respect.
  if (g.spot === 'open' && g.raiseBb > 3.5 && read.aggression < 2.5) {
    call *= Math.min(1, (3.5 / g.raiseBb) ** 1.2);
    raise *= Math.min(1, (3.5 / g.raiseBb) ** 0.8);
  }
  // Adapting: against loose raisers defend and 3-bet a bit wider; against tight ones, give them more credit.
  const w = 0.3 + style.adapt;
  if (g.spot === 'open' || g.spot === '3bet') {
    const loose = read.pfr - PRIOR.pfr;
    const extra = Math.max(-0.6, Math.min(0.6, loose * (loose < 0 ? 5 : 2.5) * w));
    const f0 = Math.max(0, 1 - call - raise);
    if (extra > 0) {
      call += f0 * extra * 0.6 * (st > 0.4 ? 1 : 0.3);
      raise += f0 * extra * 0.4 * (st > 0.4 ? 1 : 0.3);
    } else {
      call *= 1 + extra;
      raise *= 1 + extra * 0.5;
    }
  }
  // Steal more from players who fold too much, before or after the flop.
  if (g.spot === 'rfi' && g.limpers === 0) {
    const foldy = Math.max(0, Math.min(EXPLOIT.stealCap, read.foldToBet - PRIOR.foldToBet)) + Math.max(0, Math.min(0.25, PRIOR.vpip - read.vpip)) * 2;
    const f0 = Math.max(0, 1 - call - raise);
    if (foldy > 0) raise += f0 * Math.min(1, foldy * EXPLOIT.steal * (0.3 + style.adapt)) * (st > 0.2 ? 1 : 0.4);
  }
  const total = call + raise;
  if (total > 1) {
    call /= total;
    raise /= total;
  }
  return { call: Math.max(0, call), raise: Math.max(0, raise) };
}

// ── After the flop: GTO's own mix (for balance) ─────────────────────────────

type Situation = 'open' | 'small' | 'big' | 'raised';
type Probs = [number, number, number];

const TABLE = (trained as { table?: Record<string, number[]> }).table ?? {};

/** GTO-style defaults, for spots training didn't reach: how often to check / bet small / bet big, or fold / call / raise. */
function defaults(street: string, role: 'agg' | 'def', sit: Situation, tex: Texture, bucket: Bucket): Probs {
  const river = street === 'river';
  if (sit === 'open') {
    const wet = tex === 'wet' || tex === 'mono';
    const bet: Record<Bucket, number> =
      role === 'agg'
        ? wet
          ? { monster: 0.8, strong: 0.85, top: 0.65, mid: 0.3, draw: 0.7, weak: 0.3, air: river ? 0.3 : 0.28 }
          : { monster: 0.75, strong: 0.9, top: 0.85, mid: 0.55, draw: 0.75, weak: 0.55, air: river ? 0.3 : 0.5 }
        : { monster: 0.45, strong: 0.4, top: 0.25, mid: 0.08, draw: 0.25, weak: 0.08, air: river ? 0.18 : 0.08 };
    const bigShare: Record<Bucket, number> = wet
      ? { monster: 0.75, strong: 0.7, top: 0.45, mid: 0.2, draw: 0.6, weak: 0.3, air: 0.6 }
      : { monster: 0.45, strong: 0.35, top: 0.15, mid: 0.05, draw: 0.3, weak: 0.15, air: river ? 0.6 : 0.2 };
    const b = bet[bucket];
    const big = river && (bucket === 'monster' || bucket === 'air') ? Math.max(bigShare[bucket], 0.7) : bigShare[bucket];
    return [1 - b, b * (1 - big), b * big];
  }
  const small: Record<Bucket, Probs> = {
    monster: [0, 0.5, 0.5],
    strong: [0, 0.65, 0.35],
    top: [0.04, 0.86, 0.1],
    mid: [0.3, 0.65, 0.05],
    draw: river ? [0.85, 0.1, 0.05] : [0.12, 0.65, 0.23],
    weak: [0.55, 0.38, 0.07],
    air: [0.84, 0.06, 0.1],
  };
  const big: Record<Bucket, Probs> = {
    monster: [0, 0.55, 0.45],
    strong: [0.04, 0.72, 0.24],
    top: [0.22, 0.73, 0.05],
    mid: [0.6, 0.38, 0.02],
    draw: river ? [0.92, 0.04, 0.04] : [0.35, 0.55, 0.1],
    weak: [0.82, 0.16, 0.02],
    air: [0.92, 0.0, 0.08],
  };
  const raised: Record<Bucket, Probs> = {
    monster: [0, 0.45, 0.55],
    strong: [0.08, 0.8, 0.12],
    top: [0.42, 0.56, 0.02],
    mid: [0.78, 0.22, 0],
    draw: river ? [0.95, 0.05, 0] : [0.45, 0.5, 0.05],
    weak: [0.9, 0.08, 0.02],
    air: [0.93, 0.02, 0.05],
  };
  return (sit === 'small' ? small : sit === 'big' ? big : raised)[bucket];
}

const MIN_WEIGHT = 2;

/** GTO's mix for this spot from training, or the defaults. */
function postflopGto(street: string, role: 'agg' | 'def', pos: 'ip' | 'oop', sit: Situation, tex: Texture, bucket: Bucket): Probs {
  const row = TABLE[`${street}|${role}|${pos}|${sit}|${tex}|${bucket}`];
  const fallback = defaults(street, role, sit, tex, bucket);
  if (!row || row[3] < MIN_WEIGHT) return fallback;
  // Trust the trained numbers more the more hands stood behind them, but never all the way: training
  // starts from the turn with ranges that only went through preflop, so the flop's narrowing is missing.
  const t = Math.min(0.7, row[3] / 40);
  return [0, 1, 2].map((i) => row[i] * t + fallback[i] * (1 - t)) as Probs;
}

// ── Choosing a move ─────────────────────────────────────────────────────────

const pick = (rng: Rng, p: number[]) => {
  const total = p.reduce((x, y) => x + y, 0);
  let x = rng() * total;
  for (let i = 0; i < p.length; i++) {
    x -= p[i];
    if (x < 0) return i;
  }
  return p.length - 1;
};

/** Turns values (in chips) into chances: the best option most often, close ones mixed, bad ones rarely. */
function softmax(values: number[], temp: number): number[] {
  const t = Math.max(1e-6, temp);
  const top = Math.max(...values);
  const e = values.map((v) => Math.exp((v - top) / t));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

/** For tuning (scripts/botLab.ts): sees each decision's numbers. Never set in the app. */
let tracer: ((info: Record<string, unknown>) => void) | null = null;
export function traceBots(fn: typeof tracer): void {
  tracer = fn;
}

export interface BotThought {
  move: BotMove;
  /** For the bot's comments: what it held and what it did. */
  bucket?: Bucket;
  bluff?: boolean;
  /** How long a person in its seat would take over this, in ms. */
  thinkMs: number;
}

/** One thing the bot could do, with what it's worth (in chips) and how much it's drawn to it. */
interface Option {
  move: BotMove;
  value: number;
  /** For GTO's mix: 0 check/fold, 1 small bet/call, 2 big bet/raise. */
  kind: 0 | 1 | 2;
}

/** A style's taste for an option: it stretches the gain from a good bet or raise, and shrinks the cost of a bad one (or the other way round for passive styles). */
const scaled = (gain: number, scale: number) => (gain > 0 ? gain * scale : gain / scale);

/** How big a deal this decision is, 0 to 1, for thinking time. */
function stakesOf(amount: number, stack: number): number {
  return Math.max(0, Math.min(1, amount / Math.max(1, stack * 0.6)));
}

/** How long it takes: quick when it's easy, longer when it's close or a lot is at stake, all shaped by the style's tempo. */
function thinkTime(style: Style, rng: Rng, opts: { street: string; probs: number[]; chosen: number; stakes: number; folding: boolean; monster: boolean; facing: boolean }): number {
  const sorted = [...opts.probs].sort((a, b) => b - a);
  const hard = 1 - (sorted[0] - (sorted[1] ?? 0));
  const t = style.tempo;
  const easy = sorted[0] > 0.85;
  if (easy && rng() < t.snap) return 450 + rng() * 350;
  let ms = (opts.street === 'preflop' ? (opts.folding ? 1000 : 1500) : 1900) * (0.7 + rng() * 0.6);
  ms += hard * 1600 * t.tank * (0.4 + opts.stakes);
  ms += opts.stakes * 1400 * t.tank;
  if (opts.monster && opts.facing && rng() < t.hollywood) ms += 2200 + rng() * 1800;
  ms *= t.speed;
  return Math.round(Math.max(450, Math.min(7000, ms)));
}

export function decide(game: Game, hand: Hand, seat: Seat, rng: Rng): BotThought {
  const player = game.players.find((p) => p.id === seat.playerId);
  const opps = opponentsOf(game, hand, seat);
  const mind = mindOf(game, seat.playerId);
  // The grudge that matters is against whoever's betting (or anyone, heads up).
  const aggressor = hand.aggressorId && hand.aggressorId !== seat.playerId ? hand.aggressorId : opps.length === 1 ? opps[0].id : null;
  const grudge = aggressor ? (mind.grudges?.[aggressor] ?? 0) : 0;
  const style = inTheMoment(styleOf(player?.style), mind, grudge);
  return hand.street === 'preflop' ? preflop(game, hand, seat, style, opps, rng) : postflop(game, hand, seat, style, opps, rng);
}

/** Helpers for turning an intention into a legal move. */
function mover(game: Game, hand: Hand, seat: Seat, rng: Rng, allInAt = 0.8) {
  const o = options(game, hand, seat);
  const bb = game.settings.bigBlind;
  const check = (): BotMove => (o.canCheck ? { move: 'check' } : { move: 'fold' });
  const call = (): BotMove => (o.canCheck ? { move: 'check' } : o.callIsAllIn ? { move: 'allin' } : { move: 'call' });
  const raiseTo = (amount: number): BotMove => {
    if (!o.canRaise) return call();
    const jitter = 1 + (rng() - 0.5) * 0.08;
    let to = niceAmount(amount * jitter, bb);
    to = Math.max(o.minTo, Math.min(o.maxTo, to));
    // Most of the stack anyway: just go all in.
    if (to >= o.maxTo * allInAt) return { move: 'allin' };
    return { move: hand.currentBet > 0 ? 'raise' : 'bet', to };
  };
  return { o, check, call, raiseTo };
}

function preflop(game: Game, hand: Hand, seat: Seat, style: Style, opps: Opponent[], rng: Rng): BotThought {
  const bb = game.settings.bigBlind;
  const { o, check, call, raiseTo } = mover(game, hand, seat, rng, 0.75);
  const cls = handClass(seat.cards);
  const ci = CLASS_INDEX.get(cls) ?? 0;
  const g = preflopGto(game, hand, seat);
  const eff = effectiveBb(game, hand, seat);
  const order = preflopOrder(hand);
  const behind = order.length - 1 - order.indexOf(seat.playerId);
  const raiserRead = g.raiser ? (opps.find((x) => x.id === g.raiser)?.read ?? averageRead(opps)) : averageRead(opps);
  const myStack = chipsOf(game, seat.playerId) + seat.bet;
  const pot = potTotal(hand);
  const think = (probs: number[], chosen: number, amount: number) =>
    thinkTime(style, rng, { street: 'preflop', probs, chosen, stakes: stakesOf(amount, myStack), folding: chosen === 0, monster: TOP[ci] < 0.03, facing: o.toCall > bb });

  // Short-stacked and nobody has raised: all in or fold, like the push/fold charts.
  if ((g.spot === 'rfi' || g.spot === 'limp') && eff <= 13 && o.canRaise) {
    const width = shoveWidth(eff, behind) * style.pre.shove * (g.limpers ? 0.8 : 1);
    const shove = Math.max(0, Math.min(1, (width - TOP[ci]) / 0.04 + 0.5));
    // Limpy styles limp the near-misses instead of folding them.
    const limp = o.toCall <= bb ? (1 - shove) * style.pre.limp * (TOP[ci] < width * 2 ? 1 : 0.2) : 0;
    const probs = [Math.max(0, 1 - shove - limp), limp, shove];
    const c = pick(rng, probs);
    const move = c === 2 ? ({ move: 'allin' } as BotMove) : c === 1 ? call() : check();
    return { move, thinkMs: think(probs, c, c === 2 ? myStack : 0) };
  }

  // A big decision: someone moved in or made a raise that commits a lot of our stack. Work out the
  // chances against what they'd do that with, rather than trusting a chart built for small raises.
  const commits = o.toCall >= Math.max(bb * 10, (chipsOf(game, seat.playerId) + seat.bet) * 0.3);
  if (o.toCall > 0 && commits) {
    const ranges = opps.map((x) => preflopRange(game, hand, x.id, x.story, x.read));
    const hole: Card2 = [toInt(seat.cards[0]), toInt(seat.cards[1])];
    const im = imagine(hole, [], 'preflop', opps, ranges, rng, Math.round(320 / (1 + 0.4 * opps.length)));
    const covered = !game.settings.rebuys && o.callIsAllIn;
    const eq = equityOf(im) + style.pre.callShove - (covered ? style.pre.survival * 0.06 : 0);
    const allInAlready = o.callIsAllIn || opps.every((x) => hand.seats.find((s) => s.playerId === x.id)?.allIn || chipsOf(game, x.id) === 0);
    // Calling a raise that isn't all in still leaves play behind, where position matters.
    const realise = allInAlready ? 1 : inPosition(hand, seat.playerId) ? 0.95 : 0.85;
    const evCall = eq * (pot + o.toCall) * realise - o.toCall;
    const temp = style.post.wobble * (pot + o.toCall) * 1.2;
    const values = [0, evCall];
    if (!allInAlready && o.canRaise) {
      // Moving in over the top: each of them calls with the hands that are worth the price.
      const most = Math.max(0, ...opps.map((x) => chipsOf(game, x.id) + (hand.seats.find((q) => q.playerId === x.id)?.bet ?? 0)));
      const to = Math.min(myStack, most);
      const put = to - seat.bet;
      const finalPot = pot + put + opps.reduce((a, x) => a + Math.max(0, to - (hand.seats.find((q) => q.playerId === x.id)?.bet ?? 0)), 0) / Math.max(1, opps.length);
      const prices = opps.map((x) => Math.max(0, to - (hand.seats.find((q) => q.playerId === x.id)?.bet ?? 0)) / Math.max(1, finalPot));
      const out = jamOutcome(im, opps, prices);
      values.push(out.fold * pot + (1 - out.fold) * ((out.eqCalled + style.pre.callShove) * finalPot - put) + style.post.raise * pot);
    }
    const probs = softmax(values, temp);
    const c = pick(rng, probs);
    const move = c === 0 ? check() : c === 1 ? call() : ({ move: 'allin' } as BotMove);
    tracer?.({ street: 'preflop', big: true, style: style.id, cards: cls, eq, pot, toCall: o.toCall, values: values.map((v) => (v / pot).toFixed(2)).join(' '), probs: probs.map((p) => p.toFixed(2)).join(' '), chose: move.move });
    return { move, thinkMs: think(probs, c, o.toCall) };
  }

  const canLimp = hand.currentBet <= bb;
  const f = styledPreflop(style, cls, g, raiserRead, canLimp);
  const probs = [Math.max(0, 1 - f.call - f.raise), f.call, f.raise];
  const c = pick(rng, probs);
  if (c === 0) return { move: check(), thinkMs: think(probs, c, 0) };
  if (c === 1) return { move: call(), thinkMs: think(probs, c, o.toCall) };
  // Raise sizes: opens at the style's usual size (plus one per limper; some styles go bigger with
  // their best hands, a tell you can learn), 3-bets about 3x (4x out of position), 4-bets 2.3x.
  const ip = inPosition(hand, seat.playerId);
  let target: number;
  if (hand.currentBet <= bb) {
    const premium = TOP[ci] < 0.04 && style.post.tell > 0.25 ? 1 + style.post.tell : 1;
    const open = seat.playerId === hand.sbId && order.length > 2 ? Math.max(3, style.pre.open) : style.pre.open;
    target = (bb * open * premium + g.limpers * bb) * (style.id === 'maniac' && rng() < 0.15 ? 1.6 : 1);
  } else if (g.spot === 'open') target = hand.currentBet * (ip ? 3 : 3.8);
  else target = hand.currentBet * 2.3;
  // Short stacks just go all in.
  if (eff <= 20 && hand.currentBet > bb) return { move: { move: 'allin' }, thinkMs: think(probs, c, myStack) };
  return { move: raiseTo(target), thinkMs: think(probs, c, target) };
}

function postflop(game: Game, hand: Hand, seat: Seat, style: Style, opps: Opponent[], rng: Rng): BotThought {
  const bb = game.settings.bigBlind;
  const { o, check, call, raiseTo } = mover(game, hand, seat, rng);
  const s = style.post;
  const river = hand.street === 'river';
  const board = boardCards(hand);
  const hole: Card2 = [toInt(seat.cards[0]), toInt(seat.cards[1])];
  const info = boardInfo(board);
  const myTier = tierWith(hole[0], hole[1], info, []);
  const draw = drawLevelWith(hole[0], hole[1], info);
  const bucket = handBucket(seat.cards, hand.board);
  const pot = potTotal(hand);
  const behind = chipsOf(game, seat.playerId);
  const theirBehind = Math.max(0, ...opps.map((x) => chipsOf(game, x.id)));
  const effBehind = Math.min(behind, theirBehind + Math.max(0, hand.currentBet - seat.bet));
  const ip = inPosition(hand, seat.playerId);
  const multiway = opps.length > 1;
  const read = averageRead(opps);

  // Picture their hands and play it out.
  const ranges = opps.map((x) => preflopRange(game, hand, x.id, x.story, x.read));
  // Fewer imagined deals when more players are in, so a decision stays within a couple of ms on the server.
  const n = Math.round(300 / (1 + 0.6 * opps.length));
  const im = imagine(hole, board, hand.street, opps, ranges, rng, n);
  const naive = imagine(hole, board, hand.street, opps, ranges, rng, Math.round(n / 3), true);
  const sense = s.sense * (im.quality > 0.05 ? 1 : 0.5);
  const eqRange = equityOf(im);
  const eqNaive = equityOf(naive);
  // How good it thinks its hand is: some styles overrate a pair or a draw.
  const bias = (myTier === 3 || myTier === 4 ? s.pairs * 0.1 : 0) + (draw >= 2 && !river ? s.chase * 0.08 : 0);
  const eq = Math.max(0, Math.min(1, sense * eqRange + (1 - sense) * eqNaive + bias));
  const realise = river ? 1 : ip ? 1 : 0.88;
  // Draws get paid when they hit, if there are chips left to win.
  const implied = draw >= 2 && !river ? Math.min(effBehind, pot) * 0.1 * (1 + s.chase) : 0;
  const temp = s.wobble * pot;
  const stack = behind + seat.bet;
  const bluffing = myTier <= 1;
  const strong = myTier >= 5 || eqRange > 0.75;
  const adapt = 0.4 + style.adapt;
  const foldy = (read.foldToBet - PRIOR.foldToBet) * adapt;
  // How much of each opponent's chips are already in: committed players don't fold.
  const committed = opps.map((x) => {
    const st = hand.seats.find((q) => q.playerId === x.id)!;
    return st.total / Math.max(1, st.total + chipsOf(game, x.id));
  });
  // Passive styles shy away from betting and raising even when it would pay; aggressive ones lean in.
  const betScale = Math.max(0.3, 1 + 4 * s.bet);
  const raiseScale = Math.max(0.2, Math.min(2, 1 + 6 * s.raise));

  // No rebuys: going broke ends the night, so careful styles shy away from risking it all on a thin
  // edge, and a big stack leans on players a call would knock out.
  const tournament = !game.settings.rebuys;
  const covered = tournament && theirBehind >= behind;
  const bully = tournament && theirBehind < behind * 0.5 ? pot * 0.03 * (1 - style.pre.survival) : 0;
  const risk = (put: number) => (covered && put >= behind * 0.7 ? pot * style.pre.survival * 0.12 : 0);

  const opts: Option[] = [];
  if (o.canCheck) {
    // Checking: see the next card (or the showdown) for free. Out of position the others may bet us off it.
    let vCheck = eq * pot * (river ? 1 : realise);
    if (myTier === 6 && !river && !multiway) vCheck += s.trap * 0.3 * pot;
    opts.push({ move: check(), value: vCheck, kind: 0 });
    // Betting: each size the style likes.
    let sizes = s.sizes.filter((f) => hand.street !== 'flop' || f <= 1.05);
    if (effBehind <= pot * 1.3) sizes = [...sizes.filter((f) => f * pot < effBehind * 0.8), effBehind / pot];
    for (const f0 of sizes) {
      const amount = Math.min(effBehind, f0 * pot);
      if (amount < bb) continue;
      const f = amount / pot;
      const out = betOutcome(im, opps, f, river, false, committed);
      // Folds from a player who folds too much (or too little), as the bot has seen.
      const fold = Math.max(0, Math.min(1, (sense * out.fold + (1 - sense) * 0.35) * (1 + foldy * EXPLOIT.fold)));
      // When it's called it's up against the hands that call, whatever it thinks of its own.
      const eqCalled = Math.min(1, out.eqCalled + (1 - sense) * 0.05 + bias);
      let v = fold * pot + (1 - fold) * (eqCalled * (pot + 2 * amount) * realise - amount);
      // Getting raised costs the bet with anything but a strong hand.
      v -= sense * out.raised * amount * (myTier >= 5 ? 0 : myTier === 4 ? 0.4 : 0.9);
      v = vCheck + scaled(v - vCheck, betScale);
      v += pot * (s.bet + (bluffing ? s.bluff : 0) + (strong ? s.value : 0));
      // Pub players' sizes give their hands away: big with big hands, small with so-so ones.
      v += pot * s.tell * 0.15 * (f - 0.6) * (myTier >= 5 ? 1 : myTier <= 3 ? -1 : 0);
      if (multiway && bluffing) v -= pot * 0.05 * opps.length;
      v += bully - risk(amount);
      opts.push({ move: raiseTo(seat.bet + amount), value: v, kind: f <= 0.5 ? 1 : 2 });
    }
  } else {
    const facingBig = o.toCall > pot * 0.45;
    opts.push({ move: check(), value: 0, kind: 0 });
    let vCall = eq * (pot + o.toCall) * (o.callIsAllIn ? 1 : realise) - o.toCall + (o.callIsAllIn ? 0 : implied);
    vCall += pot * s.sticky;
    if (facingBig && myTier < 5) vCall -= pot * s.scared * 0.15;
    // Bots notice players who bet too much and look them up lighter (and give tight ones more credit).
    vCall += pot * Math.max(-0.08, Math.min(0.2, (read.aggression - PRIOR.aggression) * 0.04 + (read.bluffy - PRIOR.bluffy) * 0.2 + (read.betFreq - PRIOR.betFreq) * BET_CALL)) * adapt;
    vCall -= risk(o.toCall);
    opts.push({ move: call(), value: vCall, kind: 1 });
    if (o.canRaise && !o.callIsAllIn) {
      const bigPot = pot + o.toCall;
      // Never more than the biggest stack still in could call.
      const most = Math.max(0, ...opps.map((x) => chipsOf(game, x.id) + (hand.seats.find((q) => q.playerId === x.id)?.bet ?? 0)));
      const cap = Math.min(seat.bet + behind, most);
      const targets = [Math.min(cap, hand.currentBet + bigPot * 0.8)];
      if (cap - seat.bet <= bigPot * 2.5 && cap > targets[0]) targets.push(cap);
      for (const to of targets) {
        if (to <= hand.currentBet) continue;
        const put = Math.min(behind, to - seat.bet);
        const f = (to - hand.currentBet) / Math.max(1, bigPot);
        const out = betOutcome(im, opps, f, river, true, committed);
        const fold = Math.max(0, Math.min(1, (sense * out.fold + (1 - sense) * 0.2) * (1 + foldy)));
        const eqCalled = Math.min(1, out.eqCalled + (1 - sense) * 0.05 + bias);
        let v = fold * pot + (1 - fold) * (eqCalled * (pot + put + (to - hand.currentBet)) * (put >= behind ? 1 : realise) - put);
        const best = Math.max(0, vCall);
        v = best + scaled(v - best, raiseScale);
        v += bully - risk(put);
        v += pot * (s.raise + (bluffing ? s.bluff : 0) + (strong ? s.value : 0));
        if (myTier === 6 && s.trap > 0 && !river && hand.street === 'flop') v -= pot * s.trap * 0.1;
        opts.push({ move: raiseTo(to), value: v, kind: 2 });
      }
    }
  }

  // GTO's own mix for this spot, for balance: the better players lean on it more.
  let probs = softmax(
    opts.map((x) => x.value),
    temp,
  );
  const g = s.gto * (1 - mindOf(game, seat.playerId).tilt * 0.5);
  if (g > 0) {
    const tex = boardTexture(hand.board.slice(0, board.length));
    const acts = hand.actions ?? [];
    const streets = ['preflop', 'flop', 'turn', 'river'] as const;
    const prev = streets[streets.indexOf(hand.street as (typeof streets)[number]) - 1];
    const lastAgg = [...acts].reverse().find((a) => a.street === prev && AGGRESSIVE.includes(a.move));
    const role: 'agg' | 'def' = lastAgg?.playerId === seat.playerId ? 'agg' : 'def';
    const iBetHere = acts.some((a) => a.street === hand.street && a.playerId === seat.playerId && AGGRESSIVE.includes(a.move));
    const sit: Situation = o.canCheck ? 'open' : iBetHere ? 'raised' : o.toCall <= 0.5 * Math.max(1, pot - o.toCall) ? 'small' : 'big';
    const mix = postflopGto(hand.street, role, ip ? 'ip' : 'oop', sit, tex, bucket);
    const byKind = [0, 1, 2].map((k) => opts.filter((x) => x.kind === k).length);
    // A bet kind with no option of that size goes to the nearest kind there is.
    const kindShare = (k: number) => (byKind[k] ? mix[k] / byKind[k] : 0);
    const missing = [0, 1, 2].filter((k) => !byKind[k]).reduce((a, k) => a + mix[k], 0);
    const aggressive = opts.filter((x) => x.kind > 0).length;
    probs = probs.map((p, i) => {
      const k = opts[i].kind;
      const share = kindShare(k) + (k > 0 && aggressive ? missing / aggressive : 0);
      return (1 - g) * p + g * share;
    });
  }
  // Nobody folds the near-nuts.
  if (!o.canCheck && eqRange > 0.92) probs[0] = 0;
  // Nor a hand that's far ahead of the price: when the call costs a small part of the pot and its chance of winning
  // is several times what the call needs, folding is a blunder, whatever the style (choice noise and nerves included).
  if (!o.canCheck && eqRange > 0.5 && eqRange > 3 * (o.toCall / (pot + o.toCall))) probs[0] = 0;
  const c = pick(rng, probs);
  const chosen = opts[c];
  tracer?.({ street: hand.street, style: style.id, cards: seat.cards.join(''), board: hand.board.join(''), myTier, eqRange, eqNaive, eq, pot, toCall: o.toCall, behind, quality: im.quality, opts: opts.map((x, i) => `${x.move.move}${x.move.to ?? ''}:${(x.value / pot).toFixed(2)}:${probs[i].toFixed(2)}`).join(' '), chose: `${chosen.move.move}${chosen.move.to ?? ''}` });
  const amount = chosen.move.move === 'allin' ? behind : chosen.move.to ? chosen.move.to - seat.bet : o.toCall;
  return {
    move: chosen.move,
    bucket,
    bluff: bluffing && chosen.kind > 0,
    thinkMs: thinkTime(style, rng, { street: hand.street, probs, chosen: c, stakes: stakesOf(amount, stack), folding: chosen.move.move === 'fold', monster: myTier === 6, facing: o.toCall > 0 }),
  };
}

/** How hard bots punish players who fold too much, before the flop (`steal`) and after it (`fold`). The lab turns these. */
export const EXPLOIT = { steal: 3, fold: 3, stealCap: 0.5 };

/**
 * How much lighter to call (in pots, per point of bet frequency above the usual) a player who bets nearly every
 * time it's checked to. Tested against a constant bluffer: calling much more than this loses chips (a constant
 * bluffer is still a real hand part of the time), so it's a nudge, not a switch.
 */
const BET_CALL = 0.3;

// ── Keeping reads ───────────────────────────────────────────────────────────

/** After each hand: what everyone did, as the bots see it (only public moves, and cards that were shown). */
export function updateReads(game: Game, hand: Hand): void {
  const reads = (game.reads ??= {});
  const acts = hand.actions ?? [];
  const bb = game.settings.bigBlind;
  // A move is aggressive if it put in more than the bet to match (calling all in isn't).
  const raised = new Set<(typeof acts)[number]>();
  for (const street of ['preflop', 'flop', 'turn', 'river'] as const) {
    let top = street === 'preflop' ? bb : 0;
    for (const a of acts) {
      if (a.street !== street) continue;
      if (AGGRESSIVE.includes(a.move) && a.to > top) raised.add(a);
      if (a.move !== 'fold' && a.move !== 'check') top = Math.max(top, a.to);
    }
  }
  for (const s of hand.seats) {
    const r = (reads[s.playerId] ??= { hands: 0, vpip: 0, pfr: 0, betsFaced: 0, foldsToBet: 0, aggr: 0, calls: 0 });
    r.hands++;
    const pre = acts.filter((a) => a.street === 'preflop' && a.playerId === s.playerId);
    if (pre.some((a) => a.move === 'call' || AGGRESSIVE.includes(a.move))) r.vpip++;
    if (pre.some((a) => raised.has(a))) r.pfr++;
    // Moved in first, with a stack worth more than a few blinds.
    const first = acts.find((a) => a.street === 'preflop' && AGGRESSIVE.includes(a.move));
    if (first?.playerId === s.playerId && first.move === 'allin' && first.to >= bb * 8) r.shoves = (r.shoves ?? 0) + 1;
    // Shown down after betting the turn or river: was it a bluff?
    const betLate = acts.filter((a) => a.playerId === s.playerId && (a.street === 'turn' || a.street === 'river') && AGGRESSIVE.includes(a.move));
    if (s.shown && s.cards.length === 2 && betLate.length && hand.board.length >= 4) {
      const last = betLate[betLate.length - 1];
      const board = hand.board.slice(0, last.street === 'turn' ? 4 : 5).map(toInt);
      const t = tierWith(toInt(s.cards[0]), toInt(s.cards[1]), boardInfo(board), []);
      r.shownBets = (r.shownBets ?? 0) + 1;
      if (t <= 1) r.shownBluffs = (r.shownBluffs ?? 0) + 1;
    }
  }
  for (const street of ['flop', 'turn', 'river'] as const) {
    let bet = false;
    for (const a of acts.filter((x) => x.street === street && !x.outOfTurn)) {
      const r: PlayerRead | undefined = reads[a.playerId];
      if (!r) continue;
      // Could they have bet (nobody had yet), and did they?
      if (!bet && (a.move === 'check' || AGGRESSIVE.includes(a.move))) {
        r.betOpps = (r.betOpps ?? 0) + 1;
        if (AGGRESSIVE.includes(a.move)) r.bets = (r.bets ?? 0) + 1;
      }
      if (raised.has(a)) {
        r.aggr++;
        if (bet) r.betsFaced++;
        bet = true;
      } else if (a.move === 'call' || a.move === 'allin') {
        r.calls++;
        r.betsFaced++;
      } else if (a.move === 'fold' && bet) {
        r.foldsToBet++;
        r.betsFaced++;
      }
    }
  }
}
