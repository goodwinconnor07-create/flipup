// No-limit Texas Hold'em: dealing, blinds, betting rounds, side pots and the showdown.
// Everything here works on a copy of the game that applyAction() already made, so it changes it in place.

import { handRecord } from './record';
import { fullDeck, isRed, shuffle, type Card } from './cards';
import { anteBigBlinds, bestHand, botVote, holeCount, IMPOSTER_MIN, keepTwo, potLimit, streetCards, variantOf, type Variant } from './variants';
import type { ActionContext, Game, Hand, Move, Player, PotResult, Seat, Street } from './types';

export const TIMING = {
  /** Bots take a moment to look at the spot before deciding (then think for as long as the spot needs, see botPlay.ts). */
  botMin: 500,
  botMax: 800,
  /** The bot answering someone: at least this long after the line it answers, and starting this much before that line is read out. */
  replyMin: 800,
  replyEarly: 250,
  /** A person has had the clock this long: a bot may poke them. */
  tankJab: 12000,
  /** Extra time before the next deal when a bot has something to say about the hand: at least this, at most the max, otherwise how long the talk takes less the slack. */
  talkPause: 1600,
  talkPauseMax: 3600,
  talkSlack: 1200,
  /** Gap between cards on an all-in run-out, so the odds can be read. */
  runoutStep: 2200,
  /** Pause after a hand before the next one deals (unless everyone taps Next hand). */
  afterFold: 5000,
  afterShowdown: 9000,
  /** An online table with nobody left to play against closes this long after it stopped. */
  emptyClose: 60000,
  /** The clock for someone whose phone has lost the table, when the table has a clock at all. */
  offlineClock: 15000,
  /** A new game: this long after Deal before the first cards come, so there's time to take the table in. */
  startDelay: 3000,
  /** A heads-up game opens with the full-screen VS intro, which takes this long. The bot stays quiet until it's over. */
  versusDelay: 2600,
  /** After the intro, how long before the bot says hello. */
  versusHello: 250,
  /** Once the opening hello has been said and read, this long before the first cards. */
  afterHello: 700,
  /** ...and a bot says hello this long into it. */
  greeting: 700,
  /** Someone joined or came back: give the table a beat before dealing. */
  resume: 2000,
  /** One player has all the chips on a table where rebuys are allowed: this long for the others to rebuy before the game ends. */
  rebuyWindow: 20000,
  /** After the last bet of a street is matched, a beat before the next card so the move can be seen. */
  streetPause: 1100,
  /** Once every person is out of a hand, the bots finish it quickly: no one is watching their thinking. */
  fastBotMin: 250,
  fastBotMax: 550,
  fastStreet: 350,
  fastRunout: 600,
  /** The pause before the next deal is this share of the usual when every person has folded. */
  fastAfter: 0.45,
  /** A game that ends at once (see endsAtOnce): how long the deciding hand stays on screen before the winner's page. */
  endPause: 3000,
};

/** Games that end as soon as one player has all the chips: no rebuys, a legend, or an online table. Other tables (bots-only on one phone, rebuys on) wait the rebuy window. */
export const endsAtOnce = (game: Game): boolean => !game.settings.rebuys || !!game.legendGame || !!game.code;

/** How long a new game waits before its first greeting. A heads-up table plays the VS intro first (the clock of a fast table runs at twice the speed, so its intro is twice as long in table time). */
export const greetWait = (game: Game): number =>
  game.players.length === 2 ? (TIMING.versusDelay + TIMING.versusHello) * (game.fast ? 2 : 1) : TIMING.greeting;

/** The first deal is pencilled in just after the greeting; saying it moves the deal to after it has been read. */
export const startWait = (game: Game): number => (game.players.length === 2 ? greetWait(game) + TIMING.afterHello : TIMING.startDelay);

/** Hands kept in the hand log. */
export const MAX_LOGS = 150;

/** "[Ah] [Kd]" */
export const cardsText = (cards: Card[]) => cards.map((c) => `[${c}]`).join(' ');
const nameOf = (game: Game, id: string) => playerById(game, id)?.name ?? 'Someone';
const n0 = (n: number) => n.toLocaleString('en-US');

function log(game: Game, line: string): void {
  game.hand?.log.push(line);
}

/** Only one player (or only bots) has chips: nobody left to play against. */
export function lastStanding(game: Game): boolean {
  const withChips = game.players.filter((p) => p.stack > 0);
  return withChips.length <= 1 || withChips.every((p) => p.bot);
}

export const MAX_SEATS = 9;

export function playerById(game: Game, id: string | null | undefined): Player | undefined {
  return id ? game.players.find((p) => p.id === id) : undefined;
}

/** Players who'd be dealt into a new hand, in seat order. */
export function dealable(game: Game): Player[] {
  return game.players.filter((p) => !p.sittingOut && !p.leaving && p.stack > 0).sort((a, b) => a.seat - b.seat);
}

/** A hand needs two players with chips, and at least one of them a person (bots don't play alone). */
export function canDeal(game: Game): boolean {
  const players = dealable(game);
  return players.length >= 2 && players.some((p) => !p.bot);
}

const isLive = (s: Seat) => !s.folded && !s.allIn;

export function potTotal(hand: Hand): number {
  return hand.seats.reduce((sum, s) => sum + s.total, 0) + (hand.carry ?? 0);
}

/** The most a bet or raise can go to: everything they have, or at a pot-limit table the size of the pot after calling. */
export function maxRaiseTo(game: Game, hand: Hand, seat: Seat, stack: number): number {
  const all = seat.bet + stack;
  if (!potLimit(variantOf(game))) return all;
  const toCall = Math.max(0, hand.currentBet - seat.bet);
  return Math.min(all, hand.currentBet + potTotal(hand) + toCall);
}

/** Puts chips from a player's stack in front of them. */
function put(seat: Seat, player: Player, amount: number): void {
  const chips = Math.min(amount, player.stack);
  player.stack -= chips;
  seat.bet += chips;
  seat.total += chips;
  if (player.stack === 0) seat.allIn = true;
}

/** The next seat index after `from` (wrapping) that matches, or -1. */
function nextIndex(hand: Hand, from: number, test: (s: Seat) => boolean): number {
  const n = hand.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (test(hand.seats[idx])) return idx;
  }
  return -1;
}

const indexOf = (hand: Hand, id: string) => hand.seats.findIndex((s) => s.playerId === id);

function needsAction(hand: Hand, s: Seat): boolean {
  return isLive(s) && (!s.acted || s.bet < hand.currentBet);
}

/** Betting on this street is finished. */
function roundOver(hand: Hand): boolean {
  const live = hand.seats.filter(isLive);
  if (live.length === 0) return true;
  // One player left with chips: nobody can raise them, so they only need to match the bet.
  if (live.length === 1) return live[0].bet >= hand.currentBet;
  return live.every((s) => s.acted && s.bet === hand.currentBet);
}

/** Can this seat raise right now? Not after a short all-in they've already acted on, and not with nobody left to call. */
export function canRaise(hand: Hand, seat: Seat): boolean {
  if (seat.acted) return false;
  return hand.seats.some((s) => s !== seat && isLive(s));
}

// ── Starting a hand ─────────────────────────────────────────────────────────

/**
 * Rising blinds: when the clock has run out (or the hand count is up, in a party round), both blinds double as the next hand is dealt (never mid-hand).
 * They stop at the host's "stop increasing at" big blind, if one is set (the last rise is cut short to land on it).
 * Returns true if they went up.
 */
function raiseBlindsIfDue(game: Game, now: number): boolean {
  const minutes = game.settings.blindMinutes ?? 0;
  const every = game.settings.blindHands ?? 0;
  // By hands (party rounds): after every `every` hands dealt.
  const byHands = every > 0 && (game.hands ?? 0) > 0 && (game.hands ?? 0) % every === 0;
  let due = byHands;
  if (!minutes) game.blindsRaiseAt = null;
  // The clock starts with the first hand.
  else if (game.blindsRaiseAt == null) game.blindsRaiseAt = now + minutes * 60_000;
  else if (now >= game.blindsRaiseAt) {
    game.blindsRaiseAt = now + minutes * 60_000;
    due = true;
  }
  if (!due) return false;
  const { smallBlind, bigBlind, blindCap } = game.settings;
  if (blindCap && bigBlind >= blindCap) return false;
  let nextBig = bigBlind * 2;
  let nextSmall = smallBlind * 2;
  if (blindCap && nextBig > blindCap) {
    nextBig = blindCap;
    nextSmall = Math.max(1, Math.round(blindCap / 2));
  }
  game.settings.smallBlind = nextSmall;
  game.settings.bigBlind = nextBig;
  return true;
}

/** Deals a new hand, or leaves the table waiting if there aren't enough players. */
export function startHand(game: Game, ctx: ActionContext): void {
  game.ready = [];
  game.sweating = undefined;
  game.nextHandAt = null;
  if (!canDeal(game)) {
    // Nobody rebought in time: the last player with chips wins. Busted bots stay on the roster here,
    // so the finished game still shows (and counts) the one that was knocked out.
    game.players = game.players.filter((p) => !p.leaving);
    if (game.hand && lastStanding(game)) game.status = 'ended';
    schedule(game);
    return;
  }
  // Bots that ran out of chips leave now (not straight after the hand, so their cards can still be seen).
  // People stay, and can buy back in if the table allows it.
  game.players = game.players.filter((p) => !p.leaving && !(p.bot && p.stack === 0));
  const players = dealable(game);
  const raised = raiseBlindsIfDue(game, ctx.now);

  // The button moves one seat clockwise to the next player who's in. The first one is random,
  // like drawing for the button. A Scroll card places it.
  const scene = game.card;
  const person = players.find((p) => !p.bot);
  let button: Player;
  if (scene && person) button = players[(players.indexOf(person) - scene.at + players.length * 2) % players.length];
  else if (game.buttonSeat === null) button = players[Math.floor(ctx.rng() * players.length)];
  else button = players.find((p) => p.seat > game.buttonSeat!) ?? players[0];
  game.buttonSeat = button.seat;

  const seats: Seat[] = players.map((p) => ({
    playerId: p.id,
    cards: [],
    bet: 0,
    total: 0,
    folded: false,
    allIn: false,
    acted: false,
    shown: false,
    last: null,
  }));
  const b = players.indexOf(button);
  const n = players.length;
  // Heads-up the button posts the small blind and acts first before the flop.
  const sb = n === 2 ? b : (b + 1) % n;
  const bb = (sb + 1) % n;

  const fixed = scene && person ? [...scene.hero, ...scene.board] : [];
  const deck = shuffle(
    fullDeck().filter((c) => !fixed.includes(c)),
    ctx.rng,
  );
  // One card at a time, starting left of the button, until everyone has two (three in Crazy Pineapple).
  // Imposter needs three players; with two the hand is plain Hold'em.
  const chosen: Variant = game.settings.variant ?? 'holdem';
  const variant: Variant = chosen === 'imposter' && n < IMPOSTER_MIN ? 'holdem' : chosen;
  let imposter: string | undefined;
  if (variant === 'imposter') {
    // Everyone gets the same two cards except one player, picked at random, who gets their own.
    const same = [deck.shift()!, deck.shift()!];
    const own = [deck.shift()!, deck.shift()!];
    const at = Math.floor(ctx.rng() * n);
    imposter = seats[at].playerId;
    seats.forEach((s, i) => (s.cards = [...(i === at ? own : same)]));
  } else for (let round = 0; round < holeCount(variant); round++) for (let i = 1; i <= n; i++) seats[(b + i) % n].cards.push(deck.shift()!);
  // Ghost Hold'em: the ghost's two cards come last, face down.
  const ghost = variant === 'ghost' ? [deck.shift()!, deck.shift()!] : undefined;
  // Whatever the ghost kept goes into this pot (even if the table has since switched to another game).
  const carry = game.ghostPot ?? 0;
  game.ghostPot = 0;
  if (scene && person) {
    // The set board comes out in its usual order (burn, flop, burn, turn, burn, river); anything unset is random.
    seats[players.indexOf(person)].cards = [...scene.hero];
    const spare = deck.splice(0, 8);
    const [burn1, burn2, burn3, ...extra] = spare;
    const board = [...scene.board, ...extra].slice(0, 5);
    deck.unshift(burn1, ...board.slice(0, 3), burn2, board[3], burn3, board[4]);
  }

  const hand: Hand = {
    number: (game.hand?.number ?? 0) + 1,
    seq: 0,
    buttonId: button.id,
    sbId: players[sb].id,
    bbId: players[bb].id,
    seats,
    deck,
    board: [],
    street: 'preflop',
    toAct: null,
    currentBet: game.settings.bigBlind,
    minRaise: game.settings.bigBlind,
    aggressorId: null,
    runout: false,
    actAt: null,
    deadline: null,
    result: null,
    log: [],
    actions: [],
    startStacks: Object.fromEntries(players.map((p) => [p.id, p.stack])),
    ...(variant !== 'holdem' ? { variant } : {}),
    ...(imposter ? { imposter } : {}),
    ...(ghost ? { ghost } : {}),
    ...(carry ? { carry } : {}),
  };
  game.hand = hand;
  game.hands = (game.hands ?? 0) + 1;
  log(game, `-- Hand #${hand.number} (dealer: ${button.name}) --`);
  if (raised) log(game, `Blinds go up to ${n0(game.settings.smallBlind)}/${n0(game.settings.bigBlind)}`);
  log(game, `Stacks: ${players.map((p) => `${p.name} ${n0(p.stack)}`).join(' · ')}`);
  if (carry) log(game, `The ghost's ${n0(carry)} is in the pot`);

  // Antes (Imposter): dead money from everyone before the blinds. It counts in the pot but isn't a bet on the street.
  const ante = anteBigBlinds(variant) * game.settings.bigBlind;
  if (ante) {
    seats.forEach((seat, i) => {
      const chips = Math.min(ante, players[i].stack);
      players[i].stack -= chips;
      seat.total += chips;
      if (players[i].stack === 0) seat.allIn = true;
    });
    log(game, `Everyone antes ${n0(ante)}`);
  }
  put(seats[sb], players[sb], game.settings.smallBlind);
  seats[sb].last = { move: 'sb', amount: seats[sb].bet, street: 'preflop' };
  log(game, `${players[sb].name} posts the small blind ${n0(seats[sb].bet)}`);
  put(seats[bb], players[bb], game.settings.bigBlind);
  seats[bb].last = { move: 'bb', amount: seats[bb].bet, street: 'preflop' };
  log(game, `${players[bb].name} posts the big blind ${n0(seats[bb].bet)}`);

  continueFrom(game, bb, ctx);
  playScript(game, ctx);
}

/**
 * A Scroll card's set-up moves, played at once so the first real decision is the one the card is about.
 * It stops early if a move doesn't fit (the card builder's tests make sure none of them do).
 */
function playScript(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  for (const step of game.card?.script ?? []) {
    if (hand.nextStreetAt != null) dealNextStreet(game, ctx);
    const actor = playerById(game, hand.toAct);
    if (hand.result || !actor || actor.bot !== (step.by === 'bot')) return;
    if (makeMove(game, step.move, step.to, ctx)) return;
  }
}

// ── Moves ───────────────────────────────────────────────────────────────────

/** Applies a move for the seat whose turn it is. Returns an error message, or null if it worked. */
export function makeMove(game: Game, move: Move, to: number | undefined, ctx: ActionContext): string | null {
  const hand = game.hand!;
  const idx = indexOf(hand, hand.toAct!);
  const seat = hand.seats[idx];
  const player = playerById(game, seat.playerId)!;
  const toCall = hand.currentBet - seat.bet;

  const cap = maxRaiseTo(game, hand, seat, player.stack);
  if (move === 'allin') {
    // At a pot-limit table "all in" is as much as the pot allows.
    if (cap <= hand.currentBet || !canRaise(hand, seat)) move = toCall > 0 ? 'call' : 'check';
    else {
      move = hand.currentBet > 0 ? 'raise' : 'bet';
      to = cap;
    }
  }
  // Over the pot limit: the bet goes in at the limit.
  if (potLimit(variantOf(game)) && (move === 'bet' || move === 'raise') && to !== undefined && to > cap && cap > hand.currentBet) to = cap;

  // Imposter: nobody can fold (only someone leaving the table folds).
  if (move === 'fold' && hand.imposter && !player.leaving) return "There's no folding in Imposter.";
  switch (move) {
    case 'fold':
      seat.folded = true;
      seat.last = { move: 'fold', amount: 0, street: hand.street };
      break;
    case 'check':
      if (toCall > 0) return `You can't check. It's ${toCall} to call.`;
      seat.last = { move: 'check', amount: 0, street: hand.street };
      break;
    case 'call':
      if (toCall <= 0) return 'Nothing to call. Check instead.';
      // Like Poker Now: a call says how many chips went in with it, not the street's running total.
      const added = Math.min(toCall, player.stack);
      put(seat, player, toCall);
      seat.last = { move: seat.allIn ? 'allin' : 'call', amount: seat.allIn ? seat.bet : added, street: hand.street };
      break;
    case 'bet':
    case 'raise': {
      if (to === undefined || !Number.isInteger(to)) return 'How much?';
      const max = cap;
      const min = Math.min(max, hand.currentBet + hand.minRaise);
      if (!canRaise(hand, seat)) return 'You can only call or fold here.';
      if (to > max) return "You don't have that many chips.";
      if (to <= hand.currentBet) return `Raise to more than ${hand.currentBet}.`;
      if (to < min) return `The smallest ${hand.currentBet ? 'raise' : 'bet'} is ${min}.`;
      const raiseBy = to - hand.currentBet;
      const opening = hand.currentBet === 0;
      put(seat, player, to - seat.bet);
      // A full raise reopens the betting for everyone. A short all-in doesn't.
      if (raiseBy >= hand.minRaise) {
        hand.minRaise = raiseBy;
        for (const s of hand.seats) if (s !== seat && isLive(s)) s.acted = false;
      }
      hand.currentBet = to;
      hand.aggressorId = seat.playerId;
      seat.last = { move: seat.allIn ? 'allin' : opening ? 'bet' : 'raise', amount: to, street: hand.street };
      break;
    }
    default:
      return "That's not a move.";
  }

  const l = seat.last!;
  (hand.actions ??= []).push({ street: hand.street, playerId: seat.playerId, move: l.move as Move, to: l.move === 'call' ? seat.bet : l.amount });
  log(
    game,
    `${player.name} ${
      l.move === 'fold'
        ? 'folds'
        : l.move === 'check'
          ? 'checks'
          : l.move === 'call'
            ? `calls ${n0(l.amount)}`
            : l.move === 'bet'
              ? `bets ${n0(l.amount)}`
              : l.move === 'raise'
                ? `raises to ${n0(l.amount)}`
                : `goes all in for ${n0(l.amount)}`
    }`,
  );
  seat.acted = true;
  hand.seq += 1;
  continueFrom(game, idx, ctx);
  return null;
}

/** What happens when a player doesn't choose (out of time, or a bot's move didn't fit): check, else fold, or in Imposter (no folding) call. */
export function passiveMove(hand: Hand, seat: Seat): Move {
  if (hand.currentBet - seat.bet <= 0) return 'check';
  return hand.imposter ? 'call' : 'fold';
}

/** Someone left the table mid-hand, out of turn: their hand is folded straight away. */
export function foldOutOfTurn(game: Game, playerId: string, ctx: ActionContext): void {
  const hand = game.hand!;
  const seat = hand.seats.find((s) => s.playerId === playerId);
  if (!seat || seat.folded) return;
  if (hand.toAct === playerId) {
    makeMove(game, 'fold', undefined, ctx);
    return;
  }
  seat.folded = true;
  seat.last = { move: 'fold', amount: 0, street: hand.street };
  (hand.actions ??= []).push({ street: hand.street, playerId, move: 'fold', to: 0, outOfTurn: true });
  log(game, `${nameOf(game, playerId)} leaves and folds`);
  hand.seq += 1;
  if (hand.seats.filter((s) => !s.folded).length === 1) winWithoutShowdown(game, ctx);
  else if (hand.discarding && !pendingDiscards(game).length) endDiscards(game, ctx);
  else if (hand.voting && !pendingVoters(game).length) endVote(game, ctx);
}

/** After a move (or the blinds): next player, next street, or the end of the hand. */
function continueFrom(game: Game, idx: number, ctx: ActionContext): void {
  const hand = game.hand!;
  const inHand = hand.seats.filter((s) => !s.folded);
  if (inHand.length === 1) {
    winWithoutShowdown(game, ctx);
    return;
  }
  if (!roundOver(hand)) {
    const next = nextIndex(hand, idx, (s) => needsAction(hand, s));
    if (next !== -1) {
      setTurn(game, next, ctx);
      return;
    }
  }
  endStreet(game, ctx);
}

/** True when every person has folded and only bots are left playing the hand out. */
export function botsOnly(game: Game): boolean {
  const hand = game.hand;
  return !!hand && hand.seats.every((s) => s.folded || !!playerById(game, s.playerId)?.bot);
}

function setTurn(game: Game, idx: number, ctx: ActionContext): void {
  const hand = game.hand!;
  const seat = hand.seats[idx];
  const player = playerById(game, seat.playerId);
  hand.toAct = seat.playerId;
  hand.deadline = null;
  hand.actAt = null;
  // Someone who left the table folds as soon as it's their turn.
  if (!player || player.leaving) {
    makeMove(game, 'fold', undefined, ctx);
    return;
  }
  if (player.bot) {
    const [lo, hi] = botsOnly(game) ? [TIMING.fastBotMin, TIMING.fastBotMax] : [TIMING.botMin, TIMING.botMax];
    hand.actAt = ctx.now + lo + Math.floor(ctx.rng() * (hi - lo));
  } else if (game.settings.turnSeconds > 0) {
    const clock = game.settings.turnSeconds * 1000;
    hand.deadline = ctx.now + (player.offline ? Math.min(clock, TIMING.offlineClock) : clock);
    hand.actAt = hand.deadline;
  }
  // Someone slow to act gets a jab from a bot, if the clock isn't about to run out anyway.
  if (!player.bot && !game.pendingTalk && !game.card && (!hand.deadline || hand.deadline - ctx.now > TIMING.tankJab + 3000)) {
    const bots = game.players.filter((p) => p.bot && !p.sittingOut && hand.seats.some((s) => s.playerId === p.id));
    if (bots.length) game.pendingTalk = { at: ctx.now + TIMING.tankJab, playerId: bots[Math.floor(ctx.rng() * bots.length)].id, event: 'tank', forId: player.id, seq: hand.seq };
  }
  schedule(game);
}

/** The biggest bet on a street, where nobody matched all of it, gets the unmatched part back. */
function returnUncalled(game: Game): void {
  const hand = game.hand!;
  const sorted = [...hand.seats].sort((a, b) => b.bet - a.bet);
  const [top, second] = sorted;
  const extra = top.bet - (second?.bet ?? 0);
  if (extra <= 0) return;
  top.bet -= extra;
  top.total -= extra;
  const player = playerById(game, top.playerId);
  if (player) player.stack += extra;
  log(game, `Uncalled ${n0(extra)} returned to ${nameOf(game, top.playerId)}`);
  if (top.allIn && player && player.stack > 0) top.allIn = false;
}

const NEXT_STREET: Record<Street, Street | null> = { preflop: 'flop', flop: 'turn', turn: 'river', river: null };

function dealStreet(game: Game, hand: Hand, rng: () => number): void {
  const next = NEXT_STREET[hand.street]!;
  const variant = variantOf(game);
  // Crazy Pineapple: anyone who still has three cards when the turn comes (all in, out of time) keeps their best two.
  if (next === 'turn') for (const s of hand.seats) if (!s.folded && s.cards.length > 2) throwAway(game, s, null);
  hand.deck.shift(); // burn
  const count = streetCards(variant, next as 'flop' | 'turn' | 'river');
  for (let i = 0; i < count; i++) hand.board.push(hand.deck.shift()!);
  hand.street = next;
  const label = next === 'flop' ? 'Flop' : next === 'turn' ? 'Turn' : 'River';
  // Like Poker Now: the new card on its own after the ones already out.
  hand.log.push(
    next === 'flop'
      ? `${label}: ${cardsText(hand.board)}`
      : `${label}: ${cardsText(hand.board.slice(0, -count))} ${cardsText(hand.board.slice(-count))}`,
  );
  if (next !== 'river') return;
  if (variant === 'dice') {
    // Die on the River: a 1 to 5 swaps that board card (from the left) for a fresh one; a 6 leaves it.
    const roll = 1 + Math.floor(rng() * 6);
    if (roll <= 5 && hand.deck.length) {
      const out = hand.board[roll - 1];
      const fresh = hand.deck.shift()!;
      hand.board[roll - 1] = fresh;
      hand.dice = { roll, out, in: fresh };
      hand.log.push(`The die rolls a ${roll}: ${cardsText([out])} is replaced by ${cardsText([fresh])}`);
    } else {
      hand.dice = { roll };
      hand.log.push(`The die rolls a ${roll}: the board stays`);
    }
  } else if (variant === 'redriver') {
    // Red River: while the last card is red, another one comes.
    while (isRed(hand.board[hand.board.length - 1]) && hand.deck.length) {
      hand.board.push(hand.deck.shift()!);
      hand.log.push(`Red river, another card: ${cardsText(hand.board.slice(-1))}`);
    }
  }
}

function endStreet(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  returnUncalled(game);
  hand.toAct = null;
  hand.deadline = null;
  hand.actAt = null;

  if (hand.street === 'river') {
    showdown(game, ctx);
    return;
  }

  for (const s of hand.seats) {
    s.bet = 0;
    s.acted = false;
  }
  hand.currentBet = 0;
  hand.minRaise = game.settings.bigBlind;
  hand.aggressorId = null;

  const live = hand.seats.filter(isLive);
  if (live.length <= 1) {
    // No more betting possible: everyone still in turns their cards over and the board runs out.
    hand.runout = true;
    hand.ranOut = true;
    for (const s of hand.seats) {
      if (s.folded) continue;
      s.shown = true;
      log(game, `${nameOf(game, s.playerId)} shows ${cardsText(s.cards)}`);
    }
    hand.actAt = ctx.now + (botsOnly(game) ? TIMING.fastRunout : TIMING.runoutStep);
    schedule(game);
    return;
  }

  // Crazy Pineapple: after the flop betting everyone still in throws a card away. Bots do it at once.
  if (hand.street === 'flop' && hand.seats.some((s) => !s.folded && s.cards.length > 2)) {
    for (const s of hand.seats) if (!s.folded && s.cards.length > 2 && playerById(game, s.playerId)?.bot) throwAway(game, s, null);
    if (pendingDiscards(game).length) {
      hand.discarding = true;
      hand.toAct = null;
      hand.deadline = game.settings.turnSeconds > 0 ? ctx.now + game.settings.turnSeconds * 1000 : null;
      hand.actAt = hand.deadline;
      schedule(game);
      return;
    }
  }
  pauseBeforeNextStreet(game, ctx);
}

/** A beat before the next card, so the last move is seen first and nobody's cards land mid-thought. */
function pauseBeforeNextStreet(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  hand.toAct = null;
  hand.deadline = null;
  hand.nextStreetAt = ctx.now + (botsOnly(game) ? TIMING.fastStreet : TIMING.streetPause);
  hand.actAt = hand.nextStreetAt;
  schedule(game);
}

// ── Crazy Pineapple discards ────────────────────────────────────────────────

/** Seats still holding three cards while the table waits for discards. */
export function pendingDiscards(game: Game): Seat[] {
  return game.hand?.seats.filter((s) => !s.folded && s.cards.length > 2) ?? [];
}

/** Throws one card away: the one given, or (null) the one that leaves the best two. */
function throwAway(game: Game, seat: Seat, card: Card | null): void {
  const keep = card ? seat.cards.filter((c) => c !== card) : keepTwo(seat.cards, game.hand!.board.slice(0, 3));
  seat.cards = keep;
  log(game, `${nameOf(game, seat.playerId)} throws a card away`);
}

/** A player throws a card away after the flop. Returns an error message, or null. */
export function discardCard(game: Game, playerId: string, card: Card, ctx: ActionContext): string | null {
  const hand = game.hand;
  const seat = hand?.seats.find((s) => s.playerId === playerId);
  if (!hand?.discarding || !seat || seat.folded || seat.cards.length < 3) return "There's nothing to throw away now.";
  if (!seat.cards.includes(card)) return "That's not one of your cards.";
  throwAway(game, seat, card);
  hand.seq += 1;
  if (!pendingDiscards(game).length) endDiscards(game, ctx);
  else schedule(game);
  return null;
}

/** Time's up (or everyone's done): the rest keep their best two and the turn comes. */
export function endDiscards(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  for (const s of pendingDiscards(game)) throwAway(game, s, null);
  hand.discarding = false;
  pauseBeforeNextStreet(game, ctx);
}

/** The pause is over: deal the next street and start its betting. */
export function dealNextStreet(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  hand.nextStreetAt = null;
  dealStreet(game, hand, ctx.rng);
  const button = indexOf(hand, hand.buttonId);
  // After the flop the first player still in, left of the button, acts first.
  const first = nextIndex(hand, button === -1 ? hand.seats.length - 1 : button, isLive);
  setTurn(game, first, ctx);
}

/** One card of an all-in run-out, or the showdown once the river is out. */
export function runoutStep(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  if (hand.street === 'river') {
    showdown(game, ctx);
    return;
  }
  dealStreet(game, hand, ctx.rng);
  hand.actAt = ctx.now + (botsOnly(game) ? TIMING.fastRunout : TIMING.runoutStep);
  schedule(game);
}

/** Splits the chips into the main pot and side pots by how much each player put in. */
export function buildPots(seats: Seat[]): PotResult[] {
  const levels = [...new Set(seats.filter((s) => !s.folded && s.total > 0).map((s) => s.total))].sort((a, b) => a - b);
  const pots: PotResult[] = [];
  let prev = 0;
  for (const level of levels) {
    const amount = seats.reduce((sum, s) => sum + Math.max(0, Math.min(s.total, level) - prev), 0);
    const eligible = seats.filter((s) => !s.folded && s.total >= level).map((s) => s.playerId);
    const last = pots[pots.length - 1];
    // Same players in both: one pot, not two.
    if (last && last.eligible.length === eligible.length) last.amount += amount;
    else pots.push({ amount, eligible, winners: [] });
    prev = level;
  }
  // Chips from folded players above the biggest live total (rare) go in the last pot.
  const leftover = seats.reduce((sum, s) => sum + Math.max(0, s.total - prev), 0);
  if (leftover && pots.length) pots[pots.length - 1].amount += leftover;
  return pots.filter((p) => p.amount > 0);
}

function showdown(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  hand.toAct = null;
  hand.actAt = null;
  hand.deadline = null;
  // Imposter: the hand isn't decided by the cards but by the vote.
  if (hand.imposter) {
    if (!hand.votes) startVote(game, ctx);
    else imposterShowdown(game, ctx);
    return;
  }
  const n = hand.seats.length;
  const button = Math.max(0, indexOf(hand, hand.buttonId));
  const variant: Variant = variantOf(game);
  const values = new Map(hand.seats.filter((s) => !s.folded).map((s) => [s.playerId, bestHand(variant, s.cards, hand.board)]));

  const pots = buildPots(hand.seats);
  // Ghost Hold'em: what the ghost was holding goes in the main pot (everyone still in can win it).
  if (hand.carry && pots.length) pots[0].amount += hand.carry;
  const ghost = hand.ghost ? bestHand(variant, hand.ghost, hand.board) : null;
  let kept = 0;
  const won: Record<string, number> = {};
  for (const pot of pots) {
    const best = Math.max(...pot.eligible.map((id) => values.get(id)!.score));
    // The winner has to beat the ghost too. If they can't (a tie isn't enough), the ghost keeps this pot for the next hand.
    if (ghost && best <= ghost.score) {
      kept += pot.amount;
      pot.winners = [];
      continue;
    }
    pot.winners = pot.eligible.filter((id) => values.get(id)!.score === best);
    const share = Math.floor(pot.amount / pot.winners.length);
    let odd = pot.amount - share * pot.winners.length;
    // Odd chips go to the winners closest to the left of the button.
    for (let i = 1; i <= n; i++) {
      const id = hand.seats[(button + i) % n].playerId;
      if (!pot.winners.includes(id)) continue;
      won[id] = (won[id] ?? 0) + share + (odd > 0 ? 1 : 0);
      if (odd > 0) odd--;
    }
  }

  // Showing down: the last bettor on the river shows first (or the first player left of the button).
  // After that, a hand is shown only if it beats or ties the best one so far, or wins something.
  // A player who's all in always shows (as at a real table), even if they lost. The rest are mucked.
  const start = hand.aggressorId ? indexOf(hand, hand.aggressorId) : nextIndex(hand, button, (s) => !s.folded);
  const names: Record<string, string> = {};
  let bestShown = -1;
  for (let i = 0; i < n; i++) {
    const seat = hand.seats[(start + i) % n];
    if (seat.folded) continue;
    const v = values.get(seat.playerId)!;
    if (seat.shown || seat.allIn || v.score >= bestShown || won[seat.playerId]) {
      if (!seat.shown || hand.runout) log(game, `${nameOf(game, seat.playerId)} shows ${cardsText(seat.cards)} (${v.detail})`);
      seat.shown = true;
      names[seat.playerId] = v.detail;
      bestShown = Math.max(bestShown, v.score);
    } else {
      log(game, `${nameOf(game, seat.playerId)} mucks`);
    }
  }

  for (const [id, chips] of Object.entries(won)) {
    const p = playerById(game, id);
    if (p) p.stack += chips;
  }
  if (ghost) {
    log(game, `The ghost shows ${cardsText(hand.ghost!)} (${ghost.detail})`);
    if (kept) log(game, `Nobody beats the ghost: it keeps ${n0(kept)} for the next hand`);
    game.ghostPot = (game.ghostPot ?? 0) + kept;
  }
  pots.forEach((pot, i) => {
    if (!pot.winners.length) return;
    const which = pots.length > 1 ? (i === 0 ? ' from the main pot' : ' from a side pot') : '';
    const each = Math.floor(pot.amount / pot.winners.length);
    for (const id of pot.winners)
      log(
        game,
        `${nameOf(game, id)} wins ${n0(each)}${which}${names[id] ? ` with ${names[id].charAt(0).toLowerCase()}${names[id].slice(1)}` : ''}`,
      );
  });
  hand.result = { pots, won, names, showdown: true, ...(ghost ? { ghost: { cards: hand.ghost!, name: ghost.detail, kept } } : {}) };
  finishHand(game, ctx, TIMING.afterShowdown);
}

// ── Imposter ────────────────────────────────────────────────────────────────

/** Players who still have to vote: everyone dealt in who's still at the table. */
export function pendingVoters(game: Game): Seat[] {
  const hand = game.hand;
  if (!hand?.voting) return [];
  return hand.seats.filter((s) => {
    const p = playerById(game, s.playerId);
    return p && !p.leaving && !hand.votes?.[s.playerId];
  });
}

/** After the river: everyone dealt in votes for who they think the imposter is. Bots vote straight away. */
function startVote(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  hand.votes = {};
  hand.voting = true;
  log(game, 'Time to vote: who is the imposter?');
  for (const s of pendingVoters(game)) {
    if (!playerById(game, s.playerId)?.bot) continue;
    const pick = botVote(hand, s.playerId);
    if (pick) hand.votes[s.playerId] = pick;
  }
  if (!pendingVoters(game).length) {
    endVote(game, ctx);
    return;
  }
  hand.deadline = game.settings.turnSeconds > 0 ? ctx.now + game.settings.turnSeconds * 1000 : null;
  hand.actAt = hand.deadline;
  schedule(game);
}

/** A player's vote. Returns an error message, or null. */
export function castVote(game: Game, voterId: string, suspectId: string, ctx: ActionContext): string | null {
  const hand = game.hand;
  if (!hand?.voting || !hand.votes) return "There's no vote on.";
  if (!hand.seats.some((s) => s.playerId === voterId)) return "You weren't dealt in.";
  if (hand.votes[voterId]) return "You've already voted.";
  if (suspectId === voterId || !hand.seats.some((s) => s.playerId === suspectId)) return "You can't vote for them.";
  hand.votes[voterId] = suspectId;
  log(game, `${nameOf(game, voterId)} votes`);
  hand.seq += 1;
  if (!pendingVoters(game).length) endVote(game, ctx);
  else schedule(game);
  return null;
}

/** Everyone has voted (or time's up): count the votes and settle the pot. */
export function endVote(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  hand.voting = false;
  hand.deadline = null;
  hand.actAt = null;
  imposterShowdown(game, ctx);
}

/** Pays one pot out evenly to its winners; odd chips go to the winners closest to the left of the button. */
function splitPot(hand: Hand, pot: PotResult, won: Record<string, number>): void {
  const n = hand.seats.length;
  const button = Math.max(0, indexOf(hand, hand.buttonId));
  const share = Math.floor(pot.amount / pot.winners.length);
  let odd = pot.amount - share * pot.winners.length;
  for (let i = 1; i <= n; i++) {
    const id = hand.seats[(button + i) % n].playerId;
    if (!pot.winners.includes(id)) continue;
    won[id] = (won[id] ?? 0) + share + (odd > 0 ? 1 : 0);
    if (odd > 0) odd--;
  }
}

/**
 * The most votes on the imposter (and no tie): the innocents still in split the pot. Otherwise the imposter takes it.
 * If the imposter folded, the innocents still in split it either way.
 */
function imposterShowdown(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  const imp = hand.imposter!;
  const votes = hand.votes ?? {};
  const tally = new Map<string, number>();
  for (const suspect of Object.values(votes)) tally.set(suspect, (tally.get(suspect) ?? 0) + 1);
  const top = Math.max(0, ...tally.values());
  const leaders = [...tally].filter(([, n]) => n === top).map(([id]) => id);
  const caught = top > 0 && leaders.length === 1 && leaders[0] === imp;
  const live = hand.seats.filter((s) => !s.folded).map((s) => s.playerId);
  const innocents = live.filter((id) => id !== imp);
  const impIn = live.includes(imp);
  const winners = !impIn || caught ? innocents : [imp];

  const pots = buildPots(hand.seats);
  if (hand.carry && pots.length) pots[0].amount += hand.carry;
  const won: Record<string, number> = {};
  for (const pot of pots) {
    // A side pot the winners can't win goes to whoever can.
    const mine = pot.eligible.filter((id) => winners.includes(id));
    pot.winners = mine.length ? mine : pot.eligible;
    splitPot(hand, pot, won);
  }
  const names: Record<string, string> = {};
  for (const s of hand.seats) {
    if (s.folded) continue;
    s.shown = true;
    names[s.playerId] = s.playerId === imp ? 'The imposter' : 'Innocent';
  }
  log(game, `The imposter was ${nameOf(game, imp)} with ${cardsText(hand.seats.find((s) => s.playerId === imp)!.cards)}`);
  log(game, caught ? 'The innocents found the imposter!' : impIn ? `${nameOf(game, imp)} got away with it` : 'The imposter folded');
  for (const [id, chips] of Object.entries(won)) {
    const p = playerById(game, id);
    if (p) p.stack += chips;
    log(game, `${nameOf(game, id)} wins ${n0(chips)}`);
  }
  hand.result = { pots, won, names, showdown: true, imposter: { id: imp, votes, caught } };
  finishHand(game, ctx, TIMING.afterShowdown);
}

function winWithoutShowdown(game: Game, ctx: ActionContext): void {
  const hand = game.hand!;
  returnUncalled(game);
  const winner = hand.seats.find((s) => !s.folded)!;
  const amount = potTotal(hand);
  const player = playerById(game, winner.playerId);
  if (player) player.stack += amount;
  hand.toAct = null;
  hand.actAt = null;
  hand.deadline = null;
  hand.result = {
    pots: [{ amount, eligible: [winner.playerId], winners: [winner.playerId] }],
    won: { [winner.playerId]: amount },
    names: {},
    showdown: false,
  };
  log(game, `${nameOf(game, winner.playerId)} wins ${n0(amount)}`);
  finishHand(game, ctx, TIMING.afterFold);
}

function finishHand(game: Game, ctx: ActionContext, usualPause: number): void {
  const hand = game.hand!;
  const pause = botsOnly(game) ? Math.round(usualPause * TIMING.fastAfter) : usualPause;
  for (const s of hand.seats) s.bet = 0;
  hand.runout = false;
  if (hand.board.length) log(game, `Board: ${cardsText(hand.board)}`);
  game.logs = [
    ...(game.logs ?? []),
    {
      number: hand.number,
      lines: hand.log,
      holes: Object.fromEntries(hand.seats.map((s) => [s.playerId, s.cards])),
      shown: hand.seats.filter((s) => s.shown).map((s) => s.playerId),
      record: handRecord(game, hand, ctx.now) ?? undefined,
    },
  ].slice(-MAX_LOGS);
  // A Scroll card is one hand: the table just waits there for the result.
  if (game.card) {
    game.ready = [];
    game.nextHandAt = null;
    schedule(game);
    return;
  }
  // Where the game ends at once, it's over once one player has all the chips (or only bots have any).
  // The table stays up for a few seconds first, so the hand that decided it can be seen.
  if (endsAtOnce(game) && lastStanding(game)) {
    game.ready = [];
    game.nextHandAt = ctx.now + TIMING.endPause;
    schedule(game);
    return;
  }
  game.ready = [];
  // One player left with chips: the others get a short window to rebuy, then the game ends.
  // A campaign cash table where the person still has chips fills its empty seats with new bots instead.
  const refills = game.campaign?.kind === 'cash' && game.players.some((p) => !p.bot && p.stack > 0);
  game.nextHandAt = lastStanding(game) && !refills ? ctx.now + TIMING.rebuyWindow : canDeal(game) || refills ? ctx.now + pause : null;
  schedule(game);
}

/** Works out when the server next needs to wake up. */
export function schedule(game: Game): void {
  const hand = game.hand;
  if (game.status !== 'playing') game.wakeAt = null;
  else if (hand && !hand.result) game.wakeAt = hand.actAt;
  else game.wakeAt = game.nextHandAt;
  if (game.status === 'playing' && game.emptyAt && (game.wakeAt === null || game.emptyAt < game.wakeAt)) game.wakeAt = game.emptyAt;
  // A bot's reply that's due before anything else.
  if (game.status === 'playing' && game.pendingTalk && (game.wakeAt === null || game.pendingTalk.at < game.wakeAt)) game.wakeAt = game.pendingTalk.at;
}
