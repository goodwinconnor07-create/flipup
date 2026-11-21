import { describe, expect, it } from 'vitest';
import { makeMove } from '../game/holdem';
import { seededRng } from '../game/cards';
import type { BotMove } from '../game/botPlay';
import { informationFor, legalActions, type InformationSet } from './information';
import { everydayThought } from './everydayLive';
import { applyMultiwayRestraint, KEEP, scaryBoard, weakNoDraw } from './multiway';
import { recordedHand } from './testFixtures';

const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
const betShare = (actions: BotMove[], dist: number[]) => sum(actions.map((a, k) => (a.move === 'bet' || a.move === 'allin' ? dist[k] : 0)));

/** The recorded hand with the small blind's check made: the big blind (pocket fives) to act on A-J-10, two players live. */
function fivesToAct(seed: number) {
  const t = recordedHand(seed, ['9h', '9d'], 20, 'flop');
  if (!t) return null;
  expect(makeMove(t.game, 'check', undefined, { now: 0, deviceId: 'host', rng: seededRng(seed) })).toBeNull();
  return t;
}

describe('multiway restraint', () => {
  it('checks pocket fives into two players on A-J-10 (the recorded hand)', () => {
    let tables = 0;
    for (let seed = 1; tables < 8 && seed < 300; seed++) {
      const t = fivesToAct(seed);
      if (!t) continue;
      tables++;
      everydayThought(t.game, t.bb);
      const trace = t.game.botTable!.traces.at(-1)!;
      // The restraint leaves a bet share within 0.002 of its cap alone.
      expect(betShare(trace.prediction.actions, trace.finalDistribution)).toBeLessThanOrEqual(KEEP[0] + 0.002 + 1e-9);
    }
    expect(tables).toBe(8);
  }, 60_000);

  it('knows a scary board and a weak hand with no draw', () => {
    expect(scaryBoard(['Js', 'Ac', 'Td'])).toBe(true);
    expect(scaryBoard(['Kh', '7h', '2h'])).toBe(true);
    expect(scaryBoard(['9c', '8d', '7s'])).toBe(true);
    expect(scaryBoard(['Kd', '7s', '2c'])).toBe(false);
    expect(weakNoDraw(['5h', '5c'], ['Js', 'Ac', 'Td'])).toBe(true);
    expect(weakNoDraw(['3h', '4c'], ['Js', 'Ac', 'Td'])).toBe(true);
    // A gutshot is weak (K-2 needs a queen); an open-ender or a flush draw is a draw.
    expect(weakNoDraw(['Kh', '2c'], ['Js', 'Ac', 'Td'])).toBe(true);
    expect(weakNoDraw(['9h', '8c'], ['Js', 'Tc', '2d'])).toBe(false);
    expect(weakNoDraw(['5d', '4d'], ['Jd', 'Ad', 'Tc'])).toBe(false);
    // A real pair is not weak: top pair, or a pocket pair over all but one card.
    expect(weakNoDraw(['Ah', '3c'], ['Js', 'Ac', 'Td'])).toBe(false);
    expect(weakNoDraw(['Qh', 'Qc'], ['Js', 'Ac', 'Td'])).toBe(false);
  });

  describe('on the fives spot', () => {
    let info: InformationSet, actions: BotMove[];
    for (let seed = 1; !info! && seed < 300; seed++) {
      const t = fivesToAct(seed);
      if (t) {
        info = informationFor(t.game, t.bb);
        actions = legalActions(info, true, true);
      }
    }
    const dist = () => actions.map((a) => (a.move === 'check' ? 0.4 : a.move === 'bet' ? 0.6 / actions.filter((x) => x.move === 'bet').length : 0));

    it('moves only bets, only to the check, keeps their mix and sums to one', () => {
      const before = dist();
      const r = applyMultiwayRestraint(info, actions, before);
      expect(betShare(actions, r.distribution)).toBeCloseTo(KEEP[0], 9);
      expect(sum(r.distribution)).toBeCloseTo(1, 9);
      const bets = actions.map((_, k) => k).filter((k) => actions[k].move === 'bet');
      for (const k of bets) expect(r.distribution[k] / r.distribution[bets[0]]).toBeCloseTo(before[k] / before[bets[0]], 9);
      expect(r.note).toContain('2-players');
    });

    it('keeps less into three or more players', () => {
      const three = { ...info, players: [...info.players, { ...info.players[0], id: 'extra', seat: 9 }] };
      expect(betShare(actions, applyMultiwayRestraint(three, actions, dist()).distribution)).toBeCloseTo(KEEP[1], 9);
    });

    it('leaves heads-up pots, calm boards, draws, real hands and a bet already made alone', () => {
      const before = dist();
      const headsUp = { ...info, players: info.players.map((p) => (p.id === info.heroId || p.id === info.players.find((q) => q.id !== info.heroId && !q.folded)!.id ? p : { ...p, folded: true })) };
      expect(applyMultiwayRestraint(headsUp, actions, before).distribution).toBe(before);
      expect(applyMultiwayRestraint({ ...info, board: ['Kd', '7s', '2c'] }, actions, before).distribution).toBe(before);
      expect(applyMultiwayRestraint({ ...info, hole: ['Kh', 'Qc'] }, actions, before).distribution).toBe(before);
      expect(applyMultiwayRestraint({ ...info, hole: ['Ah', '3c'] }, actions, before).distribution).toBe(before);
      expect(applyMultiwayRestraint({ ...info, currentBet: 20, legal: { ...info.legal, canCheck: false } }, actions, before).distribution).toBe(before);
    });
  });
});
