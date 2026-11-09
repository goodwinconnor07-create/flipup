export interface LearningConfig {
  version: 'contextual-1';
  contextDecay: number;
  minimumSamples: number;
  confidenceSamples: number;
  confidenceZ: number;
  profitMargin: number;
  maximumBlend: number;
}

/** Offline tuning defaults. The training runner exports candidates; it never overwrites these automatically. */
export const LEARNING_CONFIG: Readonly<LearningConfig> = Object.freeze({
  version: 'contextual-1',
  contextDecay: 0.96,
  minimumSamples: 8,
  confidenceSamples: 24,
  confidenceZ: 1.64,
  profitMargin: 0.02,
  maximumBlend: 0.5,
});
export function validateLearningConfig(c: LearningConfig): void {
  if (
    c.version !== 'contextual-1' ||
    !Number.isFinite(c.contextDecay) ||
    c.contextDecay < 0.8 ||
    c.contextDecay > 1 ||
    !Number.isInteger(c.minimumSamples) ||
    c.minimumSamples < 1 ||
    !Number.isFinite(c.confidenceSamples) ||
    c.confidenceSamples <= 0 ||
    !Number.isFinite(c.confidenceZ) ||
    c.confidenceZ < 1 ||
    c.confidenceZ > 3 ||
    !Number.isFinite(c.profitMargin) ||
    c.profitMargin < 0 ||
    c.profitMargin > 0.2 ||
    !Number.isFinite(c.maximumBlend) ||
    c.maximumBlend < 0 ||
    c.maximumBlend > 0.6
  )
    throw new Error('Invalid learning configuration');
}
