// Party tournaments: a string of short tables (one per mini game) that the same friends play in turn.
// Every round is a normal online table; finishing higher earns more points, and the party's ranking
// moves after each one. This file is the pure part (points, ranking, building a round's table), shared
// by the Worker and the app. The party itself lives in worker/party.ts.

import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { cryptoRng } from './ids';
import { MAX_SEATS } from './holdem';
import type { Game, Player, Settings } from './types';
import type { Variant } from './variants';

export const PARTY_MIN_GAMES = 4;
export const PARTY_MAX_GAMES = 12;
export const PARTY_MAX_PLAYERS = MAX_SEATS;
/** Chips each player starts every round with. */
export const PARTY_STACKS = [500, 1000, 2000];
/** The blinds double after this many hands. */
export const PARTY_BLIND_HANDS = [2, 3, 5];
/** Bots fill the table up to this many seats (0 = people only). */
export const PARTY_FILL = [0, 4, 6, 9];
/** Seconds the leaderboard stays up before the next game starts by itself. */
export const PARTY_BREAK_SECONDS = 25;

/** Points for each finishing place among the people at the table (bots don't score). */
export const PLACE_POINTS = [10, 7, 5, 4, 3, 2, 1];
export const placePoints = (place: number): number => PLACE_POINTS[Math.min(place, PLACE_POINTS.length - 1)] ?? 1;

export interface PartySettings {
  games: Variant[];
  startingStack: number;
  blindHands: number;
  fillTo: number;
}

export type PartyStatus = 'lobby' | 'playing' | 'between' | 'done';

/** A person in the party, as everyone sees them. */
export interface PartyMemberView {
  id: string;
  name: string;
  emoji: string;
  /** Their friend code, if they have one, so others can add them. */
  friendCode?: string;
  /** Points earned in each finished round, in order. */
  points: number[];
}

/** One person's chips in the round being played. `out` is the order they went out in (0 = first), or null if still in. */
export interface PartyLive {
  id: string;
  stack: number;
  out: number | null;
}

export interface PartyView {
  code: string;
  status: PartyStatus;
  /** Your member id, or null if you're not in this party. */
  you: string | null;
  hostId: string;
  settings: PartySettings;
  /** Index of the round being played, or the last one played. -1 before the first starts. */
  round: number;
  /** The join code of the table to be at now. */
  table: string | null;
  /** When the next game starts by itself (status 'between'). */
  nextAt: number | null;
  members: PartyMemberView[];
  /** Chips in the round being played, updated after every hand. */
  live: PartyLive[] | null;
}

export const totalOf = (m: { points: number[] }): number => m.points.reduce((a, b) => a + b, 0);

/** Member ids best first, counting only the first `rounds` rounds (all of them when missing). */
export function rankMembers<T extends { id: string; name: string; points: number[] }>(members: T[], rounds?: number): T[] {
  const upTo = rounds ?? Infinity;
  const score = (m: T) => m.points.slice(0, upTo).reduce((a, b) => a + b, 0);
  const latest = (m: T) => m.points[Math.min(m.points.length, upTo) - 1] ?? 0;
  return [...members].sort((a, b) => score(b) - score(a) || latest(b) - latest(a) || a.name.localeCompare(b.name));
}

/** Everyone at a finished (or running) table, best first: chips left, then the last to go out, back to the first. */
export function finishOrder(game: Game): Player[] {
  const out = game.busted ?? [];
  const alive = game.players.filter((p) => p.stack > 0).sort((a, b) => b.stack - a.stack);
  const gone = game.players.filter((p) => p.stack === 0);
  const rank = (p: Player) => {
    const at = out.indexOf(p.id);
    return at < 0 ? -1 : at;
  };
  // The latest bust is the best of the busted; anyone with no recorded bust (the table was ended) goes last.
  gone.sort((a, b) => (rank(b) < 0 ? -2 : rank(b)) - (rank(a) < 0 ? -2 : rank(a)));
  return [...alive, ...gone];
}

/** The people at a table with their chips and bust order, for the live ranking. `ids` maps a device to its member id. */
export function liveOf(game: Game, ids: Record<string, string>): PartyLive[] {
  const out = game.busted ?? [];
  const live: PartyLive[] = [];
  for (const p of game.players) {
    const id = p.deviceId ? ids[p.deviceId] : undefined;
    if (!id) continue;
    const at = out.indexOf(p.id);
    live.push({ id, stack: p.stack, out: p.stack > 0 ? null : at < 0 ? out.length : at });
  }
  return live;
}

/** Live rows best first: still in, by chips, then the ones out, last out first. */
export function liveOrder(live: PartyLive[]): PartyLive[] {
  const alive = live.filter((l) => l.out === null).sort((a, b) => b.stack - a.stack);
  const gone = live.filter((l) => l.out !== null).sort((a, b) => (b.out as number) - (a.out as number));
  return [...alive, ...gone];
}

export interface PartyRow extends PartyMemberView {
  total: number;
  /** Where they stand right now, counting the round being played as if it ended this moment. */
  rank: number;
  /** Places gained (+) or lost (-) since the round before. */
  move: number;
  /** Points the running round would give them. */
  provisional: number;
  /** Chips in the running round, if one is on. */
  stack: number | null;
  out: boolean;
}

/** The leaderboard: finished rounds plus, while a round is on, where everyone would finish if it ended now. */
export function partyStandings(view: Pick<PartyView, 'members' | 'live' | 'status' | 'round'>): PartyRow[] {
  const running = view.status === 'playing' && !!view.live;
  const order = running ? liveOrder(view.live!) : [];
  const provisional = (id: string) => {
    const at = order.findIndex((l) => l.id === id);
    return at < 0 ? 0 : placePoints(at);
  };
  const withNow = view.members.map((m) => ({ ...m, points: running ? [...m.points, provisional(m.id)] : m.points }));
  const now = rankMembers(withNow);
  // The ranking before the latest round (or before the running one).
  const before = rankMembers(view.members, running ? view.members[0]?.points.length : Math.max(0, (view.members[0]?.points.length ?? 0) - 1));
  return now.map((m, i) => {
    const original = view.members.find((x) => x.id === m.id)!;
    const was = before.findIndex((x) => x.id === m.id);
    const live = view.live?.find((l) => l.id === m.id);
    return {
      ...original,
      total: totalOf(m),
      rank: i + 1,
      move: running || original.points.length > 1 ? was - i : 0,
      provisional: running ? provisional(m.id) : 0,
      stack: running && live ? live.stack : null,
      out: running && !!live && live.out !== null,
    };
  });
}

/** A short random playlist of games. The first is always plain Hold'em so a party starts on familiar ground. */
export function shufflePlaylist(all: Variant[], count: number, rng: () => number = Math.random): Variant[] {
  const n = Math.max(PARTY_MIN_GAMES, Math.min(PARTY_MAX_GAMES, count));
  const out: Variant[] = [];
  let bag: Variant[] = [];
  while (out.length < n) {
    if (bag.length === 0) bag = [...all].sort(() => rng() - 0.5);
    const next = bag.pop()!;
    if (out[out.length - 1] !== next) out.push(next);
    else if (bag.length === 0) bag = [...all];
  }
  return out;
}

export function validPartySettings(s: PartySettings, isVariant: (v: unknown) => boolean): boolean {
  return (
    Array.isArray(s.games) &&
    s.games.length >= PARTY_MIN_GAMES &&
    s.games.length <= PARTY_MAX_GAMES &&
    s.games.every(isVariant) &&
    PARTY_STACKS.includes(s.startingStack) &&
    PARTY_BLIND_HANDS.includes(s.blindHands) &&
    PARTY_FILL.includes(s.fillTo)
  );
}

export interface PartyPerson {
  deviceId: string;
  name: string;
  emoji: string;
  twinCode?: string;
}

/**
 * The table for one round: everyone in the party already seated, bots filling up to `fillTo`, blinds that
 * double every few hands, no rebuys, and the deal already under way. The first person hosts it.
 */
export function buildPartyGame(opts: {
  tableCode: string;
  partyCode: string;
  round: number;
  settings: PartySettings;
  people: PartyPerson[];
  now: number;
  rng?: () => number;
}): Game | null {
  const { people, settings, now } = opts;
  const rng = opts.rng ?? cryptoRng;
  if (people.length === 0 || people.length > PARTY_MAX_PLAYERS) return null;
  const game0: Settings = {
    ...DEFAULT_SETTINGS,
    startingStack: settings.startingStack,
    smallBlind: settings.startingStack / 100,
    bigBlind: settings.startingStack / 50,
    rebuys: false,
    turnSeconds: 20,
    blindHands: settings.blindHands,
    variant: settings.games[opts.round] ?? 'holdem',
  };
  const [host, ...rest] = people;
  let game = createTable({ hostDeviceId: host.deviceId, name: host.name, emoji: host.emoji, settings: game0, bots: 0, twinCode: host.twinCode, code: opts.tableCode, now });
  const step = (action: Parameters<typeof applyAction>[1], deviceId: string): boolean => {
    const r = applyAction(game, action, { deviceId, now, rng });
    if (r.ok) game = r.game;
    return r.ok;
  };
  for (const p of rest) if (!step({ type: 'join', name: p.name, emoji: p.emoji, ...(p.twinCode ? { twinCode: p.twinCode } : {}) }, p.deviceId)) return null;
  // One person alone still plays against at least one bot.
  const want = Math.max(settings.fillTo, people.length === 1 ? 2 : 0);
  while (game.players.length < Math.min(want, MAX_SEATS)) if (!step({ type: 'addBot' }, host.deviceId)) break;
  game = { ...game, party: { code: opts.partyCode, round: opts.round, total: settings.games.length } };
  return step({ type: 'start' }, host.deviceId) ? game : null;
}
