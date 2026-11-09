import type { BotMove } from '../game/botPlay';
import type { Card } from '../game/cards';
import type { Hand } from '../game/types';
import { canRaise } from '../game/holdem';
import { scoreHand } from '../game/evaluate';
import { showdownReturn } from './actionValues';
import { handIntent, publicLine } from './handPlan';
import type { InformationSet } from './information';
import { sampleDeal, type OpponentRange } from './ranges';

/** Small betting ledger for hypothetical worlds. Production reopening and pot eligibility
 * remain authoritative; parity tests check this ledger against actual engine transitions. */
export class PlanningRound {
  hand: Hand;
  stacks: number[];
  aggressions: number;
  bettors: Set<string>;
  previousBettors: Set<string>;
  previousBoard: Card[];
  lead: string | null;
  constructor(readonly information: InformationSet) {
    const i = information;
    const players = [...i.players].sort((a, b) => a.seat - b.seat);
    const acted = new Set<string>();
    let price = 0,
      minRaise = i.bigBlind;
    for (const a of i.actions.filter((a) => a.street === i.street && !a.outOfTurn)) {
      if (['raise', 'bet', 'allin'].includes(a.move) && a.to > price) {
        if (a.to - price >= minRaise) {
          minRaise = a.to - price;
          for (const p of players) if (!p.folded && !p.allIn) acted.delete(p.id);
        }
        price = a.to;
      }
      acted.add(a.playerId);
    }
    this.stacks = players.map((p) => p.stack);
    const line = publicLine(i.actions, i.heroId, i.street);
    this.aggressions = line.raises;
    this.lead = line.lastAggressor;
    this.bettors = new Set(players.filter((p) => publicLine(i.actions, p.id, i.street).heroBet).map((p) => p.id));
    const previousStreet = i.street === 'river' ? 'turn' : i.street === 'turn' ? 'flop' : 'preflop';
    this.previousBettors = new Set(players.filter((p) => publicLine(i.actions, p.id, previousStreet, i.bigBlind).heroBet).map((p) => p.id));
    this.previousBoard = i.board.slice(0, i.street === 'river' ? 4 : i.street === 'turn' ? 3 : 0);
    this.hand = {
      number: i.hand,
      seq: i.sequence,
      buttonId: i.buttonId,
      sbId: null,
      bbId: i.buttonId,
      seats: players.map((p) => ({
        playerId: p.id,
        cards: [],
        bet: p.bet,
        total: p.total,
        folded: p.folded,
        allIn: p.allIn || p.stack === 0,
        acted: acted.has(p.id),
        shown: false,
        last: null,
      })),
      deck: [],
      board: [...i.board],
      street: i.street,
      toAct: i.heroId,
      currentBet: i.currentBet,
      minRaise,
      aggressorId: this.lead,
      runout: false,
      actAt: null,
      deadline: null,
      result: null,
      log: [],
    };
  }
  clone(): PlanningRound {
    const copy = Object.create(PlanningRound.prototype) as PlanningRound;
    Object.assign(copy, {
      information: this.information,
      hand: { ...this.hand, seats: this.seats.map((s) => ({ ...s })) },
      stacks: [...this.stacks],
      aggressions: this.aggressions,
      bettors: new Set(this.bettors),
      previousBettors: this.previousBettors,
      previousBoard: this.previousBoard,
      lead: this.lead,
    });
    return copy;
  }
  get seats() {
    return this.hand.seats;
  }
  live() {
    return this.seats.filter((s) => !s.folded);
  }
  active() {
    return this.seats.filter((s) => !s.folded && !s.allIn);
  }
  pot() {
    return this.seats.reduce((s, p) => s + p.total, 0);
  }
  options(at: number) {
    const s = this.seats[at],
      maxTo = s.bet + this.stacks[at];
    return {
      toCall: Math.min(this.stacks[at], Math.max(0, this.hand.currentBet - s.bet)),
      minTo: Math.min(maxTo, this.hand.currentBet + this.hand.minRaise),
      maxTo,
      canRaise: !s.folded && !s.allIn && canRaise(this.hand, s) && maxTo > this.hand.currentBet,
    };
  }
  next(after: number): number {
    if (this.live().length <= 1) return -1;
    for (let step = 1; step <= this.seats.length; step++) {
      const at = (after + step) % this.seats.length,
        s = this.seats[at];
      if (!s.folded && !s.allIn && (!s.acted || s.bet < this.hand.currentBet)) return at;
    }
    return -1;
  }
  eligiblePot(at: number, call: number) {
    const cap = this.seats[at].total + call;
    return this.seats.reduce((sum, s) => sum + Math.min(s.total, cap), 0);
  }
  apply(at: number, action: BotMove) {
    const s = this.seats[at],
      o = this.options(at);
    if (s.folded || s.allIn) throw new Error('Inactive planning actor');
    let cost = 0;
    if (action.move === 'fold') s.folded = true;
    else if (action.move === 'check') {
      if (o.toCall > 0) throw new Error('Planning check faces a bet');
    } else if (action.to !== undefined) {
      if (
        !o.canRaise ||
        action.to < o.minTo ||
        action.to > o.maxTo ||
        action.to <= this.hand.currentBet ||
        !Number.isSafeInteger(action.to)
      )
        throw new Error('Illegal planning raise');
      const by = action.to - this.hand.currentBet;
      if (by >= this.hand.minRaise) {
        this.hand.minRaise = by;
        for (const other of this.seats) if (other !== s && !other.folded && !other.allIn) other.acted = false;
      }
      this.hand.currentBet = action.to;
      this.hand.aggressorId = s.playerId;
      this.lead = s.playerId;
      this.bettors.add(s.playerId);
      this.aggressions++;
      cost = action.to - s.bet;
    } else if (action.move === 'call') {
      if (o.toCall <= 0) throw new Error('Nothing to call in planning round');
      cost = o.toCall;
    } else throw new Error('Unsupported planning move');
    this.stacks[at] -= cost;
    s.bet += cost;
    s.total += cost;
    s.allIn = this.stacks[at] === 0;
    s.acted = true;
  }
  refundUncalled() {
    const sorted = [...this.seats].sort((a, b) => b.bet - a.bet);
    const s = sorted[0],
      extra = s.bet - sorted[1].bet;
    if (extra <= 0) return;
    s.bet -= extra;
    s.total -= extra;
    const at = this.seats.indexOf(s);
    this.stacks[at] += extra;
    if (this.stacks[at] > 0) s.allIn = false;
  }
  advance(card: Card) {
    this.refundUncalled();
    this.previousBettors = this.bettors;
    this.bettors = new Set();
    this.previousBoard = [...this.hand.board];
    this.hand.board = [...this.hand.board, card];
    this.hand.street = this.hand.board.length === 4 ? 'turn' : 'river';
    this.hand.currentBet = 0;
    this.hand.minRaise = this.information.bigBlind;
    this.hand.aggressorId = null;
    this.aggressions = 0;
    for (const s of this.seats) {
      s.bet = 0;
      s.acted = false;
    }
  }
}

export function continuationView(round: PlanningRound, at: number, hole: Card[]) {
  const s = round.seats[at],
    o = round.options(at);
  const active = round.active(),
    live = round.live().length;
  const inPosition =
    [
      ...round.seats.slice(round.seats.findIndex((s) => s.playerId === round.hand.buttonId) + 1),
      ...round.seats.slice(0, round.seats.findIndex((s) => s.playerId === round.hand.buttonId) + 1),
    ]
      .filter((s) => !s.folded && !s.allIn)
      .at(-1)?.playerId === s.playerId;
  const drySidePot =
    live > active.length &&
    active.every((p) => p.total <= Math.max(0, ...round.seats.filter((p) => !p.folded && p.allIn).map((p) => p.total)));
  return {
    hole: [...hole],
    board: [...round.hand.board],
    previousBoard: [...round.previousBoard],
    previousBet: round.previousBettors.has(s.playerId),
    facingStrength:
      round.aggressions >= 2 ||
      (round.previousBettors.has(s.playerId) && round.hand.aggressorId !== null && round.hand.aggressorId !== s.playerId),
    inPosition,
    initiative: round.lead === s.playerId,
    drySidePot,
    live,
    toCall: o.toCall,
    eligiblePot: round.eligiblePot(at, o.toCall),
  };
}

/** Narrow policy input: own hole cards and public state only. */
export function continuationIntent(view: ReturnType<typeof continuationView>) {
  const { hole, board, previousBoard, previousBet, facingStrength, inPosition, initiative, live, drySidePot, toCall, eligiblePot } = view;
  const kind = handIntent(hole, board, previousBoard, previousBet, facingStrength);
  const base =
    kind.intent === 'value'
      ? 0.8
      : kind.intent === 'semi-bluff'
        ? 0.43
        : kind.intent === 'pressure'
          ? 0.13
          : kind.intent === 'pot-control'
            ? kind.level >= 5
              ? 0.48
              : 0.2
            : kind.intent === 'bluff-catch'
              ? 0.12
              : 0.045;
  const multiway = Math.pow(kind.level >= 7 ? 0.9 : kind.level >= 3 || kind.draw !== 'none' ? 0.75 : 0.45, Math.max(0, live - 2));
  const betProbability = Math.min(
    0.9,
    (base + (inPosition ? 0.035 : 0) + (initiative ? 0.035 : 0)) * multiway * (drySidePot && kind.level <= 4 ? 0.1 : 1),
  );
  const made = { 0: 0.08, 1: 0.17, 3: 0.32, 4: 0.42, 5: 0.53, 6: 0.66, 7: 0.74, 8: 0.85, 9: 0.91, 10: 0.96, 11: 0.992 }[kind.level];
  let strength = Math.max(made, kind.draw === 'combo draw' || kind.draw === 'nut flush draw' ? 0.5 : kind.draw !== 'none' ? 0.43 : 0);
  if (facingStrength && kind.level < 7) strength -= 0.06;
  const odds = toCall / Math.max(1, eligiblePot + toCall);
  const royalBoard =
    board.length === 5 && board.every((c) => c[1] === board[0][1]) && ['T', 'J', 'Q', 'K', 'A'].every((r) => board.some((c) => c[0] === r));
  let callProbability =
    toCall === 0 || royalBoard ? 1 : Math.max(0.02, Math.min(0.995, 1 / (1 + Math.exp(-(strength - odds - 0.12) / 0.12))));
  if (kind.level < 7 && !royalBoard) callProbability *= Math.pow(0.94, Math.max(0, live - 2));
  return {
    ...kind,
    betProbability,
    callProbability,
    raiseProbability: (kind.level >= 8 ? 0.28 : kind.level >= 7 ? 0.15 : kind.draw !== 'none' ? 0.035 : 0) * multiway,
    fraction: kind.intent === 'value' ? 0.75 : kind.intent === 'semi-bluff' ? 0.5 : 0.33,
  };
}

/** All random variates are indexed by actor, round and response, never by the chosen
 * root action. Conditional policies have no opposing holes or unseen board input. */
export function estimateMultiplayer(
  i: InformationSet,
  ranges: OpponentRange[],
  actions: BotMove[],
  rng: () => number,
  samples: number,
  onContinuation?: (event: {
    sample: number;
    candidate: number;
    playerId: string;
    view: ReturnType<typeof continuationView>;
    action: BotMove;
  }) => void,
) {
  if (i.street === 'preflop' || !Number.isSafeInteger(samples) || samples < 2 || samples > 256)
    throw new Error('Unsupported multiplayer estimate');
  const template = new PlanningRound(i);
  const hero = template.seats.findIndex((s) => s.playerId === i.heroId);
  const initialStack = template.stacks[hero];
  const sum = actions.map(() => 0),
    square = actions.map(() => 0);
  const futureBets = actions.map(() => 0),
    reraises = actions.map(() => 0),
    futureCost = actions.map(() => 0);
  let equitySum = 0,
    equitySquare = 0;
  const futureStreets = i.street === 'flop' ? ['turn', 'river'] : i.street === 'turn' ? ['river'] : [];
  for (let sample = 0; sample < samples; sample++) {
    const deal = sampleDeal(i, ranges, rng);
    const sampled = new Map(ranges.map((r, at) => [r.playerId, deal.opponents[at]]));
    const holes = template.seats.map((s) => (s.playerId === i.heroId ? i.hole : (sampled.get(s.playerId) ?? [])));
    const scores = template.seats.map((s, at) => (s.folded ? -1 : scoreHand([...holes[at], ...deal.board])));
    const best = Math.max(...scores),
      share = scores[hero] === best ? 1 / scores.filter((s) => s === best).length : 0;
    equitySum += share;
    equitySquare += share * share;
    const button = template.seats.findIndex((s) => s.playerId === i.buttonId);
    const actorOrder = template.seats.map((_, n) => (button + n + 1) % template.seats.length);
    const draws = Array.from({ length: 3 }, () => {
      const bySeat: number[][] = [];
      for (const at of actorOrder) bySeat[at] = Array.from({ length: 4 }, () => rng());
      return bySeat;
    });
    actions.forEach((action, k) => {
      if (action.move === 'fold') return;
      const round = template.clone();
      round.apply(hero, action);
      const afterRootAggression = round.aggressions;
      let futureBet = false,
        reraised = false,
        startFuture = 0;
      const complete = (after: number, streetIndex: number, maxAggressions: number) => {
        const visits = round.seats.map(() => 0);
        let at = round.next(after),
          steps = 0;
        while (at >= 0) {
          if (++steps > round.seats.length * 4 + 4) throw new Error('Planning round did not finish');
          const o = round.options(at),
            view = continuationView(round, at, holes[at]),
            intent = continuationIntent(view);
          const draw = draws[streetIndex][at][Math.min(3, visits[at]++)];
          const raise =
            o.canRaise && round.aggressions < maxAggressions && draw < (o.toCall ? intent.raiseProbability : intent.betProbability);
          const target = Math.min(
            o.maxTo,
            Math.max(o.minTo, round.hand.currentBet + Math.round((round.eligiblePot(at, o.toCall) + o.toCall) * intent.fraction)),
          );
          const move: BotMove = raise
            ? { move: round.hand.currentBet ? 'raise' : 'bet', to: target }
            : o.toCall
              ? { move: draw < intent.callProbability ? 'call' : 'fold' }
              : { move: 'check' };
          const raised = move.to !== undefined && round.hand.currentBet > 0;
          round.apply(at, move);
          if (onContinuation) onContinuation({ sample, candidate: k, playerId: round.seats[at].playerId, view, action: { ...move } });
          if (move.to !== undefined && at === hero && streetIndex > 0) futureBet = true;
          if (raised && at !== hero && streetIndex === 0) reraised = true;
          at = round.next(at);
        }
        round.refundUncalled();
      };
      complete(hero, 0, afterRootAggression + (action.to === undefined && i.currentBet === 0 ? 2 : 1));
      startFuture = round.stacks[hero];
      for (let street = 0; street < futureStreets.length; street++) {
        if (round.seats[hero].folded || round.active().length < 2 || round.live().length < 2) break;
        round.advance(deal.board[i.board.length + street]);
        const button = round.seats.findIndex((s) => s.playerId === i.buttonId);
        complete(button, street + 1, 2); // One bet and one re-raise per future street.
      }
      const cost = initialStack - round.stacks[hero];
      const contributions = i.players.map((p) => round.seats.find((s) => s.playerId === p.id)!.total);
      const folded = i.players.map((p) => round.seats.find((s) => s.playerId === p.id)!.folded);
      const orderedScores = i.players.map((p) => scores[round.seats.findIndex((s) => s.playerId === p.id)]);
      const value = showdownReturn(i, contributions, folded, orderedScores) - cost;
      sum[k] += value;
      square[k] += value * value;
      futureBets[k] += Number(futureBet);
      reraises[k] += Number(reraised);
      futureCost[k] += startFuture - round.stacks[hero];
    });
  }
  const se = (s: number, ss: number) => Math.sqrt(Math.max(0, (ss - (s * s) / samples) / (samples - 1)) / samples);
  return {
    values: sum.map((s) => s / samples),
    standardErrors: sum.map((s, k) => se(s, square[k])),
    equity: equitySum / samples,
    equityStandardError: se(equitySum, equitySquare),
    planning: {
      version: 'multi-street-2' as const,
      street: i.street,
      nextStreet: futureStreets[0] ?? null,
      futureStreets,
      samples,
      opponents: template.live().length - 1,
      activeOpponents: template.active().length - 1,
      futureBetShare: futureBets.map((n) => n / samples),
      reRaiseShare: reraises.map((n) => n / samples),
      futureCostBb: futureCost.map((n) => n / samples / i.bigBlind),
    },
  };
}
