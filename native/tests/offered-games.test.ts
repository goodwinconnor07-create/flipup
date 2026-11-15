// Which games the app offers to host (native/src/engine/index.ts): the engine's list without the held-back ones.
import { describe, expect, it } from 'vitest';

import { HELD_BACK, isOffered, isVariant, VARIANTS } from '@/engine';
import { VARIANTS as ALL } from '@game/index';
import { nextModes } from '@/state/next-mode';

describe('games the app offers', () => {
  it("lists every game but the held-back ones, in the engine's order, with Texas Hold'em first", () => {
    expect(VARIANTS.map((v) => v.id)).toEqual(ALL.map((v) => v.id).filter((id) => !HELD_BACK.has(id)));
    expect(VARIANTS[0].id).toBe('holdem');
    expect(VARIANTS.some((v) => HELD_BACK.has(v.id))).toBe(false);
  });

  it('holds back only real games, and never Texas Hold’em', () => {
    for (const id of HELD_BACK) expect(isVariant(id)).toBe(true);
    expect(HELD_BACK.has('holdem')).toBe(false);
  });

  it('still knows a held-back game for a table joined from elsewhere, but never offers it', () => {
    for (const id of HELD_BACK) {
      expect(isVariant(id)).toBe(true);
      expect(isOffered(id)).toBe(false);
    }
    expect(isOffered('holdem')).toBe(true);
    expect(isOffered('nope')).toBe(false);
    expect(isOffered(undefined)).toBe(false);
  });

  it('suggests only offered games for the next game at a table', () => {
    const modes = nextModes('holdem', [], true, Date.UTC(2026, 10, 16));
    expect(modes.length).toBeGreaterThan(0);
    for (const m of modes) expect(isOffered(m)).toBe(true);
  });
});
