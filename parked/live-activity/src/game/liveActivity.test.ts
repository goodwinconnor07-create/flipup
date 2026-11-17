import { describe, expect, it } from 'vitest';

import {
  applyAction,
  bbWords,
  createTable,
  DEFAULT_SETTINGS,
  liveAlert,
  liveAttributes,
  liveState,
  livePriority,
  options,
  ordinal,
  seededRng,
  type Game,
  type LiveState,
} from './index';

const ME = 'live-device-secret-0001';
const FRIEND = 'live-device-secret-0002';

function table(): Game {
  const game = createTable({ hostDeviceId: ME, name: 'Connor', emoji: '😎', settings: { ...DEFAULT_SETTINGS, startingStack: 1000, smallBlind: 5, bigBlind: 10, turnSeconds: 30 }, bots: 2, code: 'ACES42', now: 0, rng: seededRng(3) });
  game.legacyBotSimulation = true;
  const joined = applyAction(game, { type: 'join', name: 'Mia', emoji: '🦊' }, { deviceId: FRIEND, now: 0, rng: seededRng(3) });
  if (!joined.ok) throw new Error(joined.error);
  const r = applyAction(joined.game, { type: 'start' }, { deviceId: ME, now: 0, rng: seededRng(3) });
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

/** Plays the table on until `stop` says so, both people checking or calling, and returns every state seen. */
function play(stop: (g: Game, seen: LiveState[]) => boolean): { game: Game; seen: LiveState[]; clock: number } {
  let game = table();
  let clock = 0;
  const rng = seededRng(9);
  const seen: LiveState[] = [];
  for (let i = 0; i < 4000 && !stop(game, seen); i++) {
    const hand = game.hand;
    const actor = hand && !hand.result ? game.players.find((p) => p.id === hand.toAct && !p.bot) : undefined;
    const seat = actor && hand?.seats.find((s) => s.playerId === actor.id);
    let r;
    if (actor && hand && seat && !(hand.moment?.gate && clock < hand.moment.until) && clock >= (hand.bettingAt ?? 0)) {
      const o = options(game, hand, seat);
      r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : 'call' }, { deviceId: actor.deviceId!, now: clock, rng });
    } else {
      clock = Math.max(clock, game.wakeAt ?? clock) + 1;
      r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
    }
    if (!r.ok) throw new Error(r.error);
    game = r.game;
    const s = liveState(game, ME, clock);
    if (s) seen.push(s);
  }
  return { game, seen, clock };
}

describe('liveState', () => {
  it('is null for a phone with no seat, and waits in the lobby', () => {
    const lobby = createTable({ hostDeviceId: ME, name: 'Connor', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 2, code: 'ACES42', now: 0 });
    expect(liveState(lobby, 'someone-else-entirely-01', 0)).toBeNull();
    expect(liveState(lobby, ME, 0)).toMatchObject({ phase: 'lobby', hand: 0, cards: [] });
  });

  it('shows your turn with its clock, what it costs and your cards', () => {
    const { game, clock } = play((g) => !!g.hand && !g.hand.result && g.hand.toAct === g.players.find((p) => p.deviceId === ME)!.id && (g.hand.bettingAt ?? 0) <= 0);
    const s = liveState(game, ME, clock)!;
    expect(s.phase).toBe('turn');
    expect(s.cards).toHaveLength(2);
    expect(s.turnEnd).toBe(Math.floor(game.hand!.deadline! / 1000));
    expect(s.turnStart).not.toBeNull();
    expect(s.turnEnd! - s.turnStart!).toBeLessThanOrEqual(30);
    // The same turn gives the same clock a few seconds later, so a later push doesn't restart the bar.
    expect(liveState(game, ME, clock + 3000)!.turnStart).toBe(s.turnStart);
    expect(s.line).toMatch(/^Your turn/);
    expect(s.pot).toBeGreaterThan(0);
    // Big blinds, not chips.
    expect(s.stack).toBeLessThanOrEqual(100);
  });

  it('reaches a result with a net in big blinds, and names the made hand once the flop is out', () => {
    const { seen } = play((_, s) => s.filter((x) => ['won', 'lost', 'even', 'folded'].includes(x.phase) && x.board.length >= 3).length > 0);
    const done = seen.find((x) => ['won', 'lost', 'even', 'folded'].includes(x.phase) && x.board.length >= 3)!;
    expect(done.handName).not.toBe('');
    if (done.phase === 'won') expect(done.net).toBeGreaterThan(0);
    if (done.phase === 'lost') expect(done.net).toBeLessThan(0);
    for (const s of seen) if (s.board.length < 3) expect(s.handName).toBe('');
  });

  it('never says another phone is thinking with its device id, and never holds a device id', () => {
    const { seen } = play((_, s) => s.length > 200);
    for (const s of seen) expect(JSON.stringify(s)).not.toContain(FRIEND);
  });

  it('says where you finished once the game is over', () => {
    const game = table();
    const r = applyAction(game, { type: 'end' }, { deviceId: ME, now: 1, rng: seededRng(1) });
    if (!r.ok) throw new Error(r.error);
    const s = liveState(r.game, ME, 1)!;
    expect(s.phase).toBe('ended');
    expect(s.place).toBeGreaterThanOrEqual(1);
    expect(s.of).toBe(4);
    expect(s.line).toMatch(/^Game over · \d(st|nd|rd|th) of 4/);
  });
});

describe('push urgency', () => {
  const base = liveState(table(), ME, 0)!;
  const turn: LiveState = { ...base, phase: 'turn', canCheck: false, toCall: 4, pot: 22 };

  it('lights up for a new turn and for results, quietly for the rest', () => {
    expect(livePriority({ ...base, phase: 'waiting' }, turn)).toBe(10);
    expect(livePriority(turn, { ...turn })).toBe(5);
    expect(livePriority(turn, { ...turn, seq: turn.seq + 1 })).toBe(10);
    expect(livePriority(turn, { ...base, phase: 'won', net: 3 })).toBe(10);
    expect(livePriority({ ...base, phase: 'waiting' }, { ...base, phase: 'waiting', pot: 9 })).toBe(5);
  });

  it('alerts once per turn', () => {
    const attrs = liveAttributes(table());
    expect(liveAlert({ ...base, phase: 'waiting' }, turn, attrs)).toEqual({ title: "Your turn · Texas Hold'em", body: '4 bb to call · pot 22 bb' });
    expect(liveAlert(turn, turn, attrs)).toBeNull();
  });
});

describe('words', () => {
  it('writes big blinds and places', () => {
    expect(bbWords(12)).toBe('12 bb');
    expect(bbWords(-2.5)).toBe('2.5 bb');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
  });
});
