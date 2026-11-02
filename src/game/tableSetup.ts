// The rules behind a table's setup screen, shared by the web app and the iPhone app: which blinds fit a starting
// stack, the settings a game plays best with, and how settings read in a row.
import { BLIND_LEVELS } from './reducer';
import type { Settings } from './types';
import type { Variant } from './variants';

/** The longest wait between blind rises the host can pick (0 is never). */
export const BLIND_MINUTE_MAX = 20;

/** Ghost Hold'em plays best deep: picking it gives everyone at least this many big blinds. */
const GHOST_DEPTH = 500;
const GHOST_STACKS = [5000, 10000];

/** No tiny blinds on big stacks (no 1/2 at 5,000, no 5/10 either at 10,000). */
const smallestBigBlind = (stack: number) => (stack >= 10_000 ? 20 : stack >= 5_000 ? 10 : 0);

/** Blinds offered for a starting stack: at least 10 big blinds deep. */
export const levelsFor = (stack: number): [number, number][] => BLIND_LEVELS.filter(([, bb]) => bb <= stack / 10 && bb >= smallestBigBlind(stack));

const n = (v: number) => Math.round(v).toLocaleString('en-US');
export const blindsLabel = ([sb, bb]: [number, number]): string => `${n(sb)}/${n(bb)}`;
export const timerLabel = (s: number): string => (s === 0 ? 'Off' : `${s}s`);

/** A new starting stack, keeping the blinds if they still fit and otherwise taking the biggest that does. */
export function withStack(settings: Settings, startingStack: number): Settings {
  const fits = levelsFor(startingStack);
  const keep = fits.some(([sb, bb]) => sb === settings.smallBlind && bb === settings.bigBlind);
  const [smallBlind, bigBlind] = keep ? [settings.smallBlind, settings.bigBlind] : fits[fits.length - 1];
  return { ...settings, startingStack, smallBlind, bigBlind };
}

/** The settings a game plays best with: Ghost wants deep stacks, Imposter bigger blinds. */
export function withVariant(settings: Settings, variant: Variant): Settings {
  let next: Settings = { ...settings, variant };
  // Deep stacks for the ghost, so a pot it keeps doesn't wipe anyone out.
  if (variant === 'ghost' && settings.startingStack < settings.bigBlind * GHOST_DEPTH) {
    const stack = GHOST_STACKS.find((s) => s >= settings.bigBlind * GHOST_DEPTH) ?? GHOST_STACKS[GHOST_STACKS.length - 1];
    next = { ...next, startingStack: stack, ...(settings.bigBlind * GHOST_DEPTH > stack ? { smallBlind: 10, bigBlind: 20 } : {}) };
  }
  // Imposter plays for bigger blinds (about 50 big blinds deep), so every hand matters.
  if (variant === 'imposter' && settings.bigBlind < next.startingStack / 50) {
    const [smallBlind, bigBlind] = [...BLIND_LEVELS].reverse().find(([, bb]) => bb <= next.startingStack / 50) ?? [settings.smallBlind, settings.bigBlind];
    next = { ...next, smallBlind, bigBlind };
  }
  return next;
}

/** A game's note under its rules: who it's best with. */
export function variantNote(variant: Variant): string {
  return variant === 'imposter'
    ? "Needs three or more players, so it's best with friends."
    : variant === 'holdem'
      ? "Bots here play full-strength Hold'em."
      : "Bots play this the best they can, but it's most fun with friends.";
}
