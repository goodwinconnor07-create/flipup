// How the bots decide. Before the flop they play from GTO charts solved with the coach's engine
// (botCharts.json, from gto/scripts/export_bot_charts.py), bent by their style. After the flop they
// sort their hand and the board into simple buckets, look up how GTO plays that spot (botPostflop.json,
// from gto/scripts/train_bots.py, with hand-written GTO-style defaults where training didn't reach),
// bend that by style, and adjust a little to how their opponents have been playing.
// Everything here is public information plus the bot's own two cards, and it never calls a server.

import { rankOf, suitOf, type Card } from './cards';
import { strengthVsRandom } from './equity';
import charts from './botCharts.json';
import trained from './botPostflop.json';
import { styleOf, type Style } from './botStyles';
import { potTotal } from './holdem';
import { options } from './selectors';
import type { Game, Hand, HandAction, Move, PlayerRead, Seat, Street } from './types';

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

/**
 * Which of these moves raised the bet on their street. An all in only counts when it goes past the bet
 * (the table logs a call that puts someone all in as 'allin' too, and that is a call).
 */
function raiseFlags(acts: HandAction[], bb: number): boolean[] {
  const level: Partial<Record<Street, number>> = {};
  return acts.map((a) => {
    const cur = level[a.street] ?? (a.street === 'preflop' ? bb : 0);
    const raised = a.move === 'bet' || a.move === 'raise' || (a.move === 'allin' && a.to > cur);
    if (raised) level[a.street] = a.to;
    return raised;
  });
}

/** Calls (including a call that puts someone all in) among these moves. */
const isCall = (a: HandAction, raised: boolean) => !raised && (a.move === 'call' || a.move === 'allin');

/** Who has raised before the flop so far, and how many limped or called. */
function preflopHistory(game: Game, hand: Hand) {
  const pre = (hand.actions ?? []).filter((a) => a.street === 'preflop');
  const flags = raiseFlags(pre, game.settings.bigBlind);
  const first = flags.indexOf(true);
  const calls = pre.filter((a, i) => isCall(a, flags[i]));
  return {
    raisers: pre.filter((_, i) => flags[i]),
    /** Just called the big blind, with nobody having raised. */
    limpers: first === -1 ? calls.length : 0,
    /** Called a raise. */
    callers: first === -1 ? 0 : pre.filter((a, i) => i > first && isCall(a, flags[i])).length,
  };
}

/** Seats in the order they act before the flop: 0 first, the big blind last (heads up the button is 0). */
function preflopOrder(hand: Hand): string[] {
  const n = hand.seats.length;
  const ids = hand.seats.map((s) => s.playerId);
  const button = ids.indexOf(hand.buttonId);
  if (n === 2) return [ids[button], ids[(button + 1) % 2]];
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(ids[(button + 3 + i) % n]);
  return out;
}

/** Last to act after the flop among the players still in. */
function inPosition(hand: Hand, playerId: string): boolean {
  const n = hand.seats.length;
  const button = hand.seats.findIndex((s) => s.playerId === hand.buttonId);
  let last: string | null = null;
  for (let i = 1; i <= n; i++) {
    const s = hand.seats[(button + i) % n];
    if (!s.folded) last = s.playerId;
  }
  return last === playerId;
}

/** Effective stack in big blinds: the bot's chips against the biggest opponent still in. */
function effectiveBb(game: Game, hand: Hand, seat: Seat): number {
  const bb = game.settings.bigBlind;
  const mine = (game.players.find((p) => p.id === seat.playerId)?.stack ?? 0) + seat.total;
  const theirs = Math.max(
    0,
    ...hand.seats.filter((s) => s !== seat && !s.folded).map((s) => (game.players.find((p) => p.id === s.playerId)?.stack ?? 0) + s.total),
  );
  return Math.min(mine, theirs) / bb;
}

// ── Opponent reads ──────────────────────────────────────────────────────────

const PRIOR = { hands: 8, vpip: 0.3, pfr: 0.18, foldToBet: 0.45, aggression: 1.4 };

interface Read {
  vpip: number;
  pfr: number;
  foldToBet: number;
  aggression: number;
}

/** What a bot has seen of a player, eased towards an average player until there are enough hands. */
function readOf(r: PlayerRead | undefined): Read {
  const h = r?.hands ?? 0;
  const mix = (seen: number, n: number, prior: number) => (seen + prior * PRIOR.hands) / (n + PRIOR.hands);
  return {
    vpip: mix(r?.vpip ?? 0, h, PRIOR.vpip),
    pfr: mix(r?.pfr ?? 0, h, PRIOR.pfr),
    foldToBet: mix(r?.foldsToBet ?? 0, r?.betsFaced ?? 0, PRIOR.foldToBet),
    aggression: ((r?.aggr ?? 0) + PRIOR.aggression * 4) / ((r?.calls ?? 0) + 4),
  };
}

function opponentsRead(game: Game, hand: Hand, seat: Seat): Read {
  const opp = hand.seats.filter((s) => s !== seat && !s.folded).map((s) => readOf(game.reads?.[s.playerId]));
  if (!opp.length) return readOf(undefined);
  const avg = (k: keyof Read) => opp.reduce((a, r) => a + r[k], 0) / opp.length;
  return { vpip: avg('vpip'), pfr: avg('pfr'), foldToBet: avg('foldToBet'), aggression: avg('aggression') };
}

// ── Preflop ─────────────────────────────────────────────────────────────────

type ChartFile = { classes: string[]; charts: Record<string, { names: string[]; spots: Record<string, string> }> };
const CHARTS = charts as ChartFile;
const CLASS_INDEX = new Map(CHARTS.classes.map((c, i) => [c, i]));
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Rough hand strength from 0 (worst) to 1 (best), from each class's place in the opening chart of the first seat. */
const STRENGTH = (() => {
  const s = CHARTS.charts['6p100']?.spots['rfi.0'] ?? '';
  const raise = CHARTS.classes.map((_, i) => DIGITS.indexOf(s[i * 2 + 1] ?? '0') / 35);
  // Ties (lots of 0s and 1s) broken by the Chen-style order below.
  const order = CHARTS.classes.map((c, i) => ({ c, v: raise[i] * 10 + chenLike(c) / 20 }));
  order.sort((a, b) => a.v - b.v);
  return new Map(order.map((o, i) => [o.c, i / (order.length - 1)]));
})();

function chenLike(cls: string): number {
  const RANKS = '23456789TJQKA';
  const a = RANKS.indexOf(cls[0]) + 2;
  const b = RANKS.indexOf(cls[1]) + 2;
  const v = (r: number) => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
  if (a === b) return Math.max(5, v(a) * 2);
  let s = v(a) + (cls[2] === 's' ? 2 : 0);
  const gap = a - b - 1;
  s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  return s;
}

function chartFor(players: number, stackBb: number) {
  const n = Math.max(2, Math.min(6, players));
  const depths = [100, 40, 20];
  const depth = depths.reduce((best, d) => (Math.abs(Math.log(d) - Math.log(Math.max(stackBb, 5))) < Math.abs(Math.log(best) - Math.log(Math.max(stackBb, 5))) ? d : best));
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

/** Call and raise chances for the bot's hand before the flop, straight from GTO. */
function preflopGto(game: Game, hand: Hand, seat: Seat): { call: number; raise: number; spot: string } {
  const order = preflopOrder(hand);
  const n = order.length;
  const me = order.indexOf(seat.playerId);
  const chart = chartFor(n, effectiveBb(game, hand, seat));
  const at = (id: string) => chartSeat(order.indexOf(id), n);
  const cls = handClass(seat.cards);
  const { raisers, limpers, callers } = preflopHistory(game, hand);
  const mySeat = chartSeat(me, n);
  const get = (key: string) => spotFreq(chart, key, cls);
  let f: { call: number; raise: number } | null = null;
  let spot = 'rfi';
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
  return { ...f, spot };
}

/** Bends the GTO chart by the bot's style and what it has seen of the table. */
function styledPreflop(style: Style, cls: string, f: { call: number; raise: number }, spot: string, read: Read, canLimp: boolean) {
  const st = STRENGTH.get(cls) ?? 0;
  let call = f.call;
  let raise = f.raise;
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
  if (canLimp && p.limp > 0 && spot === 'rfi') {
    const move = raise * p.limp * (st > 0.9 ? 0.2 : 0.7);
    raise -= move;
    call += move + Math.max(0, 1 - call - raise) * p.limp * (st > 0.35 ? 0.5 : 0);
  }
  // Adapting: against loose openers defend and 3-bet a bit wider; against tight ones, give them more credit.
  const w = 0.6;
  if (spot === 'open' || spot === '3bet') {
    const loose = read.vpip - PRIOR.vpip;
    const extra = Math.max(-0.5, Math.min(0.5, loose * 1.5 * w));
    const f0 = Math.max(0, 1 - call - raise);
    if (extra > 0) {
      call += f0 * extra * 0.7 * (st > 0.4 ? 1 : 0.3);
      raise += f0 * extra * 0.3 * (st > 0.4 ? 1 : 0.3);
    } else {
      call *= 1 + extra;
      raise *= 1 + extra * 0.5;
    }
  }
  const total = call + raise;
  if (total > 1) {
    call /= total;
    raise /= total;
  }
  return { call: Math.max(0, call), raise: Math.max(0, raise) };
}

// ── After the flop ──────────────────────────────────────────────────────────

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

function styledPostflop(style: Style, p: Probs, sit: Situation, bucket: Bucket, street: string, read: Read, multiway: boolean): Probs {
  let [a, b, c] = p;
  const s = style.post;
  const value = bucket === 'monster' || bucket === 'strong' || bucket === 'top';
  const bluffy = bucket === 'air' || bucket === 'weak' || (bucket === 'draw' && street === 'river');
  const w = style.adapt;
  // Adapting: bluff players who fold too much, value-bet players who call too much,
  // and give aggressive players less credit.
  const foldy = read.foldToBet - PRIOR.foldToBet;
  const bluffAdj = 1 + Math.max(-0.6, Math.min(1, foldy * 3)) * w;
  const valueAdj = Math.max(-0.3, Math.min(0.3, -foldy * 1.5)) * w;
  const credit = (read.aggression - PRIOR.aggression) * 0.12 * w;
  if (sit === 'open') {
    let bet = b + c;
    const bigShare = bet > 0 ? c / bet : 0.5;
    if (value) bet = s.value >= 0 ? bet + (1 - bet) * (s.value + valueAdj) : bet * (1 + s.value + valueAdj);
    else if (bluffy) bet *= s.bluff * bluffAdj * (multiway ? 0.45 : 1);
    else bet *= 1 + (s.bluff - 1) * 0.4;
    if (bucket === 'monster' && s.trap > 0) bet *= 1 - s.trap * 0.6;
    bet = Math.max(0, Math.min(0.97, bet));
    let big = Math.max(0, Math.min(1, bigShare + s.size * 0.5));
    if (bucket === 'draw' && s.chase > 0) big = Math.max(big, 0.3);
    return [1 - bet, bet * (1 - big), bet * big];
  }
  // Facing a bet.
  let stick = s.sticky + credit;
  if (bucket === 'draw' && street !== 'river') stick += s.chase * 0.8;
  if (sit === 'big' || sit === 'raised') stick -= s.scared * (bucket === 'monster' ? 0 : bucket === 'strong' ? 0.3 : 1);
  if (multiway) stick -= 0.1;
  if (stick > 0) {
    const share = bucket === 'air' ? 0.35 : bucket === 'weak' ? 0.6 : 1;
    const move = a * Math.min(1, stick) * share;
    a -= move;
    b += move;
  } else if (stick < 0) {
    const move = b * Math.min(1, -stick) * (value ? 0.35 : 1) * (bucket === 'monster' ? 0 : 1);
    b -= move;
    a += move;
  }
  // Raises: bluff-raises scale with the bluff setting, value raises with the raise setting.
  let r = c * (bluffy ? s.bluff * bluffAdj : s.raise);
  if (bucket === 'monster' && s.trap > 0 && sit !== 'raised') r += b * s.trap * 0.5;
  if (bucket === 'draw' && street !== 'river') r *= s.raise;
  r = Math.max(0, Math.min(0.9, r));
  const scale = (1 - r) / Math.max(1e-9, a + b);
  a *= scale;
  b *= scale;
  c = r;
  return [a, b, c];
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

export interface BotThought {
  move: BotMove;
  /** For the bot's comments: what it held and what it did. */
  bucket?: Bucket;
  bluff?: boolean;
}

export function decide(game: Game, hand: Hand, seat: Seat, rng: Rng): BotThought {
  const player = game.players.find((p) => p.id === seat.playerId);
  const style = styleOf(player?.style);
  const o = options(game, hand, seat);
  const bb = game.settings.bigBlind;
  const potNow = potTotal(hand);
  const read = opponentsRead(game, hand, seat);
  const stackLeft = (player?.stack ?? 0) + seat.bet;

  const check = (): BotMove => (o.canCheck ? { move: 'check' } : { move: 'fold' });
  const call = (): BotMove => (o.canCheck ? { move: 'check' } : o.callIsAllIn ? { move: 'allin' } : { move: 'call' });
  const raiseTo = (amount: number): BotMove => {
    if (!o.canRaise) return call();
    const jitter = 1 + (rng() - 0.5) * 0.12;
    let to = Math.round((amount * jitter) / bb) * bb;
    to = Math.max(o.minTo, Math.min(o.maxTo, to));
    // Most of the stack anyway: just go all in.
    if (to >= o.maxTo * 0.75) return { move: 'allin' };
    return { move: hand.currentBet > 0 ? 'raise' : 'bet', to };
  };

  if (hand.street === 'preflop') {
    const g = preflopGto(game, hand, seat);
    const cls = handClass(seat.cards);
    const canLimp = hand.currentBet <= bb;
    const f = styledPreflop(style, cls, g, g.spot, read, canLimp);
    const choice = pick(rng, [Math.max(0, 1 - f.call - f.raise), f.call, f.raise]);
    if (choice === 0) return { move: check() };
    if (choice === 1) return { move: call() };
    // Raise sizes: opens 2.3 to 3bb (plus one per limper), 3-bets about 3x (4x out of position), 4-bets 2.3x.
    const { limpers } = preflopHistory(game, hand);
    const ip = inPosition(hand, seat.playerId);
    const bigger = 1 + Math.max(0, style.pre.aggro) * 0.25 + (style.id === 'maniac' && rng() < 0.15 ? 1 : 0);
    let target: number;
    if (hand.currentBet <= bb) target = (bb * (seat.playerId === hand.sbId ? 3 : 2.3 + (rng() < 0.4 ? 0.2 : 0)) + limpers * bb) * bigger;
    else if (g.spot === 'open') target = hand.currentBet * (ip ? 3 : 4) * bigger;
    else target = hand.currentBet * 2.3 * bigger;
    // Short stacks just go all in.
    if (effectiveBb(game, hand, seat) <= 22 && hand.currentBet > bb) return { move: { move: 'allin' } };
    return { move: raiseTo(target) };
  }

  // After the flop.
  const board = hand.board;
  const bucket = handBucket(seat.cards, board);
  const tex = boardTexture(board);
  const live = hand.seats.filter((s) => !s.folded);
  const multiway = live.length > 2;
  const acts = hand.actions ?? [];
  const raised = raiseFlags(acts, bb);
  const streets = ['preflop', 'flop', 'turn', 'river'] as const;
  const prev = streets[streets.indexOf(hand.street as (typeof streets)[number]) - 1];
  let lastAgg: HandAction | undefined;
  for (let i = acts.length - 1; i >= 0 && !lastAgg; i--) if (acts[i].street === prev && raised[i]) lastAgg = acts[i];
  const role: 'agg' | 'def' = lastAgg?.playerId === seat.playerId ? 'agg' : 'def';
  const pos = inPosition(hand, seat.playerId) ? 'ip' : 'oop';
  const iBetHere = acts.some((a, i) => a.street === hand.street && a.playerId === seat.playerId && raised[i]);
  let sit: Situation = 'open';
  if (o.toCall > 0) {
    if (iBetHere) sit = 'raised';
    else sit = o.toCall <= 0.5 * Math.max(1, potNow - o.toCall) ? 'small' : 'big';
  }
  const gto = postflopGto(hand.street, role, pos, sit, tex, bucket);
  let probs = styledPostflop(style, gto, sit, bucket, hand.street, read, multiway);

  // Facing a really big bet with a middling hand, check the price against a quick equity estimate,
  // so the bots don't hand over stacks with second pair.
  if (sit !== 'open' && (bucket === 'mid' || bucket === 'top' || bucket === 'draw') && o.toCall > potNow * 0.6) {
    const eq = strengthVsRandom(seat.cards, board, Math.max(1, live.length - 1), rng, 120);
    const odds = o.toCall / (potNow + o.toCall);
    const price = eq - odds;
    if (price < -0.08 && style.post.sticky < 0.5) probs = [probs[0] + probs[1] * 0.6, probs[1] * 0.4, probs[2]];
  }

  const choice = pick(rng, probs);
  const bluff = bucket === 'air' || bucket === 'weak';
  if (sit === 'open') {
    if (choice === 0) return { move: check(), bucket };
    const big = choice === 2;
    let frac = big ? (tex === 'wet' ? 0.75 : tex === 'mono' ? 0.66 : 0.7) : tex === 'dry' || tex === 'paired' ? 0.3 : 0.4;
    if (big && hand.street !== 'flop' && rng() < style.post.overbet) frac = 1.25;
    if (hand.street === 'river' && big && (bucket === 'monster' || bluff)) frac = Math.max(frac, 0.8);
    return { move: raiseTo(seat.bet + potNow * frac), bucket, bluff };
  }
  if (choice === 0) return { move: check(), bucket };
  if (choice === 1) return { move: call(), bucket };
  // Raise: about three times the bet, more on wet boards; short stacks go all in.
  const target = hand.currentBet * (tex === 'wet' ? 3.2 : 2.8) + (potNow - hand.currentBet) * 0.3;
  if (stackLeft <= potNow * 1.2) return { move: { move: 'allin' }, bucket, bluff };
  return { move: raiseTo(target), bucket, bluff };
}

// ── Keeping reads ───────────────────────────────────────────────────────────

/** After each hand: what everyone did, as the bots see it (only public moves). */
export function updateReads(game: Game, hand: Hand): void {
  const reads = (game.reads ??= {});
  const acts = hand.actions ?? [];
  const raised = raiseFlags(acts, game.settings.bigBlind);
  for (const s of hand.seats) {
    const r = (reads[s.playerId] ??= { hands: 0, vpip: 0, pfr: 0, betsFaced: 0, foldsToBet: 0, aggr: 0, calls: 0 });
    r.hands++;
    const mine = acts.map((a, i) => ({ a, up: raised[i] })).filter((x) => x.a.street === 'preflop' && x.a.playerId === s.playerId);
    if (mine.some((x) => x.up || isCall(x.a, x.up))) r.vpip++;
    if (mine.some((x) => x.up)) r.pfr++;
  }
  for (const street of ['flop', 'turn', 'river'] as const) {
    let bet = false;
    acts.forEach((a, i) => {
      if (a.street !== street || a.outOfTurn) return;
      const r = reads[a.playerId];
      if (!r) return;
      if (raised[i]) {
        r.aggr++;
        if (bet) r.betsFaced++;
        bet = true;
      } else if (isCall(a, false)) {
        r.calls++;
        r.betsFaced++;
      } else if (a.move === 'fold' && bet) {
        r.foldsToBet++;
        r.betsFaced++;
      }
    });
  }
}
