// Bot-against-bot tables for tuning and testing the styles: plays thousands of hands with no one
// at the table but bots (plus, if asked, simple scripted players to test the bots against), and
// reports how each seat really played.

import { boardTexture, decide, handBucket } from './botPlay';
import { seededRng, type Card } from './cards';
import type { StyleId } from './botStyles';
import { equity, strengthVsRandom } from './equity';
import { botsOnly, potTotal } from './holdem';
import { createTable, DEFAULT_SETTINGS, applyAction } from './reducer';
import { options } from './selectors';
import { handRecord } from './record';
import type { TwinBrain } from './twinFit';
import type { Action, Game, Hand, HandRecord, Move, Seat } from './types';

/**
 * A scripted player, for testing the bots against simple strategies a person might try:
 * - callBot: never folds, never raises.
 * - raiseBot: bets or raises the pot every time.
 * - shoveBot: all in every hand.
 * - foldBot: folds to any bet, raises only its best hands.
 * - abc: a decent, straightforward player (top 20% of hands, bets good hands, folds bad ones).
 * - lightBot, tightBot: abc, but calling a bet much lighter or much tighter (for testing the plans against bluffers and honest players).
 * - stabBot: the plan against a player who folds a lot: raises about half its hands first in, bets a third of the pot
 *   whenever it's checked to (any cards), calls a bet with a pair or better and gives up otherwise.
 * - bluffBot: a constant bluffer. Raises most hands before the flop and bets about two thirds of the pot
 *   every street whatever it holds. Gives up only to a raise, unless it has a real hand.
 */
export type Script = 'callBot' | 'raiseBot' | 'shoveBot' | 'foldBot' | 'abc' | 'bluffBot' | 'stabBot' | 'lightBot' | 'tightBot';
/** A style played by the bots' brain, a script, or `name:style`: a style played by another brain (see `brains`). */
export type Agent = StyleId | Script | `${string}:${StyleId}`;
/** Another way of deciding, for comparing brains (the lab plays the bots from before the update this way). */
export type Brain = (game: Game, hand: Hand, seat: Seat, rng: () => number) => { move: Move; to?: number };

const SCRIPTS: Script[] = ['callBot', 'raiseBot', 'shoveBot', 'foldBot', 'abc', 'bluffBot', 'stabBot', 'lightBot', 'tightBot'];
const isScript = (a: string): a is Script => (SCRIPTS as string[]).includes(a);
/** Seats the sim plays itself, as people: scripts and other brains. */
const isOutside = (a: string) => isScript(a) || a.includes(':');

export interface StyleReport {
  style: Agent;
  hands: number;
  /** Put money in before the flop by choice. */
  vpip: number;
  /** Raised before the flop. */
  pfr: number;
  /** After the flop: (bets + raises) / calls. */
  aggression: number;
  /** Folded when facing a bet after the flop. */
  foldToBet: number;
  /** Big blinds won per 100 hands. */
  bbPer100: number;
  /** Times it said something. */
  comments: number;
  /** Re-raised before the flop, when it had the chance. */
  threeBet: number;
  /** Saw the flop. */
  sawFlop: number;
  /** Went to showdown, of the flops it saw. */
  wtsd: number;
  /** Won at showdown, of the showdowns it went to. */
  wsd: number;
  /** Bet the flop after raising before it, when checked to or first in. */
  cbet: number;
  /** Bets and raises after the flop with air or a weak hand, of all its bets and raises. */
  bluffShare: number;
  /** Showed cards when it didn't have to (after winning without a showdown, or after folding). */
  shows: number;
  /** Average time it took to act, in ms of table clock (bots only, while a person was watching). */
  thinkMs: number;
  /** How much that time varies: standard deviation over the average. */
  thinkSpread: number;
  /** How mixed its play is: 0 always the same move in the same spot, 1 a coin flip. */
  variety: number;
  /** How often it used each technique when it could (0 to 1), and how many chances it had. See `TECHNIQUES`. */
  craft: Record<string, number>;
  craftN: Record<string, number>;
}

/** The techniques the sim keeps count of, for checking a style plays the way its craft says. */
export const TECHNIQUES = ['cbetDry', 'cbetWet', 'barrel2', 'barrel3', 'float', 'probe', 'donk', 'checkRaise', 'riverBig', 'fourBet', 'threeBet', 'pet'] as const;
export type Technique = (typeof TECHNIQUES)[number];

export interface TableReport {
  hands: number;
  /** Share of hands that saw a flop. */
  flops: number;
  /** Share of hands that went to showdown. */
  showdowns: number;
  /** Average final pot, in big blinds. */
  avgPotBb: number;
  /** Pots of 40bb or more, per 100 hands. */
  bigPots: number;
  /** Hands with someone all in, per 100 hands. */
  allIns: number;
  /** Showdowns where someone showed a hand that bet the river with air or a weak hand. */
  bluffsShown: number;
  /** Things the bots said, per hand. */
  talkPerHand: number;
  /** What they said, by kind of moment ("bigWin", "thinkHard"...), per 100 hands. */
  talk: Record<string, number>;
}

export interface SimResult {
  seats: StyleReport[];
  table: TableReport;
}

interface Tally {
  hands: number;
  vpip: number;
  pfr: number;
  aggr: number;
  calls: number;
  betsFaced: number;
  foldsToBet: number;
  threeBetOpp: number;
  threeBet: number;
  sawFlop: number;
  wtsd: number;
  wsd: number;
  cbetOpp: number;
  cbet: number;
  bets: number;
  bluffs: number;
  shows: number;
  thinkTotal: number;
  thinkSq: number;
  thinks: number;
  spots: Map<string, Map<string, number>>;
  /** Chances and uses of each technique. */
  craft: Map<string, [number, number]>;
}

const newTally = (): Tally => ({
  hands: 0,
  vpip: 0,
  pfr: 0,
  aggr: 0,
  calls: 0,
  betsFaced: 0,
  foldsToBet: 0,
  threeBetOpp: 0,
  threeBet: 0,
  sawFlop: 0,
  wtsd: 0,
  wsd: 0,
  cbetOpp: 0,
  cbet: 0,
  bets: 0,
  bluffs: 0,
  shows: 0,
  thinkTotal: 0,
  thinkSq: 0,
  thinks: 0,
  spots: new Map(),
  craft: new Map(),
});

/** Notes a chance to use a technique, and whether it was used. */
function used(t: Tally, key: Technique, hit: boolean): void {
  const c = t.craft.get(key) ?? [0, 0];
  c[0]++;
  if (hit) c[1]++;
  t.craft.set(key, c);
}

const AGGRESSIVE: Move[] = ['bet', 'raise', 'allin'];

/** What a scripted player does. */
function scriptMove(script: Script, game: Game, hand: Hand, seat: Seat, rng: () => number): { move: Move; to?: number } {
  const o = options(game, hand, seat);
  const pot = potTotal(hand);
  const callOrCheck = (): { move: Move } => (o.canCheck ? { move: 'check' } : o.callIsAllIn ? { move: 'allin' } : { move: 'call' });
  const raise = (to: number): { move: Move; to?: number } => {
    if (!o.canRaise) return callOrCheck();
    const t = Math.max(o.minTo, Math.min(o.maxTo, Math.round(to)));
    return t >= o.maxTo ? { move: 'allin' } : { move: hand.currentBet > 0 ? 'raise' : 'bet', to: t };
  };
  const strength = () =>
    hand.street === 'preflop'
      ? preflopStrength(seat.cards)
      : strengthVsRandom(seat.cards, hand.board, Math.max(1, hand.seats.filter((s) => !s.folded).length - 1), rng, 150);
  switch (script) {
    case 'callBot':
      return callOrCheck();
    case 'raiseBot':
      return raise(hand.currentBet + pot + o.toCall);
    case 'shoveBot':
      return o.canRaise ? { move: 'allin' } : callOrCheck();
    case 'foldBot': {
      const s = strength();
      if (s > (hand.street === 'preflop' ? 0.85 : 0.8)) return raise(hand.currentBet * 3 + pot * 0.5);
      return o.canCheck ? { move: 'check' } : { move: 'fold' };
    }
    case 'bluffBot': {
      const bb = game.settings.bigBlind;
      if (hand.street === 'preflop') {
        // Raises about seven hands in ten, calls a raise with a few more, otherwise gives up.
        const s = preflopStrength(seat.cards);
        if (o.toCall > bb * 6) return s > 0.7 ? callOrCheck() : { move: 'fold' };
        if (hand.currentBet <= bb) return rng() < 0.7 ? raise(bb * 3) : callOrCheck();
        return s > 0.35 ? callOrCheck() : { move: 'fold' };
      }
      // After the flop: bet two thirds of the pot every time it's checked to, whatever the cards.
      if (o.canCheck) return raise(pot * 0.66);
      // Facing a bet or raise: call with a pair or better, give up otherwise.
      return strength() > 0.62 ? callOrCheck() : { move: 'fold' };
    }
    case 'stabBot': {
      const bb = game.settings.bigBlind;
      if (hand.street === 'preflop') {
        const s = preflopStrength(seat.cards);
        if (s > 0.9) return raise(Math.max(hand.currentBet * 3, bb * 3));
        if (hand.currentBet <= bb) return s > 0.35 ? raise(bb * 2.5) : callOrCheck();
        return s > 0.6 && o.toCall <= bb * 6 ? callOrCheck() : { move: 'fold' };
      }
      // A small bet whenever it's checked to, whatever it holds. Facing a bet it needs a real hand.
      if (o.canCheck) return raise(pot * 0.33);
      const s = strength();
      if (s > 0.85) return raise(hand.currentBet * 2.5 + pot * 0.5);
      return s > 0.6 ? callOrCheck() : { move: 'fold' };
    }
    case 'abc':
    case 'lightBot':
    case 'tightBot': {
      const s = strength();
      if (hand.street === 'preflop') {
        // Plays more hands the fewer players there are: top 20% six-handed, about 60% heads up.
        const players = hand.seats.length;
        const open = players <= 2 ? 0.45 : players <= 4 ? 0.6 : 0.72;
        const bb = game.settings.bigBlind;
        if (s > 0.9) return raise(Math.max(hand.currentBet * 3, bb * 3));
        if (s > open + 0.08 && o.toCall <= bb * 4) return hand.currentBet <= bb ? raise(bb * 3) : callOrCheck();
        if (s > open && o.toCall <= bb) return hand.currentBet <= bb ? raise(bb * 2.5) : callOrCheck();
        if (s > open - 0.1 && o.toCall <= bb * 3 && players <= 2) return callOrCheck();
        return o.canCheck ? { move: 'check' } : { move: 'fold' };
      }
      const odds = o.toCall / (pot + o.toCall);
      if (s > 0.75) return raise(hand.currentBet * 2.5 + pot * 0.6);
      if (o.canCheck) return s > 0.6 || rng() < 0.12 ? raise(pot * 0.6) : { move: 'check' };
      // abc wants to be a little ahead of the price; lightBot only half way there, tightBot well ahead.
      return s > odds + (script === 'lightBot' ? -0.2 : script === 'tightBot' ? 0.3 : 0.12) ? callOrCheck() : { move: 'fold' };
    }
  }
}

/** 0 to 1, a quick preflop ranking (pairs and high cards up, suited and connected a little). */
function preflopStrength(cards: Card[]): number {
  const r = cards.map((c) => '23456789TJQKA'.indexOf(c[0]) + 2).sort((a, b) => b - a);
  const suited = cards[0][1] === cards[1][1];
  let s = r[0] === r[1] ? 0.55 + (r[0] - 2) * 0.037 : (r[0] + r[1] - 5) / 25 + (suited ? 0.06 : 0) - Math.max(0, r[0] - r[1] - 1) * 0.025;
  if (r[0] === 14 && r[0] !== r[1]) s += 0.08;
  return Math.max(0, Math.min(1, s));
}

export function simulate(agents: Agent[], hands: number, seed = 1, stackBb = 100): StyleReport[] {
  return simulateTable(agents, hands, seed, stackBb).seats;
}

/** For the AI twin lab: seats played by a twin (by index), and a look at every finished hand with all the cards. */
export interface SimExtras {
  twins?: Record<number, TwinBrain>;
  onHand?: (record: HandRecord) => void;
  /**
   * Counts a heads-up all-in run-out at its equity instead of how the cards fell, so a match's bb/100 settles on far
   * fewer hands (the luck of an all-in is most of the noise). Off by default: the sim's numbers are the real results.
   */
  evAdjust?: boolean;
}

/** Plays `hands` hands. The first agent sits in the host's seat; scripts join as people. */
export function simulateTable(agents: Agent[], hands: number, seed = 1, stackBb = 100, brains: Record<string, Brain> = {}, extras: SimExtras = {}): SimResult {
  const bb = 10;
  let clock = 1_000_000;
  const rng = seededRng(seed);
  const styleAgents = agents.filter((a, i) => i === 0 || !isOutside(a));
  const scripts = agents.filter((a, i) => i > 0 && isOutside(a));
  let game: Game = createTable({
    hostDeviceId: 'sim',
    name: 'Host',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, startingStack: bb * stackBb, smallBlind: bb / 2, bigBlind: bb, turnSeconds: 0, rebuys: true },
    bots: styleAgents.length - 1,
    code: null,
    now: clock,
  });
  // Every bot seat plays a style. The host stays a person (a table needs one to deal), and the sim
  // makes the host's moves with the same bot brain, or with a script.
  const styleOfAgent = (a: Agent) => (a.includes(':') ? a.split(':')[1] : a);
  game.players.forEach((p, i) => {
    p.style = styleOfAgent(styleAgents[i]);
  });
  const step = (deviceId: string, action: Action) => {
    const r = applyAction(game, action, { deviceId, now: clock, rng });
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    game = r.game;
  };
  for (const [i, brain] of Object.entries(extras.twins ?? {})) game.players[Number(i)].twin = brain;
  scripts.forEach((s, i) => step(`script${i}`, { type: 'join', name: `${s}${i}`.slice(0, 16), emoji: '🤖' }));
  // Seats played by another brain still need a style for it to play.
  for (const p of game.players) if (p.deviceId?.startsWith('script')) p.style = styleOfAgent(scripts[Number(p.deviceId.slice(6))]);
  const agentOf = new Map<string, Agent>();
  game.players.forEach((p) => {
    if (p.deviceId === 'sim') agentOf.set(p.id, styleAgents[0]);
    else if (p.deviceId?.startsWith('script')) agentOf.set(p.id, scripts[Number(p.deviceId.slice(6))]);
    else agentOf.set(p.id, p.style as Agent);
  });
  step('sim', { type: 'start' });

  const tallies = new Map(game.players.map((p) => [p.id, newTally()]));
  /** Chips each player won or lost to the fall of the cards in all-in run-outs (only kept when `extras.evAdjust`). */
  const luck = new Map<string, number>();
  const comments = new Map(game.players.map((p) => [p.id, 0]));
  const table = { hands: 0, flops: 0, showdowns: 0, pot: 0, bigPots: 0, allIns: 0, bluffsShown: 0, talk: 0 };
  let seenReactions: Record<string, number> = {};
  const talkKinds = new Map<string, number>();
  let played = 0;
  let lastHand = 0;
  let scored = 0;
  let guard = 0;
  let turnOf: string | null = null;
  let turnAt = 0;
  let turnWatched = false;
  let seenActions = 0;
  while (played < hands && guard++ < hands * 400) {
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    // Top up anyone who's run out, so the table never shrinks (counted as a loss for them).
    for (const p of game.players) {
      if (p.stack === 0 && (!game.hand || game.hand.result)) {
        p.stack = bb * stackBb;
        p.bought += bb * stackBb;
      }
    }
    const hand = game.hand;
    const person = hand && !hand.result && !hand.runout && hand.toAct ? game.players.find((p) => p.id === hand.toAct && !p.bot) : undefined;
    if (hand && person) {
      const seat = hand.seats.find((x) => x.playerId === person.id)!;
      const agent = agentOf.get(person.id)!;
      const m = isScript(agent) ? scriptMove(agent, game, hand, seat, rng) : agent.includes(':') ? brains[agent.split(':')[0]](game, hand, seat, rng) : decide(game, hand, seat, rng).move;
      const act = (move: Move, to?: number) =>
        applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, { deviceId: person.deviceId!, now: clock, rng });
      const r = act(m.move, m.to);
      const fallback = r.ok ? r : act(seat.bet >= hand.currentBet ? 'check' : 'fold');
      if (fallback.ok) game = fallback.game;
      clock -= 1;
    } else step('server', { type: 'tick' });
    for (const [id, r] of Object.entries(game.reactions ?? {})) {
      if ((seenReactions[id] ?? 0) !== r.n) {
        comments.set(id, (comments.get(id) ?? 0) + 1);
        table.talk++;
        const event = r.id.split(':')[2] ?? r.id;
        talkKinds.set(event, (talkKinds.get(event) ?? 0) + 1);
      }
    }
    seenReactions = Object.fromEntries(Object.entries(game.reactions ?? {}).map(([id, r]) => [id, r.n]));

    // How long each bot takes: from its turn starting to its move landing.
    const h = game.hand;
    if (h) {
      const acts = h.actions ?? [];
      if (h.number !== lastHand) seenActions = 0;
      if (acts.length > seenActions) {
        for (const a of acts.slice(seenActions)) {
          if (a.playerId === turnOf && turnWatched && game.players.find((p) => p.id === a.playerId)?.bot && !a.outOfTurn) {
            const t = tallies.get(a.playerId)!;
            t.thinkTotal += clock - turnAt;
            t.thinkSq += (clock - turnAt) ** 2;
            t.thinks++;
          }
        }
        seenActions = acts.length;
      }
      if (h.toAct !== turnOf) {
        turnOf = h.toAct;
        turnAt = clock;
        // Bots rush once every person has folded; only time the turns someone is watching.
        turnWatched = !botsOnly(game);
      }
    }
    if (game.hand && game.hand.number !== lastHand) {
      lastHand = game.hand.number;
      played++;
    }
    if (game.hand?.result && scored !== game.hand.number) {
      scored = game.hand.number;
      if (extras.evAdjust) allInLuck(game.hand, luck);
      scoreHand(game.hand, tallies, table, bb);
      const record = extras.onHand && handRecord(game, game.hand, clock);
      if (record) extras.onHand!(record);
      // The sim never reads the hand log, and copying it on every move is most of the work.
      game.logs = [];
    }
  }

  const seats = game.players.map((p) => {
    const t = tallies.get(p.id) ?? newTally();
    const h = t.hands;
    const net = p.stack - p.bought - (luck.get(p.id) ?? 0);
    return {
      style: agentOf.get(p.id) ?? (p.style as Agent),
      hands: h,
      vpip: h ? t.vpip / h : 0,
      pfr: h ? t.pfr / h : 0,
      aggression: t.calls ? t.aggr / t.calls : t.aggr,
      foldToBet: t.betsFaced ? t.foldsToBet / t.betsFaced : 0,
      bbPer100: h ? (net / bb / h) * 100 : 0,
      comments: comments.get(p.id) ?? 0,
      threeBet: t.threeBetOpp ? t.threeBet / t.threeBetOpp : 0,
      sawFlop: h ? t.sawFlop / h : 0,
      wtsd: t.sawFlop ? t.wtsd / t.sawFlop : 0,
      wsd: t.wtsd ? t.wsd / t.wtsd : 0,
      cbet: t.cbetOpp ? t.cbet / t.cbetOpp : 0,
      bluffShare: t.bets ? t.bluffs / t.bets : 0,
      shows: t.shows,
      thinkMs: t.thinks ? t.thinkTotal / t.thinks : 0,
      thinkSpread: t.thinks > 1 ? Math.sqrt(Math.max(0, t.thinkSq / t.thinks - (t.thinkTotal / t.thinks) ** 2)) / (t.thinkTotal / t.thinks) : 0,
      variety: variety(t.spots),
      craft: Object.fromEntries(TECHNIQUES.map((k) => [k, (t.craft.get(k)?.[0] ?? 0) ? t.craft.get(k)![1] / t.craft.get(k)![0] : 0])),
      craftN: Object.fromEntries(TECHNIQUES.map((k) => [k, t.craft.get(k)?.[0] ?? 0])),
    };
  });
  const n = Math.max(1, table.hands);
  return {
    seats,
    table: {
      hands: table.hands,
      flops: table.flops / n,
      showdowns: table.showdowns / n,
      avgPotBb: table.pot / n,
      bigPots: (table.bigPots / n) * 100,
      allIns: (table.allIns / n) * 100,
      bluffsShown: table.showdowns ? table.bluffsShown / table.showdowns : 0,
      talkPerHand: table.talk / n,
      talk: Object.fromEntries([...talkKinds].map(([k, v]) => [k, (v / n) * 100])),
    },
  };
}

/** Average normalised entropy of the moves made in each kind of spot, weighted by how often the spot came up. */
function variety(spots: Map<string, Map<string, number>>): number {
  let total = 0;
  let weighted = 0;
  for (const moves of spots.values()) {
    const counts = [...moves.values()];
    const n = counts.reduce((a, b) => a + b, 0);
    if (n < 4) continue;
    let e = 0;
    for (const c of counts) if (c) e -= (c / n) * Math.log(c / n);
    weighted += (e / Math.log(3)) * n;
    total += n;
  }
  return total ? weighted / total : 0;
}

/** Takes notes on one finished hand: everything a tuner wants, including hidden cards (this never runs in the app). */
function scoreHand(hand: Hand, tallies: Map<string, Tally>, table: { hands: number; flops: number; showdowns: number; pot: number; bigPots: number; allIns: number; bluffsShown: number }, bb: number): void {
  const acts = hand.actions ?? [];
  const result = hand.result!;
  const pot = potTotal(hand);
  table.hands++;
  table.pot += pot / bb;
  if (pot >= bb * 40) table.bigPots++;
  if (hand.seats.some((s) => s.allIn)) table.allIns++;
  const sawFlop = acts.some((a) => a.street === 'flop') || hand.board.length >= 3;
  if (sawFlop) table.flops++;
  if (result.showdown) table.showdowns++;

  const pre = acts.filter((a) => a.street === 'preflop');
  const preRaisers: string[] = [];
  const preRaises = new Set<(typeof acts)[number]>();
  let preTop = bb;
  for (const a of pre) {
    const raises = AGGRESSIVE.includes(a.move) && a.to > preTop;
    if (a.move !== 'fold' && a.move !== 'check') preTop = Math.max(preTop, a.to);
    if (raises) preRaises.add(a);
    const t = tallies.get(a.playerId);
    if (!t) continue;
    if (preRaisers.length === 1 && a.playerId !== preRaisers[0]) {
      t.threeBetOpp++;
      if (raises) t.threeBet++;
    }
    if (raises) preRaisers.push(a.playerId);
  }
  const preAggressor = preRaisers[preRaisers.length - 1];

  let bluffShown = false;
  for (const s of hand.seats) {
    const t = tallies.get(s.playerId);
    if (!t) continue;
    t.hands++;
    const mine = pre.filter((a) => a.playerId === s.playerId);
    if (mine.some((a) => a.move === 'call' || AGGRESSIVE.includes(a.move))) t.vpip++;
    if (mine.some((a) => preRaises.has(a))) t.pfr++;
    const foldedPre = mine.some((a) => a.move === 'fold');
    if (sawFlop && !foldedPre && hand.board.length >= 3) {
      t.sawFlop++;
      if (result.showdown && !s.folded) {
        t.wtsd++;
        if (result.won[s.playerId]) t.wsd++;
        const riverBet = acts.some((a) => a.street === 'river' && a.playerId === s.playerId && AGGRESSIVE.includes(a.move));
        const b = s.cards.length === 2 && hand.board.length === 5 ? handBucket(s.cards, hand.board) : null;
        if (riverBet && (b === 'air' || b === 'weak')) bluffShown = true;
      }
    }
    if (!result.showdown && s.shown) t.shows++;
  }
  if (bluffShown) table.bluffsShown++;

  // After the flop: aggression, folds to bets, c-bets, bluffs and the variety of moves.
  for (const street of ['flop', 'turn', 'river'] as const) {
    const board = hand.board.slice(0, street === 'flop' ? 3 : street === 'turn' ? 4 : 5);
    let bet = false;
    let aggressorActed = false;
    let top = 0;
    for (const a of acts.filter((x) => x.street === street && !x.outOfTurn)) {
      const raises = AGGRESSIVE.includes(a.move) && a.to > top;
      if (a.move !== 'fold' && a.move !== 'check') top = Math.max(top, a.to);
      const t = tallies.get(a.playerId);
      const seat = hand.seats.find((s) => s.playerId === a.playerId);
      if (!t || !seat) continue;
      if (street === 'flop' && a.playerId === preAggressor && !aggressorActed) {
        aggressorActed = true;
        if (!bet) {
          t.cbetOpp++;
          if (raises) t.cbet++;
        }
      }
      const bucket = seat.cards.length === 2 && board.length >= 3 ? handBucket(seat.cards, board) : 'air';
      const key = `${street}|${bet ? 'facing' : 'open'}|${bucket}`;
      const moveKind = a.move === 'allin' ? (raises ? (bet ? 'raise' : 'bet') : 'call') : a.move;
      const spot = t.spots.get(key) ?? new Map<string, number>();
      spot.set(moveKind, (spot.get(moveKind) ?? 0) + 1);
      t.spots.set(key, spot);
      if (raises) {
        t.aggr++;
        t.bets++;
        if (bucket === 'air' || bucket === 'weak') t.bluffs++;
        if (bet) t.betsFaced++;
        bet = true;
      } else if (a.move === 'call' || a.move === 'allin') {
        t.calls++;
        t.betsFaced++;
      } else if (a.move === 'fold' && bet) {
        t.foldsToBet++;
        t.betsFaced++;
      }
    }
  }
  noteTechniques(hand, tallies, bb, preAggressor, preRaisers.length);
}

/**
 * For a heads-up hand that ran out all in: how many chips each player won beyond (or short of) what their hands were worth when
 * the money went in, added to `luck`. A player who was a 70% favourite and won gets the 30% of the pot they were lucky to win.
 */
function allInLuck(hand: Hand, luck: Map<string, number>): void {
  const result = hand.result;
  if (!hand.ranOut || !result) return;
  const live = hand.seats.filter((s) => !s.folded);
  if (live.length !== 2 || live.some((s) => s.cards.length !== 2)) return;
  const acts = hand.actions ?? [];
  const street = acts[acts.length - 1]?.street ?? 'preflop';
  const board = hand.board.slice(0, street === 'preflop' ? 0 : street === 'flop' ? 3 : street === 'turn' ? 4 : 5);
  if (board.length >= 5) return;
  const ids = live.map((s) => s.playerId);
  const pot = result.pots.find((p) => ids.every((id) => p.eligible.includes(id)));
  if (!pot) return;
  const eq = equity(live.map((s) => s.cards), board);
  live.forEach((s, i) => {
    const expected = eq.win[i] + eq.tie[i] / 2;
    const actual = pot.winners.includes(s.playerId) ? 1 / pot.winners.length : 0;
    luck.set(s.playerId, (luck.get(s.playerId) ?? 0) + (actual - expected) * pot.amount);
  });
}

const PETS = new Set(['T2s', 'T2o']);

/** Counts the techniques used (and the chances to use them) in one finished hand. */
function noteTechniques(hand: Hand, tallies: Map<string, Tally>, bb: number, preAggressor: string | undefined, raisesBefore: number): void {
  const acts = (hand.actions ?? []).filter((a) => !a.outOfTurn);
  const folded = new Set(acts.filter((a) => a.street === 'preflop' && a.move === 'fold').map((a) => a.playerId));
  const flopPlayers = hand.seats.filter((s) => !folded.has(s.playerId)).map((s) => s.playerId);
  const button = hand.seats.findIndex((s) => s.playerId === hand.buttonId);
  const n = hand.seats.length;
  // Who acts last after the flop among those who saw it.
  const inOrder = Array.from({ length: n }, (_, i) => hand.seats[(button + 1 + i) % n].playerId).filter((id) => flopPlayers.includes(id));
  const lastToAct = inOrder[inOrder.length - 1];
  const tally = (id: string) => tallies.get(id);

  // Before the flop: signature hands played, and 4-bets when facing a 3-bet.
  let level = 0;
  let top = bb;
  let opener = '';
  let answered = false;
  for (const a of acts.filter((x) => x.street === 'preflop')) {
    const t = tally(a.playerId);
    const raises = AGGRESSIVE.includes(a.move) && a.to > top;
    if (t && level === 2 && a.playerId === opener && !answered) {
      answered = true;
      used(t, 'fourBet', raises);
    }
    if (t && level === 1 && a.playerId !== opener) used(t, 'threeBet', raises);
    if (raises) {
      level++;
      top = a.to;
      if (level === 1) opener = a.playerId;
    }
  }
  for (const seat of hand.seats) {
    const t = tally(seat.playerId);
    if (!t || seat.cards.length !== 2) continue;
    const cls = classOfCards(seat.cards);
    if (!PETS.has(cls)) continue;
    // Playing it voluntarily (not just posting a blind and checking it).
    const mine = acts.filter((a) => a.street === 'preflop' && a.playerId === seat.playerId);
    used(t, 'pet', mine.some((a) => a.move === 'call' || AGGRESSIVE.includes(a.move)));
  }

  // After the flop.
  const flopActs = acts.filter((a) => a.street === 'flop');
  const flopCards = hand.board.slice(0, 3);
  const wet = flopCards.length === 3 && ['wet', 'mono'].includes(boardTexture(flopCards));
  const checkedThrough = (st: 'flop' | 'turn') => hand.board.length >= (st === 'flop' ? 4 : 5) && !acts.some((a) => a.street === st && AGGRESSIVE.includes(a.move));
  const bettorOn = (st: 'flop' | 'turn' | 'river') => acts.find((a) => a.street === st && AGGRESSIVE.includes(a.move))?.playerId;
  const bet = (id: string, st: 'flop' | 'turn' | 'river') => acts.some((a) => a.street === st && a.playerId === id && AGGRESSIVE.includes(a.move));
  const sawStreet = (id: string, st: 'turn' | 'river') => hand.board.length >= (st === 'turn' ? 4 : 5) && !acts.some((a) => a.street !== 'preflop' && a.playerId === id && a.move === 'fold' && (st === 'river' ? a.street !== 'river' : a.street === 'flop'));

  // Continuation bets, by board.
  if (preAggressor && flopPlayers.includes(preAggressor) && raisesBefore > 0 && hand.board.length >= 3) {
    const t = tally(preAggressor);
    const firstBet = bettorOn('flop');
    const firstActionIsPfa = flopActs.find((a) => a.playerId === preAggressor);
    // Only when nobody bet before it had a chance to.
    if (t && firstActionIsPfa && (firstBet === undefined || firstBet === preAggressor)) used(t, wet ? 'cbetWet' : 'cbetDry', AGGRESSIVE.includes(firstActionIsPfa.move));
  }
  // Second and third barrels.
  for (const [prev, now, key] of [['flop', 'turn', 'barrel2'], ['turn', 'river', 'barrel3']] as const) {
    const who = bettorOn(prev);
    if (!who || !bet(who, prev) || !sawStreet(who, now) || hand.board.length < (now === 'turn' ? 4 : 5)) continue;
    const t = tally(who);
    const firstBetNow = acts.find((a) => a.street === now && AGGRESSIVE.includes(a.move));
    const acted = acts.some((a) => a.street === now && a.playerId === who);
    // Only counts when it was its chance to bet (nobody bet into it first).
    if (t && acted && (!firstBetNow || firstBetNow.playerId === who)) used(t, key, !!firstBetNow);
  }
  // Probes: out of position on the turn after the flop went check, check.
  if (checkedThrough('flop') && hand.board.length >= 4) {
    const turnActs = acts.filter((a) => a.street === 'turn');
    const first = turnActs[0];
    const t = first && tally(first.playerId);
    if (t && first.playerId !== preAggressor && first.playerId !== lastToAct) used(t, 'probe', AGGRESSIVE.includes(first.move));
  }
  // Donk bets: leading into the player who raised before the flop.
  if (preAggressor && flopPlayers.includes(preAggressor) && hand.board.length >= 3) {
    for (const a of flopActs) {
      if (a.playerId === preAggressor) break;
      const t = tally(a.playerId);
      if (t) used(t, 'donk', AGGRESSIVE.includes(a.move));
      if (AGGRESSIVE.includes(a.move)) break;
    }
  }
  // Floats: calling a flop bet in position with a hand that isn't one (air, weak, a draw or a middle pair).
  const flopBet = flopActs.find((a) => AGGRESSIVE.includes(a.move));
  if (flopBet && hand.board.length >= 3) {
    for (const a of flopActs.slice(flopActs.indexOf(flopBet) + 1)) {
      if (a.playerId !== lastToAct) continue;
      const seat = hand.seats.find((s) => s.playerId === a.playerId);
      const t = tally(a.playerId);
      if (!t || !seat || seat.cards.length !== 2) break;
      const b = handBucket(seat.cards, flopCards);
      if (b === 'air' || b === 'weak' || b === 'draw' || b === 'mid') used(t, 'float', a.move === 'call');
      break;
    }
  }
  // Check-raises: checked, then faced a bet on the same street.
  for (const street of ['flop', 'turn', 'river'] as const) {
    const onStreet = acts.filter((a) => a.street === street);
    const checked = new Set<string>();
    let betSeen = false;
    for (const a of onStreet) {
      if (a.move === 'check') checked.add(a.playerId);
      else if (AGGRESSIVE.includes(a.move) && !betSeen) betSeen = true;
      else if (betSeen && checked.has(a.playerId)) {
        checked.delete(a.playerId);
        const t = tally(a.playerId);
        if (t) used(t, 'checkRaise', AGGRESSIVE.includes(a.move));
      }
    }
  }
  // River bets: how often they were big (pot or more).
  const potBefore = (st: 'river') => {
    // The pot when the river started: everything put in on earlier streets.
    const total = hand.seats.reduce((x, s) => x + s.total, 0);
    const riverIn = Math.max(0, ...acts.filter((a) => a.street === st && a.move !== 'fold' && a.move !== 'check').map((a) => a.to));
    return Math.max(1, total - riverIn * hand.seats.filter((s) => acts.some((a) => a.street === st && a.playerId === s.playerId && a.move !== 'fold' && a.move !== 'check')).length);
  };
  const riverBet = acts.find((a) => a.street === 'river' && a.move === 'bet');
  if (riverBet) {
    const t = tally(riverBet.playerId);
    if (t) used(t, 'riverBig', riverBet.to / potBefore('river') >= 0.9);
  }
}

/** "AKs", "T2o", "77": a hand's class, for the signature-hand count. */
function classOfCards(cards: Card[]): string {
  const R = '23456789TJQKA';
  const [a, b] = [...cards].sort((x, y) => R.indexOf(y[0]) - R.indexOf(x[0]));
  return a[0] === b[0] ? a[0] + b[0] : a[0] + b[0] + (a[1] === b[1] ? 's' : 'o');
}
