// How a bot reads the other players: what hands each one could have, given everything they've done
// this hand (public moves only) and what the bots have seen of them before. A bot imagines a few
// hundred hands for its opponents, weighted by how well each fits their story, plays the board out
// and counts how often it wins. The same imagined hands tell it how often a bet would make them fold.
//
// Fair play: this only ever looks at the bot's own cards, the board and the public moves. It never
// touches the deck or anyone else's hole cards, even though the server has them.

import charts from './botCharts.json';
import { boardInfo, classIndexOf, COMBOS, score, tierWith, toInt, type BoardInfo, type CardInt } from './botEval';
import { potTotal } from './holdem';
import type { Game, Hand, Move, PlayerRead, Seat, Street } from './types';

// ── Starting hands ─────────────────────────────────────────────────────────

type ChartFile = { classes: string[]; charts: Record<string, { names: string[]; spots: Record<string, string> }> };
export const CHARTS = charts as ChartFile;
export const CLASSES = CHARTS.classes;
export const CLASS_INDEX = new Map(CLASSES.map((c, i) => [c, i]));
export const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

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

/** Rough hand strength from 0 (worst) to 1 (best), from each class's place in the opening chart of the first seat. */
export const STRENGTH = (() => {
  const s = CHARTS.charts['6p100']?.spots['rfi.0'] ?? '';
  const raise = CLASSES.map((_, i) => DIGITS.indexOf(s[i * 2 + 1] ?? '0') / 35);
  // Ties (lots of 0s and 1s) broken by the Chen-style order below.
  const order = CLASSES.map((c, i) => ({ c, v: raise[i] * 10 + chenLike(c) / 20 }));
  order.sort((a, b) => a.v - b.v);
  return new Map(order.map((o, i) => [o.c, i / (order.length - 1)]));
})();

const combosOf = (cls: string) => (cls.length === 2 ? 6 : cls[2] === 's' ? 4 : 12);

/** For each class: the share of all starting hands at least this strong (aces about 0.005, the worst hand 1). */
export const TOP = (() => {
  const top = new Float64Array(CLASSES.length);
  const order = CLASSES.map((c, i) => ({ i, s: STRENGTH.get(c) ?? 0, n: combosOf(c) })).sort((a, b) => b.s - a.s);
  let seen = 0;
  for (const o of order) {
    seen += o.n;
    top[o.i] = seen / 1326;
  }
  return top;
})();

const COMBO_CLASS = Int16Array.from(COMBOS.map(([a, b]) => classIndexOf(a, b, CLASS_INDEX)));

/** The class index of two hole cards. */
export const classOfInts = (a: CardInt, b: CardInt) => classIndexOf(a, b, CLASS_INDEX);

// ── What the bots know about a player ──────────────────────────────────────

export interface Read {
  vpip: number;
  pfr: number;
  foldToBet: number;
  aggression: number;
  /** Share of hands they move all in before the flop. */
  shove: number;
  /** Of the hands they've shown after betting the turn or river, the share that were bluffs. */
  bluffy: number;
  /** How often they bet after the flop when nobody has bet yet. Shows without any showdowns. */
  betFreq: number;
  /** 0 (never seen them) to 1 (seen plenty). */
  known: number;
}

export const PRIOR = { hands: 8, vpip: 0.3, pfr: 0.16, foldToBet: 0.45, aggression: 1.4, shove: 0.01, bluffy: 0.25, betFreq: 0.42 };

/** What a bot has seen of a player, eased towards an average pub player until there are enough hands. */
export function readOf(r: PlayerRead | undefined): Read {
  const h = r?.hands ?? 0;
  const mix = (seen: number, n: number, prior: number, k = PRIOR.hands) => (seen + prior * k) / (n + k);
  return {
    vpip: mix(r?.vpip ?? 0, h, PRIOR.vpip),
    pfr: mix(r?.pfr ?? 0, h, PRIOR.pfr),
    foldToBet: mix(r?.foldsToBet ?? 0, r?.betsFaced ?? 0, PRIOR.foldToBet),
    aggression: ((r?.aggr ?? 0) + PRIOR.aggression * 4) / ((r?.calls ?? 0) + 4),
    shove: mix(r?.shoves ?? 0, h, PRIOR.shove, 12),
    bluffy: mix(r?.shownBluffs ?? 0, r?.shownBets ?? 0, PRIOR.bluffy, 5),
    betFreq: mix(r?.bets ?? 0, r?.betOpps ?? 0, PRIOR.betFreq, 6),
    known: h / (h + 20),
  };
}

// ── Reading a hand's public moves ──────────────────────────────────────────

export type PreLine = 'blind' | 'limp' | 'open' | 'call' | '3bet' | 'call3' | '4bet' | 'shove';

/** One move after the flop, with its size as a share of the pot it went into. */
export interface PostMove {
  street: Street;
  kind: 'check' | 'bet' | 'call' | 'raise';
  frac: number;
}

export interface Story {
  pre: PreLine;
  /** Their opening raise, in big blinds (0 if they didn't open). */
  openBb: number;
  post: PostMove[];
}

const AGGRESSIVE: Move[] = ['bet', 'raise', 'allin'];

/** Seats in the order they act before the flop: 0 first, the big blind last (heads up the button is 0). */
export function preflopOrder(hand: Hand): string[] {
  const n = hand.seats.length;
  const ids = hand.seats.map((s) => s.playerId);
  const button = ids.indexOf(hand.buttonId);
  if (n === 2) return [ids[button], ids[(button + 1) % 2]];
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(ids[(button + 3 + i) % n]);
  return out;
}

/** Everything one player has done this hand, as a story. */
export function storyOf(game: Game, hand: Hand, playerId: string): Story {
  const bb = game.settings.bigBlind;
  const acts = (hand.actions ?? []).filter((a) => !a.outOfTurn);
  let level = 0;
  let cur = bb;
  let pre: PreLine = 'blind';
  let openBb = 0;
  for (const a of acts) {
    if (a.street !== 'preflop') break;
    const raises = AGGRESSIVE.includes(a.move) && a.to > cur;
    if (a.playerId === playerId) {
      if (raises) {
        const startStack = (hand.startStacks?.[playerId] ?? 0) / bb;
        const shove = a.move === 'allin' && level === 0 && a.to / bb >= 8 && a.to >= (hand.startStacks?.[playerId] ?? Infinity) * 0.9;
        pre = shove ? 'shove' : level === 0 ? 'open' : level === 1 ? '3bet' : '4bet';
        if (level === 0) openBb = a.to / bb;
        if (shove && startStack > 0) openBb = startStack;
      } else if (a.move === 'call' || a.move === 'allin') pre = level === 0 ? 'limp' : level === 1 ? 'call' : 'call3';
      else if (a.move === 'check') pre = 'blind';
    }
    if (raises) {
      level++;
      cur = a.to;
    }
  }

  // After the flop: replay each street to know the pot every bet went into.
  const post: PostMove[] = [];
  const postStreets: Street[] = ['flop', 'turn', 'river'];
  const put = new Map<Street, number>();
  for (const st of postStreets) {
    const most = new Map<string, number>();
    for (const a of acts) if (a.street === st && a.move !== 'fold' && a.move !== 'check') most.set(a.playerId, Math.max(most.get(a.playerId) ?? 0, a.to));
    put.set(st, [...most.values()].reduce((x, y) => x + y, 0));
  }
  let pot = potTotal(hand) - postStreets.reduce((x, st) => x + (put.get(st) ?? 0), 0);
  for (const st of postStreets) {
    const bets = new Map<string, number>();
    let top = 0;
    for (const a of acts) {
      if (a.street !== st) continue;
      const inPot = pot + [...bets.values()].reduce((x, y) => x + y, 0);
      const facing = top > (bets.get(a.playerId) ?? 0);
      if (a.playerId === playerId && a.move !== 'fold') {
        if (a.move === 'check') post.push({ street: st, kind: 'check', frac: 0 });
        else if (AGGRESSIVE.includes(a.move) && a.to > top) post.push({ street: st, kind: facing ? 'raise' : 'bet', frac: (a.to - top) / Math.max(1, inPot) });
        else post.push({ street: st, kind: 'call', frac: (top - (bets.get(a.playerId) ?? 0)) / Math.max(1, inPot) });
      }
      if (a.move !== 'fold' && a.move !== 'check') {
        bets.set(a.playerId, Math.max(bets.get(a.playerId) ?? 0, a.to));
        top = Math.max(top, a.to);
      }
    }
    pot += [...bets.values()].reduce((x, y) => x + y, 0);
  }
  return { pre, openBb, post };
}

// ── Ranges ─────────────────────────────────────────────────────────────────

/** Weight for each class in a "top x of hands" range, with a soft edge so it isn't a hard cut. */
function top(x: number, out: Float64Array, scale = 1): void {
  for (let i = 0; i < out.length; i++) out[i] += scale * Math.max(0, Math.min(1, (x - TOP[i]) / 0.05 + 0.5));
}

/** A push-or-fold range width for a short stack: roughly what shoving charts say, by stack and players behind. */
export function shoveWidth(stackBb: number, behind: number): number {
  return Math.max(0.04, Math.min(0.92, (3.2 / Math.max(1, stackBb)) * (1.6 / (1 + 0.35 * behind))));
}

/** How likely each starting hand is for a player, from what they did before the flop. */
export function preflopRange(game: Game, hand: Hand, playerId: string, story: Story, read: Read): Float64Array {
  const w = new Float64Array(CLASSES.length);
  const order = preflopOrder(hand);
  const n = order.length;
  const behind = n - 1 - order.indexOf(playerId);
  // How much wider than their average raise this seat opens (heads up, the button opens most hands).
  const pos = n === 2 ? 1.9 : Math.max(0.6, Math.min(1.9, 1.9 - 0.17 * behind));
  const pfr = read.pfr;
  const vpip = Math.max(read.vpip, pfr + 0.02);
  const stackBb = (hand.startStacks?.[playerId] ?? game.settings.startingStack) / game.settings.bigBlind;
  switch (story.pre) {
    case 'blind':
      top(1.1, w);
      top(pfr * 0.5, w, -0.7);
      break;
    case 'limp':
      top(Math.min(1, vpip * 1.1 * (n === 2 ? 2 : 1)), w);
      top(pfr * 0.6, w, -0.75);
      break;
    case 'open': {
      // Bigger opens from most people mean bigger hands.
      const size = story.openBb > 4.5 && read.aggression < 2.5 ? 0.7 : 1;
      top(Math.min(0.95, pfr * pos * size), w);
      break;
    }
    case 'shove':
      top(Math.max(Math.min(0.9, 0.04 + read.shove * 4), stackBb <= 20 ? shoveWidth(stackBb, behind) : 0), w);
      break;
    case 'call':
      top(Math.min(0.9, vpip * 0.8 * (n === 2 ? 2 : 1)), w);
      top(pfr * 0.25, w, -0.6);
      break;
    case '3bet':
      top(Math.max(0.03, pfr * 0.4), w);
      break;
    case 'call3':
      top(Math.max(0.05, pfr * 0.6), w);
      top(0.025, w, -0.5);
      break;
    case '4bet':
      top(Math.max(0.02, pfr * 0.18), w);
      break;
  }
  for (let i = 0; i < w.length; i++) w[i] = Math.max(0.002, Math.min(1, w[i]));
  return w;
}

// How likely each kind of hand (see tier() in botEval.ts: 0 air … 6 the near-nuts) is to make each move.
// Only the ratios between hands matter.
const CHECK = [0.75, 0.8, 0.55, 0.75, 0.45, 0.35, 0.35];
const BET_SMALL = [0.22, 0.22, 0.4, 0.3, 0.55, 0.6, 0.55];
const BET_BIG = [0.18, 0.1, 0.45, 0.15, 0.4, 0.65, 0.7];
const BET_HUGE = [0.2, 0.05, 0.3, 0.05, 0.2, 0.55, 0.8];
const CALL = [0.06, 0.3, 0.75, 0.6, 0.85, 0.6, 0.45];
const RAISE = [0.05, 0.03, 0.22, 0.04, 0.1, 0.45, 0.8];

/** Most people bluff less as the hand goes on: a big river bet is usually a real hand. */
const LATE: Record<Street, number> = { preflop: 1, flop: 1, turn: 0.85, river: 0.65 };

/**
 * How much more (or less) than usual their bets and raises are made with nothing. Only what they've
 * shown down counts here: betting a lot isn't the same as bluffing a lot (a nit bets every time it
 * has it). How often they bet is used elsewhere, to decide how light to call (see `BET_CALL`).
 */
export function bluffWeight(read: Read): number {
  const shown = Math.max(0.3, 1 + (read.bluffy - PRIOR.bluffy) * 2.5);
  const lean = 0.6 + 0.4 * Math.max(0.5, Math.min(2, read.aggression / PRIOR.aggression));
  return lean * shown;
}

/** How likely a hand of tier `t` is to have made this move, for a player with this read. */
function moveLikelihood(m: PostMove, t: number, read: Read): number {
  const bluffs = bluffWeight(read);
  const sticky = Math.max(0.4, Math.min(2.2, (1 - read.foldToBet) / (1 - PRIOR.foldToBet)));
  switch (m.kind) {
    case 'check':
      return CHECK[t];
    case 'bet': {
      const table = m.frac <= 0.55 ? BET_SMALL : m.frac <= 1.05 ? BET_BIG : BET_HUGE;
      return table[t] * (t <= 1 ? bluffs * LATE[m.street] : t === 2 ? Math.sqrt(bluffs) : 1);
    }
    case 'raise':
      return RAISE[t] * (t <= 1 ? bluffs * LATE[m.street] : t === 2 ? Math.sqrt(bluffs) : 1);
    case 'call': {
      const price = t === 0 || t === 1 || t === 3 ? Math.max(0.3, 1 - 0.6 * (m.frac - 0.33)) : 1;
      return CALL[t] * price * (t <= 3 && t !== 2 ? sticky : 1);
    }
  }
}

/** About how often each tier of hand wins against a betting range (what a player weighs against the price). */
const TIER_EQUITY = [0.1, 0.2, 0.36, 0.38, 0.55, 0.72, 0.9];

/**
 * How likely a hand of tier `t` is to keep going against a bet of `frac` of the pot: players call
 * when their hand seems worth the price, a little more when they're sticky or already committed,
 * and less against a raise (it shows strength).
 */
export function continueChance(t: number, frac: number, river: boolean, read: Read, committed = 0, raise = false): number {
  if (t === 6) return 1;
  const price = frac / (1 + 2 * frac);
  const sticky = (PRIOR.foldToBet - read.foldToBet) * 0.4;
  const worth = (t === 2 && river ? 0.05 : TIER_EQUITY[t]) + sticky + committed * 0.25 - (raise ? 0.12 : 0);
  const c = 0.03 + 0.95 / (1 + Math.exp(-(worth - price) / 0.08));
  // Nobody folds to a tiny raise: the price is too good.
  return Math.max(c, Math.min(1, 1 - price * 4));
}

/** How likely a hand of tier `t` is to raise a bet (so a bettor with a weak hand loses its bet). */
function raiseChance(t: number, river: boolean, read: Read): number {
  const bluffs = bluffWeight(read);
  return [0.03 * bluffs, 0.03 * bluffs, river ? 0.02 : 0.12 * bluffs, 0.03, 0.06, 0.2, 0.35][t];
}

// ── Imagining the other hands ──────────────────────────────────────────────

export interface Opponent {
  id: string;
  read: Read;
  story: Story;
}

/** A few hundred imagined deals, each weighted by how well it fits everyone's story. */
export interface Imagined {
  n: number;
  opps: number;
  /** Weight of each deal. */
  w: Float64Array;
  /** 1 win, 0.5 split, 0 lose, against everyone still in. */
  win: Float64Array;
  /** Each opponent's tier on the board as it is now, deal by deal (n × opps). */
  tiers: Int8Array;
  /** Each opponent's starting hand class, deal by deal (n × opps). */
  cls: Int16Array;
  /** Share of the total weight in the best deals: low means the stories were hard to fit (few useful samples). */
  quality: number;
}

const STREET_CARDS: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

/**
 * Deals hands to every opponent from their ranges, runs the board out and records who wins.
 * `uniform` ignores the ranges (how a player who only looks at their own cards sees things).
 */
export function imagine(hole: Card2, board: CardInt[], street: Street, opps: Opponent[], ranges: Float64Array[], rng: () => number, n: number, uniform = false): Imagined {
  const dead = new Uint8Array(52);
  dead[hole[0]] = 1;
  dead[hole[1]] = 1;
  for (const c of board) dead[c] = 1;
  const m = opps.length;
  // Cumulative weights over the 1326 combos for each opponent (dead cards out).
  const cums = ranges.map((r) => {
    const cum = new Float64Array(COMBOS.length);
    let t = 0;
    for (let i = 0; i < COMBOS.length; i++) {
      const [a, b] = COMBOS[i];
      if (!dead[a] && !dead[b]) t += uniform ? 1 : r[COMBO_CLASS[i]];
      cum[i] = t;
    }
    return cum;
  });
  const fit = opps.map(() => new Float32Array(COMBOS.length).fill(-1));
  // Each combo's tier on each street's board, shared by every opponent (worked out when first needed).
  const tierOn: Partial<Record<Street, Int8Array>> = {};
  const tierAt = (st: Street, idx: number): number => {
    const cache = (tierOn[st] ??= new Int8Array(COMBOS.length).fill(-1));
    let t = cache[idx];
    if (t < 0) {
      const [a, b] = COMBOS[idx];
      t = tierWith(a, b, boards[st]!, scratch);
      cache[idx] = t;
    }
    return t;
  };
  const boards: Partial<Record<Street, BoardInfo>> = {};
  if (street !== 'preflop') for (const st of ['flop', 'turn', 'river'] as const) if (board.length >= STREET_CARDS[st]) boards[st] = boardInfo(board.slice(0, STREET_CARDS[st]));
  const scratch: CardInt[] = [];
  const out: Imagined = { n: 0, opps: m, w: new Float64Array(n), win: new Float64Array(n), tiers: new Int8Array(n * m), cls: new Int16Array(n * m), quality: 1 };
  const used = new Uint8Array(52);
  const deck: CardInt[] = [];
  for (let c = 0; c < 52; c++) if (!dead[c]) deck.push(c);
  const need = 5 - board.length;
  const full = board.slice();
  const mine: CardInt[] = [hole[0], hole[1], ...board];
  const theirs: CardInt[] = [0, 0, ...board];
  const picked = new Int32Array(m);

  // One deal of hands to everyone (no shared cards); returns its fit weight, or -1 if it couldn't.
  const draw = (into: Int32Array): number => {
    used.fill(0);
    let w = 1;
    for (let o = 0; o < m; o++) {
      const cum = cums[o];
      const total = cum[cum.length - 1];
      let idx = -1;
      for (let tries = 0; tries < 6 && idx < 0; tries++) {
        const x = rng() * total;
        let lo = 0;
        let hi = cum.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (cum[mid] > x) hi = mid;
          else lo = mid + 1;
        }
        const [a, b] = COMBOS[lo];
        if (!used[a] && !used[b]) idx = lo;
      }
      if (idx < 0) return -1;
      into[o] = idx;
      const [a, b] = COMBOS[idx];
      used[a] = 1;
      used[b] = 1;
      // How well this hand fits their moves after the flop.
      if (!uniform && street !== 'preflop') {
        let f = fit[o][idx];
        if (f < 0) {
          f = 1;
          for (const mv of opps[o].story.post) f *= moveLikelihood(mv, tierAt(mv.street, idx), opps[o].read);
          fit[o][idx] = f;
        }
        w *= f;
      }
    }
    return w;
  };
  // Several tries per deal, keeping one in proportion to how well it fits: far fewer wasted run-outs
  // when someone's story is narrow (a big raise on the turn), and the average stays fair.
  const tries = uniform || street === 'preflop' ? 1 : 3;
  const candidate = new Int32Array(m);
  for (let s = 0; s < n; s++) {
    let sum = 0;
    for (let k = 0; k < tries; k++) {
      const w = draw(candidate);
      if (w <= 0) continue;
      sum += w;
      if (rng() * sum < w) picked.set(candidate);
    }
    if (sum <= 0) continue;
    const w = sum / tries;
    used.fill(0);
    for (let o = 0; o < m; o++) {
      const [a, b] = COMBOS[picked[o]];
      used[a] = 1;
      used[b] = 1;
    }
    // Run the board out.
    full.length = board.length;
    for (let k = 0; k < need; k++) {
      let c: CardInt;
      do c = deck[Math.floor(rng() * deck.length)];
      while (used[c]);
      used[c] = 1;
      full.push(c);
    }
    mine.length = 2;
    for (const c of full) mine.push(c);
    const my = score(mine);
    let result = 1;
    let ties = 0;
    for (let o = 0; o < m; o++) {
      const [a, b] = COMBOS[picked[o]];
      theirs.length = 0;
      theirs.push(a, b);
      for (const c of full) theirs.push(c);
      const t = score(theirs);
      if (t > my) {
        result = 0;
        break;
      }
      if (t === my) ties++;
    }
    if (result && ties) result = 1 / (ties + 1);
    // Each opponent's hand as they'd see it now (for how they'd react to a bet).
    if (street !== 'preflop') for (let o = 0; o < m; o++) out.tiers[out.n * m + o] = tierAt(street, picked[o]);
    for (let o = 0; o < m; o++) out.cls[out.n * m + o] = COMBO_CLASS[picked[o]];
    out.w[out.n] = w;
    out.win[out.n] = result;
    out.n++;
  }
  // Effective sample size, as a share of the samples.
  let sw = 0;
  let sw2 = 0;
  for (let i = 0; i < out.n; i++) {
    sw += out.w[i];
    sw2 += out.w[i] * out.w[i];
  }
  out.quality = sw2 > 0 ? (sw * sw) / sw2 / Math.max(1, out.n) : 0;
  return out;
}

export type Card2 = [CardInt, CardInt];

/** Chance of winning, over the imagined deals. */
export function equityOf(im: Imagined): number {
  let sw = 0;
  let s = 0;
  for (let i = 0; i < im.n; i++) {
    sw += im.w[i];
    s += im.w[i] * im.win[i];
  }
  return sw > 0 ? s / sw : 0.5;
}

/**
 * What happens if the bot bets `frac` of the pot: how often everyone folds, how often someone raises,
 * and its chance of winning when someone calls. `raise` is for raising their bet (they've already
 * shown some strength). `committed` is how much of each opponent's chips are already in (0 to 1).
 */
export function betOutcome(im: Imagined, opps: Opponent[], frac: number, river: boolean, raise = false, committed: number[] = []): { fold: number; raised: number; eqCalled: number } {
  let sw = 0;
  let sFold = 0;
  let sRaise = 0;
  let sCont = 0;
  let sWin = 0;
  const m = im.opps;
  for (let i = 0; i < im.n; i++) {
    const w = im.w[i];
    let allFold = 1;
    let noRaise = 1;
    for (let o = 0; o < m; o++) {
      const t = im.tiers[i * m + o];
      allFold *= 1 - continueChance(t, frac, river, opps[o].read, committed[o] ?? 0, raise);
      if (!raise) noRaise *= 1 - raiseChance(t, river, opps[o].read);
    }
    sw += w;
    sFold += w * allFold;
    sRaise += w * (1 - allFold) * (1 - noRaise);
    sCont += w * (1 - allFold);
    sWin += w * (1 - allFold) * im.win[i];
  }
  return { fold: sw > 0 ? sFold / sw : 0, raised: sw > 0 ? sRaise / sw : 0, eqCalled: sCont > 0 ? sWin / sCont : 0.5 };
}

/**
 * Before the flop, if the bot moves all in: each opponent calls with the part of their range that's
 * worth the price (`prices[o]`: their share of the final pot to call) and folds the rest. Looser
 * players call wider.
 */
export function jamOutcome(im: Imagined, opps: Opponent[], prices: number[]): { fold: number; eqCalled: number } {
  // Roughly how often a hand in the top p of starting hands wins against a jamming range.
  const callTop = opps.map((x, o) => Math.max(0.01, Math.min(1, ((0.69 - prices[o]) / 0.42) ** 2 * Math.sqrt(x.read.vpip / PRIOR.vpip))));
  let sw = 0;
  let sFold = 0;
  let sCont = 0;
  let sWin = 0;
  const m = im.opps;
  for (let i = 0; i < im.n; i++) {
    let allFold = 1;
    for (let o = 0; o < m; o++) allFold *= 1 / (1 + Math.exp((callTop[o] - TOP[im.cls[i * m + o]]) / 0.02));
    const w = im.w[i];
    sw += w;
    sFold += w * allFold;
    sCont += w * (1 - allFold);
    sWin += w * (1 - allFold) * im.win[i];
  }
  return { fold: sw > 0 ? sFold / sw : 0, eqCalled: sCont > 0 ? sWin / sCont : 0.5 };
}

export const intsOf = (cards: string[]) => cards.map(toInt);
export const boardCards = (hand: Hand) => hand.board.slice(0, STREET_CARDS[hand.street]).map(toInt);

/** The opponents still in the hand, with their stories and reads. */
export function opponentsOf(game: Game, hand: Hand, seat: Seat): Opponent[] {
  return hand.seats
    .filter((s) => s !== seat && !s.folded)
    .map((s) => ({ id: s.playerId, read: readOf(game.reads?.[s.playerId]), story: storyOf(game, hand, s.playerId) }));
}
