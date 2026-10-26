// What happened to one person over one table, from the hands they saved: the numbers the end screen
// shows big, and the moments it points back to. Pure: give it the records and who you were.

import { describeHand, recordNet, type Card, type HandRecord } from '../game';

export interface Moment {
  /** The hand's `handKey`-style number at its table. */
  number: number;
  /** Chips won (or lost, negative) in it. */
  net: number;
}

export interface TableStats {
  hands: number;
  /** Hands that ended with you up. */
  won: number;
  /** Hands you stayed in to the end, and how many of those you won at showdown. */
  showdowns: number;
  showdownsWon: number;
  /** Pots you won because everyone else folded. */
  uncontested: number;
  /** Winning hands where you bet or raised with a hand that hadn't made a pair, and nobody saw your cards. */
  bluffsWon: number;
  allIns: number;
  allInsWon: number;
  /** Your biggest win and biggest loss in one hand (null when there wasn't one). */
  bigWin: Moment | null;
  bigLoss: Moment | null;
  /** The best hand you made, by rank (null before any five-card hand). */
  bestMade: { name: string; detail: string; cards: Card[]; number: number } | null;
  /** The biggest win as a number of big blinds. */
  bigWinBlinds: number;
  /** Chips up or down after each hand, starting from zero. */
  series: number[];
  /** Most hands won in a row. */
  streak: number;
  /** The lowest you got, as a share of what you started the table with (1 = never behind). */
  lowest: number;
  /** How you played: share of hands you put chips in before the flop, how often you raised, how often you bet or raised against calling, and folds. */
  vpip: number;
  pfr: number;
  aggression: number;
  foldPct: number;
  /** One word for the style these add up to. */
  style: string;
  net: number;
  /** What you started with at this table. */
  start: number;
}

const EMPTY: TableStats = {
  hands: 0, won: 0, showdowns: 0, showdownsWon: 0, uncontested: 0, bluffsWon: 0, allIns: 0, allInsWon: 0, bigWin: null, bigLoss: null, bestMade: null, bigWinBlinds: 0,
  series: [0], streak: 0, lowest: 1, vpip: 0, pfr: 0, aggression: 0, foldPct: 0, style: 'Not enough hands', net: 0, start: 0,
};

/** A word for how someone played, from how many hands they entered and how hard they pushed. */
export function styleWord(vpip: number, aggression: number, hands: number): string {
  if (hands < 5) return 'Not enough hands';
  const loose = vpip >= 0.38;
  const tight = vpip <= 0.22;
  const hard = aggression >= 0.5;
  if (loose) return hard ? 'Loose and aggressive' : 'Loose and friendly';
  if (tight) return hard ? 'Tight and aggressive' : 'Tight and patient';
  return hard ? 'Aggressive' : 'Balanced';
}

/** Your best made hand in a record: the hole cards with the board once there are five cards to rank. */
function made(r: HandRecord, heroId: string): ReturnType<typeof describeHand> | null {
  const hole = r.holes[heroId];
  if (!hole || hole.length !== 2) return null;
  const cards = [...hole, ...r.board];
  return cards.length >= 5 ? describeHand(cards) : null;
}

/** The numbers for one table. `records` are that table's hands, oldest first. */
export function tableStats(records: HandRecord[], heroId: string): TableStats {
  const rows = records.filter((r) => r.players.some((p) => p.id === heroId)).sort((a, b) => a.number - b.number);
  if (rows.length === 0) return { ...EMPTY, series: [0] };
  const start = rows[0].players.find((p) => p.id === heroId)?.stack ?? 0;
  const s: TableStats = { ...EMPTY, series: [0], start };
  let run = 0;
  let total = 0;
  let low = 0;
  let entered = 0;
  let raised = 0;
  let aggressive = 0;
  let passive = 0;
  let folds = 0;
  let bestScore = -1;
  for (const r of rows) {
    s.hands++;
    const net = recordNet(r, heroId);
    total += net;
    low = Math.min(low, total);
    s.series.push(total);
    const mine = r.actions.filter((a) => a.playerId === heroId);
    const folded = mine.some((a) => a.move === 'fold');
    const pre = mine.filter((a) => a.street === 'preflop');
    if (pre.some((a) => a.move === 'call' || a.move === 'raise' || a.move === 'bet' || a.move === 'allin')) entered++;
    if (pre.some((a) => a.move === 'raise' || a.move === 'bet' || a.move === 'allin')) raised++;
    for (const a of mine) {
      if (a.move === 'bet' || a.move === 'raise' || a.move === 'allin') aggressive++;
      else if (a.move === 'call') passive++;
    }
    if (folded) folds++;
    const allIn = mine.some((a) => a.move === 'allin');
    const won = (r.won[heroId] ?? 0) > 0 && net > 0;
    if (allIn) {
      s.allIns++;
      if (won) s.allInsWon++;
    }
    if (won) {
      s.won++;
      run++;
      s.streak = Math.max(s.streak, run);
    } else run = 0;
    if (!folded && r.showdown) {
      s.showdowns++;
      if (won) s.showdownsWon++;
    }
    if (won && !r.showdown) s.uncontested++;
    const hand = made(r, heroId);
    // A bluff: you bet or raised, won without a showdown, and held nothing (no pair at all).
    if (won && !r.showdown && hand && hand.category === 0 && mine.some((a) => a.street !== 'preflop' && (a.move === 'bet' || a.move === 'raise' || a.move === 'allin'))) s.bluffsWon++;
    if (net > 0 && (!s.bigWin || net > s.bigWin.net)) {
      s.bigWin = { number: r.number, net };
      s.bigWinBlinds = r.bigBlind > 0 ? net / r.bigBlind : 0;
    }
    if (net < 0 && (!s.bigLoss || net < s.bigLoss.net)) s.bigLoss = { number: r.number, net };
    if (hand && !folded && (!s.bestMade || hand.score > bestScore)) {
      bestScore = hand.score;
      s.bestMade = { name: hand.name, detail: hand.detail, cards: hand.best, number: r.number };
    }
  }
  const n = s.hands;
  s.vpip = entered / n;
  s.pfr = raised / n;
  s.aggression = aggressive + passive > 0 ? aggressive / (aggressive + passive) : 0;
  s.foldPct = folds / n;
  s.net = total;
  s.lowest = start > 0 ? Math.max(0, (start + low) / start) : 1;
  s.style = styleWord(s.vpip, s.aggression, n);
  return s;
}
