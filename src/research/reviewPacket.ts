import type { ResearchReport } from './protocol';
import { reviewResearch } from './review';
const rounded = (v: number | null | undefined) => (v == null ? null : Math.round(v * 10000) / 10000);
/** All hands and every chosen explanation, with public decision context. Full private replay snapshots are optional separately. */
export function createResearchReviewPacket(report: ResearchReport) {
  const { flags: _flags, ...summary } = reviewResearch(report);
  return {
    format: 'flipup-research-review-1' as const,
    metadata: report.metadata,
    summary,
    limitations:
      'This review copy omits private pre-hand memory and undealt cards. Scores, probabilities and timings are rounded to four decimals. Exact replay requires the full replay packet.',
    hands: report.hands.map((h) => ({
      index: h.index,
      scenario: h.scenario,
      board: h.board,
      holes: h.holes,
      feedback: h.feedback,
      result: h.result,
      endingStacks: h.endingStacks,
      durationMs: rounded(h.durationMs),
      table: {
        hand: h.initial.hand!.number,
        button: h.initial.hand!.buttonId,
        smallBlind: h.initial.hand!.sbId,
        bigBlind: h.initial.hand!.bbId,
        blinds: [h.initial.settings.smallBlind, h.initial.settings.bigBlind],
        startStacks: h.initial.hand!.startStacks,
        players: h.initial.players.map((p) => ({ id: p.id, name: p.name, seat: p.seat, bot: p.bot })),
      },
      events: h.events.map((e) => ({ ...e, elapsedMs: rounded(e.elapsedMs) })),
      decisions: h.decisions.map((d) => ({
        information: d.information,
        action: d.action,
        focus: d.profile.everyday?.focus ?? d.profile.personality ?? 'original',
        model: d.model,
        source: d.source,
        rationale: {
          ...d.rationale,
          scoreGapBb: rounded(d.rationale.scoreGapBb),
          closeBandBb: rounded(d.rationale.closeBandBb),
          alternatives: d.rationale.alternatives.map((a) => ({
            ...a,
            probability: rounded(a.probability),
            scoreGapBb: rounded(a.scoreGapBb),
          })),
        },
        handPlan: d.philosophy.plan,
        confirmedStory: d.philosophy.story,
        facts: d.philosophy.facts,
        session: d.philosophy.session,
        chosen: d.philosophy.actions[d.rationale.actionIndex],
        actions: d.actions,
        scores: d.scores?.map(rounded) ?? null,
        probabilities: d.finalDistribution.map(rounded),
        deviation: {
          estimatedValueLoss: rounded(d.deviation.estimatedValueLoss),
          budget: rounded(d.deviation.budget),
          blend: rounded(d.deviation.blend),
        },
      })),
    })),
  };
}
export type ResearchReviewPacket = ReturnType<typeof createResearchReviewPacket>;
