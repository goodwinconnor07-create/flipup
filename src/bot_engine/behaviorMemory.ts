import type { BotMemory } from './memory';
export type Triple = [number, number, number];
export interface BehaviorCell {
  hand: number;
  counts: Triple;
  pending: Triple;
  sizes: Triple;
  pendingSizes: Triple;
}
export interface BehaviorMemory {
  version: 1;
  latestHand: number;
  latestAction: number;
  opponents: Record<string, { lastHand: number; cells: Record<string, BehaviorCell> }>;
}
export interface BehaviorEvent {
  observerId: string;
  tableId: string;
  targetId: string;
  hand: number;
  actionIndex: number;
  context: string;
  label: 0 | 1 | 2;
  sizing?: 0 | 1 | 2;
}
export interface BehaviorSnapshot {
  hand: number;
  opponents: Record<string, Record<string, { counts: Triple; sizes: Triple }>>;
}
export const BEHAVIOR_DECAY = 0.97;
const zero = (): Triple => [0, 0, 0];
const validKey = (k: string) => /^(flop|turn|river)\|(HU|MW)\|(open\|none|facing\|(small|medium|large))$/.test(k);
const validTriple = (v: unknown): v is Triple =>
  Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0);
export function validateBehavior(b: BehaviorMemory): void {
  if (
    b.version !== 1 ||
    !Number.isSafeInteger(b.latestHand) ||
    b.latestHand < 0 ||
    !Number.isSafeInteger(b.latestAction) ||
    b.latestAction < 0 ||
    !b.opponents ||
    Object.keys(b.opponents).length > 16 ||
    Object.entries(b.opponents).some(
      ([id, p]) =>
        !id ||
        !Number.isSafeInteger(p.lastHand) ||
        p.lastHand < 0 ||
        p.lastHand > b.latestHand ||
        !p.cells ||
        Object.keys(p.cells).length > 24 ||
        Object.entries(p.cells).some(
          ([k, c]) =>
            !validKey(k) ||
            !Number.isSafeInteger(c.hand) ||
            c.hand < 0 ||
            c.hand > p.lastHand ||
            ![c.counts, c.pending, c.sizes, c.pendingSizes].every(validTriple) ||
            c.pending.reduce((s, v) => s + v, 0) > 2 ||
            c.pendingSizes.reduce((s, v) => s + v, 0) > 2,
        ),
    )
  )
    throw new Error('Invalid public behavior memory');
}
/** Separate ledger: collecting behavior never changes the legacy fold learner or its sequence. */
export function observeBehavior(m: BotMemory, e: BehaviorEvent): void {
  if (
    e.observerId !== m.botId ||
    e.tableId !== m.tableId ||
    !e.targetId ||
    e.targetId === m.botId ||
    !Number.isSafeInteger(e.hand) ||
    e.hand < 0 ||
    !Number.isSafeInteger(e.actionIndex) ||
    e.actionIndex < 0 ||
    !validKey(e.context) ||
    ![0, 1, 2].includes(e.label) ||
    (e.label === 0 && e.context.includes('|open|')) ||
    (e.sizing !== undefined && (![0, 1, 2].includes(e.sizing) || e.label !== 2))
  )
    throw new Error('Invalid public behavior event');
  const b = m.behavior;
  if (b && (e.hand < b.latestHand || (e.hand === b.latestHand && e.actionIndex <= b.latestAction))) return;
  const state = (m.behavior ??= { version: 1, latestHand: e.hand, latestAction: e.actionIndex, opponents: {} });
  if (!Object.hasOwn(state.opponents, e.targetId)) {
    if (Object.keys(state.opponents).length === 16) {
      const oldest = Object.keys(state.opponents).sort(
        (a, b) => state.opponents[a].lastHand - state.opponents[b].lastHand || a.localeCompare(b),
      )[0];
      delete state.opponents[oldest];
    }
    Object.defineProperty(state.opponents, e.targetId, {
      value: { lastHand: e.hand, cells: {} },
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  const p = state.opponents[e.targetId];
  const c = (p.cells[e.context] ??= { hand: e.hand, counts: zero(), pending: zero(), sizes: zero(), pendingSizes: zero() });
  if (e.hand > c.hand) {
    const decay = BEHAVIOR_DECAY ** (e.hand - c.hand);
    c.counts = c.counts.map((n, k) => (n + c.pending[k]) * decay) as Triple;
    c.sizes = c.sizes.map((n, k) => (n + c.pendingSizes[k]) * decay) as Triple;
    c.pending = zero();
    c.pendingSizes = zero();
    c.hand = e.hand;
  }
  // Multiple raises in one hand must not masquerade as many independent hands of evidence.
  if (c.pending.reduce((s, v) => s + v, 0) < 2) c.pending[e.label]++;
  if (e.sizing !== undefined && c.pendingSizes.reduce((s, v) => s + v, 0) < 2) c.pendingSizes[e.sizing]++;
  p.lastHand = e.hand;
  state.latestHand = e.hand;
  state.latestAction = e.actionIndex;
}
/** Project only this observer's public counts. Current-hand observations remain pending. */
export function behaviorSnapshot(m: BotMemory, hand: number, ids: string[]): BehaviorSnapshot {
  if (!Number.isSafeInteger(hand) || hand < 0) throw new Error('Invalid behavior query hand');
  if (m.behavior) validateBehavior(m.behavior);
  if (m.behavior && m.behavior.latestHand > hand) throw new Error('Behavior memory is from a future hand');
  const opponents: BehaviorSnapshot['opponents'] = {};
  for (const id of ids) {
    if (!Object.hasOwn(m.behavior?.opponents ?? {}, id)) continue;
    const cells = m.behavior!.opponents[id].cells;
    const projected = Object.fromEntries(
      Object.entries(cells)
        .filter(([, c]) => c.hand <= hand)
        .map(([key, c]) => {
          const d = BEHAVIOR_DECAY ** (hand - c.hand),
            include = c.hand < hand;
          return [
            key,
            {
              counts: c.counts.map((v, k) => (v + (include ? c.pending[k] : 0)) * d) as Triple,
              sizes: c.sizes.map((v, k) => (v + (include ? c.pendingSizes[k] : 0)) * d) as Triple,
            },
          ] as const;
        })
        .filter(([, c]) => c.counts.some((n) => n > 0) || c.sizes.some((n) => n > 0)),
    );
    if (Object.keys(projected).length) Object.defineProperty(opponents, id, { value: projected, enumerable: true });
  }
  return { hand, opponents };
}
