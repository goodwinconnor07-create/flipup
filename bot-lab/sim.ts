// The bot lab's table driver. One call plays one session (one table, many hands) on a chosen engine
// (the frozen baseline or the working tree) and returns per-seat counters, timing and a few flagged hands.
//
// It drives the real engine the way production does: applyAction() with a clock, ticks for the bots,
// a person seat that acts through the scripted policy (or the bot brain when the table is "bots only").
// Cards come from a separate deal stream that is reseeded for every hand, so the same chance seed deals
// the same cards to the same seats on every engine, whatever the bots decide (paired comparisons).

import { performance } from 'node:perf_hooks';
import { seededRng } from '../src/game/cards';
import { describeHand } from '../src/game/evaluate';
import { ARCHETYPES, isArchetype, scriptMove, type Archetype } from './archetypes';
import type { Action, Game, Hand, Move, Seat } from '../src/game/types';

export interface Engine {
  createTable: (opts: { hostDeviceId: string; name: string; emoji: string; settings: unknown; bots: number; botNames?: string[]; code: string | null; now: number }) => Game;
  applyAction: (game: Game, action: Action, ctx: { deviceId: string; now: number; rng: () => number }) => { ok: true; game: Game } | { ok: false; error: string };
  DEFAULT_SETTINGS: Record<string, unknown>;
  decide: (game: Game, hand: Hand, seat: Seat, rng: () => number) => { move: { move: Move; to?: number } };
  potTotal: (hand: Hand) => number;
  handBucket: (hole: string[], board: string[]) => Bucket;
  BOTS: { name: string; emoji: string; style: string }[];
}
export type Bucket = 'monster' | 'strong' | 'top' | 'mid' | 'draw' | 'weak' | 'air';

export async function loadEngine(name: string): Promise<Engine> {
  const dir = name === 'current' ? '../src/game' : `./engines/${name}/game`;
  const [reducer, botPlay, holdem, styles] = await Promise.all([import(`${dir}/reducer.ts`), import(`${dir}/botPlay.ts`), import(`${dir}/holdem.ts`), import(`${dir}/botStyles.ts`)]);
  return {
    createTable: reducer.createTable,
    applyAction: reducer.applyAction,
    DEFAULT_SETTINGS: reducer.DEFAULT_SETTINGS,
    decide: botPlay.decide,
    handBucket: botPlay.handBucket,
    potTotal: holdem.potTotal,
    BOTS: styles.BOTS,
  };
}

export interface SessionConfig {
  id: string;
  scenario: string;
  /** Chance seed: the cards. Same seed, same cards, whatever the engine does. */
  seed: number;
  /** Decision seed: bot coin flips and script noise. */
  decisionSeed: number;
  hands: number;
  stack: number;
  smallBlind: number;
  bigBlind: number;
  /** Seat 0 is the host (a person seat). Entries are a bot's name, an archetype, or `brain:<bot name>` (the host seat playing a bot's brain). */
  seats: string[];
}

const AGGRESSIVE: Move[] = ['bet', 'raise', 'allin'];
const SIZE_BINS = ['<0.3', '0.3-0.5', '0.5-0.8', '0.8-1.2', '>1.2'] as const;
const LAT_BINS = [1, 2, 5, 10, 20, 50, 1e9];

export interface Counters {
  hands: number;
  net: number; // in big blinds
  netH1: number;
  netH2: number;
  handsH1: number;
  handsH2: number;
  vpip: number;
  pfr: number;
  limp: number;
  rfiOpp: number;
  rfi: number;
  threeBetOpp: number;
  threeBet: number;
  faced3: number;
  foldTo3: number;
  sawFlop: number;
  wtsd: number;
  wsd: number;
  cbetOpp: number;
  cbet: number;
  bets: number;
  raises: number;
  calls: number;
  checks: number;
  folds: number;
  facedBet: number;
  foldedToBet: number;
  facedBig: number; // facing a bet of 0.75 pot or more after the flop
  foldedToBig: number;
  sizeBins: number[];
  sizeAllIn: number;
  bluffBets: number; // postflop bets and raises with air or a weak hand
  valueBets: number; // ... with a monster, strong hand or top pair
  strongFacingBet: number; // monster or strong hand, facing a bet of at most half a pot
  strongFoldedSmall: number;
  weakCallsBig: number; // called a river or turn bet of 0.75 pot or more with air or a weak hand
  weakFacingBig: number;
  shortPush: number; // short-stack (<= 13bb) first-in decisions, and how many were all-ins
  shortSpots: number;
  netByPos: number[]; // late, middle, early, blinds (bb)
  handsByPos: number[];
  decisions: number;
  latSumMs: number;
  latMaxMs: number;
  latBins: number[];
  /** Heads-up postflop, by what the opponent is: bluffs fired, how they answered, value spots and bets. */
  vs: Record<string, VsCell>;
  // Added after the baseline study began (v2). Older result files don't have them; readers must treat them as zero.
  /** Holding a made hand (top pair or better) and folding when the price is 6-to-1 or better. */
  absurdFolds?: number;
  absurdSpots?: number;
  /** Holding a monster (trips or better using its own cards) and facing any bet after the flop. */
  monsterFolds?: number;
  monsterFacing?: number;
  /** River, no pair at all, facing a bet of 0.75 pot or more. */
  noPairBigCalls?: number;
  noPairBigFacing?: number;
  /** Responses by who made the last raise or bet: [spots, folds, calls, raises] for the first and second half of the session. */
  resp?: Record<string, number[]>;
}
export interface VsCell {
  bluffs: number;
  bluffFolded: number;
  valueSpots: number;
  valueBets: number;
  net: number;
  hands: number;
  /** Heads-up, checked to (or first to act) after the flop with air or a weak hand: spots, and bets made. */
  airSpots?: number;
  airBets?: number;
}
export const newVs = (): VsCell => ({ bluffs: 0, bluffFolded: 0, valueSpots: 0, valueBets: 0, net: 0, hands: 0, airSpots: 0, airBets: 0 });

const zero = (): Counters => ({
  hands: 0, net: 0, netH1: 0, netH2: 0, handsH1: 0, handsH2: 0, vpip: 0, pfr: 0, limp: 0, rfiOpp: 0, rfi: 0, threeBetOpp: 0, threeBet: 0, faced3: 0, foldTo3: 0,
  sawFlop: 0, wtsd: 0, wsd: 0, cbetOpp: 0, cbet: 0, bets: 0, raises: 0, calls: 0, checks: 0, folds: 0, facedBet: 0, foldedToBet: 0, facedBig: 0, foldedToBig: 0,
  sizeBins: SIZE_BINS.map(() => 0), sizeAllIn: 0, bluffBets: 0, valueBets: 0, strongFacingBet: 0, strongFoldedSmall: 0, weakCallsBig: 0, weakFacingBig: 0,
  shortPush: 0, shortSpots: 0, netByPos: [0, 0, 0, 0], handsByPos: [0, 0, 0, 0], decisions: 0, latSumMs: 0, latMaxMs: 0, latBins: LAT_BINS.map(() => 0), vs: {}, absurdFolds: 0, absurdSpots: 0, monsterFolds: 0, monsterFacing: 0, noPairBigCalls: 0, noPairBigFacing: 0, resp: {},
});

export interface SeatReport {
  label: string; // the seat's agent: a bot name, an archetype, or brain:<name>
  kind: 'bot' | 'brain' | 'archetype';
  name: string;
  style: string; // bot style, or archetype name
  seatIndex: number;
  c: Counters;
}

export interface Event {
  h: number;
  who: number; // seat index
  street: string;
  move: Move;
  to: number;
  pot: number;
  toCall: number;
  bucket: Bucket | null;
  live: number; // players still in the hand when it acted (including itself)
  stack: number;
  /** The only other player still in, when it was heads-up. */
  opp: number | null;
  /** Size of a bet or raise as a share of the pot before it (chips added / pot). */
  frac: number;
  /** Hand category on the river (0 high card ... 8 straight flush), else -1. */
  cat: number;
}

export interface Sample {
  kind: string;
  hand: number;
  seat: number;
  names: string[];
  holes: string[][];
  board: string[];
  events: Event[];
  won: number[];
}

export interface SessionResult {
  config: SessionConfig;
  engine: string;
  seats: SeatReport[];
  handsPlayed: number;
  wallMs: number;
  chipLeaks: number;
  illegal: number;
  stuck: boolean;
  /** Seat 0's hole cards per hand, to prove paired sessions get the same cards. */
  firstCards: string[];
  samples: Sample[];
  table: { flops: number; showdowns: number; raisedMultiway: number; limpedFlops: number; threeBetPots: number; checkedDown: number; avgPotBb: number; allIns: number; endedPreflop: number };
}

const mixSeed = (a: number, b: number) => (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35)) >>> 0;

export function lineupKinds(seats: string[]): { kind: SeatReport['kind']; name: string; style: string }[] {
  return seats.map((s) => {
    if (isArchetype(s)) return { kind: 'archetype' as const, name: s, style: s };
    if (s.startsWith('brain:')) return { kind: 'brain' as const, name: s.slice(6), style: '' };
    return { kind: 'bot' as const, name: s, style: '' };
  });
}

/** Plays one session. */
export function runSession(engine: Engine, engineName: string, cfg: SessionConfig, opts: { samplesPerKind?: number } = {}): SessionResult {
  const t0 = performance.now();
  const bb = cfg.bigBlind;
  let clock = 1_000_000;
  const kinds = lineupKinds(cfg.seats);
  const botEntry = (name: string) => {
    const e = engine.BOTS.find((b) => b.name === name);
    if (!e) throw new Error(`no bot called ${name}`);
    return e;
  };
  kinds.forEach((k) => {
    if (k.kind !== 'archetype') k.style = botEntry(k.name).style;
  });

  // Streams: cards come from a stream that restarts for every hand; everything else from the decision stream.
  const decide = seededRng(cfg.decisionSeed);
  let dealStream = seededRng(mixSeed(cfg.seed, 0));
  let game: Game;
  const rng = () => (!game.hand || game.hand.result ? dealStream() : decide());

  const botSeats = kinds.map((k, i) => ({ k, i })).filter((x) => x.i > 0 && x.k.kind === 'bot');
  game = engine.createTable({
    hostDeviceId: 'sim',
    name: 'Host',
    emoji: '🙂',
    settings: { ...engine.DEFAULT_SETTINGS, startingStack: cfg.stack, smallBlind: cfg.smallBlind, bigBlind: cfg.bigBlind, turnSeconds: 0, rebuys: true },
    bots: botSeats.length,
    botNames: botSeats.map((x) => x.k.name),
    code: null,
    now: clock,
  });
  const step = (deviceId: string, action: Action) => {
    const r = engine.applyAction(game, action, { deviceId, now: clock, rng });
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    game = r.game;
  };
  // Archetypes join as people, after the bots, in the order given.
  const archetypes = kinds.map((k, i) => ({ k, i })).filter((x) => x.i > 0 && x.k.kind === 'archetype');
  archetypes.forEach((x, n) => step(`script${n}`, { type: 'join', name: `${x.k.name}${n}`.slice(0, 10), emoji: '🤖' }));

  // Players are in seat order: host, bots, archetypes. Map each to its lineup entry.
  const order = [0, ...botSeats.map((x) => x.i), ...archetypes.map((x) => x.i)];
  const entryOf = new Map<string, number>(); // playerId -> index into cfg.seats
  game.players.forEach((p, idx) => entryOf.set(p.id, order[idx]));
  game.players.forEach((p) => {
    const k = kinds[entryOf.get(p.id)!];
    if (k.kind !== 'archetype') p.style = k.style;
    if (k.kind === 'brain') p.name = `${k.name}`.slice(0, 10);
  });
  const reports: SeatReport[] = game.players.map((p, seatIndex) => {
    const k = kinds[entryOf.get(p.id)!];
    return { label: cfg.seats[entryOf.get(p.id)!], kind: k.kind, name: k.name, style: k.style, seatIndex, c: zero() };
  });
  const seatOf = new Map(game.players.map((p, i) => [p.id, i]));
  step('sim', { type: 'start' });

  const samples: Sample[] = [];
  const sampleCount: Record<string, number> = {};
  const maxSamples = opts.samplesPerKind ?? 3;
  const table = { hands: 0, flops: 0, showdowns: 0, raisedMultiway: 0, limpedFlops: 0, threeBetPots: 0, checkedDown: 0, pot: 0, allIns: 0, endedPreflop: 0 };
  const firstCards: string[] = [];
  let chipLeaks = 0;
  let illegal = 0;
  let scored = 0;
  let lastHand = 0;
  let guard = 0;
  let seen = 0;
  let events: Event[] = [];
  let prev: { pot: number; currentBet: number; bets: Map<string, number>; folded: Set<string>; stacks: Map<string, number>; board: string[]; holes: Map<string, string[]> } | null = null;
  const snap = (): typeof prev => {
    const h = game.hand;
    if (!h) return null;
    return {
      pot: engine.potTotal(h),
      currentBet: h.currentBet,
      bets: new Map(h.seats.map((s) => [s.playerId, s.bet])),
      folded: new Set(h.seats.filter((s) => s.folded).map((s) => s.playerId)),
      stacks: new Map(game.players.map((p) => [p.id, p.stack])),
      board: h.board.slice(),
      holes: new Map(h.seats.map((s) => [s.playerId, s.cards])),
    };
  };
  const latencyOf = (ms: number, c: Counters) => {
    c.decisions++;
    c.latSumMs += ms;
    if (ms > c.latMaxMs) c.latMaxMs = ms;
    c.latBins[LAT_BINS.findIndex((b) => ms < b)]++;
  };
  const boardAt = (street: string, board: string[]) => board.slice(0, street === 'flop' ? 3 : street === 'turn' ? 4 : street === 'river' ? 5 : 0);

  const finish = (hand: Hand) => {
    const result = hand.result!;
    const n = hand.seats.length;
    table.hands++;
    scored = hand.number;
    const pot = engine.potTotal(hand);
    table.pot += pot / bb;
    if (hand.seats.some((s) => s.allIn)) table.allIns++;
    const won = hand.seats.map((s) => result.won[s.playerId] ?? 0);
    const put = hand.seats.map((s) => s.total);
    if (won.reduce((a, b) => a + b, 0) !== put.reduce((a, b) => a + b, 0)) chipLeaks++;
    const acts = (hand.actions ?? []).filter((a) => !a.outOfTurn);
    const pre = acts.filter((a) => a.street === 'preflop');
    const idxOf = (id: string) => seatOf.get(id)!;
    const buttonIdx = hand.seats.findIndex((s) => s.playerId === hand.buttonId);

    // Preflop story.
    let top = bb;
    const raiseActs: typeof pre = [];
    for (const a of pre) {
      if (AGGRESSIVE.includes(a.move) && a.to > top) raiseActs.push(a);
      if (a.move !== 'fold' && a.move !== 'check') top = Math.max(top, a.to);
    }
    const foldedPre = new Set(pre.filter((a) => a.move === 'fold').map((a) => a.playerId));
    const sawFlop = hand.board.length >= 3;
    const flopPlayers = hand.seats.filter((s) => !foldedPre.has(s.playerId)).length;
    if (sawFlop) table.flops++;
    else table.endedPreflop++;
    if (sawFlop && raiseActs.length === 0) table.limpedFlops++;
    if (sawFlop && raiseActs.length > 0 && flopPlayers >= 3) table.raisedMultiway++;
    if (raiseActs.length >= 2) table.threeBetPots++;
    if (sawFlop && !acts.some((a) => a.street !== 'preflop' && AGGRESSIVE.includes(a.move))) table.checkedDown++;
    if (result.showdown) table.showdowns++;
    const preAggressor = raiseActs.length ? raiseActs[raiseActs.length - 1].playerId : null;

    hand.seats.forEach((s, si) => {
      const c = reports[idxOf(s.playerId)].c;
      const netBb = (won[si] - put[si]) / bb;
      c.hands++;
      c.net += netBb;
      if (scored <= cfg.hands / 2) {
        c.netH1 += netBb;
        c.handsH1++;
      } else {
        c.netH2 += netBb;
        c.handsH2++;
      }
      const d = (si - buttonIdx + n) % n;
      const pos = d === 0 || d === n - 1 ? 0 : d === 1 || d === 2 ? 3 : d <= Math.ceil(n / 2) ? 2 : 1;
      c.netByPos[pos] += netBb;
      c.handsByPos[pos]++;
      const mine = pre.filter((a) => a.playerId === s.playerId);
      if (mine.some((a) => a.move === 'call' || AGGRESSIVE.includes(a.move))) c.vpip++;
      if (mine.some((a) => raiseActs.includes(a))) c.pfr++;
      if (mine.length && raiseActs.length === 0 && mine[0].move === 'call') c.limp++;
      if (sawFlop && !foldedPre.has(s.playerId)) {
        c.sawFlop++;
        if (result.showdown && !s.folded) {
          c.wtsd++;
          if (result.won[s.playerId]) c.wsd++;
        }
      }
      // First-in opportunities and 3-bets.
      const firstIdx = pre.findIndex((a) => a.playerId === s.playerId);
      if (firstIdx >= 0) {
        const before = pre.slice(0, firstIdx);
        if (!before.some((a) => raiseActs.includes(a))) {
          c.rfiOpp++;
          if (raiseActs.includes(pre[firstIdx])) c.rfi++;
        }
      }
      for (const a of mine) {
        const k = pre.indexOf(a);
        const raisesBefore = raiseActs.filter((r) => pre.indexOf(r) < k).length;
        if (raisesBefore === 1) {
          c.threeBetOpp++;
          if (raiseActs.includes(a)) c.threeBet++;
        }
      }
      if (raiseActs.length >= 2 && raiseActs[0].playerId === s.playerId) {
        const second = pre.indexOf(raiseActs[1]);
        const reply = pre.slice(second + 1).find((a) => a.playerId === s.playerId);
        if (reply) {
          c.faced3++;
          if (reply.move === 'fold') c.foldTo3++;
        }
      }
    });

    // Decisions after the flop (and the short-stack ones before it) from the event list.
    events.forEach((e, i) => {
      const c = reports[e.who].c;
      const effBb = e.stack / bb;
      if (e.street === 'preflop') {
        if (effBb <= 13 && e.toCall <= bb) {
          c.shortSpots++;
          if (e.move === 'allin') c.shortPush++;
        }
        return;
      }
      const big = e.toCall > 0 && e.toCall >= 0.75 * Math.max(1, e.pot - e.toCall);
      if (e.toCall > 0) {
        const price = e.toCall / (e.pot + e.toCall);
        if (e.bucket === 'monster') {
          c.monsterFacing = (c.monsterFacing ?? 0) + 1;
          if (e.move === 'fold') c.monsterFolds = (c.monsterFolds ?? 0) + 1;
        }
        if (price <= 1 / 7 && (e.bucket === 'monster' || e.bucket === 'strong' || e.bucket === 'top')) {
          c.absurdSpots = (c.absurdSpots ?? 0) + 1;
          if (e.move === 'fold') c.absurdFolds = (c.absurdFolds ?? 0) + 1;
        }
        if (big && e.cat === 0) {
          c.noPairBigFacing = (c.noPairBigFacing ?? 0) + 1;
          if (e.move === 'call') c.noPairBigCalls = (c.noPairBigCalls ?? 0) + 1;
        }
      }
      if (e.move === 'check') c.checks++;
      if (e.move === 'call') c.calls++;
      if (e.move === 'fold') c.folds++;
      if (e.toCall > 0) {
        c.facedBet++;
        if (e.move === 'fold') c.foldedToBet++;
        if (big) {
          c.facedBig++;
          if (e.move === 'fold') c.foldedToBig++;
        }
        const small = e.toCall <= 0.5 * Math.max(1, e.pot - e.toCall);
        if (e.bucket === 'monster' || e.bucket === 'strong') {
          if (small) {
            c.strongFacingBet++;
            if (e.move === 'fold') c.strongFoldedSmall++;
          }
        }
        if (big && (e.street === 'turn' || e.street === 'river') && (e.bucket === 'air' || e.bucket === 'weak')) {
          c.weakFacingBig++;
          if (e.move === 'call') c.weakCallsBig++;
        }
      }
      const aggressive = AGGRESSIVE.includes(e.move);
      if (aggressive) {
        if (e.toCall > 0) c.raises++;
        else c.bets++;
        if (e.move === 'allin') c.sizeAllIn++;
        else c.sizeBins[e.frac < 0.3 ? 0 : e.frac < 0.5 ? 1 : e.frac < 0.8 ? 2 : e.frac < 1.2 ? 3 : 4]++;
        if (e.bucket === 'air' || e.bucket === 'weak') c.bluffBets++;
        if (e.bucket === 'monster' || e.bucket === 'strong' || e.bucket === 'top') c.valueBets++;
      }
      // Heads-up pairings: what the opponent is, bluffs fired and how they were answered, value spots.
      if (e.live === 2 && e.opp !== null) {
        const other = e.opp;
        {
          const key = reports[other].kind === 'archetype' ? reports[other].style : `bot:${reports[other].style}`;
          const v = (c.vs[key] ??= newVs());
          if (aggressive && (e.bucket === 'air' || e.bucket === 'weak') && e.street !== 'preflop') {
            v.bluffs++;
            const reply = events.slice(i + 1).find((x) => x.who === other && x.street === e.street);
            if (reply && reply.move === 'fold') v.bluffFolded++;
          }
          if (e.toCall === 0 && (e.bucket === 'air' || e.bucket === 'weak')) {
            v.airSpots = (v.airSpots ?? 0) + 1;
            if (aggressive) v.airBets = (v.airBets ?? 0) + 1;
          }
          if (e.toCall === 0 && e.street !== 'flop' && (e.bucket === 'monster' || e.bucket === 'strong' || e.bucket === 'top')) {
            v.valueSpots++;
            if (aggressive) v.valueBets++;
          }
        }
      }
    });
    // Net result per opponent type when heads-up on the flop or later.
    const liveAtFlop = hand.seats.filter((s) => !foldedPre.has(s.playerId));
    if (sawFlop && liveAtFlop.length === 2) {
      const [a, b] = liveAtFlop.map((s) => idxOf(s.playerId));
      for (const [me, other] of [[a, b], [b, a]]) {
        const key = reports[other].kind === 'archetype' ? reports[other].style : `bot:${reports[other].style}`;
        const v = (reports[me].c.vs[key] ??= newVs());
        v.hands++;
        v.net += (won[me] - put[me]) / bb;
      }
    }
    // How each seat answered raises and bets, by who made them (and in which half of the session).
    {
      const typeOf = (i: number) => (reports[i].kind === 'archetype' ? reports[i].style : `bot:${reports[i].style}`);
      const half = hand.number <= cfg.hands / 2 ? 0 : 4;
      const note = (who: number, key: string, answer: 1 | 2 | 3) => {
        const r = ((reports[who].c.resp ??= {})[key] ??= [0, 0, 0, 0, 0, 0, 0, 0]);
        r[half]++;
        r[half + answer]++;
      };
      let top = bb;
      let raises = 0;
      let opener = -1;
      let last = -1;
      for (const e of events.filter((x) => x.street === 'preflop')) {
        const aggressive = AGGRESSIVE.includes(e.move) && e.to > top;
        if (e.toCall > 0 && raises >= 1) {
          const facing = raises === 1 ? 'open' : raises === 2 ? (e.who === opener ? '3bet-opener' : '3bet-cold') : '4bet+';
          note(e.who, `pre|${facing}|${typeOf(last)}`, e.move === 'fold' ? 1 : aggressive ? 3 : 2);
        }
        if (aggressive) {
          raises++;
          if (raises === 1) opener = e.who;
          last = e.who;
        }
        if (e.move !== 'fold' && e.move !== 'check') top = Math.max(top, e.to);
      }
      for (const street of ['flop', 'turn', 'river']) {
        let t = 0;
        let bettor = -1;
        for (const e of events.filter((x) => x.street === street)) {
          const aggressive = AGGRESSIVE.includes(e.move) && e.to > t;
          if (e.toCall > 0 && bettor >= 0) note(e.who, `post|${street}|${typeOf(bettor)}`, e.move === 'fold' ? 1 : aggressive ? 3 : 2);
          if (aggressive) bettor = e.who;
          if (e.move !== 'fold' && e.move !== 'check') t = Math.max(t, e.to);
        }
      }
    }
    // c-bets
    if (preAggressor) {
      const first = acts.filter((a) => a.street === 'flop');
      const mine = first.findIndex((a) => a.playerId === preAggressor);
      if (mine >= 0 && !first.slice(0, mine).some((a) => AGGRESSIVE.includes(a.move))) {
        const c = reports[idxOf(preAggressor)].c;
        c.cbetOpp++;
        if (AGGRESSIVE.includes(first[mine].move)) c.cbet++;
      }
    }

    // Flag hands worth reading: heavy overfolds, hero calls, bluffs into stations, missed value.
    const flag = (kind: string, who: number) => {
      sampleCount[kind] = (sampleCount[kind] ?? 0) + 1;
      if (sampleCount[kind] > maxSamples) return;
      samples.push({
        kind,
        hand: hand.number,
        seat: who,
        names: reports.map((r) => `${r.label}`),
        holes: hand.seats.map((s) => s.cards),
        board: hand.board.slice(),
        events: events.slice(),
        won: won.map((w, i) => (w - put[i]) / bb),
      });
    };
    events.forEach((e, i) => {
      if (e.street === 'preflop' || reports[e.who].kind === 'archetype') return;
      const small = e.toCall > 0 && e.toCall <= 0.5 * Math.max(1, e.pot - e.toCall);
      if (e.move === 'fold' && small && (e.bucket === 'monster' || e.bucket === 'strong')) flag('strong hand folded to a small bet', e.who);
      const big = e.toCall > 0 && e.toCall >= 0.75 * Math.max(1, e.pot - e.toCall);
      if (e.move === 'call' && big && e.street === 'river' && (e.bucket === 'air' || e.bucket === 'weak')) flag('weak hand called a big river bet', e.who);
      if (AGGRESSIVE.includes(e.move) && (e.bucket === 'air') && e.live === 2) {
        const other = events.slice(i + 1).find((x) => x.who !== e.who && x.street === e.street);
        if (other && reports[other.who].style === 'station' && other.move !== 'fold') flag('bluff into a calling station', e.who);
      }
    });
    events = [];
  };

  let stuck = false;
  while (scored < cfg.hands) {
    if (guard++ > cfg.hands * 600) {
      stuck = true;
      break;
    }
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    if (!game.hand || game.hand.result) dealStream = seededRng(mixSeed(cfg.seed, game.hand ? game.hand.number : 0));
    for (const p of game.players) if (p.stack === 0 && (!game.hand || game.hand.result)) {
      p.stack = cfg.stack;
      p.bought += cfg.stack;
    }
    const hand = game.hand;
    const person = hand && !hand.result && !hand.runout && hand.toAct ? game.players.find((p) => p.id === hand.toAct && !p.bot) : undefined;
    const before = prev;
    const ts = performance.now();
    if (hand && person) {
      const seat = hand.seats.find((x) => x.playerId === person.id)!;
      const entry = kinds[entryOf.get(person.id)!];
      const m = entry.kind === 'archetype' ? scriptMove(entry.name as Archetype, game, hand, seat, decide) : engine.decide(game, hand, seat, decide).move;
      const act = (move: Move, to?: number) => engine.applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, { deviceId: person.deviceId!, now: clock, rng });
      const r = act(m.move, m.to);
      if (!r.ok) illegal++;
      const fb = r.ok ? r : act(seat.bet >= hand.currentBet ? 'check' : 'fold');
      if (fb.ok) game = fb.game;
      clock -= 1;
    } else step('server', { type: 'tick' });
    const ms = performance.now() - ts;

    const h = game.hand;
    if (h) {
      if (h.number !== lastHand) {
        lastHand = h.number;
        seen = 0;
        events = [];
        firstCards.push(h.seats[0]?.cards.join('') ?? '');
      }
      const acts = h.actions ?? [];
      if (acts.length > seen) {
        for (const a of acts.slice(seen)) {
          const who = seatOf.get(a.playerId)!;
          const seatNow = h.seats.find((s) => s.playerId === a.playerId)!;
          const toCall = before ? Math.max(0, before.currentBet - (before.bets.get(a.playerId) ?? 0)) : 0;
          const board = before ? boardAt(a.street, before.board.length >= 3 ? before.board : h.board) : [];
          const cards = before?.holes.get(a.playerId) ?? seatNow.cards;
          const livePrev = before ? h.seats.filter((s) => !before.folded.has(s.playerId)).length : h.seats.length;
          const bucket = a.street !== 'preflop' && cards.length === 2 && board.length >= 3 ? engine.handBucket(cards, board) : null;
          const liveIds = before ? h.seats.filter((x) => !before.folded.has(x.playerId)).map((x) => x.playerId) : [];
          const opp = livePrev === 2 ? (liveIds.find((id) => id !== a.playerId) ?? null) : null;
          const potBefore = Math.max(1, before?.pot ?? 1);
          const frac = (a.to - (before?.bets.get(a.playerId) ?? 0)) / potBefore;
          events.push({ h: h.number, who, street: a.street, move: a.move, to: a.to, pot: before?.pot ?? 0, toCall, bucket, live: livePrev, stack: before?.stacks.get(a.playerId) ?? 0, opp: opp === null ? null : seatOf.get(opp)!, frac, cat: a.street === 'river' && cards.length === 2 && board.length === 5 ? describeHand([...cards, ...board]).category : -1 });
          // Latency counts the step that produced the action (bots and the host brain; scripts are instant).
          if (!a.outOfTurn && reports[who].kind !== 'archetype') latencyOf(ms, reports[who].c);
        }
        seen = acts.length;
      }
      if (h.result && scored !== h.number) finish(h);
    }
    prev = snap();
  }

  const n = Math.max(1, table.hands);
  return {
    config: cfg,
    engine: engineName,
    seats: reports,
    handsPlayed: table.hands,
    wallMs: performance.now() - t0,
    chipLeaks,
    illegal,
    stuck,
    firstCards,
    samples,
    table: {
      flops: table.flops / n,
      showdowns: table.showdowns / n,
      raisedMultiway: table.raisedMultiway / n,
      limpedFlops: table.limpedFlops / n,
      threeBetPots: table.threeBetPots / n,
      checkedDown: table.checkedDown / n,
      avgPotBb: table.pot / n,
      allIns: table.allIns / n,
      endedPreflop: table.endedPreflop / n,
    },
  };
}

export { ARCHETYPES };
