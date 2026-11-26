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
import { L11 } from './11';
import { L12 } from './12';
import { L13 } from './13';
import { L14 } from './14';
import { L15 } from './15';
import { L16 } from './16';
import { L17 } from './17';
import { L18 } from './18';

export const LESSONS: Record<string, Lesson> = { ...L1, ...L2, ...L3, ...L4, ...L5, ...L6, ...L7, ...L8, ...L9, ...L10, ...L11, ...L12, ...L13, ...L14, ...L15, ...L16, ...L17, ...L18 };
