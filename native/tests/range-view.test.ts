import { describe, expect, it } from 'vitest';

import { replay, seatsOf } from '@train/ranges/model';
import { SCENARIOS } from '@train/ranges/scenarios';

import { eventsOf, firstSentence, seatPositions, streetsOf, viewAt } from '../src/state/range-view';

// The Range training table, worked out from the model: the hand as events, the table after each one, the seats.
describe('range view', () => {
  it('replays every hand to the same pot, folds and board you decide on', () => {
    for (const s of SCENARIOS) {
      const r = replay(s);
      const events = eventsOf(s, r);
      const end = viewAt(s, r, events, events.length);
      const now = viewAt(s, r, events, null);
      expect(end.board, s.id).toEqual(s.board);
      expect(end.pot, s.id).toBe(r.pot);
      // Built up move by move it stays within rounding of the model's pot.
      const built = viewAt(s, r, events, Math.max(0, events.length - 1));
      expect(built.pot, s.id).toBeLessThanOrEqual(r.pot + 1);
      for (const p of now.folded) expect(end.folded, s.id).toContain(p);
    }
  });

  it('starts from the blinds and deals each street once', () => {
    const s = SCENARIOS[0];
    const r = replay(s);
    const events = eventsOf(s, r);
    const start = viewAt(s, r, events, 0);
    expect(start.board).toEqual([]);
    expect(start.pot).toBeCloseTo(1.5 + (s.ante ?? 0), 1);
    const deals = events.filter((e) => e.kind === 'deal').map((e) => e.street);
    expect(deals).toEqual(streetsOf(s).filter((x) => x !== 'preflop'));
  });

  it('puts you at the bottom with every seat in its own place', () => {
    for (const s of SCENARIOS.slice(0, 40)) {
      const seats = seatPositions(s, 358, 270);
      expect(seats).toHaveLength(seatsOf(s).length);
      const me = seats.find((x) => x.hero)!;
      expect(me.x).toBeCloseTo(179, 3);
      expect(Math.max(...seats.map((x) => x.y))).toBeCloseTo(me.y, 3);
      expect(new Set(seats.map((x) => `${Math.round(x.x)},${Math.round(x.y)}`)).size).toBe(seats.length);
    }
  });

  it('takes the first sentence', () => {
    expect(firstSentence('Bet big. They fold a lot.')).toBe('Bet big.');
    expect(firstSentence('No full stop')).toBe('No full stop');
  });
});
