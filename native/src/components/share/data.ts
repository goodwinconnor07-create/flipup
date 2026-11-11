// What a share card says, whatever it looks like: one shape of data that every design (designs.tsx) draws. Built
// from your poker record, a recorded hand (state/replays.ts), a finished game or your streak.
import { variantInfo, type Card } from '@/engine';
import type { GameLine, PokerRecord } from '@/state/record';
import type { Replay } from '@/state/replays';

export interface ShareWho {
  name: string;
  emoji: string;
  username: string | null;
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
  };
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
  const what = d.kind === 'hand' ? `${d.headline} chips${d.subline ? ` with ${d.subline}` : ''}` : `${d.eyebrow.toLowerCase()}: ${d.headline}${d.subline ? ` ${d.subline}` : ''}`;
  return `${what} on FlipUp${d.game ? ` (${d.game})` : ''}.`;
}
