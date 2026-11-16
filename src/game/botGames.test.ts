import { describe, expect, it } from 'vitest';
import { recalledRemoved } from './botGames';
import { GAME_EVENTS, GAME_FRIENDLY, GAME_TRASH } from './botGameLines';
import { botLineText, variantTalk } from './botTalk';
import { splitBeats, ONE_LINE } from './chat';
import { seededRng } from './cards';
import { createTable, DEFAULT_SETTINGS } from './reducer';
import { startHand } from './holdem';
import { VARIANTS, type Variant } from './variants';
import type { Game } from './types';

describe('Memory Poker recall', () => {
  const removed = Array.from({ length: 20 }, (_, i) => `${'23456789TJQKA'[i % 13]}${'shdc'[Math.floor(i / 13)]}`);
  it('keeps most of the twenty cards, the same ones every time for a bot and hand', () => {
    const a = recalledRemoved(removed, 'bot-1', 7);
    expect(a).toEqual(recalledRemoved(removed, 'bot-1', 7));
    expect(a.length).toBeGreaterThanOrEqual(10);
    expect(a.length).toBeLessThanOrEqual(20);
    let total = 0;
    for (let n = 0; n < 40; n++) total += recalledRemoved(removed, `bot-${n}`, n).length;
    expect(total / 40).toBeGreaterThan(14);
    expect(total / 40).toBeLessThan(19.5);
  });
  it('is nothing when no cards were taken out', () => expect(recalledRemoved(undefined, 'x', 1)).toEqual([]));
});

describe('game talk lines', () => {
  it('has a good handful of lines for every game moment, in both tones', () => {
    for (const event of GAME_EVENTS) {
      expect(GAME_TRASH[event].length).toBeGreaterThanOrEqual(4);
      expect(GAME_FRIENDLY[event].length).toBeGreaterThanOrEqual(4);
    }
  });
  it('keeps every message short enough for a seat bubble, and every id readable', () => {
    for (const event of GAME_EVENTS)
      for (const [tone, pools] of [['trash', GAME_TRASH], ['friendly', GAME_FRIENDLY]] as const)
        pools[event].forEach((line, i) => {
          for (const beat of splitBeats(line)) expect(beat.text.replace('{you}', 'Sam').length).toBeLessThanOrEqual(ONE_LINE + 2);
          expect(botLineText(`b:${tone}:${event}:${i}`)).toBe(line);
        });
  });
});

describe('what bots say at each game', () => {
  const table = (variant: Variant): Game => {
    const rng = seededRng(3);
    const game = createTable({ hostDeviceId: 'h', name: 'Host', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, variant }, bots: 4, code: null, now: 0, rng });
    game.status = 'playing';
    game.legacyBotSimulation = true;
    startHand(game, { deviceId: 'h', now: 0, rng });
    return game;
  };
  const said = (game: Game) => Object.values(game.reactions ?? {}).map((r) => r.id);
  it('reacts to a bust at Blackjack Hold’em and to a power at Power Cards', () => {
    const bj = table('bjholdem');
    bj.hand!.busted = [bj.players.find((p) => p.bot)!.id];
    variantTalk(bj, () => 0, 100_000);
    expect(said(bj).some((id) => id.includes(':bjBust:'))).toBe(true);
    const pw = table('power');
    const [x, y] = pw.players.filter((p) => p.bot);
    pw.hand!.powerUses = [{ by: x.id, power: 'xray', street: 'flop', target: y.id }];
    variantTalk(pw, () => 0, 100_000);
    expect(said(pw).some((id) => id.includes(':powerOnMe:'))).toBe(true);
  });
  it('stays quiet at plain Hold\u2019em', () => {
    const plain = table('holdem');
    variantTalk(plain, () => 0, 100_000);
    expect(plain.reactions ?? {}).toEqual({});
  });
  it('knows every game', () => expect(VARIANTS.length).toBeGreaterThan(10));
});
