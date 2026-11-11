import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/state/storage', () => ({ read: (_k: string, f: unknown) => f, save: () => undefined, useStored: (_k: string, f: unknown) => f }));

import type { Game } from '../src/engine';
import { AGAIN_MS, noteFeel, suggestChallenge, type TableFeel } from '../src/state/table-feel';

const NOW = 1_000_000_000_000;

function game(id: string, extra: Partial<Game> = {}): Game {
  return {
    id,
    code: null,
    status: 'playing',
    settings: { variant: 'holdem', startingStack: 1000, bigBlind: 10, botDifficulty: 'casual' },
    players: [
      { id: 'me', name: 'Me', bot: false, stack: 1000, bought: 1000 },
      { id: 'b1', name: 'Mick H', bot: true, stack: 1000, bought: 1000 },
    ],
    hand: null,
    ...extra,
  } as unknown as Game;
}

const shown = (won: 'me' | 'b1', number: number) =>
  ({
    number,
    seats: [
      { playerId: 'me', cards: ['Ah', 'Kd'], folded: false },
      { playerId: 'b1', cards: ['2c', '7d'], folded: false },
    ],
    result: { showdown: true, pots: [{ amount: 200, winners: [won] }], won: { [won]: 200 }, names: {} },
  }) as unknown as Game['hand'];

describe('table feel', () => {
  it('meets the bots once per table and counts showdowns against them', () => {
    const first = noteFeel(game('t1'), 'me', {}, { tables: [], seen: [] }, NOW)!;
    expect(first.rivals['mick h']).toMatchObject({ tables: 1, beat: 0, lost: 0 });
    const won = noteFeel(game('t1', { hand: shown('me', 1) }), 'me', first.rivals, first.store, NOW + 1)!;
    expect(won.rivals['mick h']).toMatchObject({ tables: 1, beat: 1, lost: 0 });
    expect(won.store.tables[0].hands).toBe(1);
    // The same hand again changes nothing.
    expect(noteFeel(game('t1', { hand: shown('me', 1) }), 'me', won.rivals, won.store, NOW + 2)).toBeNull();
    const lost = noteFeel(game('t1', { hand: shown('b1', 2) }), 'me', won.rivals, won.store, NOW + 3)!;
    expect(lost.rivals['mick h']).toMatchObject({ beat: 1, lost: 1 });
  });

  it('marks a table come back to when another starts soon after', () => {
    const a = noteFeel(game('t1'), 'me', {}, { tables: [], seen: [] }, NOW)!;
    const b = noteFeel(game('t2'), 'me', a.rivals, a.store, NOW + AGAIN_MS - 1)!;
    expect(b.store.tables[0].cameBack).toBe(true);
    expect(b.rivals['mick h'].tables).toBe(2);
    const c = noteFeel(game('t3'), 'me', b.rivals, b.store, NOW + AGAIN_MS * 3)!;
    expect(c.store.tables[1].cameBack).toBe(false);
  });

  it('counts rebuys and the result', () => {
    const g = game('t1');
    g.players[0].bought = 3000;
    g.players[0].stack = 3500;
    const r = noteFeel(g, 'me', {}, { tables: [], seen: [] }, NOW)!;
    expect(r.store.tables[0]).toMatchObject({ rebuys: 2, net: 500 });
  });

  it('suggests Challenge only after three good Casual tables in a row', () => {
    const t = (net: number, hands = 40): TableFeel =>
      ({ botsOnly: true, variant: 'holdem', difficulty: 'casual', hands, net, bigBlind: 10 }) as TableFeel;
    expect(suggestChallenge([t(300), t(250), t(400)])).toBe(true);
    expect(suggestChallenge([t(300), t(-50), t(400)])).toBe(false);
    expect(suggestChallenge([t(300), t(250)])).toBe(false);
    expect(suggestChallenge([t(300), t(250), t(400, 10)])).toBe(false);
  });
});
