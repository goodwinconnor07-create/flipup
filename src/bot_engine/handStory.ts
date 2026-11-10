import type { BotMemory } from './memory';
import type { InformationSet } from './information';
import type { DecisionTrace } from './service';
import type { Street } from '../game/types';
export type NextCardPlan =
  | 'reassess-board-and-price'
  | 'continue-value-on-safe-card'
  | 'realize-draw-at-price'
  | 'slow-down-without-improvement'
  | 'protect-showdown-value'
  | 'no-more-board-cards'
  | 'hand-ended';
export function nextCardPlan(street: Street, move: string, principle: string, hand: { level: number; draw: string } | null): NextCardPlan {
  if (move === 'fold') return 'hand-ended';
  if (street === 'river') return 'no-more-board-cards';
  if (['build-value-pot', 'seek-thin-value', 'retain-showdown-and-trap-option'].includes(principle)) return 'continue-value-on-safe-card';
  if (hand && hand.draw !== 'none') return 'realize-draw-at-price';
  if (
    ['probe-checks', 'continue-selective-pressure', 'use-model-supported-fold-equity', 'pressure-active-side-contest'].includes(principle)
  )
    return 'slow-down-without-improvement';
  if (hand && hand.level >= 3) return 'protect-showdown-value';
  return 'reassess-board-and-price';
}
export interface HandStory {
  version: 'hand-story-1';
  hand: number;
  actionIndex: number;
  street: Street;
  principle: string;
  move: string;
  to?: number;
  facedPrice: number;
  level: number | null;
  draw: string;
  nextCard: NextCardPlan;
}
const plans: NextCardPlan[] = [
  'reassess-board-and-price',
  'continue-value-on-safe-card',
  'realize-draw-at-price',
  'slow-down-without-improvement',
  'protect-showdown-value',
  'no-more-board-cards',
  'hand-ended',
];
export function validateHandStory(s: HandStory): void {
  if (
    s.version !== 'hand-story-1' ||
    !Number.isSafeInteger(s.hand) ||
    s.hand < 0 ||
    !Number.isSafeInteger(s.actionIndex) ||
    s.actionIndex < 0 ||
    !['preflop', 'flop', 'turn', 'river'].includes(s.street) ||
    typeof s.principle !== 'string' ||
    !s.principle ||
    s.principle.length > 80 ||
    !['fold', 'check', 'call', 'bet', 'raise', 'allin'].includes(s.move) ||
    !Number.isSafeInteger(s.facedPrice) ||
    s.facedPrice < 0 ||
    (s.to !== undefined && (!Number.isSafeInteger(s.to) || s.to < 0)) ||
    (s.level !== null && (!Number.isInteger(s.level) || s.level < 0 || s.level > 11)) ||
    !plans.includes(s.nextCard) ||
    typeof s.draw !== 'string'
  )
    throw new Error('Invalid private hand story');
}
/** An intention influences the next decision only after its public action actually happens. */
export function confirmedHandStory(m: BotMemory, i: InformationSet): HandStory | undefined {
  for (const s of [m.pendingHandStory, m.handStory]) {
    if (!s || s.hand !== i.hand) continue;
    validateHandStory(s);
    const a = i.actions[s.actionIndex];
    if (!a || a.playerId !== i.heroId || a.street !== s.street || a.outOfTurn) continue;
    const aggressive = ['bet', 'raise', 'allin'].includes(a.move) && a.to > s.facedPrice;
    if (s.to !== undefined) {
      if (!aggressive || a.to !== s.to) continue;
    } else if (s.move === 'call') {
      if (aggressive || !['call', 'allin'].includes(a.move)) continue;
    } else if (a.move !== s.move) continue;
    return {
      version: s.version,
      hand: s.hand,
      actionIndex: s.actionIndex,
      street: s.street,
      principle: s.principle,
      move: s.move,
      ...(s.to === undefined ? {} : { to: s.to }),
      facedPrice: s.facedPrice,
      level: s.level,
      draw: s.draw,
      nextCard: s.nextCard,
    };
  }
}
/** Adapters persist one compact intention; the pure decision service never mutates memory. */
export function rememberHandStory(m: BotMemory, t: DecisionTrace): void {
  const i = t.information;
  if (m.botId !== i.heroId || m.tableId !== i.tableId) throw new Error('Hand story identity mismatch');
  const previous = confirmedHandStory(m, i);
  if (previous) m.handStory = previous;
  else if (m.handStory?.hand !== i.hand) delete m.handStory;
  const p = t.philosophy.actions[t.rationale.actionIndex];
  m.pendingHandStory = {
    version: 'hand-story-1',
    hand: i.hand,
    actionIndex: i.actions.length,
    street: i.street,
    principle: p.principle,
    move: t.action.move,
    ...(t.action.to === undefined ? {} : { to: t.action.to }),
    facedPrice: i.currentBet,
    level: t.philosophy.plan?.level ?? null,
    draw: t.philosophy.plan?.draw ?? 'none',
    nextCard: p.nextCard,
  };
}
