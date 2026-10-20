// Every change to a table goes through applyAction(). The server and the phone (for bots-only
// tables) run exactly this code, so they always agree.

import { decide, handBucket, updateReads, type BotMove } from './botPlay';
import { BOTS } from './botStyles';
import { botSays, type TalkEvent } from './botTalk';
import { DEFAULT_EMOJI, isEmoji } from './emoji';
import { canDeal, cardsText, dealNextStreet, foldOutOfTurn, makeMove, MAX_SEATS, playerById, potTotal, runoutStep, schedule, startHand, TIMING } from './holdem';
import { cryptoRng, newId } from './ids';
import { isReactionId } from './reactions';
import { isNameBlocked, NAME_BLOCKED } from './names';
import { options, seatFor } from './selectors';
import type { Action, ActionContext, ActionResult, Game, Player, Settings } from './types';

export const LIMITS = {
  maxNameLength: 16,
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
    (s.blindCap === undefined || (int(s.blindCap) && s.blindCap >= 0 && s.blindCap <= 1_000_000_000)) &&
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
  game.players.push(newPlayer(game, { name: cleanName(opts.name), emoji: opts.emoji, deviceId: opts.hostDeviceId, bot: false }));
  for (let i = 0; i < opts.bots && game.players.length < MAX_SEATS; i++) addBot(game);
  return game;
}

function addBot(game: Game): void {
  const names = new Set(game.players.map((p) => p.name.toLowerCase()));
  const emojis = new Set(game.players.map((p) => p.emoji));
  // A random bot whose name and picture nobody at the table has yet (so it isn't always the same order).
  const free = BOTS.filter((b) => !names.has(b.name.toLowerCase()) && !emojis.has(b.emoji));
  const pool = free.length ? free : BOTS.filter((b) => !names.has(b.name.toLowerCase()));
  const pick = pool.length ? pool[Math.floor(cryptoRng() * pool.length)] : { name: `Bot ${game.players.length}`, emoji: '🤖', style: 'pro' };
  game.players.push({ ...newPlayer(game, { name: pick.name, emoji: pick.emoji, deviceId: null, bot: true }), style: pick.style });
}

/**
 * Once per hand, when it's over: the bots take note of what everyone did, and react. Winners and
 * losers of an all-in sweat it out loud, big pots get a word, and sometimes another bot answers.
 * When someone speaks, the next deal waits a little longer so it can be read.
 */
function afterHand(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  const result = hand.result!;
  game.readHand = hand.number;
  updateReads(game, hand);
  const bb = game.settings.bigBlind;
  const pot = result.pots.reduce((a, p) => a + p.amount, 0);
  const winners = Object.keys(result.won);
  const isBot = (id: string) => !!playerById(game, id)?.bot;
  const bucketOf = (id: string) => {
    const seat = hand.seats.find((s) => s.playerId === id);
    return seat && seat.cards.length === 2 && hand.board.length >= 3 ? handBucket(seat.cards, hand.board) : null;
  };
  const say = (id: string, event: TalkEvent) => botSays(game, id, event, ctx.rng, ctx.now);
  const spoke: string[] = [];
  const showdownLosers = result.showdown ? hand.seats.filter((s) => !s.folded && !winners.includes(s.playerId)).map((s) => s.playerId) : [];
  const personWon = winners.some((id) => !isBot(id));
  // Who is on a cold streak: people who put chips in and lost, hands in a row.
  const streaks = { ...game.streaks };
  for (const s of hand.seats) {
    if (isBot(s.playerId)) continue;
    if (winners.includes(s.playerId)) streaks[s.playerId] = 0;
    else if (s.total > 0) streaks[s.playerId] = (streaks[s.playerId] ?? 0) + 1;
  }
  game.streaks = streaks;
  const tilted = hand.seats.some((s) => !isBot(s.playerId) && !winners.includes(s.playerId) && (streaks[s.playerId] ?? 0) >= 2);

  if (hand.ranOut) {
    for (const id of winners) if (isBot(id) && say(id, 'sweatWin')) spoke.push(id);
    for (const id of showdownLosers) if (isBot(id) && say(id, 'sweatLose')) spoke.push(id);
  } else {
    for (const id of winners) {
      if (!isBot(id)) continue;
      const b = bucketOf(id);
      // Twice or more in a row and they pile on; a big showdown win is a smaller chance.
      const rubbedIn = tilted ? ctx.rng() < 0.7 : result.showdown && pot >= bb * 15 && showdownLosers.some((l) => !isBot(l)) && ctx.rng() < 0.25;
      const event: TalkEvent = !result.showdown && (b === 'air' || b === 'weak') ? 'bluffWon' : rubbedIn ? 'tiltJab' : pot >= bb * 15 ? 'bigWin' : 'win';
      if (say(id, event)) spoke.push(id);
    }
    for (const id of showdownLosers) {
      if (!isBot(id)) continue;
      const b = bucketOf(id);
      const caught = b === 'air' || b === 'weak';
      if (caught ? say(id, 'bluffCaught') : (b === 'monster' || b === 'strong') && pot >= bb * 10 ? say(id, 'badBeat') : personWon && say(id, 'lostToYou')) spoke.push(id);
    }
  }
  if (!spoke.length) return;
  // Someone answers now and then: a bot that didn't just speak, a beat later.
  const others = game.players.filter((p) => p.bot && !spoke.includes(p.id) && !p.sittingOut);
  if (others.length && ctx.rng() < 0.4) {
    const who = others[Math.floor(ctx.rng() * others.length)];
    game.pendingTalk = { at: ctx.now + 1400, playerId: who.id };
  }
  // A little longer before the next deal, so the table talk can be read.
  if (game.nextHandAt !== null) game.nextHandAt += TIMING.talkPause;
  schedule(game);
}

/** What a bot says while it thinks, given the move it's about to make. */
function thinkingEvent(game: Game, hand: Game['hand'] & object, choice: BotMove, bucket: string | undefined, bigBet: boolean): TalkEvent | null {
  const raisedBig = (choice.move === 'raise' || choice.move === 'bet') && (choice.to ?? 0) >= potTotal(hand) * 0.6;
  if (choice.move === 'allin') return 'allin';
  if (choice.move === 'fold' && bigBet) return 'foldBig';
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

  if (game.status === 'ended' && action.type !== 'setLook') return fail('This table has finished.');

  switch (action.type) {
    case 'join': {
      const name = cleanName(action.name);
      if (!name) return fail('Add your name first.');
      if (isNameBlocked(name)) return fail(NAME_BLOCKED);
      const emoji = isEmoji(action.emoji) ? action.emoji : DEFAULT_EMOJI;
      if (me) {
        if (me.name === name && me.emoji === emoji) return done(false);
        me.name = name;
        me.emoji = emoji;
        return done();
      }
      if (game.players.length >= MAX_SEATS) return fail('The table is full.');
      game.players.push(newPlayer(game, { name, emoji, deviceId: ctx.deviceId, bot: false }));
      wakeIfWaiting(game, ctx);
      return done();
    }

    case 'setLook': {
      if (!me) return fail("You're not at this table.");
      const name = cleanName(action.name);
      if (!name) return fail('Add your name first.');
      if (isNameBlocked(name)) return fail(NAME_BLOCKED);
      if (!isEmoji(action.emoji)) return fail('Pick an emoji.');
      me.name = name;
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
      startHand(game, ctx);
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
        if (who) botSays(game, who.playerId, 'yourBigBet', ctx.rng, ctx.now);
      }
      return done();
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

    case 'end': {
      if (!host) return fail('Only the host can end the table.');
      // A hand in progress is called off: everyone gets back what they put in.
      const hand = game.hand;
      if (hand && !hand.result) {
        for (const s of hand.seats) {
          const p = playerById(game, s.playerId);
          if (p) p.stack += s.total;
        }
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
    const { playerId, event, forId, seq } = game.pendingTalk;
    delete game.pendingTalk;
    // A jab at a slow player only lands if they're still on the clock.
    if (event !== 'tank' || (hand && !hand.result && hand.toAct === forId && hand.seq === seq)) botSays(game, playerId, event ?? 'reply', ctx.rng, ctx.now);
    schedule(game);
    return true;
  }

  if (hand && !hand.result) {
    if (!due(hand.actAt)) return false;
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
        const pickOne = <T,>(xs: T[]) => xs[Math.floor(ctx.rng() * xs.length)];
        if (inIt.length && ctx.rng() < 0.75) botSays(game, pickOne(inIt).playerId, 'sweat', ctx.rng, ctx.now);
        else if (watching.length) botSays(game, pickOne(watching).playerId, 'sweatWatch', ctx.rng, ctx.now);
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
        if (makeMove(game, plan.move, plan.to, ctx)) makeMove(game, options(game, hand, seat).canCheck ? 'check' : 'fold', undefined, ctx);
        return true;
      }
      const before = options(game, hand, seat);
      // A big bet: after the flop, half the pot or more; before it, a raise of three big blinds or more.
      const bigBet =
        hand.street === 'preflop' ? hand.currentBet >= game.settings.bigBlind * 3 : before.toCall > potTotal(hand) * 0.45;
      const thought = decide(game, hand, seat, ctx.rng);
      const choice = thought.move;
      // Sometimes it says what it's thinking first, then moves a moment later.
      const event = thinkingEvent(game, hand, choice, thought.bucket, bigBet);
      if (event && botSays(game, player.id, event, ctx.rng, ctx.now)) {
        game.botPlan = { playerId: player.id, seq: hand.seq, move: choice.move, to: choice.to };
        hand.actAt = ctx.now + TIMING.botThink;
        schedule(game);
        return true;
      }
      if (makeMove(game, choice.move, choice.to, ctx))
        makeMove(game, options(game, hand, seat).canCheck ? 'check' : 'fold', undefined, ctx);
      return true;
    }
    // Out of time: check if that's free, otherwise fold. Two in a row and they sit out.
    makeMove(game, options(game, hand, seat).canCheck ? 'check' : 'fold', undefined, ctx);
    player.timeouts += 1;
    if (player.timeouts >= 2) player.sittingOut = true;
    return true;
  }

  if (!due(game.nextHandAt)) return false;
  startHand(game, ctx);
  // A word from a random bot between deals, now and then.
  const chatty = game.players.filter((p) => p.bot && !p.sittingOut);
  if (chatty.length) botSays(game, chatty[Math.floor(ctx.rng() * chatty.length)].id, 'idle', ctx.rng, ctx.now);
  return true;
}
