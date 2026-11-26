// Every hand's explanation, keyed by the hand's id (scenarios.ts joins them on). Split into files only to keep each
// one a readable size; the order doesn't matter.
import type { Lesson } from '../model';
import { L1 } from './1';
import { L2 } from './2';
import { L3 } from './3';
import { L4 } from './4';
import { L5 } from './5';
import { L6 } from './6';
import { L7 } from './7';
import { L8 } from './8';
import { L9 } from './9';
import { L10 } from './10';

export const LESSONS: Record<string, Lesson> = { ...L1, ...L2, ...L3, ...L4, ...L5, ...L6, ...L7, ...L8, ...L9, ...L10 };
