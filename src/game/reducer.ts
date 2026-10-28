// Every change to a table goes through applyAction(). The server and the phone (for bots-only
// tables) run exactly this code, so they always agree.

import { decide, handBucket, updateReads, type BotMove } from './botPlay';
import { boardInfo, tierWith, toInt } from './botEval';
import { cardsShown, mindOf, updateMinds } from './botMind';
import { STRENGTH } from './botRange';
import { BOTS, playerStyle, styleOf } from './botStyles';
import { botSays, type TalkEvent } from './botTalk';
import { DEFAULT_EMOJI, isEmoji } from './emoji';
import {
  botsOnly,
  canDeal,
  cardsText,
  castVote,
  dealNextStreet,
  endsAtOnce,
  discardCard,
  endVote,
  endDiscards,
  foldOutOfTurn,
  lastStanding,
  makeMove,
  MAX_SEATS,
  passiveMove,
  playerById,
  potTotal,
  runoutStep,
  schedule,
  startHand,
  greetWait,
  startWait,
  TIMING,
} from './holdem';
import { cryptoRng, newId } from './ids';
import { botView, isVariant } from './variants';
import { variantDecide } from './botVariants';
import { isReactionId } from './reactions';
import { isNameBlocked, NAME_BLOCKED } from './names';
import { options, seatFor } from './selectors';
import type { Action, ActionContext, ActionResult, Game, Player, Settings } from './types';

export const LIMITS = {
  maxNameLength: 10,
  minStack: 100,
  maxStack: 1_000_000,
  maxTurnSeconds: 300,
};

export const DEFAULT_SETTINGS: Settings = {
  startingStack: 1000,
  smallBlind: 5,
  bigBlind: 10,
  rebuys: true,
  turnSeconds: 45,
};

/** Blind levels the host can pick from. */
export const BLIND_LEVELS: [number, number][] = [
  [1, 2],
  [5, 10],
  [10, 20],
  [25, 50],
  [50, 100],
  [100, 200],
];

/** How often the blinds can go up, in minutes (0 = never). */
/** Big blinds the host can stop the rise at (0 is no limit). */
export const BLIND_CAP_CHOICES = [0, 100, 200, 500, 1000, 2000];

export const STACK_CHOICES = [500, 1000, 2000, 5000, 10000];
export const TIMER_CHOICES = [0, 20, 45, 90];

export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxNameLength);
}

export function validSettings(s: Settings): boolean {
  const int = (n: unknown) => typeof n === 'number' && Number.isInteger(n);
  return (
    int(s.startingStack) &&
    s.startingStack >= LIMITS.minStack &&
    s.startingStack <= LIMITS.maxStack &&
    int(s.smallBlind) &&
    int(s.bigBlind) &&
    s.smallBlind >= 1 &&
    s.bigBlind >= s.smallBlind &&
    // No upper bound against the stack: rising blinds can climb past it, and the host must still be able to change other settings then.
    typeof s.rebuys === 'boolean' &&
    (s.showToBusted === undefined || typeof s.showToBusted === 'boolean') &&
    (s.variant === undefined || isVariant(s.variant)) &&
    (s.blindCap === undefined || (int(s.blindCap) && s.blindCap >= 0 && s.blindCap <= 1_000_000_000)) &&
    (s.blindHands === undefined || (int(s.blindHands) && s.blindHands >= 0 && s.blindHands <= 100)) &&
    (s.blindMinutes === undefined || (int(s.blindMinutes) && s.blindMinutes >= 0 && s.blindMinutes <= 120)) &&
    int(s.turnSeconds) &&
    s.turnSeconds >= 0 &&
    s.turnSeconds <= LIMITS.maxTurnSeconds
  );
}

function freeSeat(game: Game): number {
  const taken = new Set(game.players.map((p) => p.seat));
  for (let s = 0; s < MAX_SEATS; s++) if (!taken.has(s)) return s;
  return -1;
}

/** `name`, or "name 2", "name 3"… if someone else at the table already has it (case doesn't count). */
function uniqueName(game: Game, name: string, exceptId?: string): string {
  const taken = new Set(game.players.filter((p) => p.id !== exceptId).map((p) => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; n < 100; n++) {
    const tail = ` ${n}`;
    const candidate = name.slice(0, LIMITS.maxNameLength - tail.length).trimEnd() + tail;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return name;
}

function newPlayer(game: Game, fields: Pick<Player, 'name' | 'emoji' | 'deviceId' | 'bot'>): Player {
  return {
    id: newId(10),
    ...fields,
    seat: freeSeat(game),
    stack: game.settings.startingStack,
    bought: game.settings.startingStack,
    sittingOut: false,
    timeouts: 0,
    leaving: false,
  };
}

/** A new table with its host seated. */
export function createTable(opts: {
  hostDeviceId: string;
  name: string;
  emoji: string;
  settings: Settings;
  bots: number;
  /** Bots to seat by name first (Home's quick games); the rest are random. */
  botNames?: string[];
  code: string | null;
  now: number;
}): Game {
  const game: Game = {
    id: newId(16),
    code: opts.code,
    createdAt: opts.now,
    hostDeviceId: opts.hostDeviceId,
    status: 'lobby',
    settings: { ...opts.settings },
    players: [],
    hand: null,
    buttonSeat: null,
    nextHandAt: null,
    ready: [],
    version: 0,
    wakeAt: null,
    logs: [],
    reactions: {},
  };
  game.players.push({ ...newPlayer(game, { name: cleanName(opts.name), emoji: opts.emoji, deviceId: opts.hostDeviceId, bot: false }) });
  for (const name of opts.botNames ?? []) {
    const pick = BOTS.find((b) => b.name === name);
    if (pick && game.players.length < MAX_SEATS && !game.players.some((p) => p.name === pick.name))
      game.players.push({
        ...newPlayer(game, { name: pick.name, emoji: pick.emoji, deviceId: null, bot: true }),
        style: pick.style,
        botProfile: pick.profile?.id,
      });
  }
  while (game.players.length - 1 < opts.bots && game.players.length < MAX_SEATS) addBot(game);
  return game;
}

function addBot(game: Game): void {
  const names = new Set(game.players.map((p) => p.name.toLowerCase()));
  const emojis = new Set(game.players.map((p) => p.emoji));
  // A random bot whose name and picture nobody at the table has yet (so it isn't always the same order).
  const free = BOTS.filter((b) => !names.has(b.name.toLowerCase()) && !emojis.has(b.emoji));
  const pool = free.length ? free : BOTS.filter((b) => !names.has(b.name.toLowerCase()));
  const pick = pool.length
    ? pool[Math.floor(cryptoRng() * pool.length)]
    : { name: `Bot ${game.players.length}`, emoji: '🤖', style: 'pro', profile: undefined };
  game.players.push({
    ...newPlayer(game, { name: pick.name, emoji: pick.emoji, deviceId: null, bot: true }),
    style: pick.style,
    botProfile: pick.profile?.id,
  });
}

/** Bot lines that are about a person at the table, so they use their name ({you}). */
const ADDRESSED = new Set<TalkEvent>(['lostToYou', 'tiltJab', 'revenge', 'bluffCaught', 'badBeat', 'bluffWon']);

/** What another bot answers when the first to speak after a hand was cheering, or hurting. */
const GOOD_NEWS = new Set<TalkEvent>(['bigWin', 'win', 'bluffWon', 'tiltJab', 'revenge', 'sweatWin', 'showBluff', 'showStrong']);
const BAD_NEWS = new Set<TalkEvent>(['sweatLose', 'badBeat', 'lostToYou', 'bluffCaught', 'gotBluffed', 'tilted', 'showFold']);

/** Pending lines that are said whatever the dice and the cooldown say. */
const SURE_THINGS = new Set<string>(['hello', 'welcome', 'rematchWon', 'rematchLost', 'greetBack', 'thanks', 'ribbed', 'goodLuck', 'gg']);

/** What a bot says back to each quick message a person can send (none for the others). */
const ANSWER: Record<string, NonNullable<Game['pendingTalk']>['event']> = {
  nice: 'thanks',
  clap: 'thanks',
  fire: 'thanks',
  lucky: 'ribbed',
  oops: 'ribbed',
  laugh: 'ribbed',
  grimace: 'ribbed',
  gl: 'goodLuck',
  gg: 'gg',
};

/** How often a bot answers a quick message, and how soon (ms) after it. */
const ANSWER_CHANCE = 0.6;
const ANSWER_AFTER = { min: 900, spread: 700 };

/**
 * Once per hand, when it's over: the bots take note of what everyone did, and react. Winners and
 * losers of an all-in sweat it out loud, big pots get a word, and sometimes another bot answers.
 * When someone speaks, the next deal waits a little longer so it can be read.
 */
/** Party rounds: remember who ran out of chips on this hand. The one with fewer chips at the start goes out first. */
function noteBusts(game: Game, hand: NonNullable<Game['hand']>): void {
  if (!game.party) return;
  const out = game.busted ?? [];
  const fresh = game.players.filter((p) => p.stack === 0 && !out.includes(p.id) && hand.seats.some((s) => s.playerId === p.id));
  fresh.sort((a, b) => (hand.startStacks?.[a.id] ?? 0) - (hand.startStacks?.[b.id] ?? 0));
  game.busted = [...out, ...fresh.map((p) => p.id)];
}

function afterHand(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  const result = hand.result!;
  game.readHand = hand.number;
  noteBusts(game, hand);
  updateReads(game, hand);
  updateMinds(game, hand);
  const bb = game.settings.bigBlind;
  const pot = result.pots.reduce((a, p) => a + p.amount, 0);
  const winners = Object.keys(result.won);
  const isBot = (id: string) => !!playerById(game, id)?.bot;
  const bucketOf = (id: string) => {
    const seat = hand.seats.find((s) => s.playerId === id);
    return seat && seat.cards.length === 2 && hand.board.length >= 3 ? handBucket(seat.cards, hand.board) : null;
  };
  // How long the table talk takes to say and read, line after line: the next deal waits for it.
  let talkMs = 0;
  let firstMs = 0;
  let firstEvent: TalkEvent | null = null;
  // The person a line is about, when it's about one: a win over them, a loss to them.
  const aboutPerson = winners.find((id) => !isBot(id)) ?? hand.seats.find((s) => !isBot(s.playerId) && !s.folded)?.playerId;
  const say = (id: string, event: TalkEvent, owed = false) => {
    const ms = botSays(game, id, event, ctx.rng, ctx.now, owed, ADDRESSED.has(event) ? aboutPerson : undefined);
    if (ms) {
      talkMs += ms;
      firstMs ||= ms;
      firstEvent ??= event;
    }
    return ms > 0;
  };
  const spoke: string[] = [];
  const showdownLosers = result.showdown ? hand.seats.filter((s) => !s.folded && !winners.includes(s.playerId)).map((s) => s.playerId) : [];
  const personWon = winners.some((id) => !isBot(id));
  // Who is on a cold streak: people who put in more than a big blind and lost, hands in a row.
  // (Posting a blind and folding isn't a loss worth rubbing in.)
  const streaks = { ...game.streaks };
  for (const s of hand.seats) {
    if (isBot(s.playerId)) continue;
    if (winners.includes(s.playerId)) streaks[s.playerId] = 0;
    else if (s.total > bb) streaks[s.playerId] = (streaks[s.playerId] ?? 0) + 1;
  }
  game.streaks = streaks;
  const tilted = hand.seats.some(
    (s) => !isBot(s.playerId) && !winners.includes(s.playerId) && s.total > bb && (streaks[s.playerId] ?? 0) >= 2,
  );

  // A bot that won with its signature hand (Brunson's ten-deuce) says so.
  for (const id of winners) {
    const p = playerById(game, id);
    const seat = hand.seats.find((s) => s.playerId === id);
    if (!p?.bot || !seat || seat.cards.length !== 2 || !playerStyle(p).craft.pets.includes(handClassOf(seat.cards))) continue;
    if (say(id, 'signature', true)) spoke.push(id);
  }

  // Now and then a bot turns its cards over when it didn't have to: a bluff that worked, a monster
  // nobody paid off, or a good hand it laid down. Its own cards only, so nothing hidden leaks.
  for (const id of showOffs(game, hand, ctx)) if (say(id, id in result.won ? (strongEnough(hand, id) ? 'showStrong' : 'showBluff') : 'showFold')) spoke.push(id);

  if (hand.ranOut) {
    for (const id of winners) if (isBot(id) && say(id, 'sweatWin', true)) spoke.push(id);
    for (const id of showdownLosers) if (isBot(id) && say(id, 'sweatLose', true)) spoke.push(id);
  } else {
    for (const id of winners) {
      if (!isBot(id)) continue;
      const b = bucketOf(id);
      // Twice or more in a row and they pile on; a big showdown win is a smaller chance.
      const rubbedIn = tilted ? ctx.rng() < 0.7 : result.showdown && pot >= bb * 15 && showdownLosers.some((l) => !isBot(l)) && ctx.rng() < 0.25;
      if (spoke.includes(id)) continue;
      // Beating the player it has a grudge with is sweeter.
      const revenge = result.showdown && pot >= bb * 15 && showdownLosers.some((l) => (mindOf(game, id).grudges?.[l] ?? 0) > 0.3);
      const event: TalkEvent = !result.showdown && (b === 'air' || b === 'weak') ? 'bluffWon' : revenge ? 'revenge' : rubbedIn ? 'tiltJab' : pot >= bb * 15 ? 'bigWin' : 'win';
      if (say(id, event)) spoke.push(id);
    }
    for (const id of showdownLosers) {
      if (!isBot(id)) continue;
      const b = bucketOf(id);
      const caught = b === 'air' || b === 'weak';
      const beat = (b === 'monster' || b === 'strong') && pot >= bb * 10;
      if (caught ? say(id, 'bluffCaught') : beat ? say(id, 'badBeat') : personWon && say(id, 'lostToYou')) spoke.push(id);
    }
  }
  // A bot that's steaming says so.
  for (const p of game.players) {
    if (!p.bot || spoke.includes(p.id) || !hand.seats.some((s) => s.playerId === p.id)) continue;
    if (mindOf(game, p.id).tilt > 0.5 && ctx.rng() < 0.35 && say(p.id, 'tilted')) spoke.push(p.id);
  }
  // A bot that spoke before the outcome ("c'mon!", "all in") reacts to it now: that's what makes the
  // earlier line feel like a person watching, not a sound effect. Winners cheer, losers groan, the rest remark.
  for (const id of game.sweating ?? []) {
    if (spoke.includes(id) || !isBot(id)) continue;
    const event: TalkEvent = winners.includes(id)
      ? hand.ranOut ? 'sweatWin' : pot >= bb * 15 ? 'bigWin' : 'win'
      : showdownLosers.includes(id)
        ? hand.ranOut || !personWon ? 'sweatLose' : 'lostToYou'
        : 'watched';
    if (say(id, event, true)) spoke.push(id);
  }
  game.sweating = undefined;
  if (!spoke.length) return;
  // Someone answers now and then: a bot that didn't just speak, a beat later.
  const others = game.players.filter((p) => p.bot && !spoke.includes(p.id) && !p.sittingOut);
  if (others.length && ctx.rng() < 0.55) {
    const who = others[Math.floor(ctx.rng() * others.length)];
    // It answers once the first line has landed, like someone who was listening: cheering a win, feeling a loss.
    const event = firstEvent && GOOD_NEWS.has(firstEvent) ? 'cheer' : firstEvent && BAD_NEWS.has(firstEvent) ? 'commiserate' : 'reply';
    game.pendingTalk = { at: ctx.now + Math.max(TIMING.replyMin, firstMs - TIMING.replyEarly), playerId: who.id, event, forId: spoke[spoke.length - 1], reactionN: game.reactions?.[spoke[spoke.length - 1]]?.n, handNumber: hand.number };
    talkMs += TIMING.replyMin + 900;
  }
  // A little longer before the next deal, so the table talk can be read (but not when the game is about to end).
  if (game.nextHandAt !== null && !(endsAtOnce(game) && lastStanding(game))) game.nextHandAt += botsOnly(game) ? 1000 : Math.min(TIMING.talkPauseMax, Math.max(TIMING.talkPause, talkMs - TIMING.talkSlack));
  schedule(game);
}

/**
 * Play again: the finished game becomes a new lobby, set up as the last one was. The host is seated, and
 * so is anyone who tapped Play again; nobody else is put in. Bots come back with fresh chips.
 */
function openAgain(game: Game, ctx: ActionContext): void {
  const first = game.first;
  if (first) game.settings = { ...first.settings };
  const wanted = new Set([...(game.again ?? [])]);
  game.players = game.players.filter((p) => p.bot || p.deviceId === game.hostDeviceId || wanted.has(p.id));
  for (const p of game.players) {
    p.stack = game.settings.startingStack;
    p.bought = game.settings.startingStack;
    p.sittingOut = false;
    p.timeouts = 0;
    p.leaving = false;
    p.offline = undefined;
  }
  // Bots that busted out of the last game left the table: bring the count back.
  while (first && game.players.filter((p) => p.bot).length < first.bots && game.players.length < MAX_SEATS) addBot(game);
  game.id = newId(16);
  game.createdAt = ctx.now;
  game.status = 'lobby';
  game.hand = null;
  game.buttonSeat = null;
  game.nextHandAt = null;
  game.ready = [];
  game.logs = [];
  game.reactions = {};
  game.hands = 0;
  game.blindsRaiseAt = null;
  for (const k of ['again', 'first', 'pendingTalk', 'botPlan', 'sweating', 'talkAt', 'talkDone', 'reads', 'streaks', 'minds', 'readHand', 'dialogue'] as const) delete game[k];
  schedule(game);
}

/** Did this player's hand end up strong (two pair or better made with a hole card)? */
function strongEnough(hand: Game['hand'] & object, id: string): boolean {
  const seat = hand.seats.find((s) => s.playerId === id);
  if (!seat || seat.cards.length !== 2) return false;
  if (hand.board.length < 3) return (STRENGTH.get(handClassOf(seat.cards)) ?? 0) > 0.93;
  return tierWith(toInt(seat.cards[0]), toInt(seat.cards[1]), boardInfo(hand.board.map(toInt)), []) >= 5;
}

function handClassOf(cards: string[]): string {
  const R = '23456789TJQKA';
  const [a, b] = [...cards].sort((x, y) => R.indexOf(y[0]) - R.indexOf(x[0]));
  return a[0] === b[0] ? a[0] + b[0] : a[0] + b[0] + (a[1] === b[1] ? 's' : 'o');
}

/** Bots that choose to show their cards after this hand (and turns them face up). */
function showOffs(game: Game, hand: Game['hand'] & object, ctx: ActionContext): string[] {
  const result = hand.result!;
  if (result.showdown) return [];
  const bb = game.settings.bigBlind;
  const pot = result.pots.reduce((a, p) => a + p.amount, 0);
  const acts = hand.actions ?? [];
  const out: string[] = [];
  for (const seat of hand.seats) {
    const player = playerById(game, seat.playerId);
    if (!player?.bot || seat.shown || seat.cards.length !== 2) continue;
    const show = styleOf(player.style, player.botProfile).show;
    const won = seat.playerId in result.won;
    const aggressive = acts.some((a) => a.playerId === seat.playerId && (a.move === 'bet' || a.move === 'raise' || a.move === 'allin'));
    let chance = 0;
    if (won && pot >= bb * 6) {
      const tier = hand.board.length >= 3 ? tierWith(toInt(seat.cards[0]), toInt(seat.cards[1]), boardInfo(hand.board.map(toInt)), []) : -1;
      const trash = tier >= 0 ? tier <= 1 : (STRENGTH.get(handClassOf(seat.cards)) ?? 1) < 0.3;
      if (aggressive && trash) chance = show.bluffs;
      else if (strongEnough(hand, seat.playerId)) chance = show.strong;
    } else if (!won && seat.folded && hand.board.length >= 3) {
      // Laid down a good hand after the flop to a real bet.
      const fold = acts.find((a) => a.playerId === seat.playerId && a.move === 'fold' && !a.outOfTurn);
      if (fold && fold.street !== 'preflop') {
        const board = hand.board.slice(0, fold.street === 'flop' ? 3 : fold.street === 'turn' ? 4 : 5).map(toInt);
        if (tierWith(toInt(seat.cards[0]), toInt(seat.cards[1]), boardInfo(board), []) >= 4 && pot >= bb * 10) chance = show.folds;
      }
    }
    if (chance <= 0 || ctx.rng() >= chance) continue;
    seat.shown = true;
    const entry = game.logs?.find((l) => l.number === hand.number);
    if (entry) {
      entry.shown.push(player.id);
      entry.lines.push(`${player.name} shows ${cardsText(seat.cards)}`);
    }
    out.push(player.id);
  }
  return out;
}

/** This bot spoke before the hand's outcome was known, so it owes a reaction when the hand ends. */
function owe(game: Game, id: string): void {
  if (!game.sweating?.includes(id)) game.sweating = [...(game.sweating ?? []), id];
}

/** What a bot says while it thinks, given the move it's about to make. */
function thinkingEvent(
  game: Game,
  hand: Game['hand'] & object,
  choice: BotMove,
  bucket: string | undefined,
  bigBet: boolean,
): TalkEvent | null {
  const raisedBig = (choice.move === 'raise' || choice.move === 'bet') && (choice.to ?? 0) >= potTotal(hand) * 0.6;
  if (choice.move === 'allin') return 'allin';
  // Folding to an ordinary raise before the flop isn't worth a word; a big one is.
  if (choice.move === 'fold' && bigBet && (hand.street !== 'preflop' || hand.currentBet >= game.settings.bigBlind * 8)) return 'foldBig';
  if (choice.move === 'call' && bigBet) return bucket === 'mid' || bucket === 'weak' || bucket === 'air' ? 'callLight' : 'thinkHard';
  if (raisedBig && (hand.street !== 'preflop' || hand.currentBet > game.settings.bigBlind)) return 'raise';
  if (choice.move === 'check' || (choice.move === 'call' && !bigBet)) return 'thinkEasy';
  return null;
}

/** Deal soon if the table was waiting for players and now has enough. */
function wakeIfWaiting(game: Game, ctx: ActionContext): void {
  if (game.status !== 'playing') return;
  const idle = !game.hand || !!game.hand.result;
  if (idle && game.nextHandAt === null && canDeal(game)) {
    game.nextHandAt = ctx.now + TIMING.resume;
    schedule(game);
  }
}

const fail = (error: string): ActionResult => ({ ok: false, error });

export function applyAction(input: Game, action: Action, ctx: ActionContext): ActionResult {
  const game = structuredClone(input);
  const me = game.players.find((p) => p.deviceId === ctx.deviceId);
  const host = ctx.deviceId === game.hostDeviceId;
  const done = (changed = true): ActionResult => {
    if (!changed) return { ok: true, game: input, changed: false };
    if (game.hand?.result && game.readHand !== game.hand.number) afterHand(game, ctx);
    game.version += 1;
    return { ok: true, game, changed: true };
  };

  if (game.status === 'ended' && action.type !== 'setLook' && action.type !== 'playAgain') return fail('This table has finished.');

  switch (action.type) {
    case 'join': {
      const name = cleanName(action.name);
      if (!name) return fail('Add your name first.');
      if (isNameBlocked(name)) return fail(NAME_BLOCKED);
      const emoji = isEmoji(action.emoji) ? action.emoji : DEFAULT_EMOJI;
      if (me) {
        const mine = uniqueName(game, name, me.id);
        if (me.name === mine && me.emoji === emoji) return done(false);
        me.name = mine;
        me.emoji = emoji;
        return done();
      }
      if (game.players.length >= MAX_SEATS) return fail('The table is full.');
      game.players.push({ ...newPlayer(game, { name: uniqueName(game, name), emoji, deviceId: ctx.deviceId, bot: false }) });
      wakeIfWaiting(game, ctx);
      return done();
    }

    case 'setLook': {
      if (!me) return fail("You're not at this table.");
      const name = cleanName(action.name);
      if (!name) return fail('Add your name first.');
      if (isNameBlocked(name)) return fail(NAME_BLOCKED);
      if (!isEmoji(action.emoji)) return fail('Pick an emoji.');
      me.name = uniqueName(game, name, me.id);
      me.emoji = action.emoji;
      return done();
    }

    case 'addBot': {
      if (!host) return fail('Only the host can add bots.');
      if (game.players.length >= MAX_SEATS) return fail('The table is full.');
      addBot(game);
      wakeIfWaiting(game, ctx);
      return done();
    }

    case 'remove': {
      const target = playerById(game, action.playerId);
      if (!target) return done(false);
      if (!host && target.deviceId !== ctx.deviceId) return fail('Only the host can remove players.');
      if (game.party && game.status === 'playing' && !game.busted?.includes(target.id)) game.busted = [...(game.busted ?? []), target.id];
      const seat = seatFor(game.hand, target.id);
      const inHand = game.status === 'playing' && game.hand && !game.hand.result && seat && !seat.folded;
      if (inHand) {
        // Their hand is folded now and they leave when it ends.
        target.leaving = true;
        foldOutOfTurn(game, target.id, ctx);
      } else {
        game.players = game.players.filter((p) => p.id !== target.id);
      }
      // The host left: hand the table to someone else on a phone.
      if (target.deviceId === game.hostDeviceId) {
        const next = game.players.find((p) => !p.bot && !p.leaving && p.deviceId);
        if (next?.deviceId) game.hostDeviceId = next.deviceId;
      }
      return done();
    }

    case 'settings': {
      if (!host) return fail('Only the host can change the table.');
      const next = { ...game.settings, ...action.settings };
      if (!validSettings(next)) return fail("Those settings don't work together.");
      const stackChanged = next.startingStack !== game.settings.startingStack;
      const minutesChanged = (next.blindMinutes ?? 0) !== (game.settings.blindMinutes ?? 0);
      game.settings = next;
      // Changing how often the blinds rise restarts their clock; turning it off stops it.
      if (!next.blindMinutes) game.blindsRaiseAt = null;
      else if (game.status === 'playing' && (minutesChanged || game.blindsRaiseAt == null))
        game.blindsRaiseAt = ctx.now + next.blindMinutes * 60_000;
      // Before the first hand, everyone sits down with the new stack.
      if (game.status === 'lobby' && stackChanged) {
        for (const p of game.players) {
          p.stack = next.startingStack;
          p.bought = next.startingStack;
        }
      }
      return done();
    }

    case 'start': {
      if (!host) return fail('Only the host can start.');
      if (game.status !== 'lobby') return done(false);
      if (game.players.length < 2) return fail('You need at least two players. Add a bot or invite a friend.');
      game.status = 'playing';
      game.first = { settings: { ...game.settings }, bots: game.players.filter((p) => p.bot).length };
      // A Scroll card deals straight away: the intro popup has already given the table its moment.
      if (game.card) {
        startHand(game, ctx);
        return done();
      }
      // A few seconds to take the table in, with a word from a bot, before the first cards come.
      game.nextHandAt = ctx.now + startWait(game);
      const bots = game.players.filter((p) => p.bot);
      const people = game.players.filter((p) => !p.bot);
      if (bots.length) {
        const headsUp = game.players.length === 2 && people.length === 1;
        const who = headsUp ? bots[0] : bots[Math.floor(ctx.rng() * bots.length)];
        game.pendingTalk = { at: ctx.now + greetWait(game), playerId: who.id, event: !headsUp ? 'welcome' : game.rematch === 'won' ? 'rematchWon' : game.rematch === 'lost' ? 'rematchLost' : 'hello', forId: headsUp ? people[0].id : undefined };
      }
      schedule(game);
      return done();
    }

    case 'act': {
      const hand = game.hand;
      if (!me) return fail("You're not at this table.");
      if (!hand || hand.result || hand.number !== action.hand || hand.toAct !== me.id) return fail("It's not your turn.");
      if (hand.seq !== action.seq) return fail('That turn has passed.');
      const potBefore = potTotal(hand);
      const error = makeMove(game, action.move, action.to, ctx);
      if (error) return fail(error);
      me.timeouts = 0;
      // A big move from a person gets a reaction from one of the bots still in the hand.
      const big = action.move === 'allin' || ((action.move === 'raise' || action.move === 'bet') && (action.to ?? 0) >= potBefore * 0.75);
      if (big && !game.hand?.result) {
        const bots = hand.seats.filter((s) => !s.folded && playerById(game, s.playerId)?.bot);
        const who = bots[Math.floor(ctx.rng() * bots.length)];
        if (who) botSays(game, who.playerId, 'yourBigBet', ctx.rng, ctx.now, false, me.id);
      }
      return done();
    }

    case 'discard': {
      const hand = game.hand;
      if (!me) return fail("You're not at this table.");
      if (!hand || hand.result || hand.number !== action.hand) return fail('That hand is over.');
      const error = discardCard(game, me.id, action.card, ctx);
      return error ? fail(error) : done();
    }

    case 'vote': {
      const hand = game.hand;
      if (!me) return fail("You're not at this table.");
      if (!hand || hand.result || hand.number !== action.hand) return fail('That hand is over.');
      const error = castVote(game, me.id, action.playerId, ctx);
      return error ? fail(error) : done();
    }

    case 'next': {
      const hand = game.hand;
      if (!me || game.status !== 'playing') return done(false);
      if (!hand || !hand.result || hand.number !== action.hand) return done(false);
      if (game.ready.includes(me.id)) return done(false);
      game.ready.push(me.id);
      // Everyone who's playing has seen enough: deal now.
      const waitingOn = game.players.filter((p) => !p.bot && !p.sittingOut && p.stack > 0 && !game.ready.includes(p.id));
      if (waitingOn.length === 0 && game.nextHandAt !== null && canDeal(game)) startHand(game, ctx);
      return done();
    }

    case 'revealBots': {
      const hand = game.hand;
      if (!host) return fail('Only the host can reveal the bots.');
      if (!hand || !hand.result || hand.number !== action.hand) return fail('Wait until the hand is over.');
      const entry = game.logs?.find((l) => l.number === hand.number);
      let changed = false;
      for (const seat of hand.seats) {
        const player = playerById(game, seat.playerId);
        if (!player?.bot || seat.shown || seat.cards.length !== 2) continue;
        if (action.playerId && player.id !== action.playerId) continue;
        seat.shown = true;
        changed = true;
        if (entry) {
          entry.shown.push(player.id);
          entry.lines.push(`${player.name} shows ${cardsText(seat.cards)}`);
        }
      }
      return done(changed);
    }

    case 'react': {
      if (!me) return fail("You're not at this table.");
      if (!isReactionId(action.id)) return fail("That isn't one of the quick messages.");
      game.reactions = { ...game.reactions, [me.id]: { id: action.id, n: (game.reactions?.[me.id]?.n ?? 0) + 1 } };
      // A bot answers now and then: thanks for a compliment, a tease back, good luck to you too.
      const answer = ANSWER[action.id];
      if (answer && !game.card && !game.pendingTalk && game.status === 'playing') {
        const ready = game.players.filter((p) => p.bot && !p.sittingOut && ctx.now - (game.talkAt?.[p.id] ?? -Infinity) > 3000);
        if (ready.length && ctx.rng() < ANSWER_CHANCE) {
          game.pendingTalk = { at: ctx.now + ANSWER_AFTER.min + Math.floor(ctx.rng() * ANSWER_AFTER.spread), playerId: ready[Math.floor(ctx.rng() * ready.length)].id, event: answer, forId: me.id, reactionN: game.reactions[me.id].n, handNumber: game.hand?.number };
          schedule(game);
        }
      }
      return done();
    }

    case 'show': {
      const hand = game.hand;
      const seat = seatFor(hand, me?.id);
      if (!me || !hand || !hand.result || hand.number !== action.hand || !seat) return fail('There are no cards to show.');
      if (seat.shown) return done(false);
      seat.shown = true;
      const entry = game.logs?.find((l) => l.number === hand.number);
      if (entry) {
        entry.shown.push(me.id);
        entry.lines.push(`${me.name} shows ${cardsText(seat.cards)}`);
      }
      // Showing a bluff gets noticed, and one of the bots it worked on may say something.
      const fooled = cardsShown(game, hand, me.id);
      if (fooled.length) botSays(game, fooled[Math.floor(ctx.rng() * fooled.length)], 'gotBluffed', ctx.rng, ctx.now, false, me.id);
      return done();
    }

    case 'sitOut': {
      if (!me) return fail("You're not at this table.");
      if (me.sittingOut === action.out) return done(false);
      me.sittingOut = action.out;
      me.timeouts = 0;
      if (!action.out) wakeIfWaiting(game, ctx);
      return done();
    }

    case 'rebuy': {
      if (!me) return fail("You're not at this table.");
      if (!game.settings.rebuys) return fail("This table doesn't allow rebuys.");
      if (me.stack > 0) return fail('You still have chips.');
      const seat = seatFor(game.hand, me.id);
      if (game.hand && !game.hand.result && seat && !seat.folded) return fail('Wait for this hand to finish.');
      me.stack = game.settings.startingStack;
      me.bought += game.settings.startingStack;
      me.sittingOut = false;
      // Bought back in during the last-player-standing window: deal again soon.
      if (game.status === 'playing' && game.hand?.result && canDeal(game))
        game.nextHandAt = Math.min(game.nextHandAt ?? Infinity, ctx.now + TIMING.resume);
      wakeIfWaiting(game, ctx);
      schedule(game);
      return done();
    }

    case 'presence': {
      const online = new Set(action.online);
      let changed = false;
      for (const p of game.players) {
        if (p.bot || !p.deviceId) continue;
        const off = !online.has(p.deviceId);
        if (!!p.offline === off) continue;
        p.offline = off || undefined;
        changed = true;
        // On the clock when they dropped: the clock shortens. Back in time: they keep at least the short clock.
        const hand = game.hand;
        if (!hand || hand.result || hand.toAct !== p.id || game.settings.turnSeconds <= 0) continue;
        const short = ctx.now + TIMING.offlineClock;
        if (off && (hand.deadline === null || hand.deadline > short)) hand.deadline = short;
        else if (!off && hand.deadline !== null) hand.deadline = Math.max(hand.deadline, short);
        hand.actAt = hand.deadline;
      }
      if (!changed) return done(false);
      schedule(game);
      return done();
    }

    case 'playAgain': {
      if (!me) return fail("You're not at this table.");
      if (game.status !== 'ended') return done(false);
      if (host && !action.off) {
        openAgain(game, ctx);
        return done();
      }
      const wants = new Set(game.again ?? []);
      if (action.off) wants.delete(me.id);
      else wants.add(me.id);
      game.again = [...wants];
      return done();
    }

    case 'end': {
      if (!host) return fail('Only the host can end the table.');
      // A hand in progress is called off: everyone gets back what they put in.
      const hand = game.hand;
      if (hand && !hand.result) {
        for (const s of hand.seats) {
          const p = playerById(game, s.playerId);
          if (p) p.stack += s.total;
        }
        // The ghost keeps what it was holding.
        if (hand.carry) game.ghostPot = (game.ghostPot ?? 0) + hand.carry;
        game.hand = null;
      }
      game.players = game.players.filter((p) => !p.leaving);
      game.status = 'ended';
      game.nextHandAt = null;
      schedule(game);
      return done();
    }

    case 'tick':
      return done(tick(game, ctx));
  }
}

/** Moves time along: a bot acts, a turn times out, a run-out card comes, or the next hand deals. */
function tick(game: Game, ctx: ActionContext): boolean {
  if (game.status !== 'playing') return false;
  const hand = game.hand;
  // Timers can fire a hair early; that's close enough.
  const due = (at: number | null) => at !== null && ctx.now >= at - 20;

  // A bot answering what was just said.
  if (game.pendingTalk && due(game.pendingTalk.at)) {
    const { playerId, event, forId, seq, reactionN, handNumber } = game.pendingTalk;
    delete game.pendingTalk;
    // An answer to a quick message is dropped if that message has since been replaced or the hand has moved on.
    const current =
      (handNumber === undefined || hand?.number === handNumber) &&
      (reactionN === undefined || (forId && game.reactions?.[forId]?.n === reactionN));
    if (!current) {
      schedule(game);
      return true;
    }
    // Greetings and answers to a person are always said: someone was waiting for them.
    if (event && SURE_THINGS.has(event)) {
      const ms = botSays(game, playerId, event, ctx.rng, ctx.now, true, forId);
      // The opening hello: nobody is dealt in until it has been said and read.
      if (ms && !game.hand && game.nextHandAt !== null && (event === 'hello' || event === 'welcome' || event === 'rematchWon' || event === 'rematchLost'))
        game.nextHandAt = Math.max(game.nextHandAt, ctx.now + ms + TIMING.afterHello);
      // Someone else at the table says hi back, before the cards come.
      if (event === 'welcome' && ms) {
        const rest = game.players.filter((p) => p.bot && p.id !== playerId && !p.sittingOut);
        const at = ctx.now + ms + 150;
        if (rest.length && ctx.rng() < 0.65 && game.nextHandAt !== null && at < game.nextHandAt - 400)
          game.pendingTalk = { at, playerId: rest[Math.floor(ctx.rng() * rest.length)].id, event: 'greetBack' };
      }
      schedule(game);
      return true;
    }
    // A jab at a slow player only lands if they're still on the clock.
    if (event !== 'tank' || (hand && !hand.result && hand.toAct === forId && hand.seq === seq)) botSays(game, playerId, event ?? 'reply', ctx.rng, ctx.now, false, event === 'tank' ? forId : undefined);
    schedule(game);
    return true;
  }

  if (hand && !hand.result) {
    if (!due(hand.actAt)) return false;
    // Crazy Pineapple: time's up for throwing a card away.
    if (hand.discarding) {
      endDiscards(game, ctx);
      return true;
    }
    // Imposter: time's up for voting.
    if (hand.voting) {
      endVote(game, ctx);
      return true;
    }
    if (hand.nextStreetAt != null) {
      dealNextStreet(game, ctx);
      return true;
    }
    if (hand.runout) {
      runoutStep(game, ctx);
      // Sweating the next card: someone in the all-in, or someone watching.
      if (!game.hand?.result) {
        const inIt = hand.seats.filter((s) => !s.folded && playerById(game, s.playerId)?.bot);
        const watching = hand.seats.filter((s) => s.folded && playerById(game, s.playerId)?.bot);
        const pickOne = <T>(xs: T[]) => xs[Math.floor(ctx.rng() * xs.length)];
        if (inIt.length && ctx.rng() < 0.75) {
          const id = pickOne(inIt).playerId;
          if (botSays(game, id, 'sweat', ctx.rng, ctx.now)) owe(game, id);
        } else if (watching.length) {
          const id = pickOne(watching).playerId;
          if (botSays(game, id, 'sweatWatch', ctx.rng, ctx.now)) owe(game, id);
        }
      }
      return true;
    }
    const seat = seatFor(hand, hand.toAct ?? undefined);
    const player = playerById(game, hand.toAct);
    if (!seat || !player) return false;
    if (player.bot) {
      // Second half of a turn where the bot thought out loud first: make the move it settled on.
      const plan = game.botPlan;
      if (plan && plan.playerId === player.id && plan.seq === hand.seq) {
        delete game.botPlan;
        if (makeMove(game, plan.move, plan.to, ctx)) makeMove(game, passiveMove(hand, seat), undefined, ctx);
        return true;
      }
      // It said something a moment ago (a remark on someone's bet, say) and the table is still reading it.
      const talking = game.talkDone?.[player.id] ?? 0;
      if (talking > ctx.now + 20 && !botsOnly(game)) {
        hand.actAt = talking;
        schedule(game);
        return true;
      }
      const before = options(game, hand, seat);
      // A big bet: after the flop, half the pot or more; before it, a raise of three big blinds or more.
      const bigBet =
        hand.street === 'preflop' ? hand.currentBet >= game.settings.bigBlind * 3 : before.toCall > potTotal(hand) * 0.45;
      // In a Hold'em variant it sees the hand as plain Hold'em (see botView).
      const view = botView(game, hand, seat);
      // At a variant table it plays the variant's own way (botVariants.ts); plain Hold'em gets the full bot brain.
      const thought = variantDecide(game, hand, seat, ctx.rng) ?? decide(view.game, view.hand, view.seat, ctx.rng);
      const choice = thought.move;
      const fast = botsOnly(game);
      // It has already taken a moment to look; the rest of its thinking time depends on how hard
      // this one is (a snap fold, a long tank over a big call).
      let wait = fast ? 0 : Math.max(0, thought.thinkMs - TIMING.botMin);
      // Sometimes it says what it's thinking first, then moves a moment later.
      const event = thinkingEvent(view.game, view.hand, choice, thought.bucket, bigBet);
      // What it says isn't always about the move it's about to make, or the line would give the move away.
      const said = event && ctx.rng() < 0.4 ? (ctx.rng() < 0.5 ? 'thinkHard' : 'thinkEasy') : event;
      // (With every person out of the hand the bots hurry, and nobody has time to read what they think.)
      const spoken = event && said && !fast ? botSays(game, player.id, said, ctx.rng, ctx.now) : 0;
      if (spoken) {
        wait = Math.max(wait, spoken);
        if (event === 'allin') owe(game, player.id);
      }
      if (wait > 150) {
        game.botPlan = { playerId: player.id, seq: hand.seq, move: choice.move, to: choice.to };
        hand.actAt = ctx.now + wait;
        schedule(game);
        return true;
      }
      if (makeMove(game, choice.move, choice.to, ctx))
        makeMove(game, passiveMove(hand, seat), undefined, ctx);
      return true;
    }
    // Out of time: check if that's free, otherwise fold. Two in a row and they sit out.
    makeMove(game, passiveMove(hand, seat), undefined, ctx);
    player.timeouts += 1;
    if (player.timeouts >= 2) player.sittingOut = true;
    return true;
  }

  if (!due(game.nextHandAt)) return false;
  // "Nothing much happening" is only worth saying when the last hand was over before the flop.
  const sleepy = !!hand?.result && hand.street === 'preflop';
  startHand(game, ctx);
  // A word from a random bot between deals, now and then.
  const chatty = game.players.filter((p) => p.bot && !p.sittingOut);
  if (sleepy && chatty.length) botSays(game, chatty[Math.floor(ctx.rng() * chatty.length)].id, 'idle', ctx.rng, ctx.now);
  return true;
}
