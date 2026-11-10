import { texture } from '../train/ranges/classify';
import { features } from './features';
import { legalActions } from './information';
import type { DecisionTrace } from './service';
import { planForHand, ownHandBucket } from './handPlan';

export function rateInterval(success: number, total: number) {
  if (!total) return null;
  const p = success / total,
    z = 1.96,
    denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
type Rate = { opportunities: number; expectedAggressions: number; actualAggressions: number };
type SizeRow = { opportunities: number; bets: number; expected: number[]; actual: number[] };
const rate = (): Rate => ({ opportunities: 0, expectedAggressions: 0, actualAggressions: 0 });
const sizeRow = (): SizeRow => ({ opportunities: 0, bets: 0, expected: [0, 0, 0, 0], actual: [0, 0, 0, 0] });
const addRate = (r: Rate, probability: number, aggressive: boolean) => {
  r.opportunities++;
  r.expectedAggressions += probability;
  r.actualAggressions += Number(aggressive);
};
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const describeRate = (r: Rate) => ({
  ...r,
  expectedRate: r.opportunities ? r.expectedAggressions / r.opportunities : null,
  actualRate: r.opportunities ? r.actualAggressions / r.opportunities : null,
  descriptive95Interval: rateInterval(r.actualAggressions, r.opportunities),
});
const sizeBin = (fraction: number) => (fraction <= 0.45 ? 0 : fraction <= 0.9 ? 1 : fraction <= 1.5 ? 2 : 3);

/** Automated product checks, not a classifier of whether a player is human.
 * Consumes one observer's trace, never the full simulation/deck or opposing cards. */
export class RealismAudit {
  private seen = new Set<string>();
  private lines = new Map<string, { streets: Set<string>; actions: string[]; optional: number }>();
  private sizes = new Map<string, Map<string, SizeRow>>();
  private intents = new Map<string, Rate>();
  private street = new Map<string, Rate>();
  private weakMultiway = rate();
  private missedDraws = rate();
  private drySidePot = rate();
  private optional = 0;
  private mixed = 0;
  private entropySum = 0;
  private plannedDecisions = 0;
  private violations: string[] = [];
  private versions = new Set<string>();
  observe(t: DecisionTrace, namespace = '') {
    const observationId = `${namespace}:${t.decisionId}`;
    if (this.seen.has(observationId)) return;
    this.seen.add(observationId);
    this.versions.add(t.prediction.modelVersion);
    const i = t.information,
      p = t.prediction,
      distribution = t.finalDistribution;
    const legal = new Set(legalActions(i, true, true).map((a) => JSON.stringify(a)));
    if (!legal.has(JSON.stringify(t.action))) this.violations.push('illegal-action');
    if (
      distribution.length !== p.actions.length ||
      distribution.some((v) => !Number.isFinite(v) || v < 0) ||
      Math.abs(sum(distribution) - 1) > 1e-7
    ) {
      this.violations.push('invalid-distribution');
      return;
    }
    if ((t.deviation.estimatedValueLoss ?? 0) > t.deviation.budget + 1e-7) this.violations.push('cost-budget');
    if (i.street === 'preflop') return;
    const hero = i.players.find((p) => p.id === i.heroId)!;
    const f = features(i),
      bucket = ownHandBucket(i.hole, i.board);
    const mass = sum(distribution.map((v, k) => (p.actions[k].to === undefined ? 0 : v)));
    const aggressive = t.action.to !== undefined;
    const row = this.street.get(i.street) ?? rate();
    addRate(row, mass, aggressive);
    this.street.set(i.street, row);
    const story = t.handPlan ?? planForHand(i, t.profile);
    this.plannedDecisions += Number(t.handPlan !== undefined);
    {
      const row = this.intents.get(story.intent) ?? rate();
      addRate(row, mass, aggressive);
      this.intents.set(story.intent, row);
    }
    if (f.opponents > 1 && (bucket === 'air' || bucket === 'weak')) addRate(this.weakMultiway, mass, aggressive);
    if (story.missedDraw && story.previousBet) addRate(this.missedDraws, mass, aggressive);
    const allIn = i.players.filter((p) => !p.folded && p.allIn),
      active = i.players.filter((p) => !p.folded && !p.allIn);
    const dry = allIn.length > 0 && active.every((p) => p.total <= Math.max(...allIn.map((p) => p.total)));
    if (dry && (bucket === 'air' || bucket === 'weak')) addRate(this.drySidePot, mass, aggressive);
    const genuinelyOptional = p.actions.filter((a) => a.to !== undefined).length >= 2;
    if (genuinelyOptional) {
      this.optional++;
      if (Math.max(...distribution) < 0.98) this.mixed++;
      this.entropySum += -sum(distribution.filter((v) => v > 0).map((v) => v * Math.log(v))) / Math.log(distribution.length);
    }
    const pot = i.players.reduce((s, p) => s + p.total, 0) + i.legal.toCall;
    const fraction = (to: number) => (to - hero.bet - i.legal.toCall) / Math.max(i.bigBlind, pot);
    const key = `${namespace}:${i.tableId}:${i.hand}:${i.heroId}`;
    const line = this.lines.get(key) ?? { streets: new Set(), actions: [], optional: 0 };
    line.streets.add(i.street);
    line.optional += Number(genuinelyOptional);
    line.actions.push(
      `${i.street}:${t.action.to !== undefined ? `${i.currentBet ? 'raise' : 'bet'}-${sizeBin(fraction(t.action.to))}` : t.action.move}`,
    );
    this.lines.set(key, line);
    if (genuinelyOptional) {
      const board = texture(i.board);
      const context = [
        i.street,
        i.currentBet ? 'raise' : 'bet',
        f.inPosition ? 'IP' : 'OOP',
        f.opponents > 1 ? 'multiway' : 'HU',
        f.stackToPot !== null && f.stackToPot <= 3 ? 'short' : 'deep',
        board.paired ? 'paired' : board.dry ? 'dry' : 'wet',
        board.high ? 'high' : 'low',
      ].join('|');
      const strength =
        bucket === 'monster' || bucket === 'strong'
          ? 'value'
          : bucket === 'draw'
            ? 'draw'
            : bucket === 'weak' || bucket === 'air'
              ? 'air'
              : 'pair';
      const group = this.sizes.get(context) ?? new Map<string, SizeRow>();
      const row = group.get(strength) ?? sizeRow();
      row.opportunities++;
      p.actions.forEach((a, k) => {
        if (a.to !== undefined) row.expected[sizeBin(fraction(a.to))] += distribution[k];
      });
      if (t.action.to !== undefined) {
        row.bets++;
        row.actual[sizeBin(fraction(t.action.to))]++;
      }
      group.set(strength, row);
      this.sizes.set(context, group);
    }
  }
  report() {
    const trajectories = new Map<string, number>();
    for (const line of this.lines.values())
      if (line.streets.size >= 2 && line.optional >= 2) {
        const key = line.actions.join(' → ');
        trajectories.set(key, (trajectories.get(key) ?? 0) + 1);
      }
    const qualifyingHands = sum([...trajectories.values()]);
    const dominantLineShare = qualifyingHands ? Math.max(...trajectories.values()) / qualifyingHands : null;
    const comparisons = [] as {
      context: string;
      groups: [string, string];
      sampledBets: number[];
      expectedMass: number[];
      totalVariation: number | null;
      coverage: string;
      flag: boolean;
    }[];
    const sizing = [...this.sizes].map(([context, groups]) => {
      const rows = [...groups];
      for (let a = 0; a < rows.length; a++)
        for (let b = a + 1; b < rows.length; b++) {
          const [an, ar] = rows[a],
            [bn, br] = rows[b],
            am = sum(ar.expected),
            bm = sum(br.expected);
          const enough = ar.bets >= 12 && br.bets >= 12;
          const tv = am > 0 && bm > 0 ? sum(ar.expected.map((v, k) => Math.abs(v / am - br.expected[k] / bm))) / 2 : null;
          comparisons.push({
            context,
            groups: [an, bn],
            sampledBets: [ar.bets, br.bets],
            expectedMass: [am, bm],
            totalVariation: tv,
            coverage: enough ? 'sufficient-for-product-check' : 'insufficient',
            flag: enough && tv !== null && tv > 0.97,
          });
        }
      return { context, groups: Object.fromEntries(groups) };
    });
    const flags = [...new Set(this.violations)];
    if (qualifyingHands >= 30 && dominantLineShare! > 0.85) flags.push('repetitive-whole-hand-line');
    if (this.optional >= 100 && this.mixed / this.optional < 0.02) flags.push('near-universal-certainty');
    if (this.weakMultiway.opportunities >= 20 && this.weakMultiway.expectedAggressions / this.weakMultiway.opportunities > 0.18)
      flags.push('excess-multiway-air-pressure');
    if (this.missedDraws.opportunities >= 10 && this.missedDraws.expectedAggressions / this.missedDraws.opportunities > 0.3)
      flags.push('automatic-missed-draw-barrel');
    if (comparisons.some((c) => c.flag)) flags.push('near-perfect-context-matched-sizing-tell');
    return {
      protocol: 'bot-realism-audit-1',
      models: [...this.versions],
      decisions: this.seen.size,
      plannedDecisions: this.plannedDecisions,
      optionalDecisions: this.optional,
      mixedDecisionShare: this.optional ? this.mixed / this.optional : null,
      meanNormalizedEntropy: this.optional ? this.entropySum / this.optional : null,
      streets: Object.fromEntries([...this.street].map(([s, r]) => [s, describeRate(r)])),
      intentions: Object.fromEntries([...this.intents].map(([s, r]) => [s, describeRate(r)])),
      weakMultiway: describeRate(this.weakMultiway),
      missedDrawBarrels: describeRate(this.missedDraws),
      drySidePotAir: describeRate(this.drySidePot),
      repetition: {
        qualifyingHands,
        uniqueLines: trajectories.size,
        dominantLineShare,
        topLines: [...trajectories]
          .map(([line, hands]) => ({ line, hands }))
          .sort((a, b) => b.hands - a.hands)
          .slice(0, 10),
      },
      sizing: { bins: ['up-to-45%-pot', '45–90%-pot', '90–150%-pot', 'over-150%-pot'], comparisons, contexts: sizing },
      flags,
      passed: flags.length === 0,
      limitations: [
        'Authored product thresholds; no human calibration or enjoyment/retention evidence.',
        'Frequency intervals are descriptive: hands share memory, and paired sessions repeat physical deals.',
        'Sizing comparisons condition on street, price, position, player count, depth and coarse board texture. Unmeasured context remains.',
        'Insufficient contexts are reported explicitly; absence of a flag does not certify realistic or unexploitable play.',
      ],
    };
  }
}
