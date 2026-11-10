// What the result card under a Range training answer shows, worked out without drawing anything: the verdict's
// words, and every opponent's range folded into three piles you can take in at a glance. The full breakdown (every
// group, every number) is the `range-breakdown` sheet; this is the short version.
import { callShare, type Grade, type OptionId, type RangeGroup, type Scenario } from '@train/ranges/model';

export const VERDICT: Record<Grade, string> = { best: 'Best play', ok: 'Also good', mistake: 'Missed it' };

/** One group of an opponent's range with its numbers (from range-numbers.json). */
export interface PileGroup {
  group: RangeGroup;
  weight: number;
  equity: number;
}

export type PileKey = 'beats' | 'beaten' | 'bluffs' | 'folds' | 'ahead' | 'behind';

export interface Pile {
  key: PileKey;
  label: string;
  /** Share of their range, 0 to 1 (the piles add up to 1). */
  share: number;
  /** Whether this pile is good news for you (drawn in the brand colour, the rest grey). */
  good: boolean;
}

const LABEL: Record<PileKey, string> = {
  beats: 'Beat you',
  beaten: 'You beat',
  bluffs: 'Bluffs',
  folds: 'Fold',
  ahead: 'Call, you’re ahead',
  behind: 'Call, you’re behind',
};

/** The bet the piles measure against when you can bet: your best bet, else the one the hand compares against. */
export function pileBet(s: Scenario): OptionId {
  return s.best.startsWith('bet') ? s.best : (s.compare ?? 'bet75');
}

/** The bet's size in words, for the line under the piles. */
export const BET_WORDS: Partial<Record<OptionId, string>> = { bet33: 'a ⅓-pot bet', bet75: 'a ¾-pot bet', bet125: 'an overbet' };

/**
 * Every opponent still in, as three piles. Facing a bet: the hands that beat you, the worse hands, and the bluffs.
 * When you can bet: what they do against the bet (fold, call when you're ahead, call when you're behind). Each
 * opponent counts the same, whatever the size of their range. Empty piles are left out.
 */
export function pilesOf(opponents: PileGroup[][], facing: boolean, dead: string[], bet: OptionId): Pile[] {
  const sum: Partial<Record<PileKey, number>> = {};
  const add = (k: PileKey, n: number) => (sum[k] = (sum[k] ?? 0) + n);
  const live = opponents.filter((gs) => gs.some((g) => g.weight > 0));
  for (const groups of live) {
    const total = groups.reduce((n, g) => n + g.weight, 0);
    for (const g of groups) {
      const w = g.weight / total / live.length;
      if (!w) continue;
      if (facing) add(g.group.role === 'bluff' ? 'bluffs' : g.equity < 0.5 ? 'beats' : 'beaten', w);
      else {
        const calls = callShare(g.group, dead, bet);
        add('folds', w * (1 - calls));
        add(g.equity < 0.5 ? 'behind' : 'ahead', w * calls);
      }
    }
  }
  const order: PileKey[] = facing ? ['beats', 'beaten', 'bluffs'] : ['folds', 'ahead', 'behind'];
  const good = new Set<PileKey>(['beaten', 'bluffs', 'folds', 'ahead']);
  return order.filter((k) => (sum[k] ?? 0) > 0.0005).map((k) => ({ key: k, label: LABEL[k], share: sum[k]!, good: good.has(k) }));
}

/** Confetti only for runs worth marking: 3, 5, 10, then every 10. A single best play just pops its verdict. */
export const cheersRun = (run: number): boolean => run === 3 || run === 5 || (run >= 10 && run % 10 === 0);

/** Hands in a set: you play five, then see how the set went. */
export const SET_SIZE = 5;

/** The end of a set in a few words, by how many of the five were the best play. */
export function setVerdict(best: number, total = SET_SIZE): string {
  if (best >= total) return 'Perfect set';
  if (best >= total - 1) return 'Strong set';
  if (best >= Math.ceil(total / 2)) return 'Good set';
  return 'Keep at it';
}
