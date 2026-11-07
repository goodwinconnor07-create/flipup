// Challenge best scores on this phone: `flipup.challenges`, { [id]: { best, plays, lastAt } }. Challenge chips are
// pretend, so nothing here touches your poker record (flipup.record) or Home's last game.
import { isChallengeId, isNewBest, type ChallengeId } from '@/engine';

import { read, save, useStored } from './storage';

const KEY = 'flipup.challenges';

export interface ChallengeBest {
  best: number;
  plays: number;
  lastAt: number;
}

type Bests = Partial<Record<ChallengeId, ChallengeBest>>;

const EMPTY: Bests = {};

function clean(raw: unknown): Bests {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const out: Bests = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const b = v as Partial<ChallengeBest> | null;
    if (!isChallengeId(id) || !b || typeof b.best !== 'number' || typeof b.plays !== 'number') continue;
    out[id] = { best: Math.max(0, Math.round(b.best)), plays: Math.max(0, Math.round(b.plays)), lastAt: typeof b.lastAt === 'number' ? b.lastAt : 0 };
  }
  return out;
}

export function useChallengeBests(): Bests {
  return clean(useStored<unknown>(KEY, EMPTY));
}

export function bestOf(id: ChallengeId): ChallengeBest | undefined {
  return clean(read<unknown>(KEY, EMPTY))[id];
}

/** Notes a finished run. Returns the best before it, and whether this one beat it. */
export function noteRun(id: ChallengeId, score: number, at: number): { before: ChallengeBest | undefined; newBest: boolean } {
  const all = clean(read<unknown>(KEY, EMPTY));
  const before = all[id];
  const newBest = isNewBest(score, before);
  save(KEY, { ...all, [id]: { best: Math.max(before?.best ?? 0, score), plays: (before?.plays ?? 0) + 1, lastAt: at } });
  return { before, newBest };
}
