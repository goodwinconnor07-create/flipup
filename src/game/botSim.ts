// Bot-against-bot tables for tuning and testing the styles: plays thousands of hands with no one
// at the table but bots (plus, if asked, simple scripted players to test the bots against), and
// reports how each seat really played.

import { decide, handBucket } from './botPlay';
import { seededRng, type Card } from './cards';
import type { StyleId } from './botStyles';
import { strengthVsRandom } from './equity';
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
}

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
});

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
    const net = p.stack - p.bought;
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
}
