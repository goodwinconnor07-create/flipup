// The table and everything in it. One Game is one table, from lobby to the last hand.

import type { Card } from './cards';

export type Status = 'lobby' | 'playing' | 'ended';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type Move = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface Settings {
  /** Chips each player sits down with (and gets again on a rebuy). */
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  /** Busted players can buy back in for another starting stack. */
  rebuys: boolean;
  /** Minutes between blind increases. 0 (or missing) = the blinds never go up. */
  blindMinutes?: number;
  /** Rising blinds stop at this big blind (0 or missing: they keep doubling). */
  blindCap?: number;
  /** Seconds a person gets to act before they're checked or folded. 0 = no limit. */
  turnSeconds: number;
}

export interface Player {
  id: string;
  name: string;
  emoji: string;
  /** The phone that plays this seat. null for bots. */
  deviceId: string | null;
  bot: boolean;
  /** 0 to 8, clockwise. */
  seat: number;
  stack: number;
  /** Every chip this player has bought in for, so standings show what they're up or down. */
  bought: number;
  /** Not dealt in until they come back. */
  sittingOut: boolean;
  /** Turns in a row they ran out of time. Two in a row sits them out. */
  timeouts: number;
  /** Asked to leave during a hand: folded on their turn and removed when it ends. */
  leaving: boolean;
}

export interface Seat {
  playerId: string;
  /** Hole cards. Empty for other players' hidden cards (the server never sends them). */
  cards: Card[];
  /** Chips put in on this street. */
  bet: number;
  /** Chips put in over the whole hand. */
  total: number;
  folded: boolean;
  allIn: boolean;
  /** Has acted since the last full raise (so a short all-in doesn't let them raise again). */
  acted: boolean;
  /** Cards are face up for everyone. */
  shown: boolean;
  /** The last thing they did, shown under their picture. */
  last: { move: Move | 'sb' | 'bb'; amount: number; street: Street } | null;
}

export interface PotResult {
  amount: number;
  /** Who could win it. */
  eligible: string[];
  winners: string[];
}

export interface HandResult {
  pots: PotResult[];
  /** Chips each player got back, by id (the uncalled part of a bet comes back too). */
  won: Record<string, number>;
  /** Hand names for everyone who showed: "Two pair, kings and fives". */
  names: Record<string, string>;
  /** True if it went to a showdown; false if everyone else folded. */
  showdown: boolean;
}

/** One finished hand, for the hand log. */
export interface HandLog {
  number: number;
  /** What happened, in order. Cards are written like [Ah]. */
  lines: string[];
  /** Everyone's hole cards. Phones only get their own and any that were shown. */
  holes: Record<string, Card[]>;
  /** Players whose cards everyone saw. */
  shown: string[];
  /** The same hand as data, for the GTO review (missing on hands from older versions). */
  record?: HandRecord;
}

/** One move, as data. `to` is the player's total bet on that street after the move. */
export interface HandAction {
  street: Street;
  playerId: string;
  move: Move;
  to: number;
  /** Folded out of turn (left the table mid-hand). */
  outOfTurn?: boolean;
}

/** A finished hand as data: what the GTO review and the training screens work from. */
export interface HandRecord {
  tableId: string;
  number: number;
  /** When the hand finished. */
  at: number;
  smallBlind: number;
  bigBlind: number;
  buttonId: string;
  /** Everyone dealt in, with their chips before the blinds. */
  players: { id: string; name: string; emoji: string; seat: number; stack: number }[];
  actions: HandAction[];
  board: Card[];
  /** Hole cards this phone may see (its own and any shown). */
  holes: Record<string, Card[]>;
  /** Chips each player got back at the end. */
  won: Record<string, number>;
  showdown: boolean;
}

export interface Hand {
  /** 1 for the first hand at the table. */
  number: number;
  /** Counts every move, so a late or doubled tap can't act twice. */
  seq: number;
  buttonId: string;
  sbId: string | null;
  bbId: string;
  /** In seat order, clockwise. */
  seats: Seat[];
  /** The rest of the deck. Only the server (or a bots-only phone) ever has it. */
  deck: Card[];
  board: Card[];
  street: Street;
  /** Whose turn it is. null between streets, during a run-out and once the hand is over. */
  toAct: string | null;
  /** The bet to match on this street. */
  currentBet: number;
  /** Size of the last full raise: the next raise has to be at least this much more. */
  minRaise: number;
  /** Last player to bet or raise on the current street. */
  aggressorId: string | null;
  /** Betting is over and every live hand is face up: the rest of the board runs out. */
  runout: boolean;
  /** When the next timed thing happens: a bot acts, a turn times out, the next run-out card. */
  actAt: number | null;
  /** When the current person's time runs out (for the timer ring). */
  deadline: number | null;
  result: HandResult | null;
  /** What's happened so far this hand, for the hand log. */
  log: string[];
  /** Every move as data (public information). */
  actions?: HandAction[];
  /** Each player's chips before the blinds. */
  startStacks?: Record<string, number>;
}

export interface Game {
  id: string;
  /** Join code for online tables. null for bots-only tables on one phone. */
  code: string | null;
  createdAt: number;
  hostDeviceId: string;
  status: Status;
  settings: Settings;
  players: Player[];
  hand: Hand | null;
  /** Seat of the last button, so it moves on one seat each hand. */
  buttonSeat: number | null;
  /** When the next hand deals. */
  nextHandAt: number | null;
  /** Players who tapped Next hand. */
  ready: string[];
  /** Bumped on every change. */
  version: number;
  /** When the server should wake up to move things along. null = nothing timed. */
  wakeAt: number | null;
  /** Every finished hand at this table, oldest first. Sent to phones only when they open the hand log. */
  logs: HandLog[];
  /** Each player's latest quick message. `n` goes up with every new one, so phones know it's new. */
  reactions?: Record<string, { id: string; n: number }>;
  /** Hands dealt at this table so far (a hand called off still counts). */
  hands?: number;
  /** When the blinds next go up (they change as the next hand is dealt). null = never. */
  blindsRaiseAt?: number | null;
}

export type Action =
  /** This phone takes a seat (or updates its name and picture). */
  | { type: 'join'; name: string; emoji: string }
  | { type: 'setLook'; name: string; emoji: string }
  | { type: 'addBot' }
  /** Host removes a player or bot; anyone can remove themselves. */
  | { type: 'remove'; playerId: string }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'start' }
  | { type: 'act'; hand: number; seq: number; move: Move; to?: number }
  | { type: 'next'; hand: number }
  /** Turn your cards face up once the hand is over. */
  | { type: 'show'; hand: number }
  /** After a hand, the host turns every bot's cards face up for everyone. */
  | { type: 'revealBots'; hand: number }
  /** A quick message to the table ("Nice hand!"). */
  | { type: 'react'; id: string }
  | { type: 'sitOut'; out: boolean }
  | { type: 'rebuy' }
  | { type: 'end' }
  /** Internal: time has moved on (bots, timers, run-outs). Never accepted from a phone. */
  | { type: 'tick' };

export interface ActionContext {
  deviceId: string;
  now: number;
  rng: () => number;
}

export type ActionResult = { ok: true; game: Game; changed: boolean } | { ok: false; error: string };
