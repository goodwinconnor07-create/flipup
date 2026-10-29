// The table and everything in it. One Game is one table, from lobby to the last hand.

import type { Card } from './cards';
import type { TwinBrain } from './twinFit';
import type { Variant } from './variants';

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
  /** Blinds double every this many hands (party tournaments). Works alongside `blindMinutes`; 0 or missing = off. */
  blindHands?: number;
  /** Rising blinds stop at this big blind (0 or missing: they keep doubling). */
  blindCap?: number;
  /** Online tables: a busted player (no chips) sees every hole card. */
  showToBusted?: boolean;
  /** Seconds a person gets to act before they're checked or folded. 0 = no limit. */
  turnSeconds: number;
  /** Which game the table plays (see variants.ts). Missing = Texas Hold'em. */
  variant?: Variant;
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
  /** Their phone has lost the connection to the table (set by the server). Their clock is short until they're back. */
  offline?: boolean;
  /** A bot's way of playing (see botStyles.ts). Stripped before the table is sent to any phone. */
  style?: string;
  /** Plays in the style of a legend (see legends.ts). Public: the table shows who it is. */
  legend?: string;
  /** Their chat bubble colour (see bubbles.ts), a FlipUp Premium extra. Public: everyone at the table sees it. */
  bubble?: string;
  /** Their card back (see cardPacks.ts), a FlipUp Premium extra. Public: the table sees it on the back of their cards. */
  cardPack?: string;
  /** An AI twin: a bot that plays like a real person, from what their memory holds. Stripped before the table is sent to any phone. */
  twin?: TwinBrain;
  /** Stable bot identity, private on online tables. */
  botProfile?: string;
}

/** What the bots have seen a player do, from public moves only. */
export interface PlayerRead {
  hands: number;
  vpip: number;
  pfr: number;
  betsFaced: number;
  foldsToBet: number;
  aggr: number;
  calls: number;
  /** Went all in before the flop with a deep stack (8bb or more), first in. */
  shoves?: number;
  /** After the flop: times they could bet (nobody had yet), and times they did. A player who bets nearly every time is betting hands a value-only player wouldn't. */
  betOpps?: number;
  bets?: number;
  /** Hands seen at showdown after they bet or raised the turn or river... */
  shownBets?: number;
  /** ...and how many of those were bluffs. */
  shownBluffs?: number;
  /** Bets faced on each street, and how many they folded to: some people give up on the turn, others never on the river. */
  flopFaced?: number;
  flopFolds?: number;
  turnFaced?: number;
  turnFolds?: number;
  riverFaced?: number;
  riverFolds?: number;
  /** Flop bets faced from the player who raised before the flop (c-bets), and folds to them. */
  cbetFaced?: number;
  cbetFolds?: number;
  /** Times they raised first in and then faced a 3-bet, and folded. */
  threeBetFaced?: number;
  threeBetFolds?: number;
  /** Times they faced an open raise and could 3-bet, and did. */
  openFaced?: number;
  threeBets?: number;
  /** Times they checked and then faced a bet on the same street, and raised it (a check-raise). */
  crOpps?: number;
  crs?: number;
  /** Limped in (called the big blind before anyone raised). */
  limps?: number;
  /** Shown down after a big bet (70% of the pot or more) or a smaller one on the turn or river, and how many of each were top pair or better. */
  shownBig?: number;
  shownBigStrong?: number;
  shownSmall?: number;
  shownSmallStrong?: number;
  /** Exponentially weighted recent public observations (about five hands). */
  recent?: Omit<PlayerRead, 'recent'>;
}

/** How a bot feels right now. Never sent to phones. */
export interface BotMind {
  /** 0 calm to 1 steaming: after bad beats, getting bluffed and losing big pots. */
  tilt: number;
  /** -1 rattled to 1 on a heater. */
  confidence: number;
  winStreak?: number;
  lossStreak?: number;
  /** Losses preceding the latest win, for a factual comeback reaction. */
  previousLosses?: number;
  /** Players who've hurt it lately, by id: it wants those chips back. */
  grudges?: Record<string, number>;
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
  /** Ghost Hold'em: the ghost's hand, and the chips it kept for the next hand because nobody beat it. */
  ghost?: { cards: Card[]; name: string; kept: number };
  /** Imposter: who it was, how everyone voted (voter to suspect) and whether the innocents caught them. */
  imposter?: { id: string; votes: Record<string, string>; caught: boolean };
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
  /** Betting on this street is done and the next card is coming at this time. */
  nextStreetAt?: number | null;
  /** The board ran out with everyone all in (for the bots' sweating). */
  ranOut?: boolean;
  /** Each player's chips before the blinds. */
  startStacks?: Record<string, number>;
  /** Ghost Hold'em: the ghost's two cards. Sent to phones only once the hand reaches a showdown. */
  ghost?: Card[];
  /** Ghost Hold'em: chips the ghost kept from earlier hands, in this pot too. */
  carry?: number;
  /** Crazy Pineapple: the flop betting is over and everyone still in throws a card away before the turn. */
  discarding?: boolean;
  /** The game this hand is played as (a change of game in the settings waits for the next hand). Missing = Texas Hold'em. */
  variant?: Variant;
  /** Die on the River: what the die rolled, and the board card it swapped (out) for a new one (in). A 6 swaps nothing. */
  dice?: { roll: number; out?: Card; in?: Card };
  /** Imposter: the imposter's id. Phones only get it if it's them, or once the hand is over. */
  imposter?: string;
  /** Imposter: everyone dealt in is voting for who the imposter is. */
  voting?: boolean;
  /** Imposter: votes so far, voter to suspect. Phones see who has voted, not for whom, until the hand is over. */
  votes?: Record<string, string>;
}

/** One move played for a seat before anyone gets control, to set up a Scroll card's spot. `to` is the street total, as in an `act`. */
export interface ScriptMove {
  by: 'you' | 'bot';
  move: Move;
  to?: number;
}

/**
 * A Scroll card: a single hand dealt to order. Your cards and the board are fixed, the button is placed, and the
 * `script` moves are played before the first real decision. Such a table deals one hand only, and the bots stay quiet.
 * Never sent to phones.
 */
export interface CardScene {
  /** Where you sit, counted clockwise from the button: 0 is the button, 1 the small blind, 2 the big blind, then under the gun. Heads up, 0 is the button (and small blind) and 1 the big blind. */
  at: number;
  /** Your two hole cards. */
  hero: Card[];
  /** The board, up to five cards, in the order they come. Anything missing is dealt at random. */
  board: Card[];
  script: ScriptMove[];
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
  reactions?: Record<string, { id: string; n: number; /** A bot's line to one player, by name ({you}). */ to?: string }>;
  /** Hands dealt at this table so far (a hand called off still counts). */
  hands?: number;
  /** When the blinds next go up (they change as the next hand is dealt). null = never. */
  blindsRaiseAt?: number | null;
  /** What the bots have seen each player do. Never sent to phones. */
  reads?: Record<string, PlayerRead>;
  /** When each bot last spoke (table clock), so nobody chatters non-stop. Never sent to phones. */
  talkAt?: Record<string, number>;
  /** When each bot's last line is done being said and read: it doesn't move before then. */
  talkDone?: Record<string, number>;
  /** A bot that has said what it's thinking, and the move it will make a moment later. Never sent to phones. */
  botPlan?: { playerId: string; seq: number; move: Move; to?: number };
  /** A bot's reply to what someone just said, due a beat later. Never sent to phones. */
  pendingTalk?: { at: number; playerId: string; /** Default 'reply'. A 'tank' jab only lands if `forId` is still on the clock in hand-action `seq`. 'hello' is said to `forId`. */ event?: 'reply' | 'tank' | 'hello' | 'welcome' | 'rematchWon' | 'rematchLost' | 'greetBack' | 'thanks' | 'ribbed' | 'goodLuck' | 'gg' | 'cheer' | 'commiserate'; forId?: string; seq?: number; reactionN?: number; handNumber?: number };
  /** Hands in a row each person has lost chips without winning one. Bots use it to pick their moment. Never sent to phones. */
  streaks?: Record<string, number>;
  /** Bots that said something before this hand's outcome was known ("c'mon!", "all in"). They owe the table a reaction when it ends. Never sent to phones. */
  sweating?: string[];
  /** Players on the finished game's screen who tapped Play again. When the host does, they're seated in the new game; nobody else is. */
  again?: string[];
  /** How the game was dealt (blinds rise during a game), so Play again can set up the same one. */
  first?: { settings: Settings; bots: number };
  /** A bots-only table on this phone that runs on a faster clock (set when it's dealt, so it can't change mid-table). */
  fast?: boolean;
  /** A heads-up game against the player's own AI twin: "Play again" deals a new one from what the twin has learned since. */
  twinGame?: boolean;
  /** With `twinGame`: the twin is a friend's, whose twin code this is. */
  friendTwin?: string;
  /** A heads-up game against a legend (their id): "Play again" sits down against them again. */
  legendGame?: string;
  /** With `legendGame`: this person has beaten them before ('won') or only lost to them ('lost'), so they greet them differently. */
  rematch?: 'won' | 'lost';
  /** The last hand the bots took notes on. */
  readHand?: number;
  /** How each bot feels (tilt, confidence, grudges). Never sent to phones. */
  minds?: Record<string, BotMind>;
  /** Bounded private dialogue memory. IDs refer only to authored, public-safe text. */
  dialogue?: Record<string, { recent: string[]; lastIntent: string }>;
  /** A Scroll card's set-up. Its presence means one hand, dealt to order, with quiet bots. Never sent to phones. */
  card?: CardScene;
  /** Ghost Hold'em: chips the ghost is holding, which go into the next hand's pot. */
  ghostPot?: number;
  /** This table is one round of a party tournament (see party.ts). Public. */
  party?: { code: string; round: number; total: number };
  /** Party rounds: player ids in the order they ran out of chips (or left), first out first. Campaign sit and gos keep it too. */
  busted?: string[];
  /**
   * A campaign table (see campaign.ts): a cash game whose empty seats fill with new bots, or a tournament of `seats` players.
   * On this phone for bots only, or online (it has a code) with friends. `venue` is a stake id for cash, a venue id for a tournament.
   * Public: every phone pays its own buy-in and works out its own prize from it.
   */
  campaign?: {
    kind: 'cash' | 'sng';
    venue: string;
    seats: number;
    /** Tournaments: the format, and the prize drawn for this one. */
    format?: 'sng' | 'jackpot';
    prize?: number;
    /** What it costs to sit down: a tournament's buy-in, or an online cash table's fixed stack. */
    buyIn?: number;
  };
}

export type Action =
  /** This phone takes a seat (or updates its name and picture). */
  | { type: 'join'; name: string; emoji: string }
  | { type: 'setLook'; name: string; emoji: string; bubble?: string; cardPack?: string }
  /** `legend` seats that AI Legend instead of a random bot. */
  | { type: 'addBot'; legend?: string }
  /** Host removes a player or bot; anyone can remove themselves. */
  | { type: 'remove'; playerId: string }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'start' }
  | { type: 'act'; hand: number; seq: number; move: Move; to?: number }
  | { type: 'next'; hand: number }
  /** Crazy Pineapple: throw this card away after the flop. */
  | { type: 'discard'; hand: number; card: Card }
  /** Imposter: who you think the imposter is. */
  | { type: 'vote'; hand: number; playerId: string }
  /** Turn your cards face up once the hand is over. */
  | { type: 'show'; hand: number }
  /** After a hand, the host turns every bot's cards face up for everyone. */
  | { type: 'revealBots'; hand: number; /** Just this bot; all of them when missing. */ playerId?: string }
  /** A quick message to the table ("Nice hand!"). */
  | { type: 'react'; id: string }
  | { type: 'sitOut'; out: boolean }
  | { type: 'rebuy' }
  | { type: 'end' }
  /** After a game ends: the host opens a new one; anyone else says they want in (`off` takes that back). */
  | { type: 'playAgain'; off?: boolean }
  /** Internal: time has moved on (bots, timers, run-outs). Never accepted from a phone. */
  | { type: 'tick' }
  /** Internal: which phones are connected right now (device ids), from the server. Never accepted from a phone. */
  | { type: 'presence'; online: string[] };

export interface ActionContext {
  deviceId: string;
  now: number;
  rng: () => number;
}

export type ActionResult = { ok: true; game: Game; changed: boolean } | { ok: false; error: string };
