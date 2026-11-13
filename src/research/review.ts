import type { ResearchReport } from './protocol';
import { SCENARIOS } from './engine';
export function reviewResearch(report: ResearchReport) {
  const decisions = report.hands.flatMap((h) => h.decisions);
  const byScenario = Object.entries(SCENARIOS).map(([id, s]) => {
    const hands = report.hands.filter((h) => h.scenario === id),
      d = hands.flatMap((h) => h.decisions);
    return {
      id,
      title: s.title,
      hands: hands.length,
      decisions: d.length,
      flagged: hands.filter((h) => h.feedback.odd).length,
      humanDecisions: hands.flatMap((h) => h.events).filter((e) => e.kind === 'human').length,
    };
  });
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  const flags = report.hands
    .filter((h) => h.feedback.odd || h.feedback.note)
    .map((h) => ({
      index: h.index,
      scenario: h.scenario,
      feedback: h.feedback,
      decisions: h.decisions.map((d) => ({
        actor: d.information.heroId,
        street: d.information.street,
        action: d.action,
        rationale: d.rationale.summary,
      })),
    }));
  const aggression: Record<string, { actions: number; aggressive: number; calls: number; folds: number }> = {};
  for (const d of decisions) {
    const key = d.profile.everyday?.focus ?? 'balanced',
      row = (aggression[key] ??= { actions: 0, aggressive: 0, calls: 0, folds: 0 });
    row.actions++;
    if (d.action.to !== undefined) row.aggressive++;
    if (d.action.move === 'call') row.calls++;
    if (d.action.move === 'fold') row.folds++;
  }
  return {
    protocol: report.metadata.protocol,
    engine: report.metadata.engine,
    hands: report.hands.length,
    planned: report.metadata.limit,
    botDecisions: decisions.length,
    humanDecisions: report.hands.flatMap((h) => h.events).filter((e) => e.kind === 'human').length,
    scriptedSetupActions: report.hands.flatMap((h) => h.events).filter((e) => e.kind === 'setup').length,
    activeMinutes: report.hands.reduce((s, h) => s + h.durationMs, 0) / 60000,
    explained: decisions.filter((d) => !!d.rationale.summary && !!d.rationale.principle).length,
    // A choice an everyday habit made (bet when checked to, keep a pair in) may sit outside the model's close-choice band.
    unsupportedChoices: decisions.filter((d) => !d.habit && !d.philosophy.actions[d.rationale.actionIndex]?.plausible).length,
    meanRealism: mean(report.hands.flatMap((h) => (h.feedback.realism ? [h.feedback.realism] : []))),
    meanEnjoyment: mean(report.hands.flatMap((h) => (h.feedback.enjoyment ? [h.feedback.enjoyment] : []))),
    byScenario,
    aggression,
    flags,
    limitations: [
      'One participant and deliberately selected situations; results do not estimate population retention or overall win rate.',
      'Setup actions are scripted and labelled, and are excluded from bot decision metrics. The continuous segment uses natural deals.',
      'Participant-uploaded records are review evidence, not independently authenticated training or promotion results.',
    ],
  };
}
