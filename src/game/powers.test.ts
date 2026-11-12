import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createTable,
  DEFAULT_SETTINGS,
  options,
  parseAction,
  POWER_IDS,
  redactForDevice,
  seededRng,
  startWait,
  type Action,
  type Game,
  type PowerId,
  type Settings,
} from './index';

const HOST = 'device-host';
let clock = 5_000_000;
const ctx = (deviceId: string, rng = seededRng(7)) => ({ deviceId, now: clock, rng });
const h = (s: string) => s.split(' ');

function must(game: Game, action: Action, deviceId: string, rng = seededRng(7)): Game {
  const r = applyAction(game, action, { ...ctx(deviceId), rng });
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.game;
}

function table(players: number, settings: Partial<Settings> = {}, seed = 1): Game {
  let game = createTable({
    hostDeviceId: HOST,
    name: 'Host',
    emoji: '😎',
    settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, variant: 'power', ...settings },
    bots: 0,
    code: 'BCDFG',
    now: clock,
  });
  for (let i = 1; i < players; i++) game = must(game, { type: 'join', name: `P${i}`, emoji: '🐸' }, `device-${i}`);
  let g = must(game, { type: 'start' }, HOST, seededRng(seed));
  expect(g.nextHandAt).toBe(clock + startWait(g));
  for (let i = 0; i < 5 && !g.hand; i++) {
    clock = g.wakeAt ?? clock + 1;
    g = must(g, { type: 'tick' }, 'server', seededRng(seed));
  }
  return g;
}

const deviceOf = (game: Game, id: string) => game.players.find((p) => p.id === id)!.deviceId!;
const nameOf = (game: Game, id: string | null | undefined) => game.players.find((p) => p.id === id)?.name;
const idOf = (game: Game, name: string) => game.players.find((p) => p.name === name)!.id;
const seatOf = (game: Game, name: string) => game.hand!.seats.find((s) => nameOf(game, s.playerId) === name)!;
const stackOf = (game: Game, name: string) => game.players.find((p) => p.name === name)!.stack;
const toAct = (game: Game) => nameOf(game, game.hand!.toAct)!;

/** Lets any moment or pause pass, as the table's clock would, until someone has to act or the hand is over. */
function settle(game: Game): Game {
  let g = game;
  for (let i = 0; i < 12; i++) {
    const hand = g.hand!;
    if (hand.result) return g;
    if (hand.moment?.gate && clock < hand.moment.until) clock = hand.moment.until;
    if (hand.toAct && hand.nextStreetAt == null && hand.bettingAt == null && hand.showdownAt == null && !hand.runout) return g;
    clock = (g.wakeAt ?? clock) + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

function act(game: Game, move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', to?: number): Game {
  const hand = game.hand!;
  return settle(must(game, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, deviceOf(game, hand.toAct!)));
}

function power(game: Game, more: { target?: string; card?: string; rank?: number } = {}): Game {
  const hand = game.hand!;
  return must(game, { type: 'power', hand: hand.number, seq: hand.seq, ...more }, deviceOf(game, hand.toAct!));
}

function tryPower(game: Game, more: { target?: string; card?: string; rank?: number } = {}) {
  const hand = game.hand!;
  return applyAction(game, { type: 'power', hand: hand.number, seq: hand.seq, ...more }, ctx(deviceOf(game, hand.toAct!)));
}

/** Fixes the cards: everyone's hole cards, the board (burn, flop, burn, turn, burn, river) and spare cards at the bottom of the deck. */
function rig(game: Game, holes: Record<string, string>, board: string, spare = '8c 8d 8h 8s 9c 9d'): Game {
  const g = structuredClone(game);
  const hand = g.hand!;
  for (const s of hand.seats) s.cards = h(holes[nameOf(g, s.playerId)!]);
  const b = h(board);
  hand.deck = ['2c', b[0], b[1], b[2], '2d', b[3], '2h', b[4], ...h(spare)];
  return g;
}

/** Gives a player a power for this hand. */
function give(game: Game, name: string, id: PowerId): Game {
  const g = structuredClone(game);
  g.hand!.powers = { ...g.hand!.powers, [idOf(g, name)]: id };
  return g;
}

function chipsInPlay(game: Game): number {
  return game.players.reduce((sum, p) => sum + p.stack, 0) + (game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0);
}

/** Everyone calls or checks round to the next street. */
function callRound(game: Game): Game {
  let g = game;
  const street = g.hand!.street;
  for (let i = 0; i < 12 && !g.hand!.result && g.hand!.street === street && g.hand!.toAct; i++) {
    const o = options(g, g.hand!, g.hand!.seats.find((s) => s.playerId === g.hand!.toAct)!);
    g = act(g, o.canCheck ? 'check' : 'call');
  }
  return g;
}

describe('Power Cards', () => {
  it('deals everyone dealt in one power at random, every hand', () => {
    const g = table(4);
    const hand = g.hand!;
    expect(hand.variant).toBe('power');
    expect(Object.keys(hand.powers!).sort()).toEqual(hand.seats.map((s) => s.playerId).sort());
    for (const p of Object.values(hand.powers!)) expect(POWER_IDS).toContain(p);
  });

  it('keeps powers secret until they are played, and what a Peek shows stays with its player', () => {
    let g = table(3);
    const first = toAct(g);
    g = give(g, first, 'peek');
    const other = g.players.find((p) => p.name !== first)!;
    const before = redactForDevice(g, other.deviceId!);
    expect(Object.keys(before.hand!.powers!)).toEqual([other.id]);
    g = power(g);
    const theirs = redactForDevice(g, other.deviceId!);
    expect(theirs.hand!.powers![idOf(g, first)]).toBe('peek');
    expect(theirs.hand!.powerUses![0].seen).toBeUndefined();
    const mine = redactForDevice(g, deviceOf(g, idOf(g, first)));
    expect(mine.hand!.powerUses![0].seen).toHaveLength(1);
  });

  it('Peek shows the next board card, and it comes', () => {
    let g = table(2);
    g = rig(g, { Host: 'As Kd', P1: 'Qh Jh' }, '7c 6d 5h 4s 3c');
    g = give(g, toAct(g), 'peek');
    g = power(g);
    expect(g.hand!.powerUses![0].seen).toEqual(['7c']);
    g = settle(g);
    g = callRound(g);
    expect(g.hand!.board[0]).toBe('7c');
  });

  it('X-ray shows one of the opponent’s cards', () => {
    let g = table(2);
    g = rig(g, { Host: 'As Kd', P1: 'Qh Jh' }, '7c 6d 5h 4s 3c');
    const me = toAct(g);
    const them = me === 'Host' ? 'P1' : 'Host';
    g = give(g, me, 'xray');
    g = power(g, { target: idOf(g, them) });
    expect(seatOf(g, them).cards).toContain(g.hand!.powerUses![0].seen![0]);
  });

  it('Swap replaces a card from the bottom of the deck and leaves the board to come alone', () => {
    let g = table(2);
    g = rig(g, { Host: 'As Kd', P1: 'Qh Jh' }, '7c 6d 5h 4s 3c', '8c 9d');
    const me = toAct(g);
    const mine = seatOf(g, me).cards[1];
    g = give(g, me, 'swap');
    g = power(g, { card: mine });
    expect(seatOf(g, me).cards).not.toContain(mine);
    expect(seatOf(g, me).cards).toContain('9d');
    g = settle(g);
    g = callRound(g);
    expect(g.hand!.board).toEqual(['7c', '6d', '5h']);
  });

  it('Reroll and Extra Card only work once the board is out, and change it for everyone', () => {
    let g = table(2);
    g = rig(g, { Host: 'As Kd', P1: 'Qh Jh' }, '7c 6d 5h 4s 3c', '8c 9d');
    g = give(g, toAct(g), 'reroll');
    expect(tryPower(g, { card: '7c' }).ok).toBe(false);
    g = callRound(settle(g));
    expect(g.hand!.street).toBe('flop');
    g = give(g, toAct(g), 'reroll');
    g = power(g, { card: '6d' });
    expect(g.hand!.board).toEqual(['7c', '9d', '5h']);
    expect(g.hand!.powerUses!.at(-1)).toMatchObject({ out: '6d', in: '9d' });
    g = act(settle(g), 'check');
    g = give(g, toAct(g), 'extra');
    g = power(g);
    expect(g.hand!.board).toEqual(['7c', '9d', '5h', '8c']);
    g = callRound(settle(g));
    g = callRound(g);
    expect(g.hand!.board).toEqual(['7c', '9d', '5h', '8c', '4s', '3c']);
  });

  it('Pass Left moves one card from each player to the next', () => {
    let g = table(3);
    g = rig(g, { Host: 'As Kd', P1: 'Qh Jh', P2: 'Tc 9s' }, '7c 6d 5h 4s 3c');
    const all = g.hand!.seats.flatMap((s) => s.cards).sort();
    g = give(g, toAct(g), 'passleft');
    g = power(g);
    expect(g.hand!.seats.flatMap((s) => s.cards).sort()).toEqual(all);
    for (const s of g.hand!.seats) expect(s.cards).toHaveLength(2);
    expect(g.hand!.seats.map((s) => s.cards.join())).not.toEqual(structuredClone(g).hand!.seats.map(() => ''));
  });

  it('Silence stops an opponent betting or raising for the rest of the street', () => {
    let g = table(2);
    g = callRound(settle(g));
    const me = toAct(g);
    const them = me === 'Host' ? 'P1' : 'Host';
    g = give(g, me, 'silence');
    g = power(g, { target: idOf(g, them) });
    g = settle(g);
    g = act(g, 'check');
    expect(toAct(g)).toBe(them);
    const o = options(g, g.hand!, seatOf(g, them));
    expect(o.canRaise).toBe(false);
    const hand = g.hand!;
    expect(applyAction(g, { type: 'act', hand: hand.number, seq: hand.seq, move: 'bet', to: 40 }, ctx(deviceOf(g, hand.toAct!))).ok).toBe(false);
  });

  it('Fold Tax charges whoever folds a big blind, into the pot', () => {
    let g = table(3);
    const total = chipsInPlay(g);
    const me = toAct(g);
    g = give(g, me, 'foldtax');
    g = power(g);
    g = settle(g);
    g = act(g, 'call');
    const folder = toAct(g);
    const before = stackOf(g, folder);
    g = act(g, 'fold');
    expect(stackOf(g, folder)).toBe(before - DEFAULT_SETTINGS.bigBlind);
    expect(chipsInPlay(g)).toBe(total);
  });

  it('Shield gives a loser half of what they put in after it went up', () => {
    let g = table(2);
    g = rig(g, { Host: '7d 2s', P1: '7h 2c' }, 'Ac Kc Qd Jc 3h');
    const total = chipsInPlay(g);
    g = callRound(settle(g));
    // Now give the player first to act a hand that loses, and a Shield.
    const me = toAct(g);
    const them = me === 'Host' ? 'P1' : 'Host';
    const fixed = structuredClone(g);
    fixed.hand!.seats.find((s) => s.playerId === idOf(g, me))!.cards = ['4d', '5s'];
    fixed.hand!.seats.find((s) => s.playerId === idOf(g, them))!.cards = ['Ah', 'As'];
    g = give(fixed, me, 'shield');
    const put = seatOf(g, me).total;
    g = power(g);
    g = settle(g);
    g = act(g, 'bet', 100);
    g = act(g, 'call');
    g = callRound(g);
    g = callRound(g);
    expect(g.hand!.result?.showdown).toBe(true);
    const use = g.hand!.powerUses![0];
    expect(use.refund).toBe(Math.floor((seatOf(g, me).total - put) / 2));
    expect(g.hand!.result!.won[idOf(g, me)]).toBe(use.refund);
    expect(chipsInPlay(g)).toBe(total);
  });

  it('Bounty pays the caller a big blind from everyone when the rank comes', () => {
    let g = table(3);
    g = rig(g, { Host: '7d 2s', P1: '7h 3c', P2: '9s 4d' }, 'Ac Kc Qd Jc Qh');
    const total = chipsInPlay(g);
    const me = toAct(g);
    g = give(g, me, 'bounty');
    g = power(g, { rank: 12 });
    g = settle(g);
    for (let i = 0; i < 8 && !g.hand!.result; i++) g = callRound(g);
    const use = g.hand!.powerUses![0];
    expect(Object.values(use.paid ?? {})).toEqual([DEFAULT_SETTINGS.bigBlind, DEFAULT_SETTINGS.bigBlind]);
    expect(chipsInPlay(g)).toBe(total);
  });

  it('Copycat plays the last power someone else played, and nobody plays twice', () => {
    let g = table(3);
    const first = toAct(g);
    g = give(g, first, 'foldtax');
    g = power(g);
    expect(tryPower(settle(g)).ok).toBe(false);
    g = settle(g);
    g = act(g, 'call');
    const second = toAct(g);
    g = give(g, second, 'copycat');
    g = power(g);
    expect(g.hand!.powerUses!.at(-1)).toMatchObject({ power: 'copycat', as: 'foldtax' });
  });

  it('can only be played on your turn', () => {
    const g = table(3);
    const someoneElse = g.hand!.seats.find((s) => s.playerId !== g.hand!.toAct)!.playerId;
    const r = applyAction(g, { type: 'power', hand: g.hand!.number, seq: g.hand!.seq }, ctx(deviceOf(g, someoneElse)));
    expect(r.ok).toBe(false);
  });

  it('reads a power from the network and rejects bad ones', () => {
    expect(parseAction({ type: 'power', hand: 1, seq: 2, rank: 12 })).toEqual({ type: 'power', hand: 1, seq: 2, rank: 12 });
    expect(parseAction({ type: 'power', hand: 1, seq: 2, card: 'As', target: 'abc' })).toEqual({ type: 'power', hand: 1, seq: 2, card: 'As', target: 'abc' });
    expect(parseAction({ type: 'power', hand: 1, seq: 2, rank: 15 })).toBeNull();
    expect(parseAction({ type: 'power', hand: 1, seq: 2, card: 'Zz' })).toBeNull();
  });

  it('keeps every chip accounted for over many hands with bots playing powers', () => {
    let game = createTable({
      hostDeviceId: HOST,
      name: 'Host',
      emoji: '😎',
      settings: { ...DEFAULT_SETTINGS, turnSeconds: 5, variant: 'power' },
      bots: 5,
      code: null,
      now: clock,
    });
    const styles = ['pro', 'maniac', 'station', 'trapper', 'gambler'];
    game.players.filter((p) => p.bot).forEach((p, i) => (p.style = styles[i]));
    game = must(game, { type: 'start' }, HOST);
    const total = chipsInPlay(game);
    const rng = seededRng(11);
    let hands = 0;
    let played = 0;
    for (let i = 0; i < 6000 && game.status === 'playing' && hands < 50; i++) {
      const before = game.hand?.number;
      const hostId = game.players.find((p) => p.deviceId === HOST)!.id;
      let r;
      const hand = game.hand;
      if (hand && !hand.result && hand.toAct === hostId && !(hand.moment?.gate && clock < hand.moment.until)) {
        const o = options(game, hand, hand.seats.find((x) => x.playerId === hostId)!);
        const move = o.canCheck ? 'check' : o.toCall <= game.settings.bigBlind * 2 ? 'call' : 'fold';
        r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move }, ctx(HOST));
      } else {
        clock = (game.wakeAt ?? clock) + 1;
        r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
      }
      if (!r.ok) throw new Error(r.error);
      game = r.game;
      if (game.hand?.number !== before) hands++;
      played = Math.max(played, game.hand?.powerUses?.length ?? 0);
      expect(chipsInPlay(game)).toBe(total);
      for (const p of game.players) expect(p.stack).toBeGreaterThanOrEqual(0);
    }
    expect(hands).toBeGreaterThan(5);
    expect(played).toBeGreaterThan(0);
  }, 30000);
});
