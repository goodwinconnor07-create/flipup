import { describe, expect, it } from 'vitest';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { makeMove, startHand } from '../game/holdem';
import { seededRng } from '../game/cards';
import { informationFor, legalActions } from './information';
import { preflopLookup } from './preflop';
import { BaselineProvider } from './strategy';
import { BotService } from './service';
import { BotFactory } from './identity';
import { emptyMemory } from './memory';
import type { Move } from '../game/types';
import { calibrationContexts } from './calibration';
import charts from '../game/botCharts.json';

function fixture(n = 2, depth = 100, bb = 10, line: (Move | number)[] = []) {
  const ctx = { now: 0, deviceId: 'test', rng: seededRng(77) };
  const game = createTable({
    hostDeviceId: 'test',
    name: 'Test',
    emoji: '🃏',
    settings: {
      ...DEFAULT_SETTINGS,
      startingStack: depth * bb,
      smallBlind: bb / 2,
      bigBlind: bb,
    },
    bots: n - 1,
    code: null,
    now: 0,
    rng: ctx.rng,
  });
  game.players.forEach((p) => {
    p.bot = false;
  });
  startHand(game, ctx);
  for (const action of line)
    expect(makeMove(game, typeof action === 'number' ? 'raise' : action, typeof action === 'number' ? action : undefined, ctx)).toBeNull();
  const info = informationFor(game, game.hand!.toAct!);
  return { game, ctx, info };
}
function matched(n: number, depth: number, line: (Move | number)[], spot: string, raiseTo?: number) {
  const { game, ctx, info } = fixture(n, depth, 10, line);
  expect(preflopLookup(info)).toMatchObject({ matched: true, bank: `${n}p${depth}`, spot, ...(raiseTo ? { raiseTo } : {}) });
  const prediction = new BaselineProvider().predict(info);
  expect(prediction.source).toBe('shipped-preflop-frequency');
  expect(prediction.values).toBeNull();
  expect(prediction.probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  for (const action of prediction.actions) expect(makeMove(structuredClone(game), action.move, action.to, ctx)).toBeNull();
  const profile = new BotFactory().generate(info.heroId, 1001);
  const trace = new BotService().decide(info, profile, emptyMemory(info.heroId, info.tableId), 1);
  expect(prediction.actions).toContainEqual(trace.action);
  return prediction;
}

describe('Preflop chart coverage', () => {
  it('reaches every exported spot through production rules and decodes all 169 hand classes', () => {
    const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
    for (const [bank, data] of Object.entries(charts.charts)) {
      const [n, depth] = bank.split('p').map(Number);
      for (const [spot, row] of Object.entries(data.spots)) {
        const [kind, first, second] = spot.split('.');
        const a = Number(first),
          b = Number(second);
        const opener = kind === '4bet' ? b : a,
          raiser = kind === '4bet' ? a : b;
        const sb = n === 2 ? 0 : n - 2;
        const folds = (count: number): Move[] => Array(count).fill('fold');
        const open = (): Move[] => [...folds(opener), 'raise', ...folds(raiser - opener - 1)];
        const three = (): Move[] => [...open(), 'raise', ...folds(n - raiser - 1)];
        const line: Move[] =
          kind === 'rfi'
            ? folds(a)
            : kind === 'limp'
              ? [...folds(sb), 'call']
              : kind === 'open'
                ? open()
                : kind === '3bet'
                  ? three()
                  : [...three(), 'raise'];
        const { game, ctx } = fixture(n, depth);
        for (const move of line) {
          const info = informationFor(game, game.hand!.toAct!);
          const lookup = preflopLookup(info);
          if (move === 'raise' && !lookup.matched) throw new Error(`${bank}:${spot} prefix failed: ${lookup.reason}`);
          expect(makeMove(game, move, move === 'raise' && lookup.matched ? lookup.raiseTo : undefined, ctx)).toBeNull();
        }
        const info = informationFor(game, game.hand!.toAct!);
        for (const [k, cls] of charts.classes.entries()) {
          info.hole = [cls[0] + 's', cls[1] + (cls[2] === 's' ? 's' : 'h')];
          const lookup = preflopLookup(info);
          expect(lookup).toMatchObject({
            matched: true,
            bank,
            spot,
            call: digits.indexOf(row[k * 2]) / 35,
            raise: digits.indexOf(row[k * 2 + 1]) / 35,
          });
        }
      }
    }
  });
  it.each([
    [2, 100, [], 'rfi.0', 25],
    [2, 100, [25], 'open.0.1', 100],
    [2, 100, [25, 100], '3bet.0.1', 220],
    [2, 100, [25, 100, 220], '4bet.1.0', 1000],
    [2, 100, ['call'], 'limp', 35],
    [2, 20, [], 'rfi.0', 20],
    [2, 20, [20], 'open.0.1', 80],
    [2, 20, [20, 80], '3bet.0.1', 200],
    [6, 100, [], 'rfi.0', 23],
    [6, 100, ['fold', 'fold', 'fold'], 'rfi.3', 25],
    [6, 100, ['fold', 'fold', 'fold', 'fold'], 'rfi.4', 30],
    [6, 100, [23, 'fold', 'fold'], 'open.0.3', 69],
    [6, 100, [23, 'fold', 'fold', 69, 'fold', 'fold'], '3bet.0.3', 166],
    [6, 100, [23, 'fold', 'fold', 69, 'fold', 'fold', 166], '4bet.3.0', 1000],
    [6, 40, ['fold', 'fold', 'fold', 'fold'], 'rfi.4', 25],
    [6, 100, ['fold', 'fold', 'fold', 'fold', 'call'], 'limp', 35],
  ] as [number, number, (Move | number)[], string, number][])('matches %ip%ibb %j → %s', (n, depth, line, spot, raiseTo) => {
    matched(n, depth, line, spot, raiseTo);
  });

  it.each([2, 3, 4, 5, 6])('covers every opening position at %i seats and each shipped depth', (n) => {
    for (const depth of [20, 40, 100]) for (let hero = 0; hero < n - 1; hero++) matched(n, depth, Array(hero).fill('fold'), `rfi.${hero}`);
  });

  it('uses the stored hand-class frequencies and scales the size with chips', () => {
    const info = fixture(2, 100, 100, [250]).info;
    info.hole = ['As', 'Ah'];
    const p = new BaselineProvider().predict(info);
    expect(p.preflop).toMatchObject({ matched: true, raiseTo: 1000 });
    expect(p.actions[p.probabilities.indexOf(Math.max(...p.probabilities))]).toEqual({ move: 'raise', to: 1000 });
    expect(p.probabilities[p.actions.findIndex((a) => a.move === 'fold')]).toBe(0);
  });

  it.each([
    [2, 100, [30], 'off-tree-raise-size'],
    [2, 100, [25, 1000], 'off-tree-raise-size'],
    [3, 100, ['call'], 'unsupported-action-history'],
    [3, 100, [25, 'call'], 'unsupported-action-history'],
    [2, 75, [], 'unsupported-stack-depth'],
    [7, 100, [], 'unsupported-player-count'],
  ] as [number, number, (Move | number)[], string][])('falls back explicitly for %ip%i %j', (n, depth, line, reason) => {
    const info = fixture(n, depth, 10, line).info;
    expect(preflopLookup(info)).toEqual({ matched: false, reason });
    expect(new BaselineProvider(4, 'baseline-4').predict(info).coverage).toBe('fallback');
  });

  it('rejects unequal stacks, altered blinds, out-of-turn folds and inconsistent public state', () => {
    const original = fixture(2, 100, 10, [25]).info;
    const cases = [
      [
        'unequal-starting-stacks',
        (i: typeof original) => {
          i.players[0].stack--;
        },
      ],
      [
        'unsupported-blind-ratio',
        (i: typeof original) => {
          i.smallBlind = 4;
        },
      ],
      [
        'unsupported-action-history',
        (i: typeof original) => {
          i.actions[0].outOfTurn = true;
        },
      ],
      [
        'inconsistent-public-state',
        (i: typeof original) => {
          i.currentBet++;
        },
      ],
    ] as const;
    for (const [reason, mutate] of cases) {
      const info = structuredClone(original);
      mutate(info);
      expect(preflopLookup(info)).toEqual({ matched: false, reason });
      expect(legalActions(info, true)).toEqual(legalActions(info));
    }
  });

  it('preserves the incumbent candidate space and representative postflop policies', () => {
    const info = fixture(6).info;
    expect(legalActions(info)).not.toContainEqual({ move: 'raise', to: 23 });
    expect(legalActions(info, true)).toContainEqual({ move: 'raise', to: 23 });
    expect(new BaselineProvider(4, 'baseline-3').predict(info).modelVersion).toBe('baseline-3');
    for (const postflop of calibrationContexts().filter((i) => i.street !== 'preflop')) {
      const { modelVersion: _old, ...before } = new BaselineProvider(4, 'baseline-3').predict(postflop);
      const { modelVersion: _new, ...after } = new BaselineProvider(4).predict(postflop);
      expect(after).toEqual(before);
    }
  });

  it('recognizes positions after seat gaps, circular rotation and player-array reordering', () => {
    const info = fixture(6, 100, 10, [23, 'fold', 'fold', 69, 'fold', 'fold']).info;
    const before = preflopLookup(info);
    const seats = [0, 2, 3, 5, 7, 8];
    info.players.forEach((p) => {
      p.seat = (seats[p.seat] + 4) % 9;
    });
    info.players.reverse();
    expect(preflopLookup(info)).toEqual(before);
  });
});
