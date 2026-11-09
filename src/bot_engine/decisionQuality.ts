import type { DecisionTrace } from './service';
/** Flags possible leaks under the bot's own approximate model, not certified poker mistakes. */
export class DecisionQualityAudit {
  counts = { decisions: 0, missedValue: 0, weakCalls: 0, abandonedBluffs: 0 };
  examples: { kind: string; decisionId: string; gapBb: number }[] = [];
  observe(t: DecisionTrace) {
    if (t.information.street === 'preflop' || !t.prediction.values) return;
    this.counts.decisions++;
    const p = t.prediction,
      values = p.rolloutValues ?? p.values!,
      errors = p.valueStandardErrors ?? values.map(() => 0);
    const aggressive = p.actions.map((a, k) => (a.to !== undefined ? k : -1)).filter((k) => k >= 0);
    const passive = p.actions.map((a, k) => (a.to === undefined ? k : -1)).filter((k) => k >= 0);
    const best = (indices: number[]) => indices.reduce((a, b) => (values[a] > values[b] ? a : b));
    const flag = (kind: 'missedValue' | 'weakCalls' | 'abandonedBluffs', gap: number) => {
      this.counts[kind]++;
      if (this.examples.length < 20) this.examples.push({ kind, decisionId: t.decisionId, gapBb: gap / t.information.bigBlind });
    };
    if (aggressive.length && passive.length) {
      const a = best(aggressive),
        b = best(passive),
        gap = values[a] - values[b];
      const margin = t.information.bigBlind * 0.5 + 2 * ((errors[a] ?? 0) + (errors[b] ?? 0));
      const mass = aggressive.reduce((s, k) => s + t.finalDistribution[k], 0);
      if (gap > margin && mass < 0.35 && (p.equity ?? 0) > 0.65) flag('missedValue', gap);
      if (gap > margin && mass < 0.05 && (p.equity ?? 1) < 0.25) flag('abandonedBluffs', gap);
    }
    const call = p.actions.findIndex((a) => a.move === 'call'),
      fold = p.actions.findIndex((a) => a.move === 'fold');
    if (call >= 0 && fold >= 0 && t.finalDistribution[call] > 0.35) {
      const gap = values[fold] - values[call],
        margin = t.information.bigBlind * 0.5 + 2 * (errors[call] ?? 0);
      if (gap > margin) flag('weakCalls', gap);
    }
  }
  report() {
    return {
      ...this.counts,
      examples: this.examples,
      limitation:
        'Model-disagreement diagnostics; rollout errors can cause false positives. Controlled payoff tests and independent returns are required.',
    };
  }
}
