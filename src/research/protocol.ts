import type { ResearchHand, ResearchFeedback } from './engine';
export interface ResearchMetadata {
  protocol: 'bot-research-1';
  engine: string;
  seed: number;
  limit: number;
  startedAt: number;
}
export interface ResearchReport {
  metadata: ResearchMetadata;
  expiresAt: number;
  hands: ResearchHand[];
}
export const researchId = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export const researchKey = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function parseMetadata(v: unknown): ResearchMetadata | null {
  if (
    !object(v) ||
    v.protocol !== 'bot-research-1' ||
    typeof v.engine !== 'string' ||
    v.engine.length > 100 ||
    !Number.isSafeInteger(v.seed) ||
    ![12, 60, 120].includes(v.limit as number) ||
    typeof v.startedAt !== 'number' ||
    !Number.isSafeInteger(v.startedAt) ||
    v.startedAt < 0
  )
    return null;
  return { protocol: v.protocol, engine: v.engine, seed: v.seed as number, limit: v.limit as number, startedAt: v.startedAt };
}
export function parseFeedback(v: unknown): ResearchFeedback | null {
  if (
    !object(v) ||
    typeof v.odd !== 'boolean' ||
    typeof v.note !== 'string' ||
    v.note.length > 1000 ||
    [v.realism, v.enjoyment].some((n) => n !== undefined && (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 5))
  )
    return null;
  return {
    odd: v.odd,
    note: v.note,
    ...(v.realism === undefined ? {} : { realism: v.realism as number }),
    ...(v.enjoyment === undefined ? {} : { enjoyment: v.enjoyment as number }),
  };
}
/** Bounded research-only payloads. Uploads are participant observations, not trusted training/promotion data. */
export function parseResearchHand(v: unknown, metadata: ResearchMetadata): ResearchHand | null {
  if (
    !object(v) ||
    v.protocol !== metadata.protocol ||
    v.engine !== metadata.engine ||
    v.seed !== metadata.seed ||
    !Number.isInteger(v.index) ||
    (v.index as number) < 0 ||
    (v.index as number) >= metadata.limit ||
    !['position', 'crowded', 'draws', 'pressure', 'sidepots', 'continuous'].includes(v.scenario as string) ||
    !object(v.initial) ||
    !object(v.initial.hand) ||
    v.initial.hand.result ||
    !Array.isArray(v.initial.players) ||
    v.initial.players.length < 2 ||
    v.initial.players.length > 6 ||
    !Array.isArray(v.initial.hand.seats) ||
    !Array.isArray(v.events) ||
    v.events.length > 500 ||
    !Array.isArray(v.decisions) ||
    v.decisions.length > 500 ||
    !object(v.result) ||
    !object(v.result.won) ||
    !Array.isArray(v.result.pots) ||
    !Array.isArray(v.board) ||
    v.board.length > 5 ||
    !object(v.holes) ||
    !object(v.endingStacks) ||
    typeof v.durationMs !== 'number' ||
    !Number.isFinite(v.durationMs) ||
    v.durationMs < 0 ||
    !parseFeedback(v.feedback)
  )
    return null;
  if (
    v.events.some(
      (e) =>
        !object(e) ||
        !['setup', 'human', 'bot'].includes(e.kind as string) ||
        !object(e.action) ||
        !['fold', 'check', 'call', 'bet', 'raise', 'allin'].includes(e.action.move as string) ||
        typeof e.action.playerId !== 'string' ||
        typeof e.elapsedMs !== 'number' ||
        !Number.isFinite(e.elapsedMs) ||
        e.elapsedMs < 0,
    )
  )
    return null;
  if (
    v.decisions.some(
      (d) =>
        !object(d) ||
        !object(d.information) ||
        !object(d.profile) ||
        !object(d.action) ||
        !object(d.philosophy) ||
        !object(d.rationale) ||
        typeof d.rationale.summary !== 'string' ||
        !Array.isArray(d.finalDistribution) ||
        !Array.isArray(d.actions) ||
        d.actions.length !== d.finalDistribution.length ||
        d.actions.length > 24,
    )
  )
    return null;
  return structuredClone(v) as unknown as ResearchHand;
}
export function researchReviewLink(origin: string, id: string, key: string): string {
  return `${origin}/#bot-research=${id}.${key}`;
}
