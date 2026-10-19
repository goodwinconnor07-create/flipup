// The custom-hand builder's betting rules: given the players, blinds and the moves entered so far,
// work out whose turn it is, what they may do, and when the next board cards are needed.
// Same rules as the table (docs/RULES.md): "to" amounts are street totals, the smallest raise is
// the last full raise, and short all-ins don't reopen the betting.

import type { Move, Street } from '../game';

export interface BuilderPlayer {
  id: string;
  name: string;
  stack: number;
}

export interface BuilderSetup {
  /** In seat order, clockwise. */
  players: BuilderPlayer[];
  buttonIndex: number;
  smallBlind: number;
  bigBlind: number;
}

export interface BuilderAction {
  street: Street;
  playerId: string;
  move: Move;
  to: number;
}

export interface BuilderState {
  street: Street;
  /** Player to act, or null when the street is over or the hand has ended. */
  toAct: string | null;
  toCall: number;
  /** Smallest legal bet/raise "to" amount, and the most (all in). */
  minTo: number;
  maxTo: number;
  canCheck: boolean;
  canRaise: boolean;
  pot: number;
  stacks: Record<string, number>;
  bets: Record<string, number>;
  folded: Set<string>;
  /** Board cards needed before betting can continue (3 for the flop, 1 for turn and river). */
  needCards: number;
  /** The hand is over: everyone else folded, or the river betting finished. */
  over: boolean;
  /** Everyone left is all in (or all but one): the rest of the board just runs out. */
  runout: boolean;
}

export const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const BOARD_AT: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

export function blindIndexes(setup: BuilderSetup): { sb: number; bb: number } {
  const n = setup.players.length;
  const sb = n === 2 ? setup.buttonIndex : (setup.buttonIndex + 1) % n;
  return { sb, bb: (sb + 1) % n };
}

/** Replays the moves. Throws if one of them isn't legal (the UI only offers legal ones). */
export function replay(setup: BuilderSetup, actions: BuilderAction[], boardCount: number): BuilderState {
  const n = setup.players.length;
  const ids = setup.players.map((p) => p.id);
  const stacks: Record<string, number> = Object.fromEntries(setup.players.map((p) => [p.id, p.stack]));
  const bets: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const folded = new Set<string>();
  const allIn = new Set<string>();
  let acted = new Set<string>();
  let pot = 0;
  const { sb, bb } = blindIndexes(setup);
  const post = (i: number, amt: number) => {
    const id = ids[i];
    const a = Math.min(amt, stacks[id]);
    stacks[id] -= a;
    bets[id] += a;
    pot += a;
    if (stacks[id] === 0) allIn.add(id);
  };
  post(sb, setup.smallBlind);
  post(bb, setup.bigBlind);
  let street = 'preflop' as Street;
  let currentBet = setup.bigBlind;
  let minRaise = setup.bigBlind;
  const firstToAct = (s: Street) => (s === 'preflop' ? (n === 2 ? setup.buttonIndex : (bb + 1) % n) : (setup.buttonIndex + 1) % n);
  const live = (id: string) => !folded.has(id) && !allIn.has(id);
  const needs = (id: string) => live(id) && (!acted.has(id) || bets[id] < currentBet);
  let cursor = firstToAct('preflop');

  const nextActor = (from: number): string | null => {
    if (ids.filter((id) => !folded.has(id)).length <= 1) return null;
    for (let k = 0; k < n; k++) {
      const id = ids[(from + k) % n];
      if (needs(id)) return id;
    }
    return null;
  };

  const startStreet = (s: Street) => {
    street = s;
    for (const id of ids) bets[id] = 0;
    currentBet = 0;
    minRaise = setup.bigBlind;
    acted = new Set();
    cursor = firstToAct(s);
  };

  for (const a of actions) {
    // Move to the action's street if the previous one is finished.
    while (a.street !== street) {
      if (nextActor(cursor) !== null) throw new Error(`${a.playerId} acted on the ${a.street} before the ${street} finished`);
      const i = STREETS.indexOf(street);
      if (i >= 3) throw new Error('No streets after the river.');
      startStreet(STREETS[i + 1]);
    }
    const actor = nextActor(cursor);
    if (actor !== a.playerId) throw new Error(`It's ${actor ?? 'nobody'}'s turn, not ${a.playerId}'s.`);
    const id = a.playerId;
    const toCall = currentBet - bets[id];
    if (a.move === 'fold') folded.add(id);
    else if (a.move === 'check') {
      if (toCall > 0) throw new Error("Can't check facing a bet.");
    } else if (a.move === 'call') {
      if (toCall <= 0) throw new Error('Nothing to call.');
      const add = Math.min(toCall, stacks[id]);
      stacks[id] -= add;
      bets[id] += add;
      pot += add;
      if (stacks[id] === 0) allIn.add(id);
    } else {
      const max = bets[id] + stacks[id];
      const to = Math.min(a.to, max);
      if (to <= currentBet) {
        // An all-in for no more than the bet is a call.
        const add = to - bets[id];
        stacks[id] -= add;
        bets[id] += add;
        pot += add;
        if (stacks[id] === 0) allIn.add(id);
      } else {
        const add = to - bets[id];
        if (to < Math.min(max, currentBet + minRaise)) throw new Error(`The smallest raise is to ${currentBet + minRaise}.`);
        stacks[id] -= add;
        bets[id] += add;
        pot += add;
        if (stacks[id] === 0) allIn.add(id);
        const raiseBy = to - currentBet;
        if (raiseBy >= minRaise) {
          minRaise = raiseBy;
          acted = new Set();
        }
        currentBet = to;
      }
    }
    acted.add(id);
    cursor = (ids.indexOf(id) + 1) % n;
  }

  const inHand = ids.filter((id) => !folded.has(id));
  const canAct = () => inHand.filter((id) => !allIn.has(id));
  let over = inHand.length <= 1;
  let runout = false;
  let needCards = 0;
  let actor = over ? null : nextActor(cursor);
  // A finished street: run on to the next one once its cards are on the board.
  while (!over && actor === null) {
    if (street === 'river') {
      over = true;
      break;
    }
    if (canAct().length < 2) {
      runout = true;
      needCards = Math.max(0, 5 - boardCount);
      over = needCards === 0;
      break;
    }
    const next = STREETS[STREETS.indexOf(street) + 1];
    needCards = Math.max(0, BOARD_AT[next] - boardCount);
    if (needCards > 0) break;
    startStreet(next);
    actor = nextActor(cursor);
  }
  const othersCanCall = actor ? canAct().some((id) => id !== actor) : false;
  const toCall = actor ? currentBet - bets[actor] : 0;
  const maxTo = actor ? bets[actor] + stacks[actor] : 0;
  return {
    street,
    toAct: over ? null : actor,
    toCall,
    minTo: actor ? Math.min(maxTo, currentBet + minRaise) : 0,
    maxTo,
    canCheck: !!actor && toCall <= 0,
    canRaise: !!actor && maxTo > currentBet && othersCanCall && (!acted.has(actor) || bets[actor] < currentBet),
    pot,
    stacks,
    bets,
    folded,
    needCards: over ? 0 : needCards,
    over,
    runout,
  };
}

/** The next street's name after the given one. */
export function nextStreet(s: Street): Street {
  return STREETS[Math.min(3, STREETS.indexOf(s) + 1)];
}
