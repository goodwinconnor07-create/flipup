// The bigger stats on the Stats page (owner, 12 Nov 2026): how you play, your chips over the last 100 hands, all-ins
// and luck, streaks, and the starting hands that win and lose you the most. Pure: `tallyHand()` adds one finished hand
// to the totals and `tallyGame()` one finished table; `state/record.ts` stores them in `flipup.record`. They count
// from the update that added them, from what this phone sees (other players' cards only once they're shown).
import { bestHand, cleanDays, rankOf, RANKS, runoutOdds, streetCards, withToday, type Card, type Game, type Variant } from '@/engine';

/** Hands kept for the chips line. */
export const TRAIL = 100;
/** Hands before your style gets a name. */
export const STYLE_AFTER = 20;
/** Your chance to win when the money went in: at least this and losing is a bad beat; at most 1 minus it and winning is a suckout. */
export const BEAT_EDGE = 0.6;

export interface StartLine {
  /** Hands dealt. */
  n: number;
  /** Chips won or lost with it. */
  net: number;
  /** The last time you had it, to draw. */
  cards: Card[];
}

export interface MoreStats {
  /** Hands counted for these stats (the all-time hand count above started earlier). */
  tracked: number;
  /** Chips from every pot you took. */
  chipsWon: number;
  /** Chips won minus chips lost. */
  net: number;
  /** The most you lost in one hand. */
  biggestLoss: number;
  /** Chips won or lost in each of your last 100 hands, oldest first. */
  nets: number[];
  /** Hands where you put chips in before the flop yourself (blinds don't count). */
  vpip: number;
  /** Bets and raises, and calls, on every street. */
  aggr: number;
  calls: number;
  allIns: number;
  allInWon: number;
  allInLost: number;
  /** All-ins with every hand face up, decided by the cards still to come. */
  badBeats: number;
  suckouts: number;
  /** Your win chance in your worst beat and your luckiest suckout, 0 to 1. */
  worstBeat: number | null;
  bestSuckout: number | null;
  /** Showdowns lost with a full house or better. */
  coolers: number;
  /** Hands in a row with a pot won, and without one: now and your record. */
  winRun: number;
  bestWinRun: number;
  dryRun: number;
  bestDryRun: number;
  /** Two-card starting hands ("AKs", "QQ", "72o"). */
  starts: Record<string, StartLine>;
  /** Days with a hand played ("2026-11-12"). */
  days: string[];
  /** Tables in play: your chips at the first hand and the lowest after any hand since. */
  tables: { id: string; start: number; low: number }[];
  /** The table you won from furthest down. */
  comeback: { low: number; start: number; variant: Variant } | null;
  /** Saved hands watched back. */
  watched: number;
}

export const EMPTY_STATS: MoreStats = {
  tracked: 0,
  chipsWon: 0,
  net: 0,
  biggestLoss: 0,
  nets: [],
  vpip: 0,
  aggr: 0,
  calls: 0,
  allIns: 0,
  allInWon: 0,
  allInLost: 0,
  badBeats: 0,
  suckouts: 0,
  worstBeat: null,
  bestSuckout: null,
  coolers: 0,
  winRun: 0,
  bestWinRun: 0,
  dryRun: 0,
  bestDryRun: 0,
  starts: {},
  days: [],
  tables: [],
  comeback: null,
  watched: 0,
};

const num = (v: unknown, signed = false) => (typeof v === 'number' && Number.isFinite(v) && (signed || v >= 0) ? v : 0);
const chance = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : null);

/** The stored stats with anything broken put back to empty. */
export function cleanStats(r: Partial<MoreStats> | null | undefined): MoreStats {
  const starts: Record<string, StartLine> = {};
  if (r?.starts && typeof r.starts === 'object') {
    for (const [k, v] of Object.entries(r.starts)) {
      if (v && typeof v.n === 'number' && typeof v.net === 'number' && Array.isArray(v.cards)) starts[k] = { n: v.n, net: v.net, cards: v.cards.slice(0, 2) };
    }
  }
  const c = r?.comeback;
  return {
    tracked: num(r?.tracked),
    chipsWon: num(r?.chipsWon),
    net: num(r?.net, true),
    biggestLoss: num(r?.biggestLoss),
    nets: Array.isArray(r?.nets) ? r.nets.filter((x) => typeof x === 'number' && Number.isFinite(x)).slice(-TRAIL) : [],
    vpip: num(r?.vpip),
    aggr: num(r?.aggr),
    calls: num(r?.calls),
    allIns: num(r?.allIns),
    allInWon: num(r?.allInWon),
    allInLost: num(r?.allInLost),
    badBeats: num(r?.badBeats),
    suckouts: num(r?.suckouts),
    worstBeat: chance(r?.worstBeat),
    bestSuckout: chance(r?.bestSuckout),
    coolers: num(r?.coolers),
    winRun: num(r?.winRun),
    bestWinRun: num(r?.bestWinRun),
    dryRun: num(r?.dryRun),
    bestDryRun: num(r?.bestDryRun),
    starts,
    days: cleanDays(r?.days),
    tables: Array.isArray(r?.tables) ? r.tables.filter((t) => t && typeof t.id === 'string' && typeof t.start === 'number' && typeof t.low === 'number') : [],
    comeback: c && typeof c.low === 'number' && typeof c.start === 'number' && c.start > 0 && typeof c.variant === 'string' ? c : null,
    watched: num(r?.watched),
  };
}

/** A starting hand's short name: "AKs", "QQ", "72o". */
export function startName(cards: Card[]): string {
  const [a, b] = [...cards].sort((x, y) => rankOf(y) - rankOf(x));
  if (a[0] === b[0]) return a[0] + b[0];
  return a[0] + b[0] + (a[1] === b[1] ? 's' : 'o');
}

/** "AKs" written out: "Ace-King suited", "Pocket queens", "Seven-Two offsuit". */
export function startWords(name: string): string {
  const word = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
  const plural = ['twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces'];
  const r = (ch: string) => RANKS.indexOf(ch);
  if (name.length === 2) return `Pocket ${plural[r(name[0])]}`;
  return `${word[r(name[0])]}-${word[r(name[1])]} ${name[2] === 's' ? 'suited' : 'offsuit'}`;
}

/** Games whose all-in odds are worked out the plain way (two cards each, a board that only grows). */
const LUCK_GAMES: Partial<Record<Variant, Variant>> = { holdem: 'holdem', missions: 'holdem', deuces: 'deuces', pittsburgh: 'pittsburgh', crucifix: 'crucifix', circle: 'circle' };
/** Games where your two cards are your starting hand all the way through. */
const TWO_CARD_GAMES = new Set<Variant>(['holdem', 'missions', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'imposter', 'crucifix', 'circle', 'memory', 'power']);

const aggressive = (move: string) => move === 'bet' || move === 'raise' || move === 'allin';

/** Your win chance (a split counts half) at the moment the money went in, or null if it can't be told. */
export function allInChance(game: Game, myId: string): number | null {
  const hand = game.hand;
  if (!hand?.result || !hand.ranOut || !hand.actions?.length) return null;
  const v = LUCK_GAMES[hand.variant ?? 'holdem'];
  if (!v) return null;
  const live = hand.seats.filter((s) => !s.folded);
  const me = live.findIndex((s) => s.playerId === myId);
  if (me < 0 || live.length < 2 || live.some((s) => s.cards.length !== 2)) return null;
  const street = hand.actions[hand.actions.length - 1].street;
  if (street === 'river') return null;
  const at = street === 'preflop' ? 0 : street === 'flop' ? streetCards(v, 'flop') : streetCards(v, 'flop') + streetCards(v, 'turn');
  if (hand.board.length <= at) return null;
  try {
    const odds = runoutOdds(v, live.map((s) => s.cards), hand.board.slice(0, at));
    return odds.win[me] + odds.tie[me] / 2;
  } catch {
    return null;
  }
}

/** One more finished hand you were dealt into. `chance` is `allInChance()`, passed in so tests can pick it. */
export function tallyHand(r: MoreStats, game: Game, myId: string, now: Date, chance: number | null = allInChance(game, myId)): MoreStats {
  const hand = game.hand;
  const result = hand?.result;
  const seat = hand?.seats.find((s) => s.playerId === myId);
  const meNow = game.players.find((p) => p.id === myId);
  if (!hand || !result || !seat || !meNow || seat.cards.length === 0) return r;
  const variant: Variant = hand.variant ?? 'holdem';
  const start = hand.startStacks?.[myId];
  const took = result.pots.filter((p) => p.winners.includes(myId)).reduce((sum, p) => sum + Math.floor(p.amount / p.winners.length), 0);
  // What the hand did to your chips (missions and powers that move chips included).
  const net = start !== undefined ? meNow.stack - start : took - seat.total;
  const mine = (hand.actions ?? []).filter((a) => a.playerId === myId);
  const wonPot = took > 0;
  const allIn = seat.allIn || mine.some((a) => a.move === 'allin');

  let { badBeats, suckouts, worstBeat, bestSuckout, coolers } = r;
  if (allIn && chance !== null) {
    if (chance >= BEAT_EDGE && net < 0) {
      badBeats++;
      worstBeat = Math.max(worstBeat ?? 0, chance);
    }
    if (chance <= 1 - BEAT_EDGE && net > 0) {
      suckouts++;
      bestSuckout = Math.min(bestSuckout ?? 1, chance);
    }
  }
  if (result.showdown && !seat.folded && !wonPot && variant !== 'imposter' && hand.board.length >= 3) {
    try {
      if (bestHand(variant, seat.cards, hand.board).category >= 6) coolers++;
    } catch {
      // A board this game can't score: not a cooler.
    }
  }

  const starts = { ...r.starts };
  if (TWO_CARD_GAMES.has(variant) && seat.cards.length === 2) {
    const key = startName(seat.cards);
    const was = starts[key] ?? { n: 0, net: 0, cards: [] };
    starts[key] = { n: was.n + 1, net: was.net + net, cards: [...seat.cards] };
  }

  const winRun = wonPot ? r.winRun + 1 : 0;
  const dryRun = wonPot ? 0 : r.dryRun + 1;
  const tables = r.tables.filter((t) => t.id !== game.id);
  const table = r.tables.find((t) => t.id === game.id) ?? { id: game.id, start: start ?? meNow.stack, low: start ?? meNow.stack };
  tables.push({ ...table, low: Math.min(table.low, meNow.stack) });

  return {
    ...r,
    tracked: r.tracked + 1,
    chipsWon: r.chipsWon + took,
    net: r.net + net,
    biggestLoss: Math.max(r.biggestLoss, -net),
    nets: [...r.nets, net].slice(-TRAIL),
    vpip: r.vpip + (mine.some((a) => a.street === 'preflop' && (a.move === 'call' || aggressive(a.move))) ? 1 : 0),
    aggr: r.aggr + mine.filter((a) => aggressive(a.move)).length,
    calls: r.calls + mine.filter((a) => a.move === 'call').length,
    allIns: r.allIns + (allIn ? 1 : 0),
    allInWon: r.allInWon + (allIn && net > 0 ? 1 : 0),
    allInLost: r.allInLost + (allIn && net < 0 ? 1 : 0),
    badBeats,
    suckouts,
    worstBeat,
    bestSuckout,
    coolers,
    winRun,
    bestWinRun: Math.max(r.bestWinRun, winRun),
    dryRun,
    bestDryRun: Math.max(r.bestDryRun, dryRun),
    starts,
    days: withToday(r.days, now),
    tables: tables.slice(-6),
  };
}

/** A table that's over: if you won it, how far down you were on the way. */
export function tallyGame(r: MoreStats, game: Game, myId: string, place: number): MoreStats {
  const t = r.tables.find((x) => x.id === game.id);
  const tables = r.tables.filter((x) => x.id !== game.id);
  if (!t || place !== 1 || t.start <= 0) return { ...r, tables };
  const best = r.comeback;
  const comeback = !best || t.low / t.start < best.low / best.start ? { low: t.low, start: t.start, variant: game.hand?.variant ?? game.settings.variant ?? 'holdem' } : best;
  return { ...r, tables, comeback };
}

export interface Style {
  emoji: string;
  name: string;
  line: string;
  /** Share of hands you play, 0 to 1. */
  loose: number;
  /** Bets and raises as a share of bets, raises and calls, 0 to 1. */
  aggression: number;
}

/** Above these you're loose and aggressive. */
const LOOSE = 0.35;
const WILD = 0.5;

/** Your poker personality from how many hands you play and how you play them, once there are enough hands. */
export function styleOf(r: MoreStats): Style | null {
  if (r.tracked < STYLE_AFTER) return null;
  const loose = r.vpip / r.tracked;
  const aggression = r.aggr + r.calls ? r.aggr / (r.aggr + r.calls) : 0;
  const wide = loose >= LOOSE;
  const wild = aggression >= WILD;
  const style = wild
    ? wide
      ? { emoji: '🔥', name: 'The Maniac', line: 'You play lots of hands and you play them hard. Nobody wants to guess what you have.' }
      : { emoji: '🦈', name: 'The Shark', line: 'You wait for good hands, then you bet and raise with them. The style the pros play.' }
    : wide
      ? { emoji: '📞', name: 'The Calling Station', line: 'You see a lot of flops and you like to call. Try betting more of your good hands.' }
      : { emoji: '🪨', name: 'The Rock', line: 'You play few hands and play them carefully. When you raise, everyone listens.' };
  return { ...style, loose, aggression };
}

/** Your best and worst starting hand by chips (at least two hands each), or null while there isn't one. */
export function startExtremes(r: MoreStats): { lucky: [string, StartLine] | null; nemesis: [string, StartLine] | null } {
  const rows = Object.entries(r.starts).filter(([, s]) => s.n >= 2);
  const up = rows.filter(([, s]) => s.net > 0).sort((a, b) => b[1].net - a[1].net);
  const down = rows.filter(([, s]) => s.net < 0).sort((a, b) => a[1].net - b[1].net);
  return { lucky: up[0] ?? null, nemesis: down[0] ?? null };
}
