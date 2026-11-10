import type { Street } from '../game/types';
import { LEARNING_CONFIG, validateLearningConfig, type LearningConfig } from './learningConfig';
import { validateBehavior, type BehaviorMemory } from './behaviorMemory';

export interface ObservationContext {
  street: Street;
  size: 'small' | 'medium' | 'large';
  headsUp: boolean;
  raised?: boolean;
}
export function contextKey(c: ObservationContext): string {
  return `${c.street}|${c.size}|${c.headsUp ? 'heads-up' : 'multiway'}${c.raised ? '|raise' : ''}`;
}
export function betSizeBucket(toCall: number, potIncludingBet: number): ObservationContext['size'] {
  const ratio = toCall / Math.max(1, potIncludingBet - toCall);
  return ratio <= 0.4 ? 'small' : ratio <= 1 ? 'medium' : 'large';
}
function validContext(c: ObservationContext): boolean {
  return (
    ['preflop', 'flop', 'turn', 'river'].includes(c.street) &&
    ['small', 'medium', 'large'].includes(c.size) &&
    typeof c.headsUp === 'boolean' &&
    (c.raised === undefined || typeof c.raised === 'boolean')
  );
}

export interface OpponentBelief {
  alpha: number;
  beta: number;
  samples: number;
}
export interface BotMemory {
  version: 1;
  botId: string;
  tableId: string;
  latestSequence: number;
  opponents: Record<string, OpponentBelief>;
  /** Additive v1 extension: old snapshots without this field remain valid. */
  contexts?: Record<string, Record<string, OpponentBelief>>;
  /** Additive, private public-action learner; old v1 snapshots need no migration. */
  behavior?: BehaviorMemory;
}
/** Deliberately narrow event schema: only a public response to a faced bet. */
export interface ObservationEvent {
  observerId: string;
  targetId: string;
  tableId: string;
  sequence: number;
  foldedToBet: boolean;
  context?: ObservationContext;
}
export function emptyMemory(botId: string, tableId: string): BotMemory {
  return { version: 1, botId, tableId, latestSequence: -1, opponents: {} };
}
export function validateMemory(m: BotMemory): void {
  if (m.behavior) validateBehavior(m.behavior);
  if (
    m.version !== 1 ||
    !m.botId ||
    !m.tableId ||
    !Number.isSafeInteger(m.latestSequence) ||
    m.latestSequence < -1 ||
    !m.opponents ||
    [...Object.values(m.opponents), ...Object.values(m.contexts ?? {}).flatMap((contexts) => Object.values(contexts))].some(
      (b) => ![b.alpha, b.beta, b.samples].every(Number.isFinite) || b.alpha < 2 || b.beta < 2 || b.samples < 0,
    )
  )
    throw new Error('Invalid persisted memory');
}
export function observe(memory: BotMemory, event: ObservationEvent, config: LearningConfig = LEARNING_CONFIG): void {
  if (
    event.observerId !== memory.botId ||
    event.tableId !== memory.tableId ||
    event.targetId === memory.botId ||
    !event.targetId ||
    !Number.isSafeInteger(event.sequence) ||
    typeof event.foldedToBet !== 'boolean' ||
    (event.context !== undefined && !validContext(event.context))
  )
    throw new Error('Invalid observation');
  if (event.sequence <= memory.latestSequence) return;
  validateLearningConfig(config);
  // Forget stale evidence, retaining a Beta(2,2) prior. Effective window ~50 responses.
  const old = Object.hasOwn(memory.opponents, event.targetId) ? memory.opponents[event.targetId] : { alpha: 2, beta: 2, samples: 0 };
  const next = {
    alpha: 2 + (old.alpha - 2) * 0.98 + Number(event.foldedToBet),
    beta: 2 + (old.beta - 2) * 0.98 + Number(!event.foldedToBet),
    samples: old.samples * 0.98 + 1,
  };
  Object.defineProperty(memory.opponents, event.targetId, { value: next, enumerable: true, writable: true, configurable: true });
  if (event.context) {
    const all = (memory.contexts ??= {});
    if (!Object.hasOwn(all, event.targetId))
      Object.defineProperty(all, event.targetId, { value: {}, enumerable: true, writable: true, configurable: true });
    const contexts = all[event.targetId],
      key = contextKey(event.context);
    const old = contexts[key] ?? { alpha: 2, beta: 2, samples: 0 };
    contexts[key] = {
      alpha: 2 + (old.alpha - 2) * config.contextDecay + Number(event.foldedToBet),
      beta: 2 + (old.beta - 2) * config.contextDecay + Number(!event.foldedToBet),
      samples: old.samples * config.contextDecay + 1,
    };
  }
  memory.latestSequence = event.sequence;
}
export function foldEstimate(b?: OpponentBelief): { mean: number; confidence: number } {
  return b ? { mean: b.alpha / (b.alpha + b.beta), confidence: b.samples / (b.samples + 30) } : { mean: 0.5, confidence: 0 };
}

export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}
/** Durable Object/file adapters can implement this without changing the policy. Callers serialize writes. */
export class MemoryRepository {
  constructor(private storage: KeyValueStorage) {}
  private key(botId: string, tableId: string) {
    return `human-poker:1:${JSON.stringify([botId, tableId])}`;
  }
  async load(botId: string, tableId: string): Promise<BotMemory> {
    const raw = await this.storage.get(this.key(botId, tableId));
    if (!raw) return emptyMemory(botId, tableId);
    const m = JSON.parse(raw) as BotMemory;
    validateMemory(m);
    if (m.botId !== botId || m.tableId !== tableId) throw new Error('Invalid persisted memory');
    return m;
  }
  async save(memory: BotMemory): Promise<void> {
    validateMemory(memory);
    await this.storage.put(this.key(memory.botId, memory.tableId), JSON.stringify(memory));
  }
}
