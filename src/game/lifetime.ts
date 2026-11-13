// How long a live game (an online table, a party, a blackjack table with friends) may stay open.
// Pure, so the Worker's rooms and the tests use the same sums. A room keeps three times: when it opened
// (`bornAt`), when a person last played (`activeAt`) and, for a party's tables, the party's own deadline.

/** A game nobody has played for this long closes. */
export const IDLE_CLOSE_MS = 30 * 60 * 1000;
/** Every game closes this long after it opened, however busy it is. */
export const MAX_LIFE_MS = 6 * 60 * 60 * 1000;
/** A party with a full 12 games may run longer. */
export const LONG_PARTY_LIFE_MS = 8 * 60 * 60 * 1000;
/** The playlist length that earns the longer limit. */
export const LONG_PARTY_GAMES = 12;

/** The longest a game may stay open: 8 hours for a party with 12 games, 6 for everything else. */
export function maxLifeMs(partyGames?: number): number {
  return partyGames !== undefined && partyGames >= LONG_PARTY_GAMES ? LONG_PARTY_LIFE_MS : MAX_LIFE_MS;
}

/** What a room remembers about its own age. */
export interface Life {
  bornAt: number;
  /** The last time a person played: a move, a seat taken, a setting changed. Never a clock tick, a bot or a connection. */
  activeAt: number;
  /** The time it must be gone by, whatever happens (a party's tables use their party's). */
  hardCloseAt: number;
}

export type CloseReason = 'idle' | 'time';

/** Why a game should close now, or null while it may stay open. The time limit wins when both are due. */
export function closeReason(life: Life, now: number): CloseReason | null {
  if (now >= life.hardCloseAt) return 'time';
  if (now >= life.activeAt + IDLE_CLOSE_MS) return 'idle';
  return null;
}

/** The moment a room should wake to close, if nothing else happens. */
export function closeAt(life: Life): number {
  return Math.min(life.hardCloseAt, life.activeAt + IDLE_CLOSE_MS);
}

/** A life that starts now. `partyGames` is the playlist length for a party; `hardCloseAt` carries a party's deadline to its tables. */
export function newLife(now: number, opts: { partyGames?: number; hardCloseAt?: number } = {}): Life {
  return { bornAt: now, activeAt: now, hardCloseAt: opts.hardCloseAt ?? now + maxLifeMs(opts.partyGames) };
}

/** Whether an action keeps a game alive: a person doing something, not the clock, a connection or a quick message. */
export function countsAsPlay(type: string, byServer: boolean): boolean {
  return !byServer && type !== 'tick' && type !== 'presence' && type !== 'react';
}

/** The words a phone is told when a game closes. */
export function closeReasonText(reason: CloseReason): string {
  return reason === 'idle' ? 'Table closed after 30 minutes of no play' : 'Table closed at its time limit';
}
