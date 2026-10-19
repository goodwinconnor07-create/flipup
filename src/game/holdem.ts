// No-limit Texas Hold'em: dealing, blinds, betting rounds, side pots and the showdown.
// Everything here works on a copy of the game that applyAction() already made, so it changes it in place.

import { handRecord } from './record';
import { fullDeck, shuffle, type Card } from './cards';
import { describeHand } from './evaluate';
import type { ActionContext, Game, Hand, Move, Player, PotResult, Seat, Street } from './types';

export const TIMING = {
  /** Bots wait a moment, like they're thinking. */
  botMin: 900,
  botMax: 2000,
  /** Gap between cards on an all-in run-out, so the odds can be read. */
  runoutStep: 2200,
  /** Pause after a hand before the next one deals (unless everyone taps Next hand). */
  afterFold: 5000,
  afterShowdown: 9000,
  /** Someone joined or came back: give the table a beat before dealing. */
  resume: 2000,
  /** One player has all the chips: this long for the others to rebuy before the game ends. */
  rebuyWindow: 20000,
  /** Without rebuys: how long the deciding hand stays on screen before the winner's page. */
  endPause: 7000,
};

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
  return hand.seats.reduce((sum, s) => sum + s.total, 0);
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

/** The steps the blinds climb through when they go up. */
export const BLIND_LADDER: [number, number][] = [
  [1, 2],
  [2, 4],
  [5, 10],
  [10, 20],
  [15, 30],
  [25, 50],
  [50, 100],
  [75, 150],
  [100, 200],
  [150, 300],
  [200, 400],
  [300, 600],
  [500, 1000],
];

/**
 * Rising blinds: when the clock has run out, the blinds step up the ladder as the next hand is dealt
 * (never mid-hand). They stop at the top of the ladder, or when the big blind would be over half a starting stack.
 * Returns true if they went up.
 */
function raiseBlindsIfDue(game: Game, now: number): boolean {
  const minutes = game.settings.blindMinutes ?? 0;
  if (!minutes) {
    game.blindsRaiseAt = null;
    return false;
  }
  // The clock starts with the first hand.
  if (game.blindsRaiseAt == null) {
    game.blindsRaiseAt = now + minutes * 60_000;
    return false;
  }
  if (now < game.blindsRaiseAt) return false;
  game.blindsRaiseAt = now + minutes * 60_000;
  const { bigBlind, startingStack } = game.settings;
  const next = BLIND_LADDER.find(([, bb]) => bb > bigBlind && bb <= startingStack / 2);
  if (!next) return false;
  [game.settings.smallBlind, game.settings.bigBlind] = next;
  return true;
}

/** Deals a new hand, or leaves the table waiting if there aren't enough players. */
export function startHand(game: Game, ctx: ActionContext): void {
  // Bots that ran out of chips leave now (not straight after the hand, so their cards can still be seen).
  // People stay, and can buy back in if the table allows it.
  game.players = game.players.filter((p) => !p.leaving && !(p.bot && p.stack === 0));
  game.ready = [];
  game.nextHandAt = null;
  if (!canDeal(game)) {
    // Nobody rebought in time: the last player with chips wins.
    if (game.hand && lastStanding(game)) game.status = 'ended';
    schedule(game);
    return;
  }
  const players = dealable(game);
  const raised = raiseBlindsIfDue(game, ctx.now);

  // The button moves one seat clockwise to the next player who's in. The first one is random,
  // like drawing for the button.
  let button: Player;
  if (game.buttonSeat === null) button = players[Math.floor(ctx.rng() * players.length)];
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

  const deck = shuffle(fullDeck(), ctx.rng);
  // Two rounds of one card each, starting left of the button.
  for (let round = 0; round < 2; round++) for (let i = 1; i <= n; i++) seats[(b + i) % n].cards.push(deck.shift()!);

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
  };
  game.hand = hand;
  game.hands = (game.hands ?? 0) + 1;
  log(game, `-- Hand #${hand.number} (dealer: ${button.name}) --`);
  if (raised) log(game, `Blinds go up to ${n0(game.settings.smallBlind)}/${n0(game.settings.bigBlind)}`);
  log(game, `Stacks: ${players.map((p) => `${p.name} ${n0(p.stack)}`).join(' · ')}`);

  put(seats[sb], players[sb], game.settings.smallBlind);
  seats[sb].last = { move: 'sb', amount: seats[sb].bet, street: 'preflop' };
  log(game, `${players[sb].name} posts the small blind ${n0(seats[sb].bet)}`);
  put(seats[bb], players[bb], game.settings.bigBlind);
  seats[bb].last = { move: 'bb', amount: seats[bb].bet, street: 'preflop' };
  log(game, `${players[bb].name} posts the big blind ${n0(seats[bb].bet)}`);

  continueFrom(game, bb, ctx);
}

// ── Moves ───────────────────────────────────────────────────────────────────

/** Applies a move for the seat whose turn it is. Returns an error message, or null if it worked. */
export function makeMove(game: Game, move: Move, to: number | undefined, ctx: ActionContext): string | null {
  const hand = game.hand!;
  const idx = indexOf(hand, hand.toAct!);
  const seat = hand.seats[idx];
  const player = playerById(game, seat.playerId)!;
  const toCall = hand.currentBet - seat.bet;

  if (move === 'allin') {
    const all = seat.bet + player.stack;
    if (all <= hand.currentBet || !canRaise(hand, seat)) move = toCall > 0 ? 'call' : 'check';
    else {
      move = hand.currentBet > 0 ? 'raise' : 'bet';
      to = all;
    }
  }

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
      const max = seat.bet + player.stack;
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
    hand.actAt = ctx.now + TIMING.botMin + Math.floor(ctx.rng() * (TIMING.botMax - TIMING.botMin));
  } else if (game.settings.turnSeconds > 0) {
    hand.deadline = ctx.now + game.settings.turnSeconds * 1000;
    hand.actAt = hand.deadline;
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

function dealStreet(hand: Hand): void {
  const next = NEXT_STREET[hand.street]!;
  hand.deck.shift(); // burn
  const count = next === 'flop' ? 3 : 1;
  for (let i = 0; i < count; i++) hand.board.push(hand.deck.shift()!);
  hand.street = next;
  const label = next === 'flop' ? 'Flop' : next === 'turn' ? 'Turn' : 'River';
  // Like Poker Now: the new card on its own after the ones already out.
  hand.log.push(
    count === 3
      ? `${label}: ${cardsText(hand.board)}`
      : `${label}: ${cardsText(hand.board.slice(0, -1))} ${cardsText(hand.board.slice(-1))}`,
  );
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
    for (const s of hand.seats) {
      if (s.folded) continue;
      s.shown = true;
      log(game, `${nameOf(game, s.playerId)} shows ${cardsText(s.cards)}`);
    }
    hand.actAt = ctx.now + TIMING.runoutStep;
    schedule(game);
    return;
  }

  dealStreet(hand);
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
  dealStreet(hand);
  hand.actAt = ctx.now + TIMING.runoutStep;
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
  const n = hand.seats.length;
  const button = Math.max(0, indexOf(hand, hand.buttonId));
  const values = new Map(hand.seats.filter((s) => !s.folded).map((s) => [s.playerId, describeHand([...s.cards, ...hand.board])]));

  const pots = buildPots(hand.seats);
  const won: Record<string, number> = {};
  for (const pot of pots) {
    const best = Math.max(...pot.eligible.map((id) => values.get(id)!.score));
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
  // The rest are mucked.
  const start = hand.aggressorId ? indexOf(hand, hand.aggressorId) : nextIndex(hand, button, (s) => !s.folded);
  const names: Record<string, string> = {};
  let bestShown = -1;
  for (let i = 0; i < n; i++) {
    const seat = hand.seats[(start + i) % n];
    if (seat.folded) continue;
    const v = values.get(seat.playerId)!;
    if (seat.shown || v.score >= bestShown || won[seat.playerId]) {
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
  pots.forEach((pot, i) => {
    const which = pots.length > 1 ? (i === 0 ? ' from the main pot' : ' from a side pot') : '';
    const each = Math.floor(pot.amount / pot.winners.length);
    for (const id of pot.winners)
      log(
        game,
        `${nameOf(game, id)} wins ${n0(each)}${which}${names[id] ? ` with ${names[id].charAt(0).toLowerCase()}${names[id].slice(1)}` : ''}`,
      );
  });
  hand.result = { pots, won, names, showdown: true };
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

function finishHand(game: Game, ctx: ActionContext, pause: number): void {
  const hand = game.hand!;
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
  // Without rebuys the table is over once one player has all the chips (or only bots have any).
  // The table stays up for a few seconds first, so the hand that decided it can be seen.
  if (!game.settings.rebuys && lastStanding(game)) {
    game.ready = [];
    game.nextHandAt = ctx.now + TIMING.endPause;
    schedule(game);
    return;
  }
  game.ready = [];
  // One player left with chips: the others get a short window to rebuy, then the game ends.
  game.nextHandAt = lastStanding(game) ? ctx.now + TIMING.rebuyWindow : canDeal(game) ? ctx.now + pause : null;
  schedule(game);
}

/** Works out when the server next needs to wake up. */
export function schedule(game: Game): void {
  const hand = game.hand;
  if (game.status !== 'playing') game.wakeAt = null;
  else if (hand && !hand.result) game.wakeAt = hand.actAt;
  else game.wakeAt = game.nextHandAt;
}
