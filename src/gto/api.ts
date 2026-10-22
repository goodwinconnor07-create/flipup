// Calls to the GTO coach service, through the Worker's /api/gto proxy.

import { apiUrl } from '../state/platform';
import type { HandRecord } from '../game';
import { isPreflopScenario, localPreflopDrill, PREFLOP_SCENARIOS } from './preflop';
import type { CustomRequest, CustomSpot, Drill, HandHistory, HandReport, Job, Scenario } from './types';

// The coach can take a while to answer while it's solving, or waking up after a quiet spell, so
// wait generously and try a dropped request once more before giving up.
async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 60000): Promise<T> {
  let res: Response | undefined;
  for (let attempt = 0; attempt < 2 && !res; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      res = await fetch(apiUrl(`/api/gto${path}`), {
        ...init,
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
      });
    } catch {
      if (attempt === 1) throw new Error("Couldn't reach the GTO coach. Check your connection.");
    } finally {
      clearTimeout(timer);
    }
  }
  if (!res) throw new Error("Couldn't reach the GTO coach. Check your connection.");
  if (!res.ok) {
    let msg = 'The GTO coach had a problem. Try again.';
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      msg = body.error || body.detail || msg;
    } catch {
      // keep the default
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

const post = <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) });

/** Polls a background job until it's done, reporting progress. */
export async function waitForJob<T>(id: string, onProgress?: (j: Job<T>) => void, signal?: { cancelled: boolean }): Promise<T> {
  for (let i = 0; ; i++) {
    if (signal?.cancelled) throw new Error('Cancelled.');
    const job = await call<Job<T>>(`/jobs/${id}`);
    onProgress?.(job);
    if (job.status === 'done' && job.result) return job.result;
    if (job.status === 'error') throw new Error(job.error || 'The review failed.');
    await new Promise((r) => setTimeout(r, Math.min(4000, 1000 + i * 250)));
  }
}

export async function reviewHands(hands: HandHistory[], hero: string, onProgress?: (j: Job<unknown>) => void) {
  const { job } = await post<{ job: string }>('/review/session', { hands, hero });
  return waitForJob<{ hands: HandReport[] }>(job, onProgress);
}

export async function analyzeHand(hand: HandHistory, hero?: string, onProgress?: (j: Job<unknown>) => void) {
  const { job } = await post<{ job: string }>('/analyze', { hand, hero });
  return waitForJob<HandReport>(job, onProgress);
}

/** The custom hand so far. If a street needs solving first, waits for it (reporting the message). */
export async function customSpot(req: CustomRequest, onSolving?: (message: string) => void, signal?: { cancelled: boolean }) {
  const first = await post<CustomSpot>('/custom/spot', req);
  if (first.status !== 'solving' || !first.job) return first;
  onSolving?.(first.message ?? 'Solving…');
  return waitForJob<CustomSpot>(first.job, undefined, signal);
}

/** The practice list. Without a connection the preflop drills still work, so those are listed. */
export const listScenarios = () => call<Scenario[]>('/library').catch(() => PREFLOP_SCENARIOS);

/** A practice hand. Preflop ones are dealt on the phone from the shipped solution; the rest come from the service. */
export async function getDrill(scenario: string, seed?: number): Promise<Drill> {
  if (isPreflopScenario(scenario)) {
    try {
      return await localPreflopDrill(scenario, seed);
    } catch {
      // No local data, or no spot found: ask the service instead.
    }
  }
  return call<Drill>(`/library/${encodeURIComponent(scenario)}/drill${seed === undefined ? '' : `?seed=${seed}`}`);
}

/** A recorded hand in the service's format, with only the hole cards this phone could see. */
export function toHandHistory(r: HandRecord): HandHistory {
  return {
    id: `${r.tableId}#${r.number}`,
    small_blind: r.smallBlind,
    big_blind: r.bigBlind,
    button: r.buttonId,
    players: r.players.map((p) => ({ id: p.id, name: p.name, seat: p.seat, stack: p.stack, cards: r.holes[p.id] ?? null })),
    actions: r.actions.map((a) => ({ street: a.street, player: a.playerId, move: a.move, to: a.to, out_of_turn: a.outOfTurn })),
    board: r.board,
  };
}
