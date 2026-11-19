// What a share card says, whatever it looks like: one shape of data that every design (designs.tsx) draws. Built
// from your poker record, a recorded hand (state/replays.ts), a finished game or your streak.
import { variantInfo, type Card, type Variant } from '@/engine';
import { handName, mainOpponent, momentOf, oddsByStreet, type HandMoment, type StreetOdds } from '@/state/hand-moments';
import type { GameLine, PokerRecord } from '@/state/record';
import { bbLabel } from '@/state/record-stats';
import type { Replay } from '@/state/replays';

export interface ShareWho {
  name: string;
  emoji: string;
}

/** One side of a hand, for the designs that put you against your opponent. */
export interface ShareSide {
  name: string;
  emoji: string;
  cards: Card[];
  /** Their hand at the end, when they saw the river: "Full house, sevens over twos". */
  hand?: string;
  won: boolean;
}

export interface ShareData {
  kind: 'stats' | 'hand' | 'game';
  /** The game the card is about: it sets the card's colours and the game icon in its corner. None for your stats. */
  variant?: Variant;
  /** Your stats: the games you play most, most first, as small icons on the band. */
  games?: Variant[];
  /** The label on the white capsule ("BIGGEST WIN", "MY POKER"). */
  eyebrow: string;
  /** The big thing: "+1,240", "62%", "1st", "14 days". */
  headline: string;
  /** Gold for a win; a loss stays white, never red. */
  tone: 'win' | 'loss' | 'plain';
  /** One line under it: "Full house, kings over fives". */
  subline?: string;
  hole?: Card[];
  board?: Card[];
  /** Up to three small numbers. */
  stats?: { label: string; value: string }[];
  /** The game's name ("Texas Hold'em"). */
  game?: string;
  /** When ("12 Nov 2026"). */
  date?: string;
  who: ShareWho;
  /** A hand's moment, the line worth sending ("Called with 7-2. Hit a boat."), from `momentOf()`. */
  moment?: HandMoment;
  /** Your win chance as each street was dealt, only when every hand still in was known. */
  odds?: StreetOdds[];
  /** The board cards that swung the odds most, when one street moved them by 30 points or more. */
  swing?: Card[];
  /** You against the opponent who showed and put the most in. */
  matchup?: { you: ShareSide; them?: ShareSide };
}

export const n = (v: number): string => Math.round(v).toLocaleString('en-US');
export const signed = (v: number): string => (v > 0 ? `+${n(v)}` : v < 0 ? `−${n(-v)}` : '0');
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
export const day = (at: number): string => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const place = (p: number): string => `${p}${p % 10 === 1 && p % 100 !== 11 ? 'st' : p % 10 === 2 && p % 100 !== 12 ? 'nd' : p % 10 === 3 && p % 100 !== 13 ? 'rd' : 'th'}`;

export function statsData(record: Omit<PokerRecord, 'more' | 'modes'>, who: ShareWho): ShareData {
  return {
    kind: 'stats',
    eyebrow: 'MY POKER',
    headline: `${pct(record.won, record.hands)}%`,
    tone: 'plain',
    subline: `of ${n(record.hands)} hands won`,
    stats: [
      { label: 'POTS WON', value: n(record.won) },
      { label: 'BIGGEST POT', value: bbLabel(record.biggestPot) },
      { label: 'GAMES', value: n(record.games.length) },
    ],
    games: mostPlayed(record.games),
    ...(record.best ? { game: `Best hand · ${record.best.name}` } : {}),
    who,
  };
}

/** What a hand won or lost, in big blinds like every chip figure in your stats: "+38 bb", or Even. */
function bbHeadline(r: Replay): string {
  const bb = Math.round(r.net / r.bigBlind);
  return bb === 0 ? 'Even' : `${signed(bb)} bb`;
}

/** The games you've finished most, most first (up to four). */
function mostPlayed(games: GameLine[]): Variant[] {
  const count = new Map<Variant, number>();
  for (const g of games) count.set(g.variant, (count.get(g.variant) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([v]) => v);
}

/** A recorded hand: what you won or lost, your cards and the board, its moment and odds, and who you were up against. */
export function handData(r: Replay, title: string, who: ShareWho): ShareData {
  const moment = momentOf(r);
  const odds = oddsByStreet(r);
  const side = (id: string): ShareSide => {
    const p = r.players.find((x) => x.id === id);
    // Other people show as Opponent: a picture can end up anywhere. Bots keep their names.
    const name = id === r.me ? who.name : p?.bot ? p.name : 'Opponent';
    const hand = handName(r, id);
    return { name, emoji: id === r.me ? who.emoji : (p?.emoji ?? '🙂'), cards: r.holes[id] ?? [], ...(hand ? { hand } : {}), won: (r.won[id] ?? 0) > 0 };
  };
  const rival = mainOpponent(r);
  return {
    kind: 'hand',
    eyebrow: title.toUpperCase(),
    headline: bbHeadline(r),
    tone: r.net > 0 ? 'win' : r.net < 0 ? 'loss' : 'plain',
    subline: r.myHand ?? (r.showdown ? 'Showdown' : r.net > 0 ? 'Everyone folded' : 'Folded'),
    hole: r.holes[r.me],
    board: r.board,
    variant: r.variant,
    game: variantInfo(r.variant).name,
    date: day(r.at),
    who,
    ...(moment ? { moment } : {}),
    ...(odds.length >= 2 ? { odds } : {}),
    ...swingOf(r, odds),
    matchup: { you: side(r.me), ...(rival ? { them: side(rival) } : {}) },
  };
}

/** The street whose cards moved your odds most (30 points or more), as those cards. */
function swingOf(r: Replay, odds: StreetOdds[]): { swing?: Card[] } {
  let best = 0.3;
  let at: StreetOdds | null = null;
  for (let i = 1; i < odds.length; i++) {
    const move = Math.abs(odds[i].you - odds[i - 1].you);
    if (odds[i].street !== 'preflop' && move >= best) {
      best = move;
      at = odds[i];
    }
  }
  if (!at) return {};
  const from = at.street === 'flop' ? 0 : at.street === 'turn' ? r.streets.flop : r.streets.turn;
  const to = at.street === 'flop' ? r.streets.flop : at.street === 'turn' ? r.streets.turn : r.board.length;
  return { swing: r.board.slice(from, to) };
}

export function gameData(g: GameLine, who: ShareWho): ShareData {
  return {
    kind: 'game',
    eyebrow: 'GAME RESULT',
    headline: place(g.place),
    tone: g.place === 1 ? 'win' : 'plain',
    subline: `of ${g.players} at the table`,
    stats: [
      { label: 'PLACE', value: place(g.place) },
      { label: 'PLAYERS', value: String(g.players) },
    ],
    variant: g.variant,
    game: variantInfo(g.variant).name,
    date: day(g.at),
    who,
  };
}

/** The words that go with the picture in the share sheet. */
export function shareText(d: ShareData): string {
  if (d.moment) return `${d.moment.headline} ${d.headline} on FlipUp${d.game ? ` (${d.game})` : ''}.`;
  const what = d.kind === 'hand' ? `${d.headline}${d.subline ? ` with ${d.subline}` : ''}` : `${d.eyebrow.toLowerCase()}: ${d.headline}${d.subline ? ` ${d.subline}` : ''}`;
  return `${what} on FlipUp${d.game ? ` (${d.game})` : ''}.`;
}
