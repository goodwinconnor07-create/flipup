// What happened in one hand against your AI twin, kept in a few fields so the report works after the
// hand history has forgotten the hand. Built once the hand is over, from the whole table's cards (a
// local game has them all), so it may name the twin's cards: they were already hidden until then.

import { heroDecisions, POST_BUCKETS, type HandRecord, type Street } from '../game';
import { handBucket } from '../game/handBucket';

export interface HandFacts {
  /** You had the button. */
  btn: boolean;
  mine: string[];
  theirs: string[];
  board: string[];
  /** It went to a showdown. */
  sd: boolean;
  /** The street you folded on, if you did. */
  fold?: Street;
  /** The street the hand ended on. */
  out: Street;
  /** The twin bet or raised after the flop with a weak hand or a draw, and: you folded ('worked') or called and won ('caught'). */
  bluff?: 'worked' | 'caught';
  /** On a bluff that worked: you folded a better hand than it had. */
  better?: boolean;
}

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const BOARD_AT: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

/** The facts of a finished hand, or null when it can't be read (not heads-up, or the cards weren't recorded). */
export function handFacts(r: HandRecord, heroId: string): HandFacts | null {
  const foe = r.players.find((p) => p.id !== heroId);
  const mine = r.holes[heroId];
  const theirs = foe ? r.holes[foe.id] : undefined;
  if (!foe || r.players.length !== 2 || !mine || mine.length !== 2) return null;
  const last = r.actions[r.actions.length - 1];
  const out: Street = r.showdown ? (r.board.length >= 5 ? 'river' : STREETS[Math.max(0, STREETS.findIndex((s) => BOARD_AT[s] === r.board.length))]) : (last?.street ?? 'preflop');
  const facts: HandFacts = { btn: r.buttonId === heroId, mine: [...mine], theirs: theirs ? [...theirs] : [], board: [...r.board], sd: r.showdown, out };
  const myMoves = heroDecisions(r, heroId);
  const fold = myMoves.find((d) => d.move === 'fold');
  if (fold) facts.fold = fold.spot.street;

  // Did it bluff me? Its last bet or raise after the flop with a draw, a weak hand or nothing.
  if (theirs && theirs.length === 2) {
    const aggressive = (m: string) => m === 'betS' || m === 'betB' || m === 'raise' || m === 'allin';
    const bluffs = heroDecisions(r, foe.id).filter((d) => d.spot.street !== 'preflop' && aggressive(d.move) && d.spot.strength <= POST_BUCKETS.indexOf('draw'));
    const bluff = bluffs[bluffs.length - 1];
    if (bluff) {
      const street = bluff.spot.street;
      if (fold && fold.spot.street === street) {
        facts.bluff = 'worked';
        facts.better = fold.spot.strength > bluff.spot.strength;
      } else if (r.showdown && !fold && (r.won[heroId] ?? 0) > 0) facts.bluff = 'caught';
    }
  }
  return facts;
}

/** Your hand and theirs in words for a street's board, for the report ("top pair", "nothing"). */
export function bucketAt(cards: string[], board: string[], street: Street): string {
  const shown = board.slice(0, BOARD_AT[street]);
  return shown.length >= 3 ? handBucket(cards, shown) : 'air';
}
