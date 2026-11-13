import { describe, expect, it } from 'vitest';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { dealNextStreet, makeMove, startHand } from '../game/holdem';
import { seededRng } from '../game/cards';
import type { Card } from '../game/cards';
import type { Move } from '../game/types';
import { informationFor } from './information';
import { everydayThought } from './everydayLive';
import { applyPotOdds, realisation } from './potOdds';

const FLOP: Card[] = ['Js', 'Ac', 'Td'];

/**
 * The hand from the owner's recording (13 Nov 2026), five-handed at 10/20: a limp, the small blind raises to 70 with
 * pocket nines, the big blind calls with fives, the limper calls. A-J-10 flop, the small blind checks, the big blind bets
 * 20 into 210, the limper calls, and it's back to the nines. Returns null for seeds where the person landed in a blind.
 */
function recordedHand(seed: number, hole: Card[] = ['9h', '9d'], flopBet = 20) {
  const ctx = { now: 0, deviceId: 'host', rng: seededRng(seed) };
  const game = createTable({
    hostDeviceId: 'host',
    name: 'You',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, smallBlind: 10, bigBlind: 20 },
    bots: 4,
    code: null,
    now: 0,
    rng: ctx.rng,
  });
  game.players.forEach((p) => (p.stack = 10000));
  startHand(game, ctx);
  const h = game.hand!;
  const me = game.players[0].id,
    sb = h.sbId!,
    bb = h.bbId!;
  if (sb === me || bb === me || h.buttonId === me) return null;
  const seat = (id: string) => h.seats.find((s) => s.playerId === id)!;
  seat(me).cards = ['6d', '3d'];
  seat(sb).cards = hole;
  seat(bb).cards = ['5h', '5c'];
  const used = new Set([...hole, '6d', '3d', '5h', '5c', ...FLOP, '8c']);
  for (const s of h.seats) if (s.cards.some((c) => used.has(c)) && ![me, sb, bb].includes(s.playerId)) s.cards = ['2h', '2c'];
  const act = (m: Move, to?: number) => {
    const e = makeMove(game, m, to, ctx);
    if (e) throw new Error(e);
  };
  while (h.street === 'preflop' && h.toAct) {
    const id = h.toAct;
    if (id === me) act('call');
    else if (id === sb && h.currentBet < 70) act('raise', 70);
    else if (id === sb || id === bb) act('call');
    else act('fold');
  }
  const rest = h.deck.filter((c) => !used.has(c) && !['2h', '2c'].includes(c));
  h.deck = [...rest.slice(0, 1), ...FLOP, ...rest.slice(1, 2), '8c', ...rest.slice(2)];
  dealNextStreet(game, ctx);
  if (h.board.join() !== FLOP.join()) throw new Error(`rigged flop came out ${h.board.join()}`);
  act('check');
  act('bet', flopBet);
  act('call');
  expect(h.toAct).toBe(sb);
  return { game, sb };
}

function tables(n: number, hole?: Card[], flopBet?: number) {
  const out: NonNullable<ReturnType<typeof recordedHand>>[] = [];
  for (let seed = 1; out.length < n && seed < 300; seed++) {
    const t = recordedHand(seed, hole, flopBet);
    if (t) out.push(t);
  }
  return out;
}

const foldShare = (t: NonNullable<ReturnType<typeof recordedHand>>) => {
  everydayThought(t.game, t.sb);
  const trace = t.game.botTable!.traces.at(-1)!;
  return trace.finalDistribution[trace.prediction.actions.findIndex((a) => a.move === 'fold')];
};

describe('pot-odds check', () => {
  it('calls with pocket nines for 20 into 250 (the recorded hand)', () => {
    const folds = tables(8).map(foldShare);
    const avg = folds.reduce((a, b) => a + b, 0) / folds.length;
    // It needs 7.4%; the nines win 11 to 19% of the time against these ranges. A borderline table may still fold.
    expect(avg).toBeLessThan(0.25);
    expect(folds.filter((f) => f <= 0.1).length).toBeGreaterThanOrEqual(6);
  }, 60_000);

  it('still lets nothing fold to the same small bet', () => {
    const [t] = tables(1, ['7h', '2c']);
    const info = informationFor(t.game, t.sb);
    const fold = [1, 0, 0, 0, 0, 0, 0];
    const r = applyPotOdds(info, [{ move: 'fold' }, { move: 'call' }, ...Array(5).fill({ move: 'raise', to: 100 })], fold);
    expect(r.distribution).toEqual(fold);
    expect(r.note).toBeNull();
  });

  it('leaves a big bet to the model', () => {
    const [t] = tables(1, ['9h', '9d'], 900);
    const info = informationFor(t.game, t.sb);
    const dist = [0.9, 0.1, 0];
    const r = applyPotOdds(info, [{ move: 'fold' }, { move: 'call' }, { move: 'raise', to: 3000 }], dist);
    expect(r.distribution).toEqual(dist);
    expect(r.check).toBeUndefined();
  });

  it('only moves fold to call: never adds a raise or a fold, and still sums to one', () => {
    for (const t of tables(4)) {
      const info = informationFor(t.game, t.sb);
      const dist = [0.7, 0.1, 0.15, 0.05];
      const r = applyPotOdds(info, [{ move: 'fold' }, { move: 'call' }, { move: 'raise', to: 60 }, { move: 'raise', to: 300 }], dist);
      expect(r.distribution[0]).toBeLessThanOrEqual(dist[0]);
      expect(r.distribution[2]).toBe(dist[2]);
      expect(r.distribution[3]).toBe(dist[3]);
      expect(r.distribution.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
  });

  it('keeps all its equity on the river and less with streets to come or players behind', () => {
    expect(realisation('river', 0)).toBe(1);
    expect(realisation('flop', 0)).toBeLessThan(realisation('turn', 0));
    expect(realisation('flop', 2)).toBeLessThan(realisation('flop', 0));
    expect(realisation('flop', 9)).toBeGreaterThanOrEqual(0.6);
  });

  it('does nothing before the flop', () => {
    const [t] = tables(1);
    const info = { ...informationFor(t.game, t.sb), street: 'preflop' as const };
    const dist = [1, 0];
    expect(applyPotOdds(info, [{ move: 'fold' }, { move: 'call' }], dist).distribution).toBe(dist);
  });
});
