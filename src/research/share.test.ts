import { describe, it, expect } from 'vitest';
import { encodeResearchShare, decodeResearchShare, encodeResearchPayload, decodeResearchPacket } from './share';
import { completeResearchHand, researchHero, researchOptions, startResearch, stepResearch } from './engine';
import { createResearchReviewPacket } from './reviewPacket';
import { replayResearchHand } from './replay';
import type { ResearchReport } from './protocol';
function fixture(): ResearchReport {
  const run = startResearch('clipboard', 314, 12, 1000);
  for (let n = 0; !run.game.hand!.result && n < 500; n++) {
    if (run.game.hand!.toAct === researchHero(run.game).id) {
      const o = researchOptions(run);
      stepResearch(run, { move: o.canCheck ? 'check' : 'call' });
    } else stepResearch(run);
  }
  run.feedback.note = 'Repeated river checks felt odd 🃏 — please review.';
  return {
    metadata: { protocol: run.protocol, engine: run.engine, seed: run.seed, limit: run.limit, startedAt: run.startedAt },
    expiresAt: 0,
    hands: [completeResearchHand(run)],
  };
}
describe('Mobile research copy packets', () => {
  it('preserves the complete report across out-of-order parts and supports exact decision replay', async () => {
    const report = fixture(),
      parts = await encodeResearchShare(report, 256),
      restored = await decodeResearchShare([...parts].reverse());
    expect(parts.length).toBeGreaterThan(1);
    expect(restored).toEqual(JSON.parse(JSON.stringify(report)));
    expect(restored.hands[0].feedback.note).toContain('🃏');
    expect(replayResearchHand(restored.hands[0])).toEqual({
      decisions: report.hands[0].decisions.length,
      mismatches: 0,
      resultMatches: true,
    });
  });
  it('makes a smaller review copy without dropping hands, public context, feedback or chosen explanations', async () => {
    const report = fixture(),
      review = createResearchReviewPacket(report),
      parts = await encodeResearchPayload(review, report.hands.length);
    const restored = await decodeResearchPacket(parts);
    expect(restored).toEqual(JSON.parse(JSON.stringify(review)));
    expect(restored.hands[0].decisions.map((d) => d.rationale.summary)).toEqual(report.hands[0].decisions.map((d) => d.rationale.summary));
    expect(restored.hands[0].events).toHaveLength(report.hands[0].events.length);
    await expect(decodeResearchShare(parts)).rejects.toThrow('full replay packet');
  });
  it('rejects missing, duplicated and mixed reports instead of reviewing an incomplete dataset', async () => {
    const report = fixture(),
      parts = await encodeResearchShare(report, 256);
    await expect(decodeResearchShare(parts.slice(1))).rejects.toThrow('missing');
    await expect(decodeResearchShare([parts[0], ...parts.slice(0, -1)])).rejects.toThrow('duplicated');
    const other = await encodeResearchShare({ ...report, expiresAt: 1 }, 256);
    await expect(decodeResearchShare([parts[0], ...other.slice(1)])).rejects.toThrow('different');
  });
  it('detects corruption, bounds copy sizes and excludes access credentials outside the report', async () => {
    const report = fixture();
    const parts = await encodeResearchShare({
      ...report,
      accessKey: 'private-access-key',
      reviewUrl: 'private-review-url',
    } as ResearchReport);
    const restored = await decodeResearchShare(parts);
    expect(JSON.stringify(restored)).not.toContain('private-access');
    expect(JSON.stringify(restored)).not.toContain('private-review-url');
    const changed = parts.map((part) => JSON.stringify({ ...JSON.parse(part), checksum: 'a'.repeat(64) }));
    await expect(decodeResearchShare(changed)).rejects.toThrow('changed');
    await expect(encodeResearchShare(report, 0)).rejects.toThrow('size');
  });
});
