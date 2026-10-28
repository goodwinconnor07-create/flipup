// Read-only questions about a table, shared by the screens and the bots.

import { canRaise, maxRaiseTo, playerById, potTotal } from './holdem';
import type { Game, Hand, Player, Seat } from './types';

export interface Options {
  toCall: number;
  canCheck: boolean;
  /** Calling would put them all in. */
  callIsAllIn: boolean;
  canRaise: boolean;
  /** Smallest and largest "raise to" (or "bet") amounts. */
  minTo: number;
  maxTo: number;
  /** Bet (nothing to match yet) or raise. */
  word: 'Bet' | 'Raise';
  /** False in Imposter, where nobody folds. */
  canFold: boolean;
}

/** What the player whose turn it is can do. */
export function options(game: Game, hand: Hand, seat: Seat): Options {
  const player = playerById(game, seat.playerId);
  const stack = player?.stack ?? 0;
  const toCall = Math.max(0, hand.currentBet - seat.bet);
  // Everything they have, or at a pot-limit table no more than the pot.
  const maxTo = maxRaiseTo(game, hand, seat, stack);
  const minTo = Math.min(maxTo, hand.currentBet + hand.minRaise);
  return {
    toCall: Math.min(toCall, stack),
    canCheck: toCall === 0,
    callIsAllIn: toCall >= stack,
    canRaise: canRaise(hand, seat) && maxTo > hand.currentBet,
    minTo,
    maxTo,
    word: hand.currentBet > 0 ? 'Raise' : 'Bet',
    canFold: !hand.imposter,
  };
}

export interface Position {
  /** "BTN", "SB", "BB", "UTG", "HJ", "CO"... */
  label: string;
  kind: 'btn' | 'sb' | 'bb' | 'other';
}

/** Names for the seats after the big blind, by how many there are (nearest the big blind first, ending at the cutoff). */
const MIDDLE: string[][] = [
  [],
  ['CO'],
  ['HJ', 'CO'],
  ['UTG', 'HJ', 'CO'],
  ['UTG', 'LJ', 'HJ', 'CO'],
  ['UTG', 'MP', 'LJ', 'HJ', 'CO'],
  ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'],
];

/** A player's position this hand, counted from the dealer button: BTN, SB, BB, then UTG up to the cutoff. */
export function positionOf(hand: Hand | null, playerId: string): Position | null {
  if (!hand) return null;
  const n = hand.seats.length;
  const at = hand.seats.findIndex((s) => s.playerId === playerId);
  const button = hand.seats.findIndex((s) => s.playerId === hand.buttonId);
  if (at < 0 || button < 0) return null;
  const offset = (at - button + n) % n;
  // Heads up the button is also the small blind.
  if (n === 2) return offset === 0 ? { label: 'B/SB', kind: 'btn' } : { label: 'BB', kind: 'bb' };
  if (offset === 0) return { label: 'BTN', kind: 'btn' };
  if (offset === 1) return { label: 'SB', kind: 'sb' };
  if (offset === 2) return { label: 'BB', kind: 'bb' };
  return { label: MIDDLE[Math.min(n - 3, MIDDLE.length - 1)][offset - 3] ?? 'MP', kind: 'other' };
}

export function seatFor(hand: Hand | null, playerId: string | undefined): Seat | undefined {
  return hand && playerId ? hand.seats.find((s) => s.playerId === playerId) : undefined;
}

/** The player this phone plays, if it has a seat. */
export function myPlayer(game: Game, deviceId: string): Player | undefined {
  return game.players.find((p) => p.deviceId === deviceId);
}

export function isHost(game: Game, deviceId: string): boolean {
  return game.hostDeviceId === deviceId;
}

/** Everything in the middle, including bets on this street. */
export function pot(hand: Hand): number {
  return potTotal(hand);
}

/** Up or down on the night: chips now minus everything bought in for. */
export function net(player: Player): number {
  return player.stack - player.bought;
}

/** Best first. */
export function standings(game: Game): Player[] {
  return [...game.players].sort((a, b) => net(b) - net(a) || b.stack - a.stack);
}

/** A hand is being played right now. */
export function handLive(game: Game): boolean {
  return game.status === 'playing' && !!game.hand && !game.hand.result;
}
