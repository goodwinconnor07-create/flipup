// The games you've played against your AI twin, kept on this phone for the twin report: one line per
// hand (just what you won or lost) so the report outlives the 24 hour hand history. Newest last.

import { read, write } from './persist';

const KEY = 'flipup.twingames';
const MAX_GAMES = 5;
const MAX_HANDS = 400;

export interface TwinGameHand {
  /** The hand's key in the hand history (see `handKey`), so its replay is a tap away while that's kept. */
  key: string;
  number: number;
  /** Chips you won (or lost, below zero). */
  net: number;
}

export interface TwinGame {
  /** The table's id. */
  id: string;
  at: number;
  /** The big blind, for chips-to-blinds. */
  bb: number;
  /** How many of your hands the twin had learned from when it sat down. */
  knew: number;
  hands: TwinGameHand[];
  /** Where you finished by chips when you left the table (1 is first). */
  place?: number;
}

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : null);

export function loadTwinGames(): TwinGame[] {
  const all = read<TwinGame[]>(KEY);
  if (!Array.isArray(all)) return [];
  const out: TwinGame[] = [];
  for (const g of all) {
    if (!g || typeof g.id !== 'string' || num(g.at) === null || !Array.isArray(g.hands)) continue;
    const hands = g.hands.filter((h) => h && typeof h.key === 'string' && num(h.number) !== null && num(h.net) !== null).map((h) => ({ key: h.key, number: h.number, net: h.net }));
    out.push({ id: g.id, at: g.at, bb: num(g.bb) || 10, knew: num(g.knew) ?? 0, hands, ...(num(g.place) ? { place: g.place } : {}) });
  }
  return out;
}

function save(games: TwinGame[]): void {
  write(KEY, games.slice(-MAX_GAMES));
}

/** A new game against your twin, with how much it knew of you. */
export function beginTwinGame(id: string, bb: number, knew: number, now = Date.now()): void {
  const games = loadTwinGames().filter((g) => g.id !== id);
  save([...games, { id, at: now, bb, knew, hands: [] }]);
}

/** One more finished hand in a twin game. Counting the same hand twice does nothing. */
export function addTwinHand(id: string, hand: TwinGameHand, bb = 10): void {
  const games = loadTwinGames();
  let game = games.find((g) => g.id === id);
  if (!game) {
    game = { id, at: Date.now(), bb, knew: 0, hands: [] };
    games.push(game);
  }
  if (game.hands.some((h) => h.key === hand.key)) return;
  game.hands = [...game.hands, hand].slice(-MAX_HANDS);
  save(games);
}

/** Where you finished, once you leave. */
export function finishTwinGame(id: string, place: number): void {
  const games = loadTwinGames();
  const game = games.find((g) => g.id === id);
  if (!game) return;
  game.place = place;
  save(games);
}
