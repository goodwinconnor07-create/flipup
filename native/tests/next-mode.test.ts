import { expect, it } from 'vitest';

import { freeThisWeek, isPremiumVariant, VARIANTS } from '../src/engine';
import { nextModes, TONIGHT_MS } from '../src/state/next-mode';

const NOW = 1_000_000_000_000;
const ids = VARIANTS.map((v) => v.id);

it('steps through the games in the app order, starting after the one just played', () => {
  const list = nextModes('holdem', [], true, NOW);
  expect(list).toEqual(ids.slice(1));
  expect(nextModes(ids[2], [], true, NOW)[0]).toBe(ids[3]);
  expect(nextModes(ids[ids.length - 1], [], true, NOW)[0]).toBe(ids[0]);
});

it('never offers the mode just played', () => {
  for (const id of ids) expect(nextModes(id, [], true, NOW)).not.toContain(id);
});

it('leaves out Premium games unless the host has Premium', () => {
  const free = nextModes('holdem', [], false, NOW);
  // Only Texas Hold'em and this week's free game are free, so that's the one other game a free host can step to.
  expect(free).toEqual([freeThisWeek(NOW)]);
  expect(nextModes('holdem', [], true, NOW).some(isPremiumVariant)).toBe(true);
});

it("puts games already played tonight last, and forgets last night's", () => {
  const list = nextModes('holdem', [{ variant: ids[1], at: NOW - 60_000 }, { variant: ids[2], at: NOW - TONIGHT_MS - 1 }], true, NOW);
  expect(list[list.length - 1]).toBe(ids[1]);
  expect(list.indexOf(ids[2])).toBeLessThan(list.indexOf(ids[1]));
  expect(list[0]).toBe(ids[2]);
});
