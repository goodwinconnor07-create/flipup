// What a share card says, whatever it looks like: one shape of data that every design (designs.tsx) draws. Built
// from your poker record, a recorded hand (state/replays.ts), a finished game or your streak.
import { variantInfo, type Card } from '@/engine';
import { handName, mainOpponent, momentOf, oddsByStreet, type HandMoment, type StreetOdds } from '@/state/hand-moments';
import type { GameLine, PokerRecord } from '@/state/record';
import type { Replay } from '@/state/replays';

export interface ShareWho {
  name: string;
  emoji: string;
  username: string | null;
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
  kind: 'stats' | 'hand' | 'game' | 'streak';
  /** The small capitals over the headline ("BIGGEST WIN", "MY POKER"). */
  eyebrow: string;
  /** The big thing: "+1,240", "62%", "1st", "14 days". */
  headline: string;
  /** Green for a win, red-free grey for a loss: the designs pick their own colours for each. */
  tone: 'win' | 'loss' | 'plain';
  /** One line under it: "Full house, kings over fives". */
  subline?: string;
  hole?: Card[];
  board?: Card[];
  /** Up to four small numbers. */
  stats?: { label: string; value: string }[];
  /** The game's name ("Texas Hold'em"). */
  game?: string;
  /** When ("12 Nov 2026"). */
  date?: string;
  who: ShareWho;
  /** For the receipt: what happened, a line at a time ("Raise 40", "Call", "Flop A♠ K♦ 4♣"). */
  lines?: { left: string; right?: string }[];
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

const SUIT: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const cardText = (c: Card): string => `${c[0] === 'T' ? '10' : c[0]}${SUIT[c[1]] ?? ''}`;

export function statsData(record: PokerRecord, streak: number, who: ShareWho): ShareData {
  return {
    kind: 'stats',
    eyebrow: 'MY POKER',
    headline: `${pct(record.won, record.hands)}%`,
    tone: 'plain',
    subline: `of ${n(record.hands)} hands won`,
    hole: record.best?.cards,
    stats: [
      { label: 'HANDS', value: n(record.hands) },
      { label: 'POTS WON', value: n(record.won) },
      { label: 'BIGGEST POT', value: n(record.biggestPot) },
      streak > 0 ? { label: 'STREAK', value: `${streak}d` } : { label: 'GAMES', value: n(record.games.length) },
    ],
    ...(record.best ? { game: `Best hand · ${record.best.name}` } : {}),
    who,
    lines: [
      { left: 'Hands played', right: n(record.hands) },
      { left: 'Pots won', right: n(record.won) },
      { left: 'Win rate', right: `${pct(record.won, record.hands)}%` },
      { left: 'Biggest pot', right: n(record.biggestPot) },
      { left: 'Games', right: n(record.games.length) },
      ...(streak > 0 ? [{ left: 'Streak', right: `${streak} days` }] : []),
      ...(record.best ? [{ left: 'Best hand', right: record.best.name }] : []),
    ],
  };
}

/** A recorded hand: what you won or lost, your cards and the board, and the hand as receipt lines. */
export function handData(r: Replay, title: string, who: ShareWho): ShareData {
  const name = (id: string) => (id === r.me ? 'You' : (r.players.find((p) => p.id === id)?.name ?? '?'));
  const lines: ShareData['lines'] = [{ left: `Blinds ${n(r.smallBlind)}/${n(r.bigBlind)}` }];
  let street = 'preflop';
  for (const a of r.actions) {
    if (a.street !== street) {
      street = a.street;
      const upTo = a.street === 'flop' ? r.streets.flop : a.street === 'turn' ? r.streets.turn : r.streets.river;
      lines.push({ left: `— ${a.street.toUpperCase()} ${r.board.slice(0, upTo).map(cardText).join(' ')}` });
    }
    lines.push({ left: `${name(a.playerId)} ${a.move}`, right: a.move === 'bet' || a.move === 'raise' || a.move === 'allin' ? n(a.to) : undefined });
  }
  lines.push({ left: 'Pot', right: n(r.pot) });
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
    headline: signed(r.net),
    tone: r.net > 0 ? 'win' : r.net < 0 ? 'loss' : 'plain',
    subline: r.myHand ?? (r.showdown ? 'Showdown' : r.net > 0 ? 'Everyone folded' : 'Folded'),
    hole: r.holes[r.me],
    board: r.board.slice(0, Math.min(r.board.length, 5)),
    stats: [
      { label: 'POT', value: n(r.pot) },
      { label: 'BIG BLINDS', value: signed(r.net / r.bigBlind) },
      { label: 'PLAYERS', value: String(r.players.length) },
    ],
    game: `${variantInfo(r.variant).name} · Hand ${r.number}`,
    date: day(r.at),
    who,
    lines,
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
    game: variantInfo(g.variant).name,
    date: day(g.at),
    who,
    lines: [
      { left: variantInfo(g.variant).name },
      { left: 'Finished', right: place(g.place) },
      { left: 'Players', right: String(g.players) },
    ],
  };
}

export function streakData(days: number, longest: number, who: ShareWho): ShareData {
  return {
    kind: 'streak',
    eyebrow: 'DAILY STREAK',
    headline: `${days}`,
    tone: 'win',
    subline: days === 1 ? 'day in a row' : 'days in a row',
    stats: [
      { label: 'NOW', value: `${days}d` },
      { label: 'LONGEST', value: `${longest}d` },
    ],
    who,
    lines: [
      { left: 'Days in a row', right: String(days) },
      { left: 'Longest', right: String(longest) },
    ],
  };
}

/** The words that go with the picture in the share sheet. */
export function shareText(d: ShareData): string {
  if (d.moment) return `${d.moment.headline} ${d.headline} chips on FlipUp${d.game ? ` (${d.game})` : ''}.`;
  const what = d.kind === 'hand' ? `${d.headline} chips${d.subline ? ` with ${d.subline}` : ''}` : `${d.eyebrow.toLowerCase()}: ${d.headline}${d.subline ? ` ${d.subline}` : ''}`;
  return `${what} on FlipUp${d.game ? ` (${d.game})` : ''}.`;
}

/**
 * A made-up hand for showing off the designs on the Premium pages: 7-2 off called from the big blind against
 * ace-king, behind on the flop, a full house on the river.
 */
export function sampleHandData(who: ShareWho): ShareData {
  const act = (street: Replay['actions'][number]['street'], playerId: string, move: Replay['actions'][number]['move'], to = 0) => ({ street, playerId, move, to });
  const r: Replay = {
    id: 'sample/42',
    tableId: 'sample',
    at: Date.UTC(2026, 10, 12),
    mode: 'bots',
    variant: 'holdem',
    number: 42,
    smallBlind: 10,
    bigBlind: 20,
    buttonId: 'b',
    sbId: 'c',
    bbId: 'a',
    me: 'a',
    players: [
      { id: 'a', name: who.name, emoji: who.emoji, stack: 2000 },
      { id: 'b', name: 'Rook', emoji: '🦉', stack: 2000, bot: true },
      { id: 'c', name: 'Moss', emoji: '🐢', stack: 2000, bot: true },
    ],
    actions: [
      act('preflop', 'b', 'raise', 60),
      act('preflop', 'c', 'fold', 10),
      act('preflop', 'a', 'call', 60),
      act('flop', 'a', 'check'),
      act('flop', 'b', 'bet', 80),
      act('flop', 'a', 'call', 80),
      act('turn', 'a', 'check'),
      act('turn', 'b', 'bet', 200),
      act('turn', 'a', 'call', 200),
      act('river', 'a', 'bet', 400),
      act('river', 'b', 'call', 400),
    ],
    board: ['Kc', '7h', '4s', '2h', '7d'],
    streets: { flop: 3, turn: 4, river: 5 },
    holes: { a: ['7c', '2d'], b: ['Ad', 'Kd'] },
    won: { a: 1490 },
    names: {},
    showdown: true,
    net: 750,
    pot: 1490,
  };
  return handData(r, 'Big win', who);
}
