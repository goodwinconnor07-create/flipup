// The moment in a saved hand: the line that makes it worth sending ("Called with 7-2. Hit a boat.", "18% on the
// flop. Won anyway."). Pure: it reads a `Replay` (state/replays.ts), which only ever holds cards this phone was
// allowed to see, so a moment never gives away a hand nobody showed. Share cards put it in the headline
// (`handData()` in components/share/data.ts); the Share page's Top hands rows use it without odds, which is quick.
import { bestHand, rankOf, runoutOdds, showsOdds, type Card, type HandValue, type Street, type Variant } from '@/engine';

import { isAir, putIn, type Replay } from './replays';

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

/** Your chance to win (ties count half) as the street was dealt, against the strongest other hand still in. */
export interface StreetOdds {
  street: Street;
  /** 0 to 1. */
  you: number;
  them: number;
}

export type MomentKind = 'junk' | 'comeback' | 'badBeat' | 'monster' | 'bluff' | 'heroCall' | 'cooler' | 'allIn' | 'bigWin';

export interface HandMoment {
  kind: MomentKind;
  /** The big line, short enough for a share card: "Called with 7-2. Hit a boat." */
  headline: string;
  /** One line under it: "Full house, sevens over twos beat a pair of kings". */
  line: string;
}

// ── Odds by street ──────────────────────────────────────────────────────────

/** Games whose odds can be worked out from a saved hand. The ghost's cards and Power Cards aren't in one. */
const oddsGame = (v: Variant) => showsOdds(v) && v !== 'ghost' && v !== 'power';

/** The board as each street was dealt. */
function boardAt(r: Replay, street: Street): Card[] | null {
  const upTo = street === 'preflop' ? 0 : street === 'flop' ? r.streets.flop : street === 'turn' ? r.streets.turn : r.board.length;
  if (street !== 'preflop' && (upTo === 0 || r.board.length < upTo)) return null;
  // The river: only once the board is longer than the turn's.
  if (street === 'river' && r.board.length <= r.streets.turn) return null;
  return r.board.slice(0, upTo);
}

/**
 * Who a street's odds are between: everyone still in once its betting was done, the way a broadcast drops a player
 * the moment they fold.
 */
function liveAt(r: Replay, street: Street): string[] {
  const upTo = STREETS.indexOf(street);
  const out = new Set(r.actions.filter((a) => a.move === 'fold' && STREETS.indexOf(a.street) <= upTo).map((a) => a.playerId));
  return r.players.map((p) => p.id).filter((id) => !out.has(id));
}

const oddsCache = new Map<string, StreetOdds[]>();

/**
 * Your win chance on each street, but only on streets where every hand still in is known (you and anyone who
 * showed); a street with a hand nobody saw is left out. An empty list when you folded or nobody showed.
 */
export function oddsByStreet(r: Replay): StreetOdds[] {
  const key = `${r.id}|${Object.keys(r.holes).sort().join(',')}`;
  const hit = oddsCache.get(key);
  if (hit) return hit;
  const out: StreetOdds[] = [];
  if (oddsGame(r.variant) && r.holes[r.me]?.length) {
    for (const street of STREETS) {
      const board = boardAt(r, street);
      if (!board) break;
      const live = liveAt(r, street);
      if (!live.includes(r.me)) break;
      if (live.length < 2 || live.some((id) => !r.holes[id]?.length)) continue;
      const order = [r.me, ...live.filter((id) => id !== r.me)];
      try {
        const eq = runoutOdds(r.variant, order.map((id) => r.holes[id]), board);
        const share = order.map((_, i) => eq.win[i] + eq.tie[i] / 2);
        out.push({ street, you: share[0], them: Math.max(...share.slice(1)) });
      } catch {
        break;
      }
    }
  }
  oddsCache.set(key, out);
  return out;
}

// ── Reading the hand ────────────────────────────────────────────────────────

const RANK_LABEL: Record<string, string> = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };
const label = (c: Card) => RANK_LABEL[c[0]] ?? c[0];

/** Two cards the way players say them, high card first: "7-2", "A-K". */
export function cardsLabel(cards: Card[]): string {
  return [...cards].sort((a, b) => rankOf(b) - rankOf(a)).map(label).join('-');
}

/**
 * Bill Chen's quick preflop score: the high card, doubled for a pair, plus a bit for suited and connected cards, less
 * for gaps. 7-2 off is -1, a hand most players fold is 2 or less.
 */
export function chenScore(cards: Card[]): number {
  const [a, b] = [...cards].sort((x, y) => rankOf(y) - rankOf(x));
  const value = (c: Card) => ({ 14: 10, 13: 8, 12: 7, 11: 6 })[rankOf(c)] ?? rankOf(c) / 2;
  if (rankOf(a) === rankOf(b)) return Math.max(5, Math.ceil(value(a) * 2));
  let s = value(a);
  if (a[1] === b[1]) s += 2;
  const gap = rankOf(a) - rankOf(b) - 1;
  s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  if (gap <= 1 && rankOf(a) < 12) s += 1;
  return Math.ceil(s);
}

/** Two-card games where a junk hand means something (wild deuces make 7-2 good). */
const twoCardGame = (v: Variant) => !['pineapple', 'deuces', 'beanstalk', 'imposter'].includes(v);

/** The hand you'd have folded: a Chen score of 2 or less. */
export const isJunk = (cards: Card[] | undefined): boolean => !!cards && cards.length === 2 && chenScore(cards) <= 2;

const pct = (x: number) => `${Math.round(x * 100)}%`;
const streetWords = (s: Street) => (s === 'preflop' ? 'before the flop' : `on the ${s}`);

/** "Hit a boat.", "Made a flush." */
function madeLine(v: HandValue): string {
  return ['Took it down.', 'Made a pair.', 'Made two pair.', 'Made trips.', 'Made a straight.', 'Made a flush.', 'Hit a boat.', 'Made quads.', 'Straight flush!', 'Royal flush!'][v.category] ?? 'Took it down.';
}

/** Your best hand at the end, when you saw the whole board. */
function finalHand(r: Replay, id: string): HandValue | null {
  const cards = r.holes[id];
  if (!cards?.length || r.variant === 'imposter' || r.board.length < 5) return null;
  if (r.actions.some((a) => a.playerId === id && a.move === 'fold')) return null;
  try {
    return bestHand(r.variant, cards, r.board);
  } catch {
    return null;
  }
}

/** A player's hand at the end, by name, when you can see their cards and they saw the river. */
export function handName(r: Replay, id: string): string | undefined {
  return r.names[id] ?? (id === r.me ? r.myHand : undefined) ?? finalHand(r, id)?.detail;
}

/** The strongest hand among the others who showed and didn't fold. */
function theirBest(r: Replay): HandValue | null {
  let best: HandValue | null = null;
  for (const id of Object.keys(r.holes)) {
    if (id === r.me) continue;
    const v = finalHand(r, id);
    if (v && (!best || v.score > best.score)) best = v;
  }
  return best;
}

/** "Pair of kings" in the middle of a sentence: "a pair of kings". */
const lower = (s: string) => {
  const l = s.charAt(0).toLowerCase() + s.slice(1);
  return l.startsWith('pair ') ? `a ${l}` : l;
};

/**
 * The one moment worth a headline, or null for an ordinary hand. `odds: false` skips the run-out maths (a list of
 * hands), which leaves out comebacks and bad beats.
 */
export function momentOf(r: Replay, opts: { odds?: boolean } = {}): HandMoment | null {
  const mine = r.holes[r.me] ?? [];
  const won = r.net > 0;
  const lost = r.net < 0;
  const me = finalHand(r, r.me);
  const them = r.showdown ? theirBest(r) : null;
  const odds = opts.odds === false ? [] : oddsByStreet(r).filter((o) => o.street !== 'river');
  const low = odds.reduce<StreetOdds | null>((m, o) => (!m || o.you < m.you ? o : m), null);
  const high = odds.reduce<StreetOdds | null>((m, o) => (!m || o.you > m.you ? o : m), null);
  const beat = me && them ? `${me.detail} beat ${lower(them.detail)}` : (me?.detail ?? '');

  // Played a hand most people fold, and won.
  const preflop = r.actions.filter((a) => a.playerId === r.me && a.street === 'preflop');
  const inVoluntarily = preflop.find((a) => a.move === 'call' || a.move === 'raise' || a.move === 'bet' || a.move === 'allin');
  if (won && twoCardGame(r.variant) && isJunk(mine) && inVoluntarily) {
    const verb = inVoluntarily.move === 'allin' ? 'Shoved' : inVoluntarily.move === 'call' ? 'Called with' : 'Raised with';
    const end = r.showdown && me ? madeLine(me) : 'Took it down.';
    const was = low && low.you <= 0.35 ? `${pct(low.you)} ${streetWords(low.street)}` : '';
    return { kind: 'junk', headline: `${verb} ${cardsLabel(mine)}. ${end}`, line: [beat, was].filter(Boolean).join(' · ') || `Won ${r.pot.toLocaleString('en-US')}` };
  }

  // Behind on a street and won it anyway.
  if (won && r.showdown && low && low.you <= 0.35) {
    return { kind: 'comeback', headline: `${pct(low.you)} ${streetWords(low.street)}. Won anyway.`, line: beat };
  }

  // Way ahead on a street and lost.
  if (lost && r.showdown && high && high.you >= 0.75) {
    return { kind: 'badBeat', headline: `${pct(high.you)} ${streetWords(high.street)}. Still lost.`, line: them ? `${them.detail} came from behind` : 'Bad beat' };
  }

  // A hand you see once in a long while.
  if (won && me && me.category >= 7) {
    return { kind: 'monster', headline: me.category === 7 ? 'Four of a kind.' : `${me.name}!`, line: me.detail };
  }

  // Won without a showdown holding nothing.
  if (won && !r.showdown && r.board.length >= 3 && mine.length === 2 && isAir(r)) {
    return { kind: 'bluff', headline: 'Nothing. Took it anyway.', line: `${cardsLabel(mine)} with no pair, and they folded` };
  }

  // Called a river bet with a weak hand and was right.
  const lastRiver = [...r.actions].reverse().find((a) => a.street === 'river' && a.playerId === r.me);
  const riverBet = r.actions.some((a) => a.street === 'river' && a.playerId !== r.me && (a.move === 'bet' || a.move === 'raise' || a.move === 'allin'));
  if (won && r.showdown && me && me.category <= 1 && lastRiver?.move === 'call' && riverBet) {
    return { kind: 'heroCall', headline: `Hero call with ${me.category === 0 ? `${cardsLabel(mine)} high` : lower(me.detail)}.`, line: 'Called the river bet and was right' };
  }

  // A big hand that still lost.
  if (lost && r.showdown && me && me.category >= 4) {
    return { kind: 'cooler', headline: `${me.name} wasn't enough.`, line: them ? `Lost to ${lower(them.detail)}` : me.detail };
  }

  // All in and it held.
  if (won && r.showdown && r.actions.some((a) => a.move === 'allin')) {
    return { kind: 'allIn', headline: 'All in. It held.', line: beat || `Won ${r.pot.toLocaleString('en-US')}` };
  }

  // A big pot: twenty big blinds or more.
  if (won && r.net >= r.bigBlind * 20) {
    return { kind: 'bigWin', headline: `Won ${Math.round(r.net / r.bigBlind)} big blinds.`, line: beat || `A ${r.pot.toLocaleString('en-US')} pot` };
  }
  return null;
}

/** The opponent a share card faces you with: one who showed, the one who put the most in. */
export function mainOpponent(r: Replay): string | null {
  const put = putIn(r);
  const shown = Object.keys(r.holes).filter((id) => id !== r.me);
  if (!shown.length) return null;
  return shown.sort((a, b) => (put[b] ?? 0) - (put[a] ?? 0))[0];
}
