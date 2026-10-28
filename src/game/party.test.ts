import { describe, expect, it } from 'vitest';
import { applyAction, cryptoRng, finishOrder, buildPartyGame, liveOf, placePoints, rankMembers, shufflePlaylist, partyStandings, VARIANTS, type Game, type PartySettings, type PartyView } from '.';

const settings: PartySettings = { games: ['holdem', 'pineapple', 'deuces', 'ghost'], startingStack: 500, blindHands: 2, fillTo: 4 };
const people = ['a', 'b', 'c'].map((n) => ({ deviceId: `device-${n}-0000000000`, name: n.toUpperCase(), emoji: '🙂' }));

function build(): Game {
  const game = buildPartyGame({ tableCode: 'BCDFG', partyCode: 'HJKLM', round: 1, settings, people, now: 1000 });
  if (!game) throw new Error('no game');
  return game;
}

describe('party scoring', () => {
  it('pays more for a better finish and never less than a point', () => {
    expect(placePoints(0)).toBeGreaterThan(placePoints(1));
    expect(placePoints(20)).toBe(1);
  });

  it('ranks by total, then by the latest round', () => {
    const m = [
      { id: 'x', name: 'X', points: [10, 1] },
      { id: 'y', name: 'Y', points: [1, 10] },
      { id: 'z', name: 'Z', points: [5, 5] },
    ];
    expect(rankMembers(m).map((r) => r.id)).toEqual(['y', 'x', 'z']);
    expect(rankMembers(m, 1).map((r) => r.id)).toEqual(['x', 'z', 'y']);
  });

  it('shows who moved up after a round, and a live ranking during one', () => {
    const members = [
      { id: 'x', name: 'X', emoji: '🙂', points: [10, 1] },
      { id: 'y', name: 'Y', emoji: '🙂', points: [1, 10] },
    ];
    const done = partyStandings({ members, live: null, status: 'between', round: 1 });
    expect(done.map((r) => [r.id, r.move])).toEqual([['y', 1], ['x', -1]]);
    const running = partyStandings({ members: members.map((m) => ({ ...m })), live: [{ id: 'x', stack: 900, out: null }, { id: 'y', stack: 100, out: null }], status: 'playing', round: 2 });
    expect(running[0].id).toBe('x');
    expect(running[0].provisional).toBe(10);
    expect(running.find((r) => r.id === 'y')!.provisional).toBe(7);
  });

  it('builds a shuffled playlist of the right length with no game twice in a row', () => {
    const all = VARIANTS.map((v) => v.id);
    for (const n of [4, 7, 12]) {
      const list = shufflePlaylist(all, n);
      expect(list).toHaveLength(n);
      list.slice(1).forEach((g, i) => expect(g).not.toBe(list[i]));
    }
  });
});

describe('a party round', () => {
  it('seats everyone, fills with bots, uses the round\'s game and starts dealing', () => {
    const game = build();
    expect(game.status).toBe('playing');
    expect(game.players).toHaveLength(4);
    expect(game.players.filter((p) => !p.bot)).toHaveLength(3);
    expect(game.settings.variant).toBe('pineapple');
    expect(game.settings.rebuys).toBe(false);
    expect(game.party).toEqual({ code: 'HJKLM', round: 1, total: 4 });
  });

  it('raises the blinds every few hands, plays to a winner and keeps every chip', () => {
    let game = build();
    const total = game.players.reduce((a, p) => a + p.stack, 0);
    let now = 1000;
    let blindsWent = false;
    for (let i = 0; i < 20000 && game.status !== 'ended'; i++) {
      now += 500;
      const hand = game.hand;
      // Every person calls or checks; the table's clock moves everything else.
      const mover = hand && !hand.result && hand.toAct ? game.players.find((p) => p.id === hand.toAct && !p.bot) : undefined;
      if (mover?.deviceId && hand) {
        const seat = hand.seats.find((s) => s.playerId === mover.id)!;
        const move = hand.currentBet > seat.bet ? 'allin' : 'check';
        const r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move }, { deviceId: mover.deviceId, now, rng: cryptoRng });
        if (r.ok) game = r.game;
        continue;
      }
      const t = applyAction(game, { type: 'tick' }, { deviceId: 'server', now, rng: cryptoRng });
      if (t.ok) game = t.game;
      if (game.settings.bigBlind > settings.startingStack / 50) blindsWent = true;
      expect(game.players.reduce((a, p) => a + p.stack, 0) + (game.hand && !game.hand.result ? game.hand.seats.reduce((a, s) => a + s.total, 0) : 0)).toBeGreaterThan(0);
    }
    expect(game.status).toBe('ended');
    expect(blindsWent || (game.hands ?? 0) < 2).toBe(true);
    const order = finishOrder(game);
    // Busted bots leave the table, but every person stays in the order.
    expect(order.filter((p) => !p.bot)).toHaveLength(3);
    expect(order[0].stack).toBeGreaterThan(0);
    expect(order.reduce((a, p) => a + p.stack, 0)).toBe(total);
    // The people in the live view all have a place.
    const ids = Object.fromEntries(people.map((p, i) => [p.deviceId, `m${i}`]));
    expect(liveOf(game, ids)).toHaveLength(3);
  });
});

describe('PartyView', () => {
  it('type checks', () => {
    const v: PartyView | null = null;
    expect(v).toBeNull();
  });
});
