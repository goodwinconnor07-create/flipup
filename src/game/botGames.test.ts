import { describe, expect, it } from 'vitest';
import { crowdAggression, crowdDeviation, recalledRemoved } from './botGames';
import { GAME_EVENTS, GAME_FRIENDLY, GAME_TRASH } from './botGameLines';
import { botLineText, variantTalk } from './botTalk';
import { splitBeats, ONE_LINE } from './chat';
import { seededRng } from './cards';
import { createTable, DEFAULT_SETTINGS } from './reducer';
import { startHand } from './holdem';
import { botVote, VARIANTS, type Variant } from './variants';
import type { Game, Hand, HandAction } from './types';

const act = (playerId: string, street: HandAction['street'], move: HandAction['move']): HandAction => ({ playerId, street, move, to: 0 });
const handWith = (actions: HandAction[], ids = ['a', 'b', 'c', 'd']) =>
  ({ seats: ids.map((playerId) => ({ playerId })), actions, board: [], buttonId: 'a', bbId: 'b', sbId: 'a', street: 'river' }) as unknown as Hand;

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

describe('Imposter reading', () => {
  it('sees who acts unlike the rest of the table, and votes for them', () => {
    // a, b and c check and call along; d bets where the others check.
    const h = handWith([
      act('a', 'flop', 'check'), act('b', 'flop', 'check'), act('c', 'flop', 'check'), act('d', 'flop', 'bet'),
      act('a', 'turn', 'check'), act('b', 'turn', 'check'), act('c', 'turn', 'check'), act('d', 'turn', 'bet'),
    ]);
    const dev = crowdDeviation(h);
    expect(dev.get('d')!).toBeGreaterThan(dev.get('a')!);
    expect(botVote(h, 'a')).toBe('d');
    expect(botVote(h, 'b')).toBe('d');
  });
  it('is quiet when nobody stands out', () => {
    const h = handWith([act('a', 'flop', 'check'), act('b', 'flop', 'check'), act('c', 'flop', 'check'), act('d', 'flop', 'check')]);
    for (const v of crowdDeviation(h).values()) expect(v).toBe(0);
  });
  it('knows how aggressive the rest of the table has been', () => {
    const h = handWith([act('b', 'flop', 'bet'), act('c', 'flop', 'call'), act('a', 'flop', 'check')]);
    expect(crowdAggression(h, 'a')).toBeCloseTo(0.5);
  });
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
  it('points a finger and answers one at an Imposter table', () => {
    const game = table('imposter');
    const [a, b] = game.players.filter((p) => p.bot);
    game.hand!.points = { [a.id]: b.id };
    variantTalk(game, () => 0, 100_000);
    expect(said(game).some((id) => id.includes(':impPoint:') || id.includes(':impAccused:'))).toBe(true);
  });
  it('says nothing twice about the same finger', () => {
    const game = table('imposter');
    const [a, b] = game.players.filter((p) => p.bot);
    game.hand!.points = { [a.id]: b.id };
    variantTalk(game, () => 0, 100_000);
    const first = JSON.stringify(game.reactions);
    variantTalk(game, () => 0, 200_000);
    expect(JSON.stringify(game.reactions)).toBe(first);
  });
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
