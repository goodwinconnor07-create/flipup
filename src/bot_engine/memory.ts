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
}
/** Deliberately narrow event schema: only a public response to a faced bet. */
export interface ObservationEvent {
  observerId: string;
  targetId: string;
  tableId: string;
  sequence: number;
  foldedToBet: boolean;
}
export function emptyMemory(botId: string, tableId: string): BotMemory {
  return { version: 1, botId, tableId, latestSequence: -1, opponents: {} };
}
export function validateMemory(m: BotMemory): void {
  if (
    m.version !== 1 ||
    !m.botId ||
    !m.tableId ||
    !Number.isSafeInteger(m.latestSequence) ||
    m.latestSequence < -1 ||
    !m.opponents ||
    Object.values(m.opponents).some(
      (b) => ![b.alpha, b.beta, b.samples].every(Number.isFinite) || b.alpha < 2 || b.beta < 2 || b.samples < 0,
    )
  )
    throw new Error('Invalid persisted memory');
}
export function observe(memory: BotMemory, event: ObservationEvent): void {
  if (
    event.observerId !== memory.botId ||
    event.tableId !== memory.tableId ||
    event.targetId === memory.botId ||
    !event.targetId ||
    !Number.isSafeInteger(event.sequence) ||
    typeof event.foldedToBet !== 'boolean'
  )
    throw new Error('Invalid observation');
  if (event.sequence <= memory.latestSequence) return;
  // Forget stale evidence, retaining a Beta(2,2) prior. Effective window ~50 responses.
  const old = Object.hasOwn(memory.opponents, event.targetId) ? memory.opponents[event.targetId] : { alpha: 2, beta: 2, samples: 0 };
  const next = {
    alpha: 2 + (old.alpha - 2) * 0.98 + Number(event.foldedToBet),
    beta: 2 + (old.beta - 2) * 0.98 + Number(!event.foldedToBet),
    samples: old.samples * 0.98 + 1,
  };
  Object.defineProperty(memory.opponents, event.targetId, { value: next, enumerable: true, writable: true, configurable: true });
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
