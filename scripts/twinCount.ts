// Counts a player's numbers from finished hands: how often they fold, call, bet and raise in each kind of spot, plus the
// usual poker stats. Lab-only: `twinHarness.ts` uses it to measure the ten bot styles (`twinLab.ts ref` regenerates
// `src/game/twinRef.json`, which `fitStyle()` reads) and to check how a fitted style plays. It moved here from
// `src/game/twin.ts` when AI twins (a bot that learned from a person's own hands) were removed: nothing in the app,
// the Worker or the website counts hands any more.

import { rankOf, suitOf, type Card } from '../src/game/cards';
import { handBucket } from '../src/game/handBucket';
import type { HandAction, HandRecord, Street } from '../src/game/types';
import { emptyTwin, POST_BUCKETS, type TwinProfile } from '../src/game/twin';

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
  /** After the flop: 'a' if they made the last bet or raise on the street before (they have the initiative), else 'd'. Always 'd' before the flop. */
  role: 'a' | 'd';
}

/** Counts per spot, in `TWIN_MOVES` order. */
export type SpotCounts = number[];

/** A profile with the per-spot counters too (the live one only needs the numbers). */
export type CountedTwin = TwinProfile & {
  spots: Record<string, SpotCounts>;
  /** The last hands counted, so the same one is never counted twice. */
  seen: string[];
};

export const emptyCounted = (): CountedTwin => ({ ...emptyTwin(), spots: {}, seen: [] });

const MAX_SPOTS = 3000;
const KEEP_SPOTS = 2400;
const MAX_SEEN = 60;

export const spotKey = (s: TwinSpot) => `${s.street}|${s.pos}|${s.strength}|${s.facing}|${s.players}|${s.role}`;

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

/** The hero's spot right now, in a hand still being played (what a twin looks up before it moves). */
export interface TwinNow {
  spot: TwinSpot;
  toCall: number;
  preAggressor: boolean;
  raises: number;
}

/** Walks the hand and returns the hero's decisions. Empty when their cards weren't recorded. */
export function heroDecisions(r: HandRecord, heroId: string, observed = false): TwinDecision[] {
  return walkHand(r, heroId, null, observed).decisions;
}

/** `observed`: someone else's hand, seen from outside, so their cards may be missing (their hand strength then reads -1). */
function walkHand(r: HandRecord, heroId: string, nextStreet: Street | null, observed = false): { decisions: TwinDecision[]; now: TwinNow | null } {
  const none = { decisions: [], now: null };
  const hole = r.holes[heroId];
  if (!observed && (!hole || hole.length !== 2)) return none;
  const order = [...r.players].sort((a, b) => a.seat - b.seat);
  const n = order.length;
  const heroIdx = order.findIndex((p) => p.id === heroId);
  const button = order.findIndex((p) => p.id === r.buttonId);
  if (n < 2 || heroIdx < 0 || button < 0) return none;
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
  // Who made the last bet or raise on the street before this one.
  let prevAgg: string | null = null;
  const out: TwinDecision[] = [];

  const currentBet = () => Math.max(0, ...bets.values());
  const startStreet = (to: Street) => {
    for (const [id, v] of bets) {
      committed += v;
      bets.set(id, 0);
    }
    street = to;
    streetStart = committed;
    raises = 0;
    prevAgg = lastAgg;
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

  /** Where the hero stands, given the chips they'd need to put in to stay in. */
  const readSpot = (owed: number) => {
    const toCall = Math.max(0, owed);
    const top = currentBet();
    const facing: TwinFacing =
      toCall > 0 && lastAggMove === 'allin' ? 'allin'
      : raises >= 2 ? 'raise'
      : raises === 1 ? (street === 'preflop' ? (top <= r.bigBlind * 3.5 ? 'small' : 'big') : top <= streetStart * 0.5 ? 'small' : 'big')
      : street === 'preflop' && limpers > 0 ? 'limp'
      : 'none';
    const board = r.board.slice(0, BOARD_AT[street]);
    const strength = !hole || hole.length !== 2 ? -1 : street === 'preflop' ? preflopTier(hole) : POST_BUCKETS.indexOf(handBucket(hole, board));
    const spot: TwinSpot = {
      street,
      pos: street === 'preflop' ? prePos : inPosition() ? 'ip' : 'oop',
      strength,
      facing,
      players: Math.min(4, Math.max(2, n - folded.size)) as 2 | 3 | 4,
      role: street !== 'preflop' && prevAgg === heroId ? 'a' : 'd',
    };
    return { spot, toCall };
  };

  for (const a of r.actions) {
    while (STREETS.indexOf(a.street) > STREETS.indexOf(street)) {
      if (street === 'preflop') preAgg = lastAgg;
      startStreet(STREETS[STREETS.indexOf(street) + 1]);
    }
    const mine = bets.get(a.playerId) ?? 0;
    const top = currentBet();
    if (a.playerId === heroId && !a.outOfTurn && r.board.length >= BOARD_AT[street]) {
      const { spot, toCall } = readSpot(top - mine);
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
        spot,
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
  let now: TwinNow | null = null;
  if (nextStreet) {
    while (STREETS.indexOf(nextStreet) > STREETS.indexOf(street)) {
      if (street === 'preflop') preAgg = lastAgg;
      startStreet(STREETS[STREETS.indexOf(street) + 1]);
    }
    if (r.board.length >= BOARD_AT[street]) {
      const { spot, toCall } = readSpot(currentBet() - (bets.get(heroId) ?? 0));
      now = { spot, toCall, preAggressor: preAgg === heroId, raises };
    }
  }
  return { decisions: out, now };
}

// ── Counting ────────────────────────────────────────────────────────────────

/** Adds one finished hand. `key` makes a repeat harmless. Returns false when it wasn't counted. */
export function addHandToTwin(twin: CountedTwin, r: HandRecord, heroId: string, key: string, observed = false): boolean {
  if (twin.seen.includes(key)) return false;
  if (!observed && (!r.holes[heroId] || r.holes[heroId].length !== 2)) return false;
  const decisions = heroDecisions(r, heroId, observed);
  const s = twin.stats;
  let vpip = false;
  let pfr = false;

  for (const d of decisions) {
    const { spot, move } = d;
    // Seen from outside there are no cards, so no hand strength: only the counts that don't need it.
    if (!observed) {
      const counts = (twin.spots[spotKey(spot)] ??= TWIN_MOVES.map(() => 0));
      counts[TWIN_MOVES.indexOf(move)]++;
    }
    const aggressive = move === 'betS' || move === 'betB' || move === 'raise' || move === 'allin';

    if (spot.street === 'preflop') {
      if (move === 'call' || aggressive) vpip = true;
      if (aggressive) pfr = true;
      if (spot.facing === 'none' && spot.pos !== 'bb') {
        s.firstIn++;
        if (move === 'call') s.limps++;
        // Moving in isn't an open size.
        if (aggressive && move !== 'allin') {
          s.opens++;
          s.openBb += Math.min(10, d.size ?? d.action.to / (r.bigBlind || 1));
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
    if (move === 'call') s.postCalls++;
    if (aggressive) {
      s.postAgg++;
      if (!observed && spot.strength <= POST_BUCKETS.indexOf('draw')) s.postBluffs++;
      if (d.size !== null) {
        const size = Math.min(3, d.size);
        if (!observed) {
          s.sizeSum[spot.strength] += size;
          s.sizeN[spot.strength]++;
        }
        if (move === 'betS') {
          s.smallN++;
          s.smallSum += size;
        } else {
          s.bigN++;
          s.bigSum += size;
        }
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
  if (observed) return true;

  // Rare spots drop out before they fill the phone.
  const keys = Object.keys(twin.spots);
  if (keys.length > MAX_SPOTS) {
    const total = (k: string) => twin.spots[k].reduce((t, v) => t + v, 0);
    const keep = new Set(keys.sort((x, y) => total(y) - total(x)).slice(0, KEEP_SPOTS));
    for (const k of Object.keys(twin.spots)) if (!keep.has(k)) delete twin.spots[k];
  }
  return true;
}
