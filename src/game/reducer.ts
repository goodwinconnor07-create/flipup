// Every change to a table goes through applyAction(). The server and the phone (for bots-only
// tables) run exactly this code, so they always agree.

import { BOTS, botMove } from './bots';
import { DEFAULT_EMOJI, isEmoji } from './emoji';
import { canDeal, cardsText, foldOutOfTurn, makeMove, MAX_SEATS, playerById, runoutStep, schedule, startHand, TIMING } from './holdem';
import { newId } from './ids';
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
    s.bigBlind <= s.startingStack / 2 &&
    typeof s.rebuys === 'boolean' &&
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
  // A name and a picture nobody at the table has yet.
  const pick = BOTS.find((b) => !names.has(b.name.toLowerCase()) && !emojis.has(b.emoji)) ??
    BOTS.find((b) => !names.has(b.name.toLowerCase())) ?? { name: `Bot ${game.players.length}`, emoji: '🤖' };
  game.players.push(newPlayer(game, { ...pick, deviceId: null, bot: true }));
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
      game.settings = next;
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
      const error = makeMove(game, action.move, action.to, ctx);
      if (error) return fail(error);
      me.timeouts = 0;
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

  if (hand && !hand.result) {
    if (!due(hand.actAt)) return false;
    if (hand.runout) {
      runoutStep(game, ctx);
      return true;
    }
    const seat = seatFor(hand, hand.toAct ?? undefined);
    const player = playerById(game, hand.toAct);
    if (!seat || !player) return false;
    if (player.bot) {
      const choice = botMove(game, hand, seat, ctx.rng);
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
  return true;
}
