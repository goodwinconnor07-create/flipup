import { fullDeck, rankOf, type Card } from '../game/cards';
import { scoreHand } from '../game/evaluate';
import type { InformationSet } from './information';
import { handBucket } from '../game/handBucket';
import { preflopLikelihood } from './preflopContext';
import { publicRangeLikelihood } from './rangeAnalysis';
import { ownHandKind } from './handPlan';

export interface Holding {
  cards: [Card, Card];
  weight: number;
}
export interface OpponentRange {
  playerId: string;
  holdings: Holding[];
  source:
    | 'smoothed-action-heuristic'
    | 'street-aware-action-heuristic'
    | 'commitment-aware-heuristic'
    | 'public-action-range-model'
    | 'public-action-range-model-2';
}

export function normalizeRange(holdings: Holding[]): Holding[] {
  const total = holdings.reduce((sum, h) => sum + h.weight, 0);
  if (!(total > 0) || holdings.some((h) => !Number.isFinite(h.weight) || h.weight < 0 || h.cards[0] === h.cards[1]))
    throw new Error('Invalid range');
  return holdings.map((h) => ({ cards: [...h.cards], weight: h.weight / total }));
}

/** Exact combinations; the likelihood model is an explicit untrained approximation. */
export function inferRanges(
  i: InformationSet,
  revision: 'legacy' | 'street-aware' | 'commitment-aware' | 'public-range' | 'public-range-v2' = 'street-aware',
): OpponentRange[] {
  const blocked = new Set([...i.hole, ...i.board]);
  const deck = fullDeck().filter((c) => !blocked.has(c));
  return i.players
    .filter((p) => p.id !== i.heroId && !p.folded)
    .map((p) => {
      const holdings: Holding[] = [];
      for (let a = 0; a < deck.length; a++)
        for (let b = a + 1; b < deck.length; b++) {
          const cards: [Card, Card] = [deck[a], deck[b]];
          // Untrained preflop strength proxy for smoothing public-action likelihoods.
          const hi = Math.max(rankOf(cards[0]), rankOf(cards[1]));
          const lo = Math.min(rankOf(cards[0]), rankOf(cards[1]));
          const quality = Math.min(1, ((hi + lo - 4) / 24) * 0.65 + (hi === lo ? 0.35 : 0) + (cards[0][1] === cards[1][1] ? 0.06 : 0));
          let weight =
            revision === 'public-range' || revision === 'public-range-v2'
              ? publicRangeLikelihood(i, p.id, cards, revision === 'public-range-v2' ? ownHandKind : undefined)
              : revision === 'commitment-aware'
                ? preflopLikelihood(i, p.id, quality, cards[0][1] === cards[1][1], hi === lo)
                : 1;
          const strengths = new Map<string, number>();
          for (const action of i.actions.filter((a) => a.playerId === p.id && !a.outOfTurn)) {
            if (revision === 'public-range' || revision === 'public-range-v2') continue;
            if (revision === 'commitment-aware' && action.street === 'preflop') continue;
            // No future board is used to evaluate what an opponent knew on an earlier street.
            let strength = quality;
            if (revision !== 'legacy' && action.street !== 'preflop') {
              const board = i.board.slice(0, { flop: 3, turn: 4, river: 5 }[action.street]);
              if (!strengths.has(action.street))
                strengths.set(
                  action.street,
                  { monster: 0.98, strong: 0.85, top: 0.68, mid: 0.4, draw: 0.48, weak: 0.22, air: 0.08 }[handBucket(cards, board)],
                );
              strength = strengths.get(action.street)!;
            }
            if (action.move === 'bet' || action.move === 'raise' || action.move === 'allin') weight *= 0.15 + strength * 0.75;
            else if (action.move === 'call') weight *= 0.3 + strength * 0.5;
            else if (action.move === 'check') weight *= 0.9 - strength * 0.2;
          }
          holdings.push({ cards, weight: Math.max(1e-12, weight) });
        }
      return {
        playerId: p.id,
        holdings: normalizeRange(holdings),
        source:
          revision === 'public-range-v2'
            ? 'public-action-range-model-2'
            : revision === 'public-range'
              ? 'public-action-range-model'
              : revision === 'legacy'
                ? 'smoothed-action-heuristic'
                : revision === 'commitment-aware'
                  ? 'commitment-aware-heuristic'
                  : 'street-aware-action-heuristic',
      };
    });
}

/** Sequential conditional sampling respects joint card removal. Not an exact joint posterior. */
export function sampleDeal(i: InformationSet, ranges: OpponentRange[], rng: () => number): { opponents: Card[][]; board: Card[] } {
  const used = new Set([...i.hole, ...i.board]);
  const opponents: Card[][] = [];
  for (const range of ranges) {
    const allowed = range.holdings.filter((h) => !h.cards.some((c) => used.has(c)));
    const total = allowed.reduce((sum, h) => sum + h.weight, 0);
    if (!(total > 0)) throw new Error('Incompatible ranges');
    let draw = rng() * total;
    let chosen = allowed.at(-1)!;
    for (const h of allowed) {
      draw -= h.weight;
      if (draw < 0) {
        chosen = h;
        break;
      }
    }
    opponents.push([...chosen.cards]);
    chosen.cards.forEach((c) => used.add(c));
  }
  const deck = fullDeck().filter((c) => !used.has(c));
  const board = [...i.board];
  while (board.length < 5) {
    const at = Math.floor(rng() * deck.length);
    board.push(deck[at]);
    deck.splice(at, 1);
  }
  return { opponents, board };
}

export function estimateEquity(
  i: InformationSet,
  ranges: OpponentRange[],
  rng: () => number,
  samples: number,
): { mean: number; standardError: number } {
  let sum = 0,
    squares = 0;
  for (let n = 0; n < samples; n++) {
    const deal = sampleDeal(i, ranges, rng);
    const scores = [i.hole, ...deal.opponents].map((h) => scoreHand([...h, ...deal.board]));
    const best = Math.max(...scores);
    const share = scores[0] === best ? 1 / scores.filter((s) => s === best).length : 0;
    sum += share;
    squares += share * share;
  }
  const mean = sum / samples;
  return { mean, standardError: samples > 1 ? Math.sqrt(Math.max(0, (squares - samples * mean * mean) / (samples - 1)) / samples) : 0.5 };
}
