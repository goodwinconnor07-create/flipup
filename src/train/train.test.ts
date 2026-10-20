import { describe, expect, it } from 'vitest';
import { applyAction, createTable, handRecord, recordNet, type Game } from '../game';
import { computeStats } from './stats';
import { buildFrames, matchDecisions, mistakeFrames } from './replay';
import { handLesson, lessonLine, trendLine, verdictLines } from './coach';
import type { Decision, HandReport } from '../gto/types';
import type { PlayedHand } from '../state/training';

function playBots(): Game {
  let game = createTable({ hostDeviceId: 'dev', name: 'Me', emoji: '🙂', settings: { startingStack: 200, smallBlind: 1, bigBlind: 2, rebuys: true, turnSeconds: 0 }, bots: 3, code: null, now: 0 });
  // Bots are seated at random; fix their styles so every run plays the same hands.
  game.players.filter((p) => p.bot).forEach((p, i) => (p.style = ['pro', 'tag', 'station'][i]));
  let now = 1;
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ctx = (deviceId: string) => ({ deviceId, now, rng });
  game = (applyAction(game, { type: 'start' }, ctx('dev')) as { game: Game }).game;
  for (let step = 0; step < 4000 && (game.logs?.length ?? 0) < 6; step++) {
    now = Math.max(now + 1, (game.wakeAt ?? now) + 1);
    const hand = game.hand;
    const me = game.players.find((p) => p.deviceId === 'dev')!;
    if (hand && !hand.result && hand.toAct === me.id) {
      const r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: hand.currentBet > (hand.seats.find((s) => s.playerId === me.id)?.bet ?? 0) ? 'call' : 'check' }, ctx('dev'));
      if (r.ok) game = r.game;
      continue;
    }
    const r = applyAction(game, { type: 'tick' }, ctx('clock'));
    if (r.ok) game = r.game;
  }
  return game;
}

describe('hand records', () => {
  it('records every move and balances chips', () => {
    const game = playBots();
    const logs = game.logs ?? [];
    expect(logs.length).toBeGreaterThan(0);
    for (const l of logs) {
      const r = l.record!;
      expect(r).toBeTruthy();
      expect(r.actions.length).toBeGreaterThan(0);
      const total = r.players.reduce((t, p) => t + recordNet(r, p.id), 0);
      expect(Math.abs(total)).toBeLessThanOrEqual(r.players.length); // odd chips aside, zero-sum
    }
    expect(handRecord(game, game.hand!, 0)?.number ?? logs.at(-1)!.number).toBeGreaterThan(0);
  });

  it('computes stats from played hands', () => {
    const game = playBots();
    const me = game.players.find((p) => p.deviceId === 'dev')!;
    const hands: PlayedHand[] = (game.logs ?? []).map((l) => ({ key: `${game.id}#${l.number}`, heroId: me.id, record: l.record! }));
    const s = computeStats(hands, {}, { cbet_ip: { attempts: 4, green: 1, yellow: 1, red: 2, evLoss: 3 } });
    expect(s.hands).toBe(hands.length);
    expect(s.wins + s.losses).toBeLessThanOrEqual(s.hands);
    expect(s.vpip).toBeGreaterThanOrEqual(0);
    expect(s.weaknesses.map((w) => w.id)).toContain('cbet_ip');
  });
});

describe('replay frames', () => {
  it('walks every hand from the deal to a result that keeps every chip', () => {
    const game = playBots();
    const me = game.players.find((p) => p.deviceId === 'dev')!;
    for (const l of game.logs ?? []) {
      const r = l.record!;
      const frames = buildFrames(r, me.id);
      expect(frames[0].kind).toBe('deal');
      expect(frames.at(-1)!.kind).toBe('result');
      expect(frames.filter((f) => f.kind === 'action')).toHaveLength(r.actions.length);
      expect(frames.at(-1)!.boardCount).toBe(r.board.length);
      // Board cards only ever go up, and a street frame is never skipped.
      for (let i = 1; i < frames.length; i++) expect(frames[i].boardCount).toBeGreaterThanOrEqual(frames[i - 1].boardCount);
      const before = r.players.reduce((t, p) => t + p.stack, 0);
      const after = Object.values(frames.at(-1)!.stacks).reduce((t, v) => t + v, 0);
      expect(after).toBe(before);
      // Nobody's chips ever go below zero while the hand plays.
      for (const f of frames) for (const v of Object.values(f.stacks)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('only turns up cards the phone was allowed to see', () => {
    const game = playBots();
    const me = game.players.find((p) => p.deviceId === 'dev')!;
    const r = game.logs![0].record!;
    const frames = buildFrames(r, me.id);
    for (const f of frames.slice(0, -1)) expect(f.reveal).toEqual([me.id]);
    for (const id of frames.at(-1)!.reveal) expect(id === me.id || !!r.holes[id]).toBe(true);
  });
});

const decision = (over: Partial<Decision>): Decision => ({
  street: 'preflop',
  player: 'x',
  position: 'BTN',
  board: [],
  pot_bb: 1.5,
  to_call_bb: 1,
  action: { move: 'call', to_bb: 1 },
  method: 'solver',
  grade: 'best',
  colour: 'green',
  explanation: [],
  ...over,
});

describe('GTO coach', () => {
  it('pairs your moves with the coach\'s grades', () => {
    const game = playBots();
    const me = game.players.find((p) => p.deviceId === 'dev')!;
    const r = game.logs!.map((l) => l.record!).find((x) => x.actions.some((a) => a.playerId === me.id))!;
    const mine = r.actions.filter((a) => a.playerId === me.id);
    const decisions = mine.map((a) => decision({ street: a.street, action: { move: a.move, to_bb: 1 }, colour: 'red' }));
    const matched = matchDecisions(r, me.id, decisions);
    expect(matched.size).toBe(mine.length);
    const frames = buildFrames(r, me.id);
    expect(mistakeFrames(frames, matched)).toHaveLength(mine.length);
  });

  it('talks plainly, and gives one lesson per hand', () => {
    const bad = decision({
      colour: 'red',
      grade: 'blunder',
      best_action: 'fold',
      matched_action: 'call',
      ev_loss_bb: 1.2,
      gto: [
        { action: 'fold', frequency: 1, ev_bb: 0 },
        { action: 'call', frequency: 0, ev_bb: -1.2 },
      ],
      scenario: 'vs_3bet',
    });
    const lines = verdictLines(bad);
    expect(lines[0]).toContain('call');
    expect(lines.join(' ')).toContain('1.2bb');
    expect(lessonLine(bad)).toMatch(/folding/i);
    const good = decision({ colour: 'green', best_action: 'call', matched_action: 'call', gto: [{ action: 'call', frequency: 1, ev_bb: 0 }] });
    expect(lessonLine(good)).toBeNull();
    const report = { decisions: [good, bad] } as HandReport;
    expect(handLesson(report).decision).toBe(bad);
    expect(handLesson({ decisions: [good] } as HandReport).text).toMatch(/clean/i);
  });

  it('reads the trend of your last hands', () => {
    const t = (xs: number[]) => xs.map((score, i) => ({ key: String(i), at: i, score }));
    expect(trendLine(t([0.5, 0.5]))).toBeNull();
    expect(trendLine(t([0.4, 0.4, 0.8, 0.8]))).toMatch(/improving/);
    expect(trendLine(t([0.8, 0.8, 0.4, 0.4]))).toMatch(/dip/);
  });
});
