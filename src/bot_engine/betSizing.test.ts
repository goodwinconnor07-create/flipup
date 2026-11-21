import { describe, expect, it } from 'vitest';
import { makeMove } from '../game/holdem';
import { seededRng } from '../game/cards';
import { informationFor, legalActions } from './information';
import { everydayThought } from './everydayLive';
import { applyBetSizing, MIN_BET_LEFT } from './betSizing';
import { recordedHand } from './testFixtures';

const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);

/** The recorded hand as the flop lands: the small blind (pocket nines) to act first, nobody has bet. */
function flopSpot(seed = 1) {
  for (let s = seed; s < 300; s++) {
    const t = recordedHand(s, ['9h', '9d'], 20, 'flop');
    if (t) return t;
  }
  throw new Error('no table');
}

describe('bet sizing', () => {
  it('checks the fives on A-J-10 rather than betting one big blind into 210 (the recorded hand)', () => {
    const shares: { token: number; check: number }[] = [];
    for (let seed = 1; shares.length < 8 && seed < 300; seed++) {
      const t = recordedHand(seed, ['9h', '9d'], 20, 'flop');
      if (!t) continue;
      expect(makeMove(t.game, 'check', undefined, { now: 0, deviceId: 'host', rng: seededRng(seed) })).toBeNull();
      expect(t.game.hand!.toAct).toBe(t.bb);
      everydayThought(t.game, t.bb);
      const trace = t.game.botTable!.traces.at(-1)!;
      const at = (pred: (a: (typeof trace.prediction.actions)[number]) => boolean) =>
        trace.finalDistribution[trace.prediction.actions.findIndex(pred)] ?? 0;
      shares.push({ token: at((a) => a.move === 'bet' && a.to === 20), check: at((a) => a.move === 'check') });
    }
    for (const s of shares) expect(s.token).toBeLessThanOrEqual(MIN_BET_LEFT + 1e-9);
    expect(sum(shares.map((s) => s.check)) / shares.length).toBeGreaterThan(0.7);
  }, 60_000);

  it('sends a token bet to a real size when the model rates the size well, and to a check when it does not', () => {
    const t = flopSpot();
    const info = informationFor(t.game, t.sb);
    const actions = legalActions(info, true, true);
    const minIdx = actions.findIndex((a) => a.move === 'bet' && a.to === info.legal.minTo);
    const checkIdx = actions.findIndex((a) => a.move === 'check');
    const sizeIdx = minIdx + 1;
    expect(actions[sizeIdx].to!).toBeGreaterThanOrEqual(210 * 0.25);
    const dist = actions.map((_, n) => (n === minIdx ? 1 : 0));
    const values = (size: number, check: number) => actions.map((_, n) => (n === sizeIdx ? size : n === checkIdx ? check : -500));
    const good = applyBetSizing(info, actions, dist, values(40, 0));
    expect(good.distribution[sizeIdx]).toBeGreaterThan(0.85);
    expect(good.distribution[minIdx]).toBeCloseTo(MIN_BET_LEFT, 9);
    const bad = applyBetSizing(info, actions, dist, values(-40, 0));
    expect(bad.distribution[checkIdx]).toBeGreaterThan(0.85);
    const level = applyBetSizing(info, actions, dist, values(0, 0));
    expect(level.distribution[sizeIdx]).toBeCloseTo(level.distribution[checkIdx], 9);
    const none = applyBetSizing(info, actions, dist, null);
    expect(none.distribution[sizeIdx]).toBeCloseTo(none.distribution[checkIdx], 9);
    for (const r of [good, bad, level, none]) expect(sum(r.distribution)).toBeCloseTo(1, 9);
  });

  it('leaves every other choice alone', () => {
    const t = flopSpot();
    const info = informationFor(t.game, t.sb);
    const actions = legalActions(info, true, true);
    const dist = actions.map((_, n) => (n === 1 ? 0.5 : n === 3 ? 0.3 : n === 4 ? 0.2 : 0));
    const r = applyBetSizing(info, actions, dist, null);
    // The token bet (index 1) goes to the check (0) and the third-pot size (2); the bigger sizes keep theirs.
    for (let n = 3; n < actions.length; n++) expect(r.distribution[n]).toBe(dist[n]);
  });

  it('keeps the minimum bet into a small pot, facing a bet and before the flop', () => {
    const t = flopSpot();
    const info = informationFor(t.game, t.sb);
    const actions = legalActions(info, true, true);
    const dist = actions.map((a) => (a.move === 'bet' && a.to === info.legal.minTo ? 1 : 0));
    // A small pot: the minimum is a real share of it.
    const small = { ...info, players: info.players.map((p) => ({ ...p, total: p.total ? 20 : 0 })) };
    expect(applyBetSizing(small, actions, dist, null).distribution).toBe(dist);
    expect(applyBetSizing({ ...info, street: 'preflop' }, actions, dist, null).distribution).toBe(dist);
    expect(applyBetSizing({ ...info, currentBet: 20, legal: { ...info.legal, canCheck: false } }, actions, dist, null).distribution).toBe(dist);
  });
});
