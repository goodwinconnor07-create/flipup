import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { DEFAULT_SETTINGS, applyAction, createTable, redactForDevice, type Game, type PowerUse } from '@game/index';

import { myPower, peekCard, powerBanner, powerOnShow, powerPill, seatPowerBadge, xrayCard } from '../src/state/power-view';

const ME = 'device-me-000001';

function seeded(seed = 11): () => number {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

/** A Power Cards bots table at the first moment it's your turn to act (the raw table, deck and all). */
function myTurn(seed = 11): { game: Game; me: string; now: number; rng: () => number } {
  const rng = seeded(seed);
  let game = createTable({ hostDeviceId: ME, name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, variant: 'power', turnSeconds: 0 }, bots: 3, code: null, now: 1, rng });
  let now = 10;
  const step = (deviceId: string, a: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(game, a, { deviceId, now, rng });
    if (r.ok) game = r.game;
  };
  step(ME, { type: 'start' });
  const me = game.players.find((p) => p.deviceId === ME)!.id;
  for (let i = 0; i < 400; i++) {
    const hand = game.hand;
    if (hand && !hand.result && hand.toAct === me && !(hand.moment?.gate && now < hand.moment.until) && hand.bettingAt == null) break;
    now = Math.max(now + 1, game.wakeAt ?? now + 1000);
    step('clock', { type: 'tick' });
  }
  expect(game.hand?.toAct).toBe(me);
  return { game, me, now, rng };
}

const use = (u: Partial<PowerUse> & Pick<PowerUse, 'by' | 'power'>): PowerUse => ({ street: 'preflop', ...u });

describe('your power', () => {
  it('is nothing at a Hold\'em table or before a hand', () => {
    const { game, me } = myTurn();
    expect(myPower({ ...game, hand: null }, me).state).toBe('none');
    expect(myPower({ ...game, hand: { ...game.hand!, variant: 'holdem' } }, me).state).toBe('none');
  });

  it('is ready on your turn, and waits for it otherwise', () => {
    const { game, me } = myTurn();
    const hand = game.hand!;
    const ready = myPower({ ...game, hand: { ...hand, powers: { ...hand.powers, [me]: 'shield' } } }, me);
    expect(ready.state).toBe('ready');
    expect(ready.effect).toBe('shield');
    const other = hand.seats.find((s) => s.playerId !== me)!.playerId;
    const waiting = myPower({ ...game, hand: { ...hand, toAct: other, powers: { ...hand.powers, [me]: 'shield' } } }, me);
    expect(waiting.state).toBe('waiting');
    expect(waiting.note).toBe('Play it on your turn, before your move.');
  });

  it('is ready on your turn on the phone too, where the deck is never sent', () => {
    const { game, me } = myTurn();
    const view = redactForDevice({ ...game, hand: { ...game.hand!, powers: { ...game.hand!.powers, [me]: 'peek' } } }, ME);
    expect(view.hand!.deck).toEqual([]);
    expect(myPower(view, me).state).toBe('ready');
  });

  it('says which streets a power works on when this one is wrong', () => {
    const { game, me } = myTurn();
    const p = myPower({ ...game, hand: { ...game.hand!, street: 'preflop', powers: { ...game.hand!.powers, [me]: 'reroll' } } }, me);
    expect(p.state).toBe('waiting');
    expect(p.note).toBe('It works on the flop or the turn.');
  });

  it('Copycat waits for something to copy, then copies the last power someone else played', () => {
    const { game, me } = myTurn();
    const hand = { ...game.hand!, powers: { ...game.hand!.powers, [me]: 'copycat' as const } };
    expect(myPower({ ...game, hand }, me).note).toMatch(/^Nothing to copy yet/);
    const other = hand.seats.find((s) => s.playerId !== me && !s.folded)!.playerId;
    const copied = myPower({ ...game, hand: { ...hand, powerUses: [use({ by: other, power: 'shield' })] } }, me);
    expect(copied.state).toBe('ready');
    expect(copied.effect).toBe('shield');
    expect(copied.note).toMatch(/^Copies Shield\. /);
  });

  it('says what it showed once played', () => {
    const { game, me } = myTurn();
    const target = game.hand!.seats.find((s) => s.playerId !== me)!.playerId;
    const name = game.players.find((p) => p.id === target)!.name;
    const played = myPower({ ...game, hand: { ...game.hand!, powerUses: [use({ by: me, power: 'xray', target, seen: ['Th'] })] } }, me);
    expect(played.state).toBe('played');
    expect(played.note).toBe(`${name} has 10♥`);
  });

  it("is out once you've folded", () => {
    const { game, me } = myTurn();
    const hand = game.hand!;
    const p = myPower({ ...game, hand: { ...hand, seats: hand.seats.map((s) => (s.playerId === me ? { ...s, folded: true } : s)) } }, me);
    expect(p.state).toBe('out');
  });
});

describe('playing a power, end to end', () => {
  it('shows the banner to everyone, and the X-ray card only to you, until a Pass Left', () => {
    const { game, me, now, rng } = myTurn();
    const hand = game.hand!;
    const forced: Game = { ...game, hand: { ...hand, powers: { ...hand.powers, [me]: 'xray' } } };
    const target = hand.seats.find((s) => s.playerId !== me && !s.folded)!.playerId;
    const r = applyAction(forced, { type: 'power', hand: hand.number, seq: hand.seq, target }, { deviceId: ME, now, rng });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const mine = redactForDevice(r.game, ME);
    expect(powerOnShow(mine.hand, now)).toBe(true);
    const banner = powerBanner(mine, me, now)!;
    expect(banner.text).toMatch(/^You X-rayed /);
    expect(banner.seen).toBeTruthy();
    expect(xrayCard(mine.hand, me, target)).toBe(banner.seen);
    expect(myPower(mine, me).state).toBe('played');

    // Another phone at the table: the same banner, but never the card.
    const bot = r.game.players.find((p) => p.id === target)!;
    const theirs = redactForDevice(r.game, bot.deviceId ?? 'someone-else');
    expect(powerBanner(theirs, target, now)!.text).toMatch(/X-rayed you$/);
    expect(powerBanner(theirs, target, now)!.seen).toBeUndefined();
    expect(xrayCard(theirs.hand, me, target)).toBeNull();

    // The banner goes once the moment is over.
    expect(powerBanner(mine, me, mine.hand!.moment!.until)).toBeNull();

    // A Pass Left afterwards means the X-rayed card may have moved on.
    const passed = { ...mine.hand!, powerUses: [...mine.hand!.powerUses!, use({ by: target, power: 'passleft' })] };
    expect(xrayCard(passed, me, target)).toBeNull();
  });

  it('keeps your Peek in view until the card is dealt', () => {
    const { game, me } = myTurn();
    const hand = { ...game.hand!, powerUses: [use({ by: me, power: 'peek', seen: ['As'] })] };
    expect(peekCard(hand, me)).toBe('As');
    expect(peekCard({ ...hand, board: ['Kd', '7c', 'As'] }, me)).toBeNull();
    expect(peekCard(hand, 'someone-else')).toBeNull();
  });
});

describe('the table', () => {
  it('badges a silenced seat and a shield, and shows every power once the hand is over', () => {
    const { game, me } = myTurn();
    const hand = game.hand!;
    const other = hand.seats.find((s) => s.playerId !== me)!.playerId;
    expect(seatPowerBadge({ ...hand, silenced: { [other]: hand.street } }, other)).toEqual({ text: '🤐', hot: true });
    expect(seatPowerBadge({ ...hand, silenced: { [other]: 'river' }, street: 'flop' }, other)).toBeNull();
    expect(seatPowerBadge({ ...hand, powerUses: [use({ by: other, power: 'shield' })] }, other)?.text).toBe('🛡️');
    const over = { ...hand, powers: { ...hand.powers, [other]: 'bounty' as const }, result: { won: {}, pots: [], showdown: false } } as never;
    expect(seatPowerBadge(over, other)?.text).toBe('🎯');
  });

  it("puts a live bounty and the fold tax in the game pill", () => {
    const { game, me } = myTurn();
    const hand = game.hand!;
    expect(powerPill(hand)).toBeNull();
    expect(powerPill({ ...hand, powerUses: [use({ by: me, power: 'bounty', rank: 12 }), use({ by: me, power: 'foldtax' })] })).toBe('🎯 Queens · 💸 Fold tax');
    expect(powerPill({ ...hand, powerUses: [use({ by: me, power: 'bounty', rank: 12 }), use({ by: me, power: 'foldtax' })] }, true)).toBe('🎯 Q · 💸 Tax');
    expect(powerPill({ ...hand, variant: 'holdem', powerUses: [use({ by: me, power: 'foldtax' })] })).toBeNull();
  });
});
