import { describe, expect, it } from 'vitest';
import { closeAt, closeReason, countsAsPlay, IDLE_CLOSE_MS, LONG_PARTY_LIFE_MS, MAX_LIFE_MS, maxLifeMs, newLife } from './lifetime';

const H = 60 * 60 * 1000;
const MIN = 60 * 1000;

describe('game lifetime', () => {
  it('gives every game 6 hours and a full 12-game party 8', () => {
    expect(maxLifeMs()).toBe(6 * H);
    expect(maxLifeMs(4)).toBe(6 * H);
    expect(maxLifeMs(11)).toBe(6 * H);
    expect(maxLifeMs(12)).toBe(8 * H);
    expect(LONG_PARTY_LIFE_MS).toBe(8 * H);
    expect(MAX_LIFE_MS).toBe(6 * H);
  });

  it('closes after 30 minutes without play', () => {
    const life = newLife(0);
    expect(closeReason(life, 29 * MIN)).toBeNull();
    expect(closeReason(life, IDLE_CLOSE_MS)).toBe('idle');
  });

  it('is kept open by play, until the time limit', () => {
    const life = newLife(0);
    for (let t = 20 * MIN; t < 6 * H; t += 20 * MIN) {
      life.activeAt = t;
      expect(closeReason(life, t + 10 * MIN)).toBeNull();
    }
    life.activeAt = 6 * H - MIN;
    expect(closeReason(life, 6 * H)).toBe('time');
  });

  it('lets a 12-game party run to 8 hours and a shorter one stop at 6', () => {
    const long = newLife(0, { partyGames: 12 });
    const short = newLife(0, { partyGames: 8 });
    long.activeAt = short.activeAt = 7 * H;
    expect(closeReason(long, 7 * H + MIN)).toBeNull();
    expect(closeReason(short, 7 * H + MIN)).toBe('time');
    long.activeAt = 8 * H - MIN;
    expect(closeReason(long, 8 * H)).toBe('time');
  });

  it("gives a party's tables the party's deadline", () => {
    const table = newLife(3 * H, { hardCloseAt: 8 * H });
    expect(table.hardCloseAt).toBe(8 * H);
  });

  it('wakes at whichever close comes first', () => {
    const life = newLife(0);
    expect(closeAt(life)).toBe(30 * MIN);
    life.activeAt = 5 * H + 50 * MIN;
    expect(closeAt(life)).toBe(6 * H);
  });

  it('counts only a person playing', () => {
    expect(countsAsPlay('act', false)).toBe(true);
    expect(countsAsPlay('start', false)).toBe(true);
    expect(countsAsPlay('react', false)).toBe(false);
    expect(countsAsPlay('tick', true)).toBe(false);
    expect(countsAsPlay('presence', true)).toBe(false);
    expect(countsAsPlay('act', true)).toBe(false);
  });
});
