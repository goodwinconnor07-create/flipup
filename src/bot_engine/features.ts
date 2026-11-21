import { rankOf, suitOf } from '../game/cards';
import { category, flushDraw, straightOuts } from '../game/handBucket';
import type { InformationSet } from './information';

/** Interpretable normalized features computed only from legal information. */
export function features(i: InformationSet) {
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const opponents = i.players.filter((p) => p.id !== i.heroId && !p.folded);
  const pot = i.players.reduce((n, p) => n + p.total, 0);
  const eligiblePot = i.players.reduce((n, p) => n + Math.min(p.total, hero.total + i.legal.toCall), 0);
  const effective = Math.min(hero.stack, Math.max(0, ...opponents.map((p) => p.stack)));
  const seats = [...i.players].sort((a, b) => a.seat - b.seat);
  const button = seats.findIndex((p) => p.id === i.buttonId);
  const postOrder = seats.map((_, n) => seats[(button + n + 1) % seats.length]).filter((p) => !p.folded && !p.allIn);
  const ranks = i.board.map(rankOf);
  const suitCounts = ['s', 'h', 'd', 'c'].map((s) => i.board.filter((c) => suitOf(c) === s).length);
  return {
    potBb: pot / i.bigBlind,
    stackBb: hero.stack / i.bigBlind,
    effectiveStackBb: effective / i.bigBlind,
    stackToPot: pot ? effective / pot : null,
    eligiblePotBb: eligiblePot / i.bigBlind,
    simplifiedCallThreshold: i.legal.toCall ? i.legal.toCall / (eligiblePot + i.legal.toCall) : 0,
    opponents: opponents.length,
    inPosition: postOrder.at(-1)?.id === i.heroId,
    boardPaired: new Set(ranks).size !== ranks.length,
    maxBoardSuitCount: Math.max(0, ...suitCounts),
    highBoardRank: Math.max(0, ...ranks),
    handCategory: category([...i.hole, ...i.board]),
    flushDraw: i.board.length >= 3 && flushDraw(i.hole, i.board),
    straightCompletingRanks: i.board.length >= 3 && i.board.length < 5 ? straightOuts(i.hole, i.board) : 0,
    bettingReopened: i.legal.canRaise,
    callIsAllIn: i.legal.callIsAllIn,
  };
}
