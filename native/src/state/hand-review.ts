// The hand review of a saved hand (Premium), for the replay screen and the hand recap. The work is in the shared
// `src/train/handReview.ts`; this turns a `Replay` into what it needs and keeps each answer, since a hand's review
// never changes and the replay screen asks for it on every draw.
import { useEffect, useState } from 'react';

import { canReview, reviewHand, reviewSummary, type ReviewedMove } from '@train/handReview';

import type { Replay } from './replays';

export type { ReviewedMove } from '@train/handReview';
export { reviewSummary } from '@train/handReview';

const cache = new Map<string, ReviewedMove[] | null>();
const keyOf = (r: Replay) => `${r.id}|${r.holes[r.me]?.join('') ?? ''}`;

/** Whether this saved hand can have a review: Texas Hold'em, your own cards, a move of yours. */
export const reviewable = (r: Replay): boolean => canReview(r);

/** The review, worked out now (or from the cache). */
export function reviewOf(r: Replay): ReviewedMove[] | null {
  const key = keyOf(r);
  if (!cache.has(key)) {
    cache.set(
      key,
      reviewHand({
        variant: r.variant,
        smallBlind: r.smallBlind,
        bigBlind: r.bigBlind,
        buttonId: r.buttonId,
        bbId: r.bbId,
        me: r.me,
        players: r.players.map((p) => ({ id: p.id, stack: p.stack })),
        actions: r.actions,
        board: r.board,
        holes: r.holes,
        house: { ante: r.ante, straddle: !!r.straddle, bomb: !!r.bomb },
      }),
    );
  }
  return cache.get(key) ?? null;
}

/**
 * The review for a screen: worked out once the screen has finished opening (it can take a moment with several players
 * in), so the replay draws first. `undefined` while it's being worked out, `null` when there's none.
 */
export function useHandReview(r: Replay | undefined, on: boolean): ReviewedMove[] | null | undefined {
  const key = r ? keyOf(r) : '';
  const [state, setState] = useState<{ key: string; moves: ReviewedMove[] | null } | null>(null);
  useEffect(() => {
    if (!r || !on || !reviewable(r) || cache.has(key)) return;
    // After the screen's opening animation, so the replay draws first.
    const t = setTimeout(() => setState({ key, moves: reviewOf(r) }), 350);
    return () => clearTimeout(t);
  }, [key, on]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r || !on || !reviewable(r)) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  return state?.key === key ? state.moves : undefined;
}

/** The hand in a line, facts only: "Folded the better hand once", "Odds at 3 moves", or "Pot odds only". */
export function summaryLine(moves: ReviewedMove[]): string {
  const s = reviewSummary(moves);
  if (!s.exact) return 'Pot odds only';
  const times = (k: number) => (k === 1 ? 'once' : k === 2 ? 'twice' : `${k} times`);
  if (s.foldedAhead) return `Folded the better hand ${times(s.foldedAhead)}`;
  if (s.calledBehind) return `Called behind ${times(s.calledBehind)}`;
  return `Odds at ${s.exact} ${s.exact === 1 ? 'move' : 'moves'}`;
}
