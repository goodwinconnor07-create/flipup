import type { BotMove } from '../game/botPlay';
import { rankOf, type Card } from '../game/cards';
import { boardTexture, flushDraw, handBucket, straightOuts } from '../game/handBucket';
import type { InformationSet } from './information';

/**
 * Multiway restraint: a weak hand doesn't bet into two or more players on a scary board.
 *
 * Why this exists: in the owner's recorded hand (13 Nov 2026) pocket fives bet into two players on A-J-10, twice. Against
 * two callers on a board like that almost any hand that continues has the fives beaten, and nobody folds anything
 * better. Measured on Casual tables before this, a pocket pair under two or more board cards bet 25% of the time into
 * several players on such boards: the hand buckets call it middle pair, so the "bet when checked to" habit pushed it.
 *
 * The rule, run after the habits: nobody has bet, two or more players are still live behind or before the bot, the board
 * is scary (connected, three of a suit, or two cards ten or higher), and the bot holds a weak hand with no draw (a pocket
 * pair under two or more board cards, overcards or a gutshot, or nothing). Then its bets together keep at most
 * `KEEP[0]` against two players and `KEEP[1]` against three or more (a rare stab still happens), and the rest goes to
 * the check. It only ever takes probability from bets, never adds a fold, and reads only public cards and the bot's own.
 */

/** The most a weak hand bets into two players, and into three or more, on a scary board. */
export const KEEP: [number, number] = [0.06, 0.03];

/** Connected, three of a suit, or two cards ten or higher: a board several players have often hit. */
export function scaryBoard(board: Card[]): boolean {
  const texture = boardTexture(board);
  return texture === 'wet' || texture === 'mono' || board.filter((c) => rankOf(c) >= 10).length >= 2;
}

/** A hand with little showdown value and no draw: an underpair to two board cards, overcards or a gutshot, or nothing. */
export function weakNoDraw(hole: Card[], board: Card[]): boolean {
  if (board.length < 5 && (flushDraw(hole, board) || straightOuts(hole, board) >= 2)) return false;
  const bucket = handBucket(hole, board);
  if (bucket === 'weak' || bucket === 'air') return true;
  const [a, b] = hole.map(rankOf);
  return bucket === 'mid' && a === b && board.filter((c) => rankOf(c) > a).length >= 2;
}

export interface MultiwayResult {
  distribution: number[];
  /** What changed, for the decision trace; null when nothing did. */
  note: string | null;
}

export function applyMultiwayRestraint(i: InformationSet, actions: BotMove[], distribution: number[]): MultiwayResult {
  const same: MultiwayResult = { distribution, note: null };
  if (i.street === 'preflop' || !i.legal.canCheck || i.currentBet > 0) return same;
  const live = i.players.filter((p) => p.id !== i.heroId && !p.folded && !p.allIn).length;
  if (live < 2 || !scaryBoard(i.board) || !weakNoDraw(i.hole, i.board)) return same;
  const checkIdx = actions.findIndex((a) => a.move === 'check');
  if (checkIdx < 0) return same;
  const bets = actions.map((a, k) => ({ a, k })).filter(({ a }) => a.move === 'bet' || a.move === 'allin');
  const betting = bets.reduce((s, { k }) => s + distribution[k], 0);
  const keep = live >= 3 ? KEEP[1] : KEEP[0];
  if (betting <= keep + 0.002) return same;
  const scale = keep / betting;
  const next = [...distribution];
  for (const { k } of bets) next[k] *= scale;
  next[checkIdx] += betting - keep;
  return { distribution: next, note: `multiway:weak-checks-${live}-players` };
}
