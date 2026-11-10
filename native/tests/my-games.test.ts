import { describe, expect, it } from 'vitest';

import type { Game } from '@game/types';

import { dayLabel, gamesFor, liveGames, pastGames, whoLine } from '../src/state/my-games';
import type { GameLine } from '../src/state/record';

// My Games (src/state/my-games.ts): the live table or party on top, then past games, split into Online and Bots.
const NOW = new Date(2026, 10, 10, 16, 0).getTime();

const player = (id: string, seat: number, deviceId: string | null, extra: Partial<Game['players'][number]> = {}) => ({
  id,
  name: id,
  emoji: '🙂',
  deviceId,
  bot: deviceId === null,
  seat,
  stack: 1000,
  bought: 1000,
  sittingOut: false,
  timeouts: 0,
  leaving: false,
  ...extra,
});

const game = (over: Partial<Game>): Game =>
  ({
    id: 'g1',
    code: null,
    status: 'playing',
    settings: { variant: 'pineapple' },
    players: [player('Me', 0, 'dme'), player('Fox', 2, null, { emoji: '🦊' }), player('Mia', 1, 'u:mia')],
    hand: { number: 7 },
    ...over,
  }) as unknown as Game;

describe('My Games', () => {
  it('lists the table you are at as live, without you, in seat order', () => {
    const [row] = liveGames({ mode: 'online', code: 'ACES42', game: game({ code: 'ACES42' }) }, null, 'dme');
    expect(row).toMatchObject({ kind: 'table', live: true, online: true, eyebrow: 'Online · ACES42', status: 'Playing', strong: 'hand 7', badge: 'LIVE', tone: 'live' });
    expect(row.who.map((w) => w.name)).toEqual(['Mia', 'Fox']);
  });

  it('calls a bots-only table a bot game and a lobby a lobby', () => {
    const [row] = liveGames({ mode: 'local', code: null, game: game({ status: 'lobby' }) }, null, 'dme');
    expect(row).toMatchObject({ online: false, eyebrow: 'Bot game', strong: 'lobby' });
  });

  it('drops a finished table, and shows an open party instead', () => {
    const ended = { mode: 'local' as const, code: null, game: game({ status: 'ended' }) };
    expect(liveGames(ended, null, 'dme')).toEqual([]);
    expect(liveGames(ended, { code: 'PARTY1', at: 0 } as never, 'dme')[0]).toMatchObject({ kind: 'party', online: true, eyebrow: 'Party · PARTY1' });
  });

  it('lists past games newest first with place, players and day', () => {
    const lines: GameLine[] = [
      { at: NOW - 3 * 86_400_000, variant: 'holdem', place: 2, players: 6, online: true, who: [], net: 2400 },
      { at: NOW - 3_600_000, variant: 'deuces', place: 1, players: 4, online: false, left: true, net: -600 },
      { at: NOW - 86_400_000, variant: 'ghost', place: 11, players: 12 },
    ];
    const rows = pastGames(lines, NOW);
    expect(rows.map((r) => r.eyebrow)).toEqual(['Bots · Today', 'Bots · Yesterday', `Online · ${dayLabel(lines[0].at, NOW, true)}`]);
    expect(rows.map((r) => r.badge)).toEqual(['LEFT', '11TH OF 12', '2ND OF 6']);
    expect(rows.map((r) => `${r.status} ${r.strong}`)).toEqual(['Left −600', ' Finished', 'Finished +2,400']);
    expect(rows.map((r) => r.tone)).toEqual(['down', 'plain', 'up']);
    // A game from before modes were kept counts as a bot game.
    expect(gamesFor('bots', [], rows).past).toHaveLength(2);
    expect(gamesFor('online', [], rows).past).toHaveLength(1);
  });

  it('writes old days in full, the way Flighty does', () => {
    expect(dayLabel(new Date(2026, 8, 29, 12).getTime(), NOW)).toBe('29 Sep 2026');
    expect(dayLabel(new Date(2026, 8, 29, 12).getTime(), NOW, true)).toBe('29 Sep');
    expect(dayLabel(new Date(2025, 8, 29, 12).getTime(), NOW, true)).toBe('29 Sep 2025');
  });

  it('shows the first few faces and how many more', () => {
    const who = Array.from({ length: 7 }, (_, i) => ({ name: `P${i}`, emoji: '🙂', bot: true }));
    expect(whoLine(who)).toMatchObject({ more: 3 });
    expect(whoLine(who).shown).toHaveLength(4);
  });
});
