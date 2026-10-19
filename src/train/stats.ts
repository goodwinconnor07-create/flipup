// Your stats, worked out from the hands saved on this phone, their GTO reviews and your drills.

import { blindFor, recordNet, type HandRecord } from '../game';
import type { DrillScore, PlayedHand, ReviewSummary } from '../state/training';
import { scenarioTitle } from './scenarios';

export interface ScenarioScore {
  id: string;
  title: string;
  /** Decisions in your own hands plus drill answers. */
  samples: number;
  green: number;
  yellow: number;
  red: number;
  /** Share of decisions that were green. */
  score: number;
  evLoss: number;
}

export interface Stats {
  hands: number;
  wins: number;
  losses: number;
  netChips: number;
  netBb: number;
  /** Big blinds won per 100 hands. */
  bbPer100: number;
  /** Voluntarily put money in the pot preflop. */
  vpip: number;
  pfr: number;
  threeBet: number;
  cbet: number;
  foldToCbet: number;
  /** Went to showdown, of hands that saw a flop. */
  wtsd: number;
  /** Won at showdown, of hands that went to showdown. */
  wsd: number;
  /** (bets + raises) / calls after the flop. */
  aggression: number;
  reviewed: number;
  decisions: number;
  /** Share of reviewed decisions that matched GTO (green). */
  gtoPct: number;
  yellowPct: number;
  redPct: number;
  evLossPer100: number;
  byStreet: Record<string, { decisions: number; gtoPct: number }>;
  scenarios: ScenarioScore[];
  strengths: ScenarioScore[];
  weaknesses: ScenarioScore[];
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

function preflopFacts(r: HandRecord, hero: string) {
  const pre = r.actions.filter((a) => a.street === 'preflop');
  let raises = 0;
  let vpip = false;
  let pfr = false;
  let threeBetChance = false;
  let threeBet = false;
  let lastRaiser: string | null = null;
  let cur = r.bigBlind;
  for (const a of pre) {
    const aggressive = (a.move === 'bet' || a.move === 'raise' || a.move === 'allin') && a.to > cur;
    if (a.playerId === hero) {
      if (raises === 1) threeBetChance = true;
      if (a.move === 'call' || aggressive || (a.move === 'allin' && a.to > blindFor(r, hero))) vpip = true;
      if (aggressive) {
        pfr = true;
        if (raises === 1) threeBet = true;
      }
    }
    if (aggressive) {
      raises += 1;
      cur = a.to;
      lastRaiser = a.playerId;
    }
  }
  return { vpip, pfr, threeBetChance, threeBet, aggressor: lastRaiser };
}

export function computeStats(
  history: PlayedHand[],
  reviews: Record<string, ReviewSummary>,
  drills: Record<string, DrillScore>,
): Stats {
  let wins = 0;
  let losses = 0;
  let netChips = 0;
  let netBb = 0;
  let vpip = 0;
  let pfr = 0;
  let tbChance = 0;
  let tb = 0;
  let cbetChance = 0;
  let cbet = 0;
  let ftcChance = 0;
  let ftc = 0;
  let sawFlop = 0;
  let wtsd = 0;
  let wsd = 0;
  let aggr = 0;
  let calls = 0;

  for (const { record: r, heroId: hero } of history) {
    const net = recordNet(r, hero);
    netChips += net;
    netBb += net / r.bigBlind;
    if (net > 0) wins += 1;
    else if (net < 0) losses += 1;
    const f = preflopFacts(r, hero);
    if (f.vpip) vpip += 1;
    if (f.pfr) pfr += 1;
    if (f.threeBetChance) tbChance += 1;
    if (f.threeBet) tb += 1;
    const folded = r.actions.some((a) => a.playerId === hero && a.move === 'fold');
    const foldedPre = r.actions.some((a) => a.playerId === hero && a.move === 'fold' && a.street === 'preflop');
    if (r.board.length >= 3 && !foldedPre) {
      sawFlop += 1;
      if (r.showdown && !folded) {
        wtsd += 1;
        if ((r.won[hero] ?? 0) > 0) wsd += 1;
      }
      const flop = r.actions.filter((a) => a.street === 'flop');
      const firstBet = flop.find((a) => a.move === 'bet' || (a.move === 'allin' && a.to > 0));
      const heroFirst = flop.findIndex((a) => a.playerId === hero);
      if (f.aggressor === hero && heroFirst >= 0) {
        const before = firstBet ? flop.indexOf(firstBet) : Infinity;
        if (heroFirst <= before) {
          cbetChance += 1;
          if (firstBet?.playerId === hero) cbet += 1;
        }
      } else if (f.aggressor && firstBet?.playerId === f.aggressor) {
        const after = flop.slice(flop.indexOf(firstBet) + 1).find((a) => a.playerId === hero);
        if (after) {
          ftcChance += 1;
          if (after.move === 'fold') ftc += 1;
        }
      }
      for (const a of r.actions) {
        if (a.playerId !== hero || a.street === 'preflop') continue;
        if (a.move === 'bet' || a.move === 'raise' || a.move === 'allin') aggr += 1;
        else if (a.move === 'call') calls += 1;
      }
    }
  }

  // Review decisions and drills, by scenario.
  const by: Record<string, ScenarioScore> = {};
  const touch = (id: string) =>
    (by[id] ??= { id, title: scenarioTitle(id), samples: 0, green: 0, yellow: 0, red: 0, score: 0, evLoss: 0 });
  let decisions = 0;
  let green = 0;
  let yellow = 0;
  let red = 0;
  let evLoss = 0;
  const streets: Record<string, { decisions: number; green: number }> = {};
  const reviewedKeys = new Set(history.map((h) => h.key));
  let reviewed = 0;
  for (const s of Object.values(reviews)) {
    if (!reviewedKeys.has(s.key)) continue;
    reviewed += 1;
    for (const d of s.decisions) {
      if (!d.colour) continue;
      decisions += 1;
      if (d.colour === 'green') green += 1;
      else if (d.colour === 'yellow') yellow += 1;
      else red += 1;
      evLoss += d.evLoss ?? 0;
      const st = (streets[d.street] ??= { decisions: 0, green: 0 });
      st.decisions += 1;
      if (d.colour === 'green') st.green += 1;
      if (d.scenario) {
        const sc = touch(d.scenario);
        sc.samples += 1;
        sc[d.colour] += 1;
        sc.evLoss += d.evLoss ?? 0;
      }
    }
  }
  for (const [id, d] of Object.entries(drills)) {
    const sc = touch(id);
    sc.samples += d.attempts;
    sc.green += d.green;
    sc.yellow += d.yellow;
    sc.red += d.red;
    sc.evLoss += d.evLoss;
  }
  const scenarios = Object.values(by).map((s) => ({ ...s, score: ratio(s.green + 0.5 * s.yellow, s.samples) }));
  const ranked = scenarios.filter((s) => s.samples >= 3);
  const weaknesses = [...ranked].sort((a, b) => a.score - b.score || b.evLoss - a.evLoss).filter((s) => s.score < 0.8).slice(0, 3);
  const strengths = [...ranked].sort((a, b) => b.score - a.score).filter((s) => s.score >= 0.7).slice(0, 3);

  const hands = history.length;
  return {
    hands,
    wins,
    losses,
    netChips,
    netBb,
    bbPer100: hands ? (100 * netBb) / hands : 0,
    vpip: ratio(vpip, hands),
    pfr: ratio(pfr, hands),
    threeBet: ratio(tb, tbChance),
    cbet: ratio(cbet, cbetChance),
    foldToCbet: ratio(ftc, ftcChance),
    wtsd: ratio(wtsd, sawFlop),
    wsd: ratio(wsd, wtsd),
    aggression: calls ? aggr / calls : aggr,
    reviewed,
    decisions,
    gtoPct: ratio(green, decisions),
    yellowPct: ratio(yellow, decisions),
    redPct: ratio(red, decisions),
    evLossPer100: reviewed ? (100 * evLoss) / reviewed : 0,
    byStreet: Object.fromEntries(Object.entries(streets).map(([k, v]) => [k, { decisions: v.decisions, gtoPct: ratio(v.green, v.decisions) }])),
    scenarios: scenarios.sort((a, b) => b.samples - a.samples),
    strengths,
    weaknesses,
  };
}
