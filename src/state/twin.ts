// Your AI twin's memory, kept on this phone. It is separate from the 24 hour hand history on
// purpose: a twin needs weeks of play to know you. Counters only (see src/game/twin.ts).

import { addHandToTwin, emptyTwin, sanitizeTwin, twinConfidence, TWIN_READY, type HandRecord, type TwinProfile } from '../game';
import { read, write } from './persist';

const KEY = 'flipup.twin';

export function loadTwin(): TwinProfile {
  const raw = read<unknown>(KEY);
  return raw ? sanitizeTwin(raw) : emptyTwin();
}

/** Adds a hand you played. Counting the same hand again does nothing. */
export function recordTwinHand(key: string, record: HandRecord, heroId: string): void {
  const twin = loadTwin();
  if (addHandToTwin(twin, record, heroId, key)) write(KEY, twin);
}

/** Forgets everything the twin knows about you. */
export function resetTwin(): void {
  write(KEY, null);
}

/** How well the twin knows you: hands counted, 0 to 1 confidence, and whether it's ready to play. */
export function twinStatus(): { hands: number; confidence: number; ready: boolean } {
  const { hands } = loadTwin();
  return { hands, confidence: twinConfidence(hands), ready: hands >= TWIN_READY };
}
