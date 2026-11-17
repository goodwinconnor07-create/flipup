// What a phone's Live Activity shows (the Lock Screen and the Dynamic Island) for an online table: your cards, the
// board, the pot, and above all whether it's your turn. One shape, built here for the server (which pushes it to
// each phone through Apple's push service) and for the phone itself (which shows the first one and keeps it fresh
// while it's open). The Swift side decodes exactly these fields: `TableActivityAttributes.ContentState` in
// native/modules/flipup-live and native/targets/live. Change all three together.
//
// It is always worked out from `redactForDevice()`'s view, so it can only hold what that phone may see.

import { TIMING } from './holdem';
import { visibleBoard } from './moments';
import { redactForDevice } from './redact';
import { options, standings } from './selectors';
import { finishOrder } from './party';
import { bestHand, variantInfo } from './variants';
import type { Game } from './types';

export type LivePhase =
  /** The table hasn't been dealt yet. */
  | 'lobby'
  /** Someone else is acting, or the next card or hand is on its way. */
  | 'waiting'
  /** Your move. */
  | 'turn'
  /** You folded this hand. */
  | 'folded'
  /** Not dealt into this hand (sitting out, or joined mid-hand). */
  | 'out'
  /** The hand is over: you won chips, lost chips, or got your own back. */
  | 'won'
  | 'lost'
  | 'even'
  /** The game is over. */
  | 'ended';

export interface LiveState {
  phase: LivePhase;
  /** Hand number at the table (0 before the first deal). */
  hand: number;
  /** Your hole cards ("As", "Kh"), face up. Empty when you hold none. */
  cards: string[];
  /** The board cards that have landed so far. */
  board: string[];
  /** Your best hand with the board ("Pair of kings"), or "" before the flop. */
  handName: string;
  /** Everything in the middle, in big blinds. */
  pot: number;
  /** What you need to put in to call, in big blinds (0 when you can check). */
  toCall: number;
  canCheck: boolean;
  /** Your turn's clock, in seconds since 1970: when it started and when it runs out. Null with no clock. */
  turnStart: number | null;
  turnEnd: number | null;
  /** The status line: "Mia is thinking", "Two pair took it", "Game over · 2nd of 6". */
  line: string;
  /** This hand's result for you in big blinds (+ up, - down). 0 until it's over. */
  net: number;
  /** Your chips, in big blinds. */
  stack: number;
  /** When the game is over: your place and out of how many. 0 before then. */
  place: number;
  of: number;
  /** A party round: "Round 3 of 6". Otherwise "". */
  round: string;
  /** The move counter of the hand, so a tap on Check is only taken for the turn it was shown on. */
  seq: number;
  /** A per-phone key that lets this Live Activity's Check button act for its seat (set by the server, never a device id). */
  act: string;
}

/** The fixed details of one table's Live Activity (they don't change while it runs). */
export interface LiveAttributes {
  code: string;
  game: string;
  emoji: string;
}

/** Rounds to one decimal place, so "12.5 bb" stays exact and long fractions don't fill the screen. */
const bb = (chips: number, bigBlind: number): number => Math.round((chips / Math.max(1, bigBlind)) * 10) / 10;

/** Writes a big blind amount the way the activity shows it: "12 bb", "2.5 bb". */
export function bbWords(n: number): string {
  return `${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 1 })} bb`;
}

/** "1st", "2nd", "3rd", "4th"... */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

export function liveAttributes(game: Game): LiveAttributes {
  const info = variantInfo(game.settings.variant);
  return { code: game.code ?? '', game: info.name, emoji: info.emoji };
}

/**
 * This phone's Live Activity for the table, or null when it has no seat there. `now` is the table's time (online
 * tables run on real time). `act` is the Check button's key, when the server has one for this phone.
 */
export function liveState(full: Game, deviceId: string, now: number, act = ''): LiveState | null {
  const game = redactForDevice(full, deviceId);
  const me = game.players.find((p) => p.deviceId === deviceId);
  if (!me) return null;
  const big = game.settings.bigBlind;
  const hand = game.hand;
  const base: LiveState = {
    phase: 'waiting',
    hand: hand?.number ?? 0,
    cards: [],
    board: [],
    handName: '',
    pot: 0,
    toCall: 0,
    canCheck: false,
    turnStart: null,
    turnEnd: null,
    line: '',
    net: 0,
    stack: bb(me.stack, big),
    place: 0,
    of: 0,
    round: game.party ? `Round ${game.party.round} of ${game.party.total}` : '',
    seq: hand?.seq ?? 0,
    act,
  };

  if (game.status === 'lobby') return { ...base, phase: 'lobby', line: 'Waiting for the deal' };

  if (game.status === 'ended') {
    const order = game.party ? finishOrder(game) : standings(game);
    const place = order.findIndex((p) => p.id === me.id) + 1;
    const up = me.stack - me.bought;
    const result = up === 0 ? 'even' : `${up > 0 ? 'up' : 'down'} ${bbWords(bb(up, big))}`;
    return { ...base, phase: 'ended', place, of: order.length, net: bb(up, big), line: `Game over · ${ordinal(place)} of ${order.length} · ${result}` };
  }

  if (!hand) return { ...base, line: 'Next hand soon' };

  const seat = hand.seats.find((s) => s.playerId === me.id);
  const board = visibleBoard(hand, now).filter((c): c is string => !!c);
  const pot = bb(hand.seats.reduce((sum, s) => sum + s.total, 0) + (hand.carry ?? 0), big);
  const named = (id: string | null | undefined) => game.players.find((p) => p.id === id)?.name ?? 'Someone';
  const withBoard = { ...base, board, pot };

  if (!seat || seat.cards.length === 0) {
    return { ...withBoard, phase: 'out', line: hand.result ? 'Hand over' : 'Sitting this hand out' };
  }

  const cards = [...seat.cards];
  const handName = board.length >= 3 ? bestHand(hand.variant ?? 'holdem', cards, board).detail : '';
  const mine = { ...withBoard, cards, handName };

  if (hand.result) {
    const back = hand.result.won[me.id] ?? 0;
    const net = bb(back - seat.total, big);
    const winners = [...new Set(hand.result.pots.flatMap((p) => p.winners))].filter((id) => id !== me.id);
    // The pill beside the line shows the amount, so the line says how it happened rather than repeating it.
    const made = hand.result.showdown ? hand.result.names[me.id] : '';
    if (net > 0) return { ...mine, phase: 'won', net, line: made ? `${made[0].toUpperCase()}${made.slice(1)} took it` : 'Everyone folded to you' };
    const taker = winners.length ? `${named(winners[0])} took the pot` : 'Hand over';
    if (seat.folded) return { ...mine, phase: 'folded', net, line: `You folded · ${taker}` };
    if (net < 0) return { ...mine, phase: 'lost', net, line: taker };
    return { ...mine, phase: 'even', net, line: 'Split pot · your chips back' };
  }

  if (seat.folded) {
    const acting = hand.toAct ? `${named(hand.toAct)} is thinking` : 'Hand still going';
    return { ...mine, phase: 'folded', line: `You folded · ${acting}` };
  }

  if (hand.toAct === me.id && !hand.runout) {
    const o = options(game, hand, seat);
    const clock = hand.deadline ?? null;
    // The turn's full length, so the bar drains from where it started (and stays the same on every push of the turn).
    // A phone that's away from the table (the app closed) gets the shorter offline clock.
    const full = game.settings.turnSeconds * 1000;
    const length = me.offline ? Math.min(full, TIMING.offlineClock) : full;
    const start = clock !== null && length > 0 ? clock - length : null;
    const owe = bb(o.toCall, big);
    return {
      ...mine,
      phase: 'turn',
      toCall: owe,
      canCheck: o.canCheck,
      turnStart: start === null ? null : Math.floor(start / 1000),
      turnEnd: clock === null ? null : Math.floor(clock / 1000),
      line: o.canCheck ? 'Your turn · check or bet' : `Your turn · ${bbWords(owe)} to call`,
    };
  }

  if (hand.runout) return { ...mine, line: 'All in · running it out' };
  if (hand.discarding) return { ...mine, line: 'Throwing a card away' };
  if (hand.toAct) return { ...mine, line: `${named(hand.toAct)} is thinking` };
  return { ...mine, line: board.length < 3 ? 'The flop is coming' : 'Next card coming' };
}

/**
 * How urgent an update is to Apple's push service. 10 shows at once and lights the Dynamic Island: your turn
 * starting, a hand you were in ending, the game ending. Everything else (a bet, a card) is 5, which Apple may batch.
 */
export function livePriority(prev: LiveState | null, next: LiveState): 5 | 10 {
  if (next.phase === 'turn' && (prev?.phase !== 'turn' || prev.hand !== next.hand || prev.seq !== next.seq)) return 10;
  if (next.phase !== prev?.phase && (next.phase === 'won' || next.phase === 'lost' || next.phase === 'even' || next.phase === 'ended')) return 10;
  return 5;
}

/** Your turn just started: the update also lights up the island with a short alert, like a notification would. */
export function liveAlert(prev: LiveState | null, next: LiveState, attrs: LiveAttributes): { title: string; body: string } | null {
  if (next.phase !== 'turn' || (prev?.phase === 'turn' && prev.hand === next.hand && prev.seq === next.seq)) return null;
  return { title: `Your turn · ${attrs.game}`, body: next.canCheck ? 'Check or bet' : `${bbWords(next.toCall)} to call · pot ${bbWords(next.pot)}` };
}
