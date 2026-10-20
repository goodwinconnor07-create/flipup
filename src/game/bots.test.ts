import { describe, expect, it } from 'vitest';
import parity from './botPlay.parity.json';
import { boardTexture, category, handBucket } from './botPlay';
import { simulate } from './botSim';
import { BOTS, STYLES } from './botStyles';
import { botLineText } from './botTalk';
import { reactionText } from './reactions';
import { redactForDevice } from './redact';
import { createTable, DEFAULT_SETTINGS } from './reducer';
import { parseAction } from './validate';

describe('bots', () => {
  it('sorts hands and boards exactly like the trainer that built their tables', () => {
    for (const s of parity as { hole: string[]; board: string[]; bucket: string; texture: string; category: number }[]) {
      expect(category([...s.hole, ...s.board]), `${s.hole} ${s.board}`).toBe(s.category);
      expect(handBucket(s.hole, s.board), `${s.hole} ${s.board}`).toBe(s.bucket);
      expect(boardTexture(s.board), `${s.board}`).toBe(s.texture);
    }
  });

  it('has forty bots, four of each of the ten styles, all different', () => {
    expect(BOTS).toHaveLength(40);
    expect(new Set(BOTS.map((b) => b.name)).size).toBe(40);
    expect(new Set(BOTS.map((b) => b.emoji)).size).toBe(40);
    for (const style of Object.keys(STYLES)) expect(BOTS.filter((b) => b.style === style)).toHaveLength(4);
  });

  it('seats bots in a random order, not top to bottom', () => {
    const firsts = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 1, code: null, now: 0 });
      firsts.add(g.players[1].name);
    }
    expect(firsts.size).toBeGreaterThan(5);
  });

  it("keeps each bot's style and the bots' notes off every phone", () => {
    const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 3, code: null, now: 0 });
    g.reads = { x: { hands: 1, vpip: 1, pfr: 0, betsFaced: 0, foldsToBet: 0, aggr: 0, calls: 0 } };
    // A bot that has said what it's thinking knows its next move: that stays on the server too.
    g.botPlan = { playerId: 'x', seq: 3, move: 'raise', to: 60 };
    g.pendingTalk = { at: 5, playerId: 'x' };
    expect(g.players.some((p) => p.style)).toBe(true);
    const seen = redactForDevice(g, 'h');
    expect(seen.players.every((p) => p.style === undefined)).toBe(true);
    expect(seen.reads).toBeUndefined();
    expect(seen.botPlan).toBeUndefined();
    expect(seen.pendingTalk).toBeUndefined();
  });

  it("speaks only from its own fixed lines, which phones can't send", () => {
    expect(botLineText('b:trash:allin:0')).toBeTruthy();
    expect(reactionText('b:friendly:bigWin:1')).toBeTruthy();
    expect(parseAction({ type: 'react', id: 'b:trash:allin:0' })).toBeNull();
  });

  it('talks like a real table: most hands get a word, the chatty styles more than the quiet ones', () => {
    const report = simulate(['pro', 'maniac', 'rock', 'gambler'], 150, 9);
    const said = (style: string) => report.find((r) => r.style === style)!.comments;
    expect(report.reduce((a, r) => a + r.comments, 0)).toBeGreaterThan(75);
    expect(said('maniac')).toBeGreaterThan(said('rock'));
  }, 60_000);

  it('plays each style the way it should', () => {
    const report = [
      ...simulate(['pro', 'rock', 'maniac', 'station', 'tag', 'lag'], 250, 3),
      ...simulate(['shark', 'gambler', 'trapper', 'nervous', 'rock', 'maniac'], 250, 4),
    ];
    const avg = (style: string, k: 'vpip' | 'pfr' | 'aggression' | 'foldToBet') => {
      const rs = report.filter((r) => r.style === style);
      return rs.reduce((a, r) => a + r[k], 0) / rs.length;
    };
    // How many hands they play, tightest to loosest.
    // (Over a few hundred hands the tight styles can land close together, so compare across the range.)
    expect(avg('rock', 'vpip')).toBeLessThan(avg('pro', 'vpip'));
    expect(avg('tag', 'vpip')).toBeLessThan(avg('lag', 'vpip'));
    expect(avg('lag', 'vpip')).toBeLessThan(avg('maniac', 'vpip'));
    expect(avg('gambler', 'vpip')).toBeGreaterThan(avg('pro', 'vpip'));
    // The station calls and doesn't raise; the maniac raises everything.
    expect(avg('station', 'pfr')).toBeLessThan(avg('station', 'vpip') / 2);
    expect(avg('station', 'foldToBet')).toBeLessThan(avg('nervous', 'foldToBet'));
    expect(avg('maniac', 'aggression')).toBeGreaterThan(avg('station', 'aggression') * 4);
  }, 120_000);
});
