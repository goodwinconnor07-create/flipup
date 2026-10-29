import { describe, expect, it } from 'vitest';
import {
  applyAction,
  buyAgain,
  cashBuyIn,
  cashOut,
  claimGoal,
  collectSalary,
  covers,
  createTable,
  cryptoRng,
  finishSng,
  goals,
  newCampaign,
  payout,
  salaryDue,
  sitDown,
  SNG,
  sngPlace,
  spinBets,
  spinWheel,
  titleOf,
  venueById,
  VENUES,
  WHEEL,
  type Campaign,
  type Game,
} from '.';

const garage = venueById('garage')!;
const backroom = venueById('backroom')!;
const riverboat = venueById('riverboat')!;

const ok = (x: Campaign | string): Campaign => {
  if (typeof x === 'string') throw new Error(x);
  return x;
};

describe('roulette', () => {
  it('has every pocket once, on a single-zero wheel', () => {
    expect(WHEEL).toHaveLength(37);
    expect([...WHEEL].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i));
  });

  it('pays 35 to 1 straight up, 2 to 1 on dozens and columns, evens on the rest', () => {
    expect(payout({ n17: 10 }, 17)).toBe(360);
    expect(payout({ n17: 10 }, 18)).toBe(0);
    expect(payout({ d2: 10 }, 13)).toBe(30);
    expect(payout({ c1: 10 }, 34)).toBe(30);
    expect(payout({ c3: 10 }, 36)).toBe(30);
    expect(payout({ red: 10 }, 1)).toBe(20);
    expect(payout({ black: 10 }, 2)).toBe(20);
    expect(payout({ red: 10, black: 10 }, 5)).toBe(20);
  });

  it('loses every outside bet on the zero', () => {
    for (const spot of ['red', 'black', 'odd', 'even', 'low', 'high', 'd1', 'c3'] as const) expect(covers(spot, 0)).toBe(false);
    expect(payout({ n0: 5 }, 0)).toBe(180);
  });

  it('has the house edge of a European wheel on every bet', () => {
    for (const spot of ['n7', 'red', 'odd', 'low', 'd1', 'c2'] as const) {
      let back = 0;
      for (let n = 0; n <= 36; n++) back += payout({ [spot]: 1 }, n);
      expect(back).toBe(36);
    }
  });

  it('spins every pocket from 0 to 36', () => {
    expect(spinWheel(() => 0)).toBe(0);
    expect(spinWheel(() => 0.9999999)).toBe(36);
  });
});

describe('campaign bankroll', () => {
  it('tops up to 1,000 once a day, and only on days you come', () => {
    let c = newCampaign();
    expect(salaryDue(c, '2026-10-01')).toBe(1000);
    c = collectSalary(c, '2026-10-01');
    expect(c.chips).toBe(1000);
    expect(collectSalary(c, '2026-10-01')).toBe(c);
    c = { ...c, chips: 300 };
    // Ten days away pay one top-up, not ten.
    c = collectSalary(c, '2026-10-11');
    expect(c.chips).toBe(1000);
    expect(c.days).toBe(2);
    // Above 1,000 there's nothing to add, but the day still counts.
    c = collectSalary({ ...c, chips: 5000 }, '2026-10-12');
    expect(c.chips).toBe(5000);
    expect(c.days).toBe(3);
    // Chips on a table count towards the 1,000.
    expect(salaryDue({ ...c, chips: 200 }, '2026-10-13', 700)).toBe(100);
  });

  it('buys into a cash table with up to 100 big blinds, and cashes out what is in front of you', () => {
    let c = collectSalary(newCampaign(), 'd1');
    expect(cashBuyIn(c, backroom)).toBe(1000);
    expect(cashBuyIn({ ...c, chips: 600 }, backroom)).toBe(600);
    expect(cashBuyIn({ ...c, chips: 400 }, backroom)).toBe(0);
    expect(cashBuyIn(c, garage)).toBe(200);
    c = ok(sitDown(c, 'cash', garage, 'g1', 0));
    expect(c.chips).toBe(800);
    expect(sitDown(c, 'sng', garage, 'g2', 0)).toMatch(/Finish/);
    c = ok(buyAgain(c, 'g1', 200));
    expect(c.chips).toBe(600);
    c = cashOut(c, 'g1', 900, 1);
    expect(c.chips).toBe(1500);
    expect(c.seat).toBeNull();
    expect(c.last).toMatchObject({ kind: 'cash', paid: 400, back: 900 });
    // Settling twice does nothing.
    expect(cashOut(c, 'g1', 900, 1)).toBe(c);
    expect(c.stats.bestCashX).toBeCloseTo(2.25);
  });

  it('keeps higher venues shut until the bankroll has reached them', () => {
    const c = { ...collectSalary(newCampaign(), 'd1'), chips: 4000, peak: 4000 };
    expect(sitDown(c, 'sng', riverboat, 'g', 0)).toMatch(/Reach 5,000/);
    expect(typeof sitDown({ ...c, peak: 5000 }, 'sng', riverboat, 'g', 0)).toBe('object');
  });

  it('pays four buy-ins for 1st, two for 2nd and nothing below', () => {
    const start = collectSalary(newCampaign(), 'd1');
    const play = (place: number | undefined) => finishSng(ok(sitDown(start, 'sng', backroom, 'g', 0)), 'g', place, 1);
    expect(play(1).chips).toBe(1000 - 250 + 1000);
    expect(play(2).chips).toBe(1000 - 250 + 500);
    expect(play(3).chips).toBe(750);
    expect(play(undefined).chips).toBe(750);
    expect(play(1).stats).toMatchObject({ sngWins: 1, winRun: 1, wonAt: ['backroom'] });
  });

  it('settles a spin against the bankroll', () => {
    const c = collectSalary(newCampaign(), 'd1');
    expect(spinBets(c, {}, 5)).toMatch(/chips down/);
    expect(spinBets(c, { red: 2000 }, 5)).toMatch(/many chips/);
    const won = ok(spinBets(c, { n5: 10, black: 100 }, 5));
    expect(won.chips).toBe(1000 - 110 + 360);
    expect(won.stats.straightHits).toBe(1);
    expect(won.spins).toEqual([5]);
    expect(ok(spinBets(c, { red: 100 }, 0)).chips).toBe(900);
  });

  it('pays a goal once it is done, and only once', () => {
    let c = { ...collectSalary(newCampaign(), 'd1'), chips: 2100, peak: 2100 };
    const double = goals(c).find((g) => g.id === 'double')!;
    expect(double.have).toBeGreaterThanOrEqual(double.need);
    c = claimGoal(c, 'double');
    expect(c.chips).toBe(2350);
    expect(claimGoal(c, 'double')).toBe(c);
    expect(claimGoal(c, 'million')).toBe(c);
  });

  it('climbs titles by peak bankroll, and the venues get dearer', () => {
    expect(titleOf(0).name).toBe('Rookie');
    expect(titleOf(1_000_000).name).toBe('Millionaire');
    for (let i = 1; i < VENUES.length; i++) {
      expect(VENUES[i].bigBlind).toBeGreaterThan(VENUES[i - 1].bigBlind);
      expect(VENUES[i].sng).toBeGreaterThan(VENUES[i - 1].sng);
      expect(VENUES[i].unlock).toBeGreaterThanOrEqual(VENUES[i - 1].unlock);
    }
  });
});

/** Plays a table where the person checks or shoves, and the clock does the rest. */
function playOut(game: Game, deviceId: string, until: (g: Game) => boolean, steps = 30000): Game {
  let now = 1000;
  for (let i = 0; i < steps && !until(game) && game.status !== 'ended'; i++) {
    now += 500;
    const hand = game.hand;
    const me = game.players.find((p) => p.deviceId === deviceId);
    if (hand && !hand.result && me && hand.toAct === me.id) {
      const seat = hand.seats.find((s) => s.playerId === me.id)!;
      const r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: hand.currentBet > seat.bet ? 'allin' : 'check' }, { deviceId, now, rng: cryptoRng });
      if (r.ok) game = r.game;
      continue;
    }
    const t = applyAction(game, { type: 'tick' }, { deviceId: 'clock', now, rng: cryptoRng });
    if (t.ok) game = t.game;
  }
  return game;
}

describe('campaign tables', () => {
  const deviceId = 'd0000000000000000000a';

  it('plays a sit and go to the end and knows where the person finished', () => {
    for (let round = 0; round < 3; round++) {
      let game = createTable({
        hostDeviceId: deviceId,
        name: 'Me',
        emoji: '🙂',
        settings: { startingStack: SNG.stack, smallBlind: SNG.smallBlind, bigBlind: SNG.bigBlind, rebuys: false, turnSeconds: 0, blindHands: SNG.levelHands },
        bots: SNG.seats - 1,
        botStyles: backroom.styles,
        code: null,
        now: 0,
      });
      game.campaign = { kind: 'sng', venue: 'backroom', seats: SNG.seats };
      const total = game.players.reduce((a, p) => a + p.stack, 0);
      const r = applyAction(game, { type: 'start' }, { deviceId, now: 0, rng: cryptoRng });
      if (!r.ok) throw new Error(r.error);
      game = r.game;
      const me = game.players.find((p) => p.deviceId === deviceId)!;
      game = playOut(game, deviceId, (g) => sngPlace(g, me.id) !== undefined);
      const place = sngPlace(game, me.id);
      expect(place).toBeGreaterThanOrEqual(1);
      expect(place).toBeLessThanOrEqual(SNG.seats);
      // Bots only ever come from the venue's styles.
      expect(game.players.every((p) => !p.bot || backroom.styles.includes(p.style!))).toBe(true);
      if (place === 1) expect(game.players.find((p) => p.id === me.id)!.stack).toBe(total);
    }
  });

  it('fills a cash table with new bots as they go bust, so it never runs dry', () => {
    let game = createTable({
      hostDeviceId: deviceId,
      name: 'Me',
      emoji: '🙂',
      settings: { startingStack: 1000, smallBlind: 5, bigBlind: 10, rebuys: true, turnSeconds: 0 },
      bots: 5,
      code: null,
      now: 0,
    });
    game.campaign = { kind: 'cash', venue: 'backroom', seats: 6 };
    const r = applyAction(game, { type: 'start' }, { deviceId, now: 0, rng: cryptoRng });
    if (!r.ok) throw new Error(r.error);
    game = r.game;
    const me = game.players.find((p) => p.deviceId === deviceId)!;
    const firstBots = new Set(game.players.filter((p) => p.bot).map((p) => p.id));
    // Play until a new bot has sat down (or the person is out).
    game = playOut(game, deviceId, (g) => g.players.some((p) => p.bot && !firstBots.has(p.id)) || (g.players.find((p) => p.id === me.id)?.stack ?? 0) === 0);
    const mine = game.players.find((p) => p.id === me.id)!;
    if (mine.stack > 0) {
      expect(game.status).toBe('playing');
      const fresh = game.players.filter((p) => p.bot && !firstBots.has(p.id));
      expect(fresh.length).toBeGreaterThan(0);
      expect(fresh.every((p) => p.bought === 1000)).toBe(true);
    }
  });
});
