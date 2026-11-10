// My Games, the Play tab's list after Flighty's My Flights: the table or party you're at now (live, at the top), then
// the games you've played, newest first, split into Online and Bot games. Pure, so the list can be tested; the
// screen reads the table, the party and the record and draws what this returns.
import { challengeById, variantInfo, variantOf, type Game, type Variant } from '@/engine';

import type { PartyRef } from './party';
import type { GameLine, GameSeat } from './record';

export type GamesTab = 'online' | 'bots';

export interface GameItem {
  key: string;
  /** Where a tap goes: back to the table, into the party, or this game's start sheet. */
  kind: 'table' | 'party' | 'past';
  live: boolean;
  online: boolean;
  variant: Variant;
  title: string;
  /** The small grey line over the title (Flighty's flight number and route). */
  eyebrow: string;
  /** Right of the eyebrow: the hand you're on, or the day it was played. */
  when: string;
  who: GameSeat[];
}

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Flighty's dates: "Today", "Yesterday", else "29 Sep 2026". */
export function dayLabel(at: number, now = Date.now()): string {
  const d = new Date(at);
  const today = new Date(now);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(today) - start(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** The people at a live table other than you, in seat order. */
function othersAt(game: Game, me: string): GameSeat[] {
  return [...game.players]
    .filter((p) => p.deviceId !== me)
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({ name: p.name, emoji: p.emoji, bot: p.bot }));
}

/**
 * What you're in right now: the table you're at (unless it's finished and isn't a party's), else your open party.
 * `me` is this phone's device id, so you're left out of who's there.
 */
export function liveGames(table: { mode: 'local' | 'online' | null; code: string | null; game: Game | null }, party: PartyRef | null, me: string): GameItem[] {
  const game = table.game;
  const atTable = !!table.mode && !(game && game.status === 'ended' && !game.party);
  if (atTable) {
    const online = table.mode === 'online';
    const variant = game ? variantOf(game) : 'holdem';
    const challenge = game?.challenge ? challengeById(game.challenge.id) : undefined;
    const title = challenge ? challenge.name : variantInfo(variant).name;
    const where = game?.party
      ? `Party · game ${game.party.round + 1} of ${game.party.total}`
      : online
        ? `Online${table.code ? ` · ${table.code}` : ''}`
        : challenge
          ? 'Challenge'
          : 'Bot game';
    const when = !game ? 'Joining' : game.status === 'lobby' ? 'Lobby' : game.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : 'Live';
    return [{ key: 'live-table', kind: 'table', live: true, online, variant, title, eyebrow: where, when, who: game ? othersAt(game, me) : [] }];
  }
  if (party) {
    return [{ key: 'live-party', kind: 'party', live: true, online: true, variant: 'holdem', title: 'Your party', eyebrow: `Party · ${party.code}`, when: 'Live', who: [] }];
  }
  return [];
}

/** How a finished game went, for its grey line: "Online · 2nd of 6", or "Left" when you walked away. */
function result(g: GameLine): string {
  const where = g.online ? 'Online' : 'Bots';
  if (g.left) return `${where} · Left`;
  return `${where} · ${ordinal(g.place)} of ${g.players}`;
}

/** The games you've played, newest first. Games noted before they carried a mode count as bot games. */
export function pastGames(games: GameLine[], now = Date.now()): GameItem[] {
  return [...games]
    .sort((a, b) => b.at - a.at)
    .map((g, i) => ({
      key: `past-${g.id ?? `${g.at}-${i}`}`,
      kind: 'past' as const,
      live: false,
      online: !!g.online,
      variant: g.variant,
      title: variantInfo(g.variant).name,
      eyebrow: result(g),
      when: dayLabel(g.at, now),
      who: g.who ?? [],
    }));
}

/** One tab of the list: its live games, then its past ones. */
export function gamesFor(tab: GamesTab, live: GameItem[], past: GameItem[]): { live: GameItem[]; past: GameItem[] } {
  const mine = (g: GameItem) => (tab === 'online' ? g.online : !g.online);
  return { live: live.filter(mine), past: past.filter(mine) };
}

/** Faces for the third line: the first few names, then how many more. */
export function whoLine(who: GameSeat[], max = 4): { shown: GameSeat[]; more: number } {
  return { shown: who.slice(0, max), more: Math.max(0, who.length - max) };
}
