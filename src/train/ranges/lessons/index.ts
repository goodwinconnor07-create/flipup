// Every hand's explanation, keyed by the hand's id (scenarios.ts joins them on). Split into files only to keep each
// one a readable size; the order doesn't matter.
import type { Lesson } from '../model';
import { L1 } from './1';
import { L2 } from './2';

export const LESSONS: Record<string, Lesson> = { ...L1, ...L2 };
