// The campaign lab: how hard is each room, and how long does the climb from 1,000 chips take? Nothing here ships in
// the app; it's how the campaign was tuned (see docs/CAMPAIGN.md).
//
//   npx tsx scripts/campaignLab.ts places [tourneys] [out.json] [agents] [venues]
//       plays real campaign tournaments (the engine, the bots, the boss) with a scripted person in your seat, and
//       writes how often each kind of player finishes in each place at each venue, knocks out the boss and a bounty
//   npx tsx scripts/campaignLab.ts climb [in.json] [players] [days]
//       plays out whole campaigns from 1,000 chips, day by day, with those finishes and the campaign's economy
//
// Agents: lightBot (a beginner who calls too much), abc (a decent, straightforward player), tag (a good player),
// pro (an expert).

import { readFileSync, writeFileSync } from 'node:fs';
import {
  applyAction,
  campaignTable,
  createTable,
  FORMATS,
  goals,
  newCampaign,
  seededRng,
  sngPlace,
  VENUES,
  type Action,
  type Game,
  type Venue,
} from '../src/game';
import { decide } from '../src/game/botPlay';
import { scriptMove, type Script } from '../src/game/botSim';
import { bountyChance, bountyReward, bossReward, collectSalary, DAILY_SPIN, finishSng, missionBonus, missionReward, sitDown, claimGoal, goalDone, dayBefore } from '../src/game/campaign';

type Agent = Script | 'tag' | 'pro';
const AGENTS: Agent[] = ['lightBot', 'abc', 'tag', 'pro'];

interface Finish {
  place: number;
  boss: boolean;
  bounty: boolean;
  hands: number;
}

/** One campaign tournament at a venue, with `agent` in the person's seat. */
export function playTourney(venue: Venue, agent: Agent, seed: number): Finish {
  const rng = seededRng(seed);
  let clock = 1_000_000;
  const table = campaignTable({ kind: 'sng', venue, prize: venue.buyIn * 4 }, false);
  let game: Game = createTable({ hostDeviceId: 'me', name: 'Me', emoji: '🙂', settings: table.settings, bots: table.campaign.seats - 1, campaign: table.campaign, code: null, now: clock });
  const me = game.players[0];
  if (agent === 'tag' || agent === 'pro') me.style = agent;
  // A bounty on a random bot that isn't the boss, to measure how often one is collected.
  const target = game.players.find((p) => p.bot && p.id !== game.campaign?.boss?.playerId)!;
  const step = (deviceId: string, action: Action) => {
    const r = applyAction(game, action, { deviceId, now: clock, rng });
    if (r.ok) game = r.game;
    return r.ok;
  };
  step('me', { type: 'start' });
  let guard = 0;
  while (sngPlace(game, me.id) === undefined && game.status !== 'ended' && guard++ < 200_000) {
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    const hand = game.hand;
    if (hand && !hand.result && !hand.runout && hand.toAct === me.id) {
      const seat = hand.seats.find((s) => s.playerId === me.id)!;
      const m = agent === 'tag' || agent === 'pro' ? decide(game, hand, seat, rng).move : scriptMove(agent, game, hand, seat, rng);
      if (!step('me', { type: 'act', hand: hand.number, seq: hand.seq, move: m.move, to: m.to })) step('me', { type: 'act', hand: hand.number, seq: hand.seq, move: seat.bet >= hand.currentBet ? 'check' : 'fold' });
      clock -= 1;
    } else step('clock', { type: 'tick' });
  }
  const knocked = game.knocked ?? {};
  const bossId = game.campaign?.boss?.playerId;
  return {
    place: sngPlace(game, me.id) ?? table.campaign.seats,
    boss: !!bossId && (knocked[bossId] ?? []).includes(me.id),
    bounty: (knocked[target.id] ?? []).includes(me.id),
    hands: game.hands ?? 0,
  };
}

type Places = Record<string, Record<string, { n: number; places: number[]; boss: number; bounty: number; hands: number }>>;

function places(tourneys: number, out: string, agents: Agent[], venues: Venue[]): void {
  const result: Places = {};
  for (const agent of agents) {
    result[agent] = {};
    for (const v of venues) {
      const seats = FORMATS[v.format].seats;
      const row = { n: 0, places: Array(seats).fill(0), boss: 0, bounty: 0, hands: 0 };
      const t0 = Date.now();
      for (let i = 0; i < tourneys; i++) {
        const f = playTourney(v, agent, 1000 + i * 7919 + v.buyIn);
        row.n++;
        row.places[f.place - 1]++;
        row.boss += f.boss ? 1 : 0;
        row.bounty += f.bounty ? 1 : 0;
        row.hands += f.hands;
      }
      result[agent][v.id] = row;
      const f = FORMATS[v.format];
      const roi = row.places.reduce((a, n, i) => a + n * (f.split[i] ?? 0), 0) / row.n;
      // The prize averages this many buy-ins, so the return on a buy-in is what the places are worth times that.
      const mean = f.draws.reduce((a, [x, w]) => a + x * w, 0) / 1000;
      console.log(
        `${agent.padEnd(8)} ${v.id.padEnd(10)} win ${((row.places[0] / row.n) * 100).toFixed(0).padStart(3)}%  paid ${(((row.places[0] + (f.split[1] ? row.places[1] : 0)) / row.n) * 100).toFixed(0).padStart(3)}%  return ${(roi * mean).toFixed(2)}x  boss ${((row.boss / row.n) * 100).toFixed(0).padStart(3)}%  bounty ${((row.bounty / row.n) * 100).toFixed(0).padStart(3)}%  ${(row.hands / row.n).toFixed(0)} hands  ${((Date.now() - t0) / row.n).toFixed(0)}ms`,
      );
      writeFileSync(out, JSON.stringify(result, null, 1));
    }
  }
}

/**
 * Whole campaigns from 1,000 chips. Each day: the salary (with the streak), the free spin, then tournaments until
 * the day's budget of games is spent or there's nothing left to play, each one drawn from the measured finishes at
 * that venue, with the bounty and boss, then the day's missions (counted as done by players who play enough).
 * The player buys into the biggest venue that's open and costs no more than a fifth of the bankroll (or the
 * cheapest they can afford when short), and collects goals as they come.
 */
function climb(input: string, players: number, days: number): void {
  const data = JSON.parse(readFileSync(input, 'utf8')) as Places;
  const rng = seededRng(42);
  const pickPlace = (agent: string, v: Venue): { place: number; boss: boolean; bounty: boolean } => {
    const row = data[agent][v.id];
    let roll = rng() * row.n;
    let place = row.places.length;
    for (let i = 0; i < row.places.length; i++) {
      roll -= row.places[i];
      if (roll < 0) {
        place = i + 1;
        break;
      }
    }
    return { place, boss: rng() < row.boss / row.n, bounty: rng() < row.bounty / row.n };
  };
  const drawPrize = (v: Venue) => {
    const f = FORMATS[v.format];
    let roll = rng() * 1000;
    for (const [x, w] of f.draws) {
      roll -= w;
      if (roll < 0) return x * v.buyIn;
    }
    return f.draws[0][0] * v.buyIn;
  };
  const spin = () => {
    let roll = rng() * DAILY_SPIN.reduce((a, [, w]) => a + w, 0);
    for (const [x, w] of DAILY_SPIN) {
      roll -= w;
      if (roll < 0) return x;
    }
    return DAILY_SPIN[0][0];
  };
  const milestones = [
    { name: 'Riverboat', at: 2500 },
    { name: 'Casino', at: 15000 },
    { name: 'Strip', at: 75000 },
    { name: 'Monte Carlo', at: 400000 },
    { name: 'Penthouse', at: 2000000 },
    { name: 'Yacht', at: 10000000 },
  ];
  for (const agent of Object.keys(data)) {
    for (const perDay of [4, 10]) {
      const reached: number[][] = milestones.map(() => []);
      const yachtWins: number[] = [];
      const peaks: number[] = [];
      const brokeDays: number[] = [];
      for (let p = 0; p < players; p++) {
        let c = newCampaign();
        let day = '2026-01-01';
        let broke = 0;
        let yachtWon = -1;
        for (let d = 0; d < days; d++) {
          day = nextDay(day);
          c = collectSalary(c, day);
          c = { ...c, chips: c.chips + spin() };
          let played = 0;
          for (let g = 0; g < perDay; g++) {
            const open = VENUES.filter((v) => c.peak >= v.unlock && v.buyIn <= c.chips);
            const safe = open.filter((v) => v.buyIn * 5 <= c.chips);
            const v = (safe.length ? safe : open).sort((a, b) => b.buyIn - a.buyIn)[0];
            if (!v) break;
            const prize = drawPrize(v);
            const sat = sitDown(c, { kind: 'sng', venue: v, prize }, `g${d}-${g}`, 0);
            if (typeof sat === 'string') break;
            const f = pickPlace(agent, v);
            const bounty = rng() < bountyChance ? bountyReward(v, rng) : 0;
            c = finishSng(sat, `g${d}-${g}`, f.place, 0, { bounty: f.bounty ? bounty : 0, boss: f.boss && v.boss ? v.boss : undefined });
            played++;
            if (v.id === 'yacht' && f.place === 1 && yachtWon < 0) yachtWon = d + 1;
          }
          if (played === 0) broke++;
          // Missions: about one a game played, all three (and the bonus) on a full day.
          const missions = Math.min(3, Math.floor(played / 2));
          c = { ...c, chips: c.chips + missions * missionReward(c) + (missions === 3 ? missionBonus(c) : 0) };
          for (const g of goals(c)) if (goalDone(g) && !c.claimed.includes(g.id)) c = claimGoal(c, g.id);
          milestones.forEach((m, i) => {
            if (c.peak >= m.at && reached[i].length <= p) reached[i][p] = d + 1;
          });
        }
        peaks.push(c.peak);
        brokeDays.push(broke);
        yachtWins.push(yachtWon);
      }
      const median = (xs: number[]) => {
        const s = xs.filter((x) => x > 0).sort((a, b) => a - b);
        return s.length ? s[Math.floor(s.length / 2)] : NaN;
      };
      const share = (xs: (number | undefined)[]) => Math.round((xs.filter((x) => x && x > 0).length / players) * 100);
      console.log(`\n${agent}, ${perDay} games a day, ${players} players over ${days} days`);
      milestones.forEach((m, i) => console.log(`  ${m.name.padEnd(12)} reached by ${String(share(reached[i])).padStart(3)}%   median day ${median(reached[i].filter(Boolean)) || '-'}`));
      console.log(`  Yacht won     by ${String(share(yachtWins)).padStart(3)}%   median day ${median(yachtWins) || '-'}`);
      console.log(`  median best bankroll ${Math.round(median(peaks)).toLocaleString('en-US')}, days with nothing to play: ${(brokeDays.reduce((a, b) => a + b, 0) / players).toFixed(1)} of ${days}`);
      void bossReward;
    }
  }
}

function nextDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const out = d.toISOString().slice(0, 10);
  // dayBefore is the campaign's own reading of a day; check it agrees.
  if (dayBefore(out) !== day) throw new Error(`day maths: ${day} -> ${out}`);
  return out;
}

const [mode, a, b, c, dArg] = process.argv.slice(2);
if (mode === 'places') {
  const agents = (c ? c.split(',') : AGENTS) as Agent[];
  const venues = dArg ? VENUES.filter((v) => dArg.split(',').includes(v.id)) : VENUES;
  places(Number(a ?? 40), b ?? 'campaign-places.json', agents, venues);
} else if (mode === 'climb') climb(a ?? 'campaign-places.json', Number(b ?? 300), Number(c ?? 120));
else console.log('Usage: npx tsx scripts/campaignLab.ts places [tourneys] [out.json] [agents] [venues] | climb [in.json] [players] [days]');
