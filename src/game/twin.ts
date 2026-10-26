// What an AI twin remembers about a player: how often they fold, call, bet and raise in each kind
// of spot, plus the usual poker stats. Built one finished hand at a time from a `HandRecord`, from
// the cards that player could see (their own). Counters only, never stored hands, so it stays small.
// Pure data in, pure data out: the phone keeps it (`src/state/twin.ts`), nothing here touches storage.

import { rankOf, suitOf, type Card } from './cards';
import { handBucket, type Bucket } from './botPlay';
import type { HandAction, HandRecord, Street } from './types';

/** What a player did, grouped so a few hundred hands say something. Counters follow this order. */
export const TWIN_MOVES = ['fold', 'check', 'call', 'betS', 'betB', 'raise', 'allin'] as const;
export type TwinMove = (typeof TWIN_MOVES)[number];

/** What they were facing: nothing, limpers, a bet up to half the pot (or a raise up to 3.5 big blinds before the flop), a bigger one, a raise over a bet, or an all-in. */
export type TwinFacing = 'none' | 'limp' | 'small' | 'big' | 'raise' | 'allin';

/** Before the flop: early, late (cutoff and button), small blind, big blind. After it: in or out of position. */
export type TwinPosition = 'ep' | 'lp' | 'sb' | 'bb' | 'ip' | 'oop';

export interface TwinSpot {
  street: Street;
  pos: TwinPosition;
  /** Before the flop 0 (worst) to 7 (premium); after it the index in POST_BUCKETS. */
  strength: number;
  facing: TwinFacing;
  /** Players still in, with 4 meaning four or more. */
  players: 2 | 3 | 4;
}

/** The post-flop hand buckets from weakest to strongest (a draw sits between a weak hand and a pair). */
export const POST_BUCKETS: readonly Bucket[] = ['air', 'weak', 'draw', 'mid', 'top', 'strong', 'monster'];

/** Counts per spot, in `TWIN_MOVES` order. */
export type SpotCounts = number[];

export interface TwinStats {
  /** Hands that put chips in before the flop (not counting a free big blind), and raised before the flop. */
  vpip: number;
  pfr: number;
  /** First to act before the flop (not the big blind): times, opens, limps, and big blinds opened to. */
  firstIn: number;
  opens: number;
  limps: number;
  openBb: number;
  /** Faced a single raise before the flop: times, 3-bets and folds. */
  raiseFaced: number;
  threeBets: number;
  foldsToRaise: number;
  /** After the flop: bets and raises faced, and folded to. */
  betsFaced: number;
  foldsToBet: number;
  /** After the flop with nobody having bet: times they could and did. */
  betOpps: number;
  bets: number;
  /** On the flop as the last raiser before it. */
  cbetOpps: number;
  cbets: number;
  /** Bets and raises after the flop, and how many were with a draw, a weak hand or nothing. */
  postAgg: number;
  postBluffs: number;
  /** Saw the flop, and showed down. */
  sawFlop: number;
  showdowns: number;
  /** Bet size as a share of the pot when nobody had bet, by post-flop hand bucket. */
  sizeSum: number[];
  sizeN: number[];
}

export interface TwinProfile {
  v: 1;
  hands: number;
  spots: Record<string, SpotCounts>;
  stats: TwinStats;
  /** The last hands counted, so the same one is never counted twice. */
  seen: string[];
}

/** From this many hands a twin is worth playing; it fills up to full confidence at CONFIDENT. */
export const TWIN_READY = 50;
export const TWIN_CONFIDENT = 300;

const MAX_SPOTS = 3000;
const KEEP_SPOTS = 2400;
const MAX_SEEN = 60;
const STATS_KEYS: (keyof Omit<TwinStats, 'sizeSum' | 'sizeN'>)[] = [
  'vpip', 'pfr', 'firstIn', 'opens', 'limps', 'openBb', 'raiseFaced', 'threeBets', 'foldsToRaise',
  'betsFaced', 'foldsToBet', 'betOpps', 'bets', 'cbetOpps', 'cbets', 'postAgg', 'postBluffs', 'sawFlop', 'showdowns',
];

export function emptyTwin(): TwinProfile {
  const stats = Object.fromEntries(STATS_KEYS.map((k) => [k, 0])) as unknown as TwinStats;
  stats.sizeSum = POST_BUCKETS.map(() => 0);
  stats.sizeN = POST_BUCKETS.map(() => 0);
  return { v: 1, hands: 0, spots: {}, stats, seen: [] };
}

/** 0 to 1: how well the twin knows this player. */
export const twinConfidence = (hands: number) => Math.min(1, Math.max(0, hands) / TWIN_CONFIDENT);

export const spotKey = (s: TwinSpot) => `${s.street}|${s.pos}|${s.strength}|${s.facing}|${s.players}`;

export function parseSpotKey(key: string): TwinSpot | null {
  const [street, pos, strength, facing, players] = key.split('|');
  if (!street || !pos || !facing || !players) return null;
  return { street: street as Street, pos: pos as TwinPosition, strength: Number(strength), facing: facing as TwinFacing, players: Number(players) as 2 | 3 | 4 };
}

// ── Reading a hand ──────────────────────────────────────────────────────────

/** Chen's formula for a starting hand, as a tier from 0 (junk) to 7 (premium). */
export function preflopTier(hole: Card[]): number {
  const [a, b] = hole.map(rankOf).sort((x, y) => y - x);
  const points = (r: number) => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
  let score = points(a);
  if (a === b) score = Math.max(5, score * 2);
  else {
    if (suitOf(hole[0]) === suitOf(hole[1])) score += 2;
    const gap = a - b - 1;
    score -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
    if (gap <= 1 && a < 12) score += 1;
  }
  score = Math.ceil(score);
  return score >= 12 ? 7 : score >= 10 ? 6 : score >= 8 ? 5 : score >= 7 ? 4 : score >= 5 ? 3 : score >= 3 ? 2 : score >= 1 ? 1 : 0;
}

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const BOARD_AT: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };
const AGGRESSIVE = new Set(['bet', 'raise', 'allin']);

/** Every decision the hero made in the hand, as the spot they were in and what they did. */
export interface TwinDecision {
  spot: TwinSpot;
  move: TwinMove;
  /** The bet as a share of the pot (after the flop, nobody having bet) or in big blinds (before it). */
  size: number | null;
  action: HandAction;
  /** Chips the hero was asked to put in to stay in. */
  toCall: number;
  /** Was the hero the last to raise before the flop (only set on later streets). */
  preAggressor: boolean;
  raises: number;
}

/** Walks the hand and returns the hero's decisions. Empty when their cards weren't recorded. */
export function heroDecisions(r: HandRecord, heroId: string): TwinDecision[] {
  const hole = r.holes[heroId];
  if (!hole || hole.length !== 2) return [];
  const order = [...r.players].sort((a, b) => a.seat - b.seat);
  const n = order.length;
  const heroIdx = order.findIndex((p) => p.id === heroId);
  const button = order.findIndex((p) => p.id === r.buttonId);
  if (n < 2 || heroIdx < 0 || button < 0) return [];
  const sb = n === 2 ? button : (button + 1) % n;
  const bb = (sb + 1) % n;
  // Seats behind the button: 0 is the button, 1 the cutoff.
  const behind = (button - heroIdx + n) % n;
  const prePos: TwinPosition = heroIdx === sb ? 'sb' : heroIdx === bb ? 'bb' : behind <= 1 ? 'lp' : 'ep';

  const bets = new Map<string, number>();
  for (const [i, p] of order.entries()) bets.set(p.id, i === sb ? Math.min(r.smallBlind, p.stack) : i === bb ? Math.min(r.bigBlind, p.stack) : 0);
  const folded = new Set<string>();
  let street: Street = 'preflop';
  let committed = 0;
  let streetStart = 0;
  let raises = 0;
  let limpers = 0;
  let lastAgg: string | null = null;
  let lastAggMove = '';
  let preAgg: string | null = null;
  const out: TwinDecision[] = [];

  const currentBet = () => Math.max(0, ...bets.values());
  const nextStreet = (to: Street) => {
    for (const [id, v] of bets) {
      committed += v;
      bets.set(id, 0);
    }
    street = to;
    streetStart = committed;
    raises = 0;
    lastAgg = null;
    lastAggMove = '';
  };
  const inPosition = () => {
    let last = '';
    for (let i = 1; i <= n; i++) {
      const p = order[(button + i) % n];
      if (!folded.has(p.id)) last = p.id;
    }
    return last === heroId;
  };

  for (const a of r.actions) {
    while (STREETS.indexOf(a.street) > STREETS.indexOf(street)) {
      if (street === 'preflop') preAgg = lastAgg;
      nextStreet(STREETS[STREETS.indexOf(street) + 1]);
    }
    const mine = bets.get(a.playerId) ?? 0;
    const top = currentBet();
    if (a.playerId === heroId && !a.outOfTurn && r.board.length >= BOARD_AT[street]) {
      const toCall = Math.max(0, top - mine);
      const facing: TwinFacing =
        toCall > 0 && lastAggMove === 'allin' ? 'allin'
        : raises >= 2 ? 'raise'
        : raises === 1 ? (street === 'preflop' ? (top <= r.bigBlind * 3.5 ? 'small' : 'big') : top <= streetStart * 0.5 ? 'small' : 'big')
        : street === 'preflop' && limpers > 0 ? 'limp'
        : 'none';
      const board = r.board.slice(0, BOARD_AT[street]);
      const strength = street === 'preflop' ? preflopTier(hole) : POST_BUCKETS.indexOf(handBucket(hole, board));
      const alive = n - folded.size;
      const aggressive = AGGRESSIVE.has(a.move);
      const unopened = raises === 0;
      const sizeRatio = street === 'preflop' ? a.to / r.bigBlind : streetStart > 0 ? a.to / streetStart : null;
      const small = street === 'preflop' ? a.to <= r.bigBlind * 3.5 : (sizeRatio ?? 0) <= 0.55;
      const move: TwinMove =
        a.move === 'allin' ? 'allin'
        : a.move === 'fold' ? 'fold'
        : a.move === 'check' ? 'check'
        : a.move === 'call' ? 'call'
        : unopened ? (small ? 'betS' : 'betB')
        : 'raise';
      out.push({
        spot: { street, pos: street === 'preflop' ? prePos : inPosition() ? 'ip' : 'oop', strength, facing, players: Math.min(4, Math.max(2, alive)) as 2 | 3 | 4 },
        move,
        size: aggressive && unopened && a.move !== 'allin' ? sizeRatio : null,
        action: a,
        toCall,
        preAggressor: preAgg === heroId,
        raises,
      });
    }
    // Then the move itself, for whoever made it.
    if (a.move === 'fold') folded.add(a.playerId);
    else if (a.move !== 'check') {
      bets.set(a.playerId, Math.max(a.to, mine));
      if (AGGRESSIVE.has(a.move) && a.to > top) {
        raises++;
        lastAgg = a.playerId;
        lastAggMove = a.move;
      } else if (a.move === 'call' && street === 'preflop' && raises === 0 && a.playerId !== order[bb].id) limpers++;
    }
  }
  return out;
}

// ── Counting ────────────────────────────────────────────────────────────────

/** Adds one finished hand. `key` makes a repeat harmless. Returns false when it wasn't counted. */
export function addHandToTwin(twin: TwinProfile, r: HandRecord, heroId: string, key: string): boolean {
  if (twin.seen.includes(key)) return false;
  const decisions = heroDecisions(r, heroId);
  if (!r.holes[heroId] || r.holes[heroId].length !== 2) return false;
  const s = twin.stats;
  let vpip = false;
  let pfr = false;

  for (const d of decisions) {
    const { spot, move } = d;
    const counts = (twin.spots[spotKey(spot)] ??= TWIN_MOVES.map(() => 0));
    counts[TWIN_MOVES.indexOf(move)]++;
    const aggressive = move === 'betS' || move === 'betB' || move === 'raise' || move === 'allin';

    if (spot.street === 'preflop') {
      if (move === 'call' || aggressive) vpip = true;
      if (aggressive) pfr = true;
      if (spot.facing === 'none' && spot.pos !== 'bb') {
        s.firstIn++;
        if (move === 'call') s.limps++;
        if (aggressive) {
          s.opens++;
          s.openBb += d.size ?? d.action.to / (r.bigBlind || 1);
        }
      }
      if (d.raises === 1 && d.toCall > 0) {
        s.raiseFaced++;
        if (move === 'fold') s.foldsToRaise++;
        if (aggressive) s.threeBets++;
      }
      continue;
    }

    if (d.toCall > 0 && (spot.facing === 'small' || spot.facing === 'big' || spot.facing === 'raise' || spot.facing === 'allin')) {
      s.betsFaced++;
      if (move === 'fold') s.foldsToBet++;
    }
    if (d.raises === 0 && (move === 'check' || aggressive)) {
      s.betOpps++;
      if (aggressive) s.bets++;
      if (spot.street === 'flop' && d.preAggressor) {
        s.cbetOpps++;
        if (aggressive) s.cbets++;
      }
    }
    if (aggressive) {
      s.postAgg++;
      if (spot.strength <= POST_BUCKETS.indexOf('draw')) s.postBluffs++;
      if (d.size !== null) {
        s.sizeSum[spot.strength] += Math.min(3, d.size);
        s.sizeN[spot.strength]++;
      }
    }
  }

  const heroFolded = r.actions.some((a) => a.playerId === heroId && a.move === 'fold');
  const foldedPre = r.actions.some((a) => a.playerId === heroId && a.move === 'fold' && a.street === 'preflop');
  if (vpip) s.vpip++;
  if (pfr) s.pfr++;
  if (r.board.length >= 3 && !foldedPre) s.sawFlop++;
  if (r.showdown && !heroFolded) s.showdowns++;
  twin.hands++;
  twin.seen = [...twin.seen, key].slice(-MAX_SEEN);

  // Rare spots drop out before they fill the phone.
  const keys = Object.keys(twin.spots);
  if (keys.length > MAX_SPOTS) {
    const total = (k: string) => twin.spots[k].reduce((t, v) => t + v, 0);
    const keep = new Set(keys.sort((x, y) => total(y) - total(x)).slice(0, KEEP_SPOTS));
    for (const k of Object.keys(twin.spots)) if (!keep.has(k)) delete twin.spots[k];
  }
  return true;
}

/** A saved twin that's the wrong shape (or from a newer version) comes back empty. */
export function sanitizeTwin(raw: unknown): TwinProfile {
  const base = emptyTwin();
  const t = raw as Partial<TwinProfile> | null;
  if (!t || t.v !== 1 || typeof t.hands !== 'number' || !t.stats || typeof t.stats !== 'object' || !t.spots || typeof t.spots !== 'object') return base;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const stats = base.stats;
  for (const k of STATS_KEYS) stats[k] = num((t.stats as unknown as Record<string, unknown>)[k]);
  for (let i = 0; i < POST_BUCKETS.length; i++) {
    stats.sizeSum[i] = num(t.stats.sizeSum?.[i]);
    stats.sizeN[i] = num(t.stats.sizeN?.[i]);
  }
  const spots: Record<string, SpotCounts> = {};
  for (const [k, v] of Object.entries(t.spots)) {
    if (Array.isArray(v) && v.length === TWIN_MOVES.length && parseSpotKey(k)) spots[k] = v.map(num);
  }
  return { v: 1, hands: num(t.hands), spots, stats, seen: Array.isArray(t.seen) ? t.seen.filter((x) => typeof x === 'string').slice(-MAX_SEEN) : [] };
}
