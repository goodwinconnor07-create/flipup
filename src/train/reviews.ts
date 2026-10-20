// Getting GTO reviews of saved hands and keeping them on this phone.

import { reviewHands, toHandHistory } from '../gto/api';
import type { HandReport, Job } from '../gto/types';
import { loadReport, saveReview, type PlayedHand, type ReviewSummary } from '../state/training';

export function summarise(key: string, report: HandReport): ReviewSummary {
  return {
    key,
    at: Date.now(),
    decisions: report.decisions
      .filter((d) => !d.pending)
      .map((d) => ({ street: d.street, colour: d.colour ?? null, evLoss: d.ev_loss_bb ?? null, scenario: d.scenario ?? null })),
  };
}

/** Reviews hands with the coach (one job for all of them) and saves each report. */
export async function reviewAndSave(hands: PlayedHand[], onProgress?: (done: number, total: number) => void): Promise<Record<string, HandReport>> {
  const out: Record<string, HandReport> = {};
  // The coach reviews one player per job, so group the hands by which seat was you.
  const byHero = new Map<string, PlayedHand[]>();
  for (const h of hands) byHero.set(h.heroId, [...(byHero.get(h.heroId) ?? []), h]);
  let done = 0;
  for (const [hero, group] of byHero) {
    const res = await reviewHands(
      group.map((h) => toHandHistory(h.record)),
      hero,
      (j: Job<unknown>) => onProgress?.(done + (Number.isFinite(j.progress) ? j.progress : 0), hands.length),
    );
    const reports = Array.isArray(res?.hands) ? res.hands : [];
    group.forEach((h, i) => {
      // Match by id. Only if the service sent every hand back in order is the position good enough.
      const report = reports.find((r) => r?.hand_id === h.key) ?? (reports.length === group.length ? reports[i] : undefined);
      if (!report || !Array.isArray(report.decisions)) return;
      saveReview(summarise(h.key, report), report);
      out[h.key] = report;
    });
    done += group.length;
  }
  return out;
}

// Reviews still solving, by hand key, so leaving the screen and coming back picks up the same job.
const inFlight = new Map<string, Promise<HandReport | null>>();

/** One hand's review: the saved report, the one already solving, or a new one. */
export function reviewHand(hand: PlayedHand): Promise<HandReport | null> {
  const saved = savedReport(hand.key);
  if (saved) return Promise.resolve(saved);
  let p = inFlight.get(hand.key);
  if (!p) {
    p = reviewAndSave([hand])
      .then((out) => out[hand.key] ?? null)
      .finally(() => inFlight.delete(hand.key));
    inFlight.set(hand.key, p);
  }
  return p;
}

export const savedReport = (key: string) => loadReport<HandReport>(key);
