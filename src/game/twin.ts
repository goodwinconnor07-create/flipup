// A player's poker numbers, as counters: how often they play a hand, raise, fold to a bet, bluff and so on, and the
// typical player a fit starts from. Used to fit a bot style to a set of numbers (`twinFit.ts`, which turns the ten
// styles' measured numbers and a legend's targets into a style) and to read what a style really plays like.
// Pure data in, pure data out. Counting the numbers from played hands is lab-only now (`scripts/twinCount.ts`,
// which regenerates `twinRef.json`): AI twins, the feature that learned from a person's own hands, are gone.

import type { Bucket } from './handBucket';

/** The post-flop hand buckets from weakest to strongest (a draw sits between a weak hand and a pair). */
export const POST_BUCKETS: readonly Bucket[] = ['air', 'weak', 'draw', 'mid', 'top', 'strong', 'monster'];

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
  /** Calls after the flop (the spot counts hold these too, but a twin seen only from outside has no spots). */
  postCalls: number;
  /** Saw the flop, and showed down. */
  sawFlop: number;
  showdowns: number;
  /** Post-flop bets when nobody had bet: how many were small (up to 55% of the pot) and big, and the pot shares added up, for the usual size of each. */
  smallN: number;
  smallSum: number;
  bigN: number;
  bigSum: number;
  /** Bet size as a share of the pot when nobody had bet, by post-flop hand bucket. */
  sizeSum: number[];
  sizeN: number[];
}

export interface TwinProfile {
  v: 1;
  hands: number;
  stats: TwinStats;
}

const STATS_KEYS: (keyof Omit<TwinStats, 'sizeSum' | 'sizeN'>)[] = [
  'vpip', 'pfr', 'firstIn', 'opens', 'limps', 'openBb', 'raiseFaced', 'threeBets', 'foldsToRaise',
  'betsFaced', 'foldsToBet', 'betOpps', 'bets', 'cbetOpps', 'cbets', 'postAgg', 'postBluffs', 'postCalls', 'sawFlop', 'showdowns', 'smallN', 'smallSum', 'bigN', 'bigSum',
];

export function emptyTwin(): TwinProfile {
  const stats = Object.fromEntries(STATS_KEYS.map((k) => [k, 0])) as unknown as TwinStats;
  stats.sizeSum = POST_BUCKETS.map(() => 0);
  stats.sizeN = POST_BUCKETS.map(() => 0);
  return { v: 1, hands: 0, stats };
}

// ── The numbers ─────────────────────────────────────────────────────────────

/** The usual poker numbers for a player, each a share from 0 to 1 (open size is in big blinds). */
export interface TwinNumbers {
  vpip: number;
  pfr: number;
  /** Of the times they were first in. */
  limp: number;
  open: number;
  threeBet: number;
  foldToRaise: number;
  foldToBet: number;
  /** After the flop, how often they bet when nobody had. */
  betFreq: number;
  cbet: number;
  /** Of their bets and raises after the flop, how many were with a draw, a weak hand or nothing. */
  bluff: number;
  /** Of their bets, raises and calls after the flop, how many were bets and raises. */
  aggression: number;
  showdown: number;
}

/** A typical player: where a twin starts before it has seen enough of someone. */
export const TWIN_PRIOR: TwinNumbers = { vpip: 0.27, pfr: 0.17, limp: 0.1, open: 2.7, threeBet: 0.07, foldToRaise: 0.6, foldToBet: 0.42, betFreq: 0.4, cbet: 0.55, bluff: 0.28, aggression: 0.4, showdown: 0.3 };

/** How many hands (or chances) of the typical player each number starts with. */
const PRIOR_WEIGHT = 12;


/** The player's numbers. A few hands pull towards the typical player (`weight` 0 gives the raw counts). */
export function twinNumbers(twin: TwinProfile, weight = PRIOR_WEIGHT): TwinNumbers {
  const s = twin.stats;
  const P = TWIN_PRIOR;
  const share = (hits: number, chances: number, prior: number) => (hits + prior * weight) / (chances + weight || 1);
  const calls = twin.stats.postCalls;
  return {
    vpip: share(s.vpip, twin.hands, P.vpip),
    pfr: share(s.pfr, twin.hands, P.pfr),
    limp: share(s.limps, s.firstIn, P.limp),
    open: share(s.openBb, s.opens, P.open),
    threeBet: share(s.threeBets, s.raiseFaced, P.threeBet),
    foldToRaise: share(s.foldsToRaise, s.raiseFaced, P.foldToRaise),
    foldToBet: share(s.foldsToBet, s.betsFaced, P.foldToBet),
    betFreq: share(s.bets, s.betOpps, P.betFreq),
    cbet: share(s.cbets, s.cbetOpps, P.cbet),
    bluff: share(s.postBluffs, s.postAgg, P.bluff),
    aggression: share(s.postAgg, s.postAgg + calls, P.aggression),
    showdown: share(s.showdowns, s.sawFlop, P.showdown),
  };
}
