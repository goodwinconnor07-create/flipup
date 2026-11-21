// The table and everything in it. One Game is one table, from lobby to the last hand.

import type { LabBotSpec, LabDials } from './botLab';
import type { Style } from './botStyles';
import type { Card } from './cards';
import type { RedStep, Variant } from './variants';
import type { BotDifficulty } from '../bot_engine/everyday';
import type { EverydayBotState } from '../bot_engine/everydayLive';

export type Status = 'lobby' | 'playing' | 'ended';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type Move = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface Settings {
  /** Normal Hold'em opponents. Missing defaults to Casual; changes apply next hand. */
  botDifficulty?: BotDifficulty;
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
  /** Bots-only tables: after each hand you played past preflop, a small recap (what you won or lost, who won) waits
   * for Next hand or Replay. The phone holds the deal; the engine and server ignore it. */
  replayEachHand?: boolean;
  /** Seconds a person gets to act before they're checked or folded. 0 = no limit. */
  turnSeconds: number;
  /** Which game the table plays (see variants.ts). Missing = Texas Hold'em. */
  variant?: Variant;
  // Home game house rules (see docs/RULES.md "House rules"). Missing = off.
  /** Everyone dealt in antes this share of the big blind, in percent (10, 25, 50 or 100). */
  ante?: number;
  /** The player after the big blind posts a straddle of two big blinds every hand (three players or more). */
  straddle?: boolean;
  /** House rule: once everyone folds, show the board cards that would have come next. */
  rabbit?: boolean;
  /** Every this many hands is a bomb pot: everyone puts in two big blinds and the hand starts on the flop. */
  bombEvery?: number;
  /** When an all-in leaves cards to come in Texas Hold'em, the players in it can agree to deal the rest twice. */
  runTwice?: boolean;
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
  /** Their chat bubble colour (see bubbles.ts), a FlipUp Premium extra. Public: everyone at the table sees it. */
  bubble?: string;
  /** Their card back (see cardPacks.ts), a FlipUp Premium extra. Public: the table sees it on the back of their cards. */
  cardPack?: string;
  /** A FlipUp Premium player who shows their name in gold (Settings > Gold name). Public: everyone at the table sees it. */
  gold?: boolean;
  /** Bot lab only (botSim.ts): the style this seat plays instead of its own. Stripped before the table is sent to any phone. */
  labStyle?: Style;
  /** A bot made in the app's Bot Lab: its dials, played through `labStyle()` (botLab.ts). Stripped like `style`. */
  lab?: LabDials;
  /**
   * A bot the host made in Bot Lab. Public (the dials stay private in `lab`): the Casual / Challenge level only
   * changes the everyday bots, so a screen hides it when every bot at the table is one of these.
   */
  labBot?: boolean;
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
  last: { move: Move | 'sb' | 'bb' | 'straddle' | 'bomb'; amount: number; street: Street } | null;
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
  /** Haunted Pot: the ghost's hand, the chips it kept for the next hand because nobody beat it (its bounty grows by
   * that), and `paid`, the bounty it had built up that a player took by beating it this hand. */
  ghost?: { cards: Card[]; name: string; kept: number; paid?: number };
  /** Hit Me: each showing player's 21 count, and who won each pot's poker half and 21 half (by pot). */
  blackjack?: { counts: Record<string, number>; poker: string[][]; winners: string[][] };
  /** Run it twice: each board, its hand names and each pot's winners on it (half of each pot per run). */
  runs?: RunResult[];
}

/** One board of a hand that was run twice. */
export interface RunResult {
  board: Card[];
  names: Record<string, string>;
  /** Winners of each pot's half on this board, in the order of `HandResult.pots`. */
  winners: string[][];
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
  /** House rules: chips each player put in before the hand as dead money (antes, or a bomb pot's buy-in). */
  dead?: Record<string, number>;
  /** A bomb pot: no blinds, no betting before the flop. */
  bomb?: boolean;
  /** Who straddled, and for how much. */
  straddle?: { id: string; amount: number };
  /** Run it twice: the first run's board (`board` is the second). */
  firstBoard?: Card[];
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
  /** A bot is saying something before the showdown turns over (a phone's own table): the cards turn at this time. */
  showdownAt?: number | null;
  /** The board ran out with everyone all in (for the bots' sweating). */
  ranOut?: boolean;
  /** Each player's chips before the blinds. */
  startStacks?: Record<string, number>;
  /** Haunted Pot: the ghost's two cards. Sent to phones only once the hand reaches a showdown. */
  ghost?: Card[];
  /** Haunted Pot: chips the ghost kept from earlier hands, in this pot too. */
  carry?: number;
  /** Crazy Pineapple: the flop betting is over and everyone still in throws a card away before the turn. */
  discarding?: boolean;
  /** The game this hand is played as (a change of game in the settings waits for the next hand). Missing = Texas Hold'em. */
  variant?: Variant;
  /** Die on the River: what the die rolled, and the board card it swapped (out) for a new one (in). A 6 swaps nothing. */
  /** `until`: when the roll's show ends on the phones (the river's betting waits for it). */
  dice?: { roll: number; out?: Card; in?: Card; until?: number };
  /** Hit Me: how many cards each player has hit (public; the cards themselves are face down). */
  hits?: Record<string, number>;
  /**
   * Hit Me and Power Cards: a new street is out and the players who can't act on it (all in, or everyone is) make
   * the game's choice before it goes on: hit or stand, play their power or keep it. `stood` are the ones done;
   * `street` the street it's for. `streets` are the streets already offered this hand.
   */
  choosing?: { street: Street; stood: string[]; until: number | null };
  chose?: Street[];
  /** Red River: the board before the run (four cards) and each step of it. */
  redRun?: { base: Card[]; steps: RedStep[] };
  /** Rabbit hunt (a house rule): the whole board as it would have been, set once everyone folds before the river. */
  rabbit?: Card[];
  /** Hit Me: players who went over 21 and were folded. */
  busted?: string[];
  /** Memory Poker: the 20 cards taken out of the deck before this hand. Phones only get them once the hand is over. */
  removed?: Card[];
  /** A timed beat the table waits on (a die roll, a red river, the ghost turning over...), see moments.ts. */
  moment?: Moment | null;
  /** Betting on this street starts at this time, once the moment has played. */
  bettingAt?: number | null;
  /** Crazy Pineapple: who has thrown their card away (public). */
  discarded?: string[];
  /** Crazy Pineapple: the cards thrown away. Phones see their own until everyone is done. */
  discards?: Record<string, Card>;
  /** Power Cards: the power each player was dealt this hand. Phones see only their own until it's played or the hand is over. */
  powers?: Record<string, PowerId>;
  /** Power Cards: every power played this hand, in order (public, except what a Peek or an X-ray showed). */
  powerUses?: PowerUse[];
  /** Power Cards: players who can't bet or raise, and on which street (Silence). */
  silenced?: Record<string, Street>;
  /** House rules: chips each player put in before the deal as dead money (antes or a bomb pot). */
  dead?: Record<string, number>;
  /** A bomb pot: everyone put in `bomb` chips and the hand starts on the flop. */
  bomb?: number;
  /** Who straddled this hand, and for how much. */
  straddle?: { id: string; amount: number };
  /** Run it twice (see `RunTwice`). */
  twice?: RunTwice;
}

/**
 * Run it twice. When an all-in leaves cards to come, every person in it is asked (`asking`, until `until`; bots answer
 * at once). Everyone yes: `agreed`, and once the first run reaches the river its board is kept in `first` and the
 * cards after `from` are dealt again. Public: there's nothing hidden in it.
 */
export interface RunTwice {
  /** Board cards out when the all-in happened: both runs share these. */
  from: number;
  /** The street the run-out started on. */
  street: Street;
  /** Who has said yes or no so far. */
  votes: Record<string, boolean>;
  /** Players asked (everyone still in the hand). */
  asked: string[];
  /** Waiting for answers until this time. */
  until: number | null;
  agreed: boolean;
  /** The first run's whole board, once it's out. */
  first?: Card[];
}

/** What `variantTalk()` has already seen this hand, so each power and bust is reacted to once. */
export interface TalkSeen {
  hand: number;
  board: number;
  powers: number;
  busts: number;
  hits: number;
  discards: boolean;
  dice: boolean;
  result: boolean;
  /** Memory Poker: the `until` of the peek already talked about. */
  peek: number;
}

export type PowerId = 'peek' | 'xray' | 'swap' | 'reroll' | 'extra' | 'passleft' | 'shield' | 'silence' | 'bounty' | 'foldtax' | 'copycat';

/** One power played in a Power Cards hand. */
export interface PowerUse {
  by: string;
  power: PowerId;
  /** Copycat: the power it copied (the effect is that power's). */
  as?: PowerId;
  street: Street;
  /** X-ray and Silence: who it was aimed at. */
  target?: string;
  /** Peek and X-ray: what it showed. Only the player who played it ever sees this. */
  seen?: Card[];
  /** Reroll: the board card that went (out) and the one that came (in). Public. */
  out?: Card;
  in?: Card;
  /** Bounty: the rank called (2 to 14), the board when it was called, and who paid what at the end. */
  rank?: number;
  board?: Card[];
  paid?: Record<string, number>;
  /** Shield: what the player had put in when it went up, and what came back at the showdown. */
  from?: number;
  refund?: number;
}

export type MomentKind = 'reveal' | 'rivers' | 'redriver' | 'suspense' | 'discards' | 'bust' | 'power';

/**
 * A beat in a hand that the table waits on. Cards dealt with it appear one at a time (`offsets`, ms after `at`, for
 * the board cards from index `from`), and while `gate` is on nobody can act. Times are table times.
 */
export interface Moment {
  kind: MomentKind;
  at: number;
  until: number;
  from?: number;
  offsets?: number[];
  gate?: boolean;
  /** Bust: who, and with what count. Power: who played it. */
  who?: string;
  value?: number;
}

/** A bot's move in a demo hand: what it does the first time it acts on a street (`to` is the street total, as in an `act`). */
export interface DemoMove {
  move: Move;
  to?: number;
}

/**
 * A demo hand (the app's Demo, see demo.ts): one hand dealt to order, with bots that follow a script, so every game's
 * twist shows up the same way each time. The engine plays it by its own rules. Never sent to phones.
 */
export interface DemoDeal {
  /** Where you sit, counted clockwise from the button: 0 is the button, 1 the small blind, 2 the big blind. */
  at: number;
  /** The whole deck in the order it's dealt (see `stackDeck()` in demo.ts). */
  deck: Card[];
  /** Memory Poker: the twenty cards everyone sees before they leave the deck. */
  memory?: Card[];
  /** Die on the River: what the die shows. */
  roll?: number;
  /** Power Cards: each seat's power, counted from the button like `at`. */
  powers?: PowerId[];
  /** A bot's moves on a street, in order, by `<seat from the button>:<street>`. Past the list it checks, or calls a bet. */
  moves?: Record<string, DemoMove[]>;
  /** Hit Me: how many cards a bot hits, by `<seat from the button>:<street>`. */
  hits?: Record<string, number>;
  /** How many of each `moves` list (and of each bot's `hits`) have been played. */
  used?: Record<string, number>;
}

export interface Game {
  /** Offline legacy-style laboratory only; never accepted as a network setting. */
  legacyBotSimulation?: true;
  /** Private, independent observer memories and stable everyday bot profiles. */
  botTable?: EverydayBotState;
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
  /** An online table that can't deal (nobody left to play with) closes at this time unless someone adds bots. */
  emptyAt?: number | null;
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
  /** What the game-mode bot talk has already reacted to (counts, so each moment is spoken about once). See `variantTalk()`. */
  talkSeen?: TalkSeen;
  /** A bot that has said what it's thinking, and the move it will make a moment later. Never sent to phones. */
  botPlan?: { playerId: string; seq: number; move: Move; to?: number };
  /** A bot's reply to what someone just said, due a beat later. Never sent to phones. */
  pendingTalk?: {
    at: number;
    playerId: string;
    /** Default 'reply'. A 'tank' jab only lands if `forId` is still on the clock in hand-action `seq`. 'hello' is said to `forId`. */ event?:
      | 'reply'
      | 'tank'
      | 'hello'
      | 'welcome'
      | 'rememberHello'
      | 'greetBack'
      | 'thanks'
      | 'ribbed'
      | 'goodLuck'
      | 'gg'
      | 'cheer'
      | 'commiserate';
    forId?: string;
    seq?: number;
    reactionN?: number;
    handNumber?: number;
  };
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
  /**
   * A phone's own table: the bots here you've played before, by lower-case name, from the phone's memory (tables
   * shared, and showdowns you've won and lost against them). A bot you know greets you as a regular.
   */
  rivals?: Record<string, Rival>;
  /** The last hand the bots took notes on. */
  readHand?: number;
  /** How each bot feels (tilt, confidence, grudges). Never sent to phones. */
  minds?: Record<string, BotMind>;
  /** Bounded private dialogue memory. IDs refer only to authored, public-safe text. */
  dialogue?: Record<string, { recent: string[]; lastIntent: string }>;
  /** A demo hand (see DemoDeal): one hand, dealt to order, with quiet bots that follow a script. Never sent to phones. */
  demo?: DemoDeal;
  /** Haunted Pot: chips the ghost is holding, which go into the next hand's pot. */
  ghostPot?: number;
  /** Memory Poker: the cards being taken out for the next hand, shown to everyone until it's dealt at `until`. Public. */
  memory?: { cards: Card[]; until: number };
  /** This table is one round of a party tournament (see party.ts). Public. */
  party?: { code: string; round: number; total: number };
  /** Party rounds: player ids in the order they ran out of chips (or left), first out first. */
  busted?: string[];
}

export type Action =
  /** This phone takes a seat (or updates its name and picture). */
  | { type: 'join'; name: string; emoji: string }
  | { type: 'setLook'; name: string; emoji: string; bubble?: string; cardPack?: string; gold?: boolean }
  /** `name` seats a bot from `BOTS` by name (the setup page's picks); `lab` seats one the host made in Bot Lab. */
  | { type: 'addBot'; name?: string; lab?: LabBotSpec }
  /** Host removes a player or bot; anyone can remove themselves. */
  | { type: 'remove'; playerId: string }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'start' }
  | { type: 'act'; hand: number; seq: number; move: Move; to?: number }
  | { type: 'next'; hand: number }
  /** Hit Me: on your turn on the flop, take another card. */
  | { type: 'hit'; hand: number; seq: number }
  /** Hit Me or Power Cards, all in: done with this street's choice (stand, or keep the power). */
  | { type: 'stand'; hand: number }
  /** Power Cards: play your power on your turn, before your move. `target` (X-ray, Silence), `card` (Swap: yours; Reroll: the board's), `rank` (Bounty). */
  | { type: 'power'; hand: number; seq: number; target?: string; card?: Card; rank?: number }
  /** Run it twice: your answer when an all-in is asked to run twice. */
  | { type: 'runTwice'; hand: number; yes: boolean }
  /** Crazy Pineapple: throw this card away after the flop. */
  | { type: 'discard'; hand: number; card: Card }
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
  | { type: 'playAgain'; off?: boolean; /** The host, opening the next game in a different mode. */ variant?: Variant }
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

/** What a phone remembers about one bot across tables (`Game.rivals`). */
export interface Rival {
  tables: number;
  /** Showdowns you won against this bot, and lost to it. */
  beat: number;
  lost: number;
}
