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
  /** The small grey line over the title (Flighty's flight number): where it's played, and the day once it's over. */
  eyebrow: string;
  /** Right of the grey line, in two parts like Flighty's "Arrived 20m late": a grey word and a bold one. */
  status: string;
  strong: string;
  /** How the bold part is coloured: going on now, chips up, or chips down. */
  tone: 'live' | 'up' | 'down' | 'plain';
  /** Under the picture, in small capitals (Flighty's ARRIVED): LIVE, your place, or LEFT. */
  badge: string;
  who: GameSeat[];
}

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Flighty's dates: "Today", "Yesterday", else "29 Sep 2026" (`short` leaves this year's year off, for a tight line). */
export function dayLabel(at: number, now = Date.now(), short = false): string {
  const d = new Date(at);
  const today = new Date(now);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(today) - start(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const year = short && d.getFullYear() === today.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
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
    const [status, strong] = !game ? ['', 'Joining'] : game.status === 'lobby' ? ['In the', 'lobby'] : game.hand && game.status === 'playing' ? ['Playing', `hand ${game.hand.number}`] : ['', 'Playing'];
    return [{ key: 'live-table', kind: 'table', live: true, online, variant, title, eyebrow: where, status, strong, tone: 'live', badge: 'LIVE', who: game ? othersAt(game, me) : [] }];
  }
  if (party) {
    return [{ key: 'live-party', kind: 'party', live: true, online: true, variant: 'holdem', title: 'Your party', eyebrow: `Party · ${party.code}`, status: '', strong: 'Playing', tone: 'live', badge: 'LIVE', who: [] }];
  }
  return [];
}

const chips = (n: number) => Math.abs(n).toLocaleString('en-US');

/** How a finished game went: its place under the picture, and the chips you came away with on the right. */
function result(g: GameLine): Pick<GameItem, 'status' | 'strong' | 'tone' | 'badge'> {
  const badge = g.left ? 'LEFT' : `${ordinal(g.place).toUpperCase()} OF ${g.players}`;
  const status = g.left ? 'Left' : 'Finished';
  if (typeof g.net !== 'number') return { badge, status: '', strong: status, tone: 'plain' };
  if (g.net === 0) return { badge, status, strong: 'even', tone: 'plain' };
  return { badge, status, strong: `${g.net > 0 ? '+' : '−'}${chips(g.net)}`, tone: g.net > 0 ? 'up' : 'down' };
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
      eyebrow: `${g.online ? 'Online' : 'Bots'} · ${dayLabel(g.at, now, true)}`,
      ...result(g),
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
