import { describe, expect, it } from 'vitest';
import { dulled } from './botStyles';
import {
  applyAction,
  buyAgain,
  cashBuyIn,
  cashMin,
  cashStakeFor,
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
  sngPlace,
  campaignTable,
  drawMultiplier,
  FORMATS,
  parseCampaignCard,
  placePrize,
  refundSeat,
  seatPrize,
  stakeById,
  STAKES,
  spinBets,
  spinWheel,
  titleOf,
  venueById,
  VENUES,
  WHEEL,
  cleanCampaign,
  BOSS_DULL,
  bossReward,
  campaignCard,
  claimMission,
  dailyFor,
  missionBonus,
  missionReward,
  MISSIONS,
  missionsFor,
  noteMission,
  redactForDevice,
  rouletteLimit,
  salaryFor,
  STYLES,
  weekOf,
  type Campaign,
  type Game,
} from '.';

const garage = venueById('garage')!;
const backroom = venueById('backroom')!;
const riverboat = venueById('riverboat')!;
const small = stakeById('1-2')!;
const mid = stakeById('5-10')!;

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
    // Three days in a row tops up to 1,200, and chips on a table count towards it.
    expect(salaryDue({ ...c, chips: 200 }, '2026-10-13', 700)).toBe(300);
    // A missed day starts the streak again.
    expect(collectSalary({ ...c, chips: 0 }, '2026-10-20').chips).toBe(1000);
  });

  it('buys into a cash game with up to 100 big blinds, and cashes out what is in front of you', () => {
    let c = collectSalary(newCampaign(), '2026-10-01');
    expect(cashBuyIn(c, mid)).toBe(1000);
    expect(cashBuyIn({ ...c, chips: 600 }, mid)).toBe(600);
    expect(cashBuyIn({ ...c, chips: 150 }, mid)).toBe(0);
    expect(cashBuyIn(c, small)).toBe(200);
    c = ok(sitDown(c, { kind: 'cash', stake: small, cost: 200 }, 'g1', 0));
    expect(c.chips).toBe(800);
    expect(sitDown(c, { kind: 'sng', venue: garage, prize: 400 }, 'g2', 0)).toMatch(/Finish/);
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

  it('keeps bigger tables shut until the bankroll has reached them, unless a friend brings you', () => {
    const c = { ...collectSalary(newCampaign(), '2026-10-01'), chips: 2400, peak: 2400 };
    expect(sitDown(c, { kind: 'sng', venue: riverboat, prize: 4000 }, 'g', 0)).toMatch(/Reach 2,500/);
    expect(typeof sitDown({ ...c, chips: 3000, peak: 3000 }, { kind: 'sng', venue: riverboat, prize: 4000 }, 'g', 0)).toBe('object');
    expect(typeof sitDown({ ...c, chips: 1000 }, { kind: 'sng', venue: riverboat, prize: 4000, friends: true }, 'g', 0)).toBe('object');
  });

  it('sets the blinds from the bankroll: about 50 big blinds of it, and never above what it can cover', () => {
    const at = (chips: number) => cashStakeFor(chips)?.id;
    // The daily 1,000 plays 10/20, and the blinds climb as the bankroll does.
    expect(at(1000)).toBe('10-20');
    expect(at(2500)).toBe('25-50');
    expect(at(60000)).toBe('500-1k');
    expect(at(1e9)).toBe('50k-100k');
    // Too little for the table's minimum, then the smallest table; below that, none.
    expect(at(60)).toBe('1-2');
    expect(at(39)).toBeUndefined();
    // Whatever the bankroll, the stake it lands on can be bought into (20 big blinds at least).
    for (const chips of [40, 99, 100, 777, 1000, 4999, 123456, 7e6]) {
      const s = cashStakeFor(chips)!;
      expect(cashBuyIn({ ...newCampaign(), chips }, s)).toBeGreaterThanOrEqual(cashMin(s));
      expect(cashMin(s)).toBe(s.bigBlind * 20);
    }
  });

  it('pays a tournament from the prize drawn for it, not from the buy-ins at the table', () => {
    const start = collectSalary(newCampaign(), '2026-10-01');
    // The Garage is a Sit & Go: 70% to 1st, 30% to 2nd.
    const play = (place: number | undefined) => finishSng(ok(sitDown(start, { kind: 'sng', venue: garage, prize: 1500 }, 'g', 0)), 'g', place, 1);
    expect(play(1).chips).toBe(1000 - 100 + 1050);
    expect(play(2).chips).toBe(1000 - 100 + 450);
    expect(play(3).chips).toBe(900);
    expect(play(undefined).chips).toBe(900);
    expect(play(1).stats).toMatchObject({ sngWins: 1, winRun: 1, wonAt: ['garage'], bestDraw: 15 });
    // The Back Room is a Jackpot: the winner takes it all.
    const jack = finishSng(ok(sitDown(start, { kind: 'sng', venue: backroom, prize: 500 }, 'j', 0)), 'j', 2, 1);
    expect(jack.chips).toBe(750);
    expect(placePrize('jackpot', 500, 1)).toBe(500);
  });

  it('draws prizes from each format’s table, with a fair-ish average', () => {
    for (const f of Object.values(FORMATS)) {
      const total = f.draws.reduce((a, [, w]) => a + w, 0);
      expect(total).toBe(1000);
      const mean = f.draws.reduce((a, [x, w]) => a + x * w, 0) / total;
      // A little under what the seats put in: only playing better than the bots climbs.
      expect(mean).toBeGreaterThan(f.seats * 0.85);
      expect(mean).toBeLessThan(f.seats);
      expect(drawMultiplier(f, () => 0)).toBe(f.draws[0][0]);
      expect(drawMultiplier(f, () => 0.99999)).toBe(f.draws[f.draws.length - 1][0]);
      expect(f.split.reduce((a, x) => a + x, 0)).toBeCloseTo(1);
    }
  });

  it('gives the buy-in back for a table that never dealt, and pays old seats the old way', () => {
    const start = collectSalary(newCampaign(), '2026-10-01');
    const sat = ok(sitDown(start, { kind: 'sng', venue: backroom, prize: 750, friends: true }, 'f', 0));
    const back = refundSeat(sat, 'f', 1);
    expect(back.chips).toBe(1000);
    expect(back.seat).toBeNull();
    expect(back.last).toMatchObject({ refunded: true, back: 250 });
    expect(seatPrize({ gameId: 'x', kind: 'sng', venue: 'garage', paid: 100, at: 0 }, 1)).toBe(400);
    // A friend table's win counts towards Bragging rights.
    expect(finishSng(sat, 'f', 1, 1).stats.friendWins).toBe(1);
  });

  it('reads a cash seat saved under a venue name as the matching stakes', () => {
    const c = cleanCampaign({ chips: 5, seat: { gameId: 'g', kind: 'cash', venue: 'backroom', paid: 1000, at: 0 } });
    expect(c.seat?.venue).toBe('5-10');
  });

  it('only takes a well-formed campaign card from the network', () => {
    expect(parseCampaignCard({ chips: 10, peak: 20, wins: 1, at: 5 })).toEqual({ chips: 10, peak: 20, wins: 1, at: 5 });
    expect(parseCampaignCard({ chips: -1, peak: 20, wins: 1, at: 5 })).toBeUndefined();
    expect(parseCampaignCard({ chips: 'lots', peak: 20, wins: 1, at: 5 })).toBeUndefined();
    expect(parseCampaignCard(null)).toBeUndefined();
  });

  it('settles a spin against the bankroll', () => {
    const c = collectSalary(newCampaign(), '2026-10-01');
    expect(spinBets(c, {}, 5)).toMatch(/chips down/);
    expect(spinBets(c, { red: 2000 }, 5)).toMatch(/many chips/);
    const won = ok(spinBets(c, { n5: 10, black: 100 }, 5));
    expect(won.chips).toBe(1000 - 110 + 360);
    expect(won.stats.straightHits).toBe(1);
    expect(won.spins).toEqual([5]);
    expect(ok(spinBets(c, { red: 100 }, 0)).chips).toBe(900);
  });

  it('pays a goal once it is done, and only once', () => {
    let c = { ...collectSalary(newCampaign(), '2026-10-01'), chips: 2100, peak: 2100 };
    const double = goals(c).find((g) => g.id === 'double')!;
    expect(double.have).toBeGreaterThanOrEqual(double.need);
    c = claimGoal(c, 'double');
    expect(c.chips).toBe(2350);
    expect(claimGoal(c, 'double')).toBe(c);
    expect(claimGoal(c, 'million')).toBe(c);
  });

  it('climbs titles by peak bankroll, and the tables get dearer', () => {
    expect(titleOf(0).name).toBe('Rookie');
    expect(titleOf(1_000_000).name).toBe('Millionaire');
    for (let i = 1; i < VENUES.length; i++) {
      expect(VENUES[i].buyIn).toBeGreaterThan(VENUES[i - 1].buyIn);
      expect(VENUES[i].unlock).toBeGreaterThanOrEqual(VENUES[i - 1].unlock);
    }
    for (let i = 1; i < STAKES.length; i++) {
      expect(STAKES[i].bigBlind).toBeGreaterThan(STAKES[i - 1].bigBlind);
      expect(STAKES[i].unlock).toBeGreaterThanOrEqual(STAKES[i - 1].unlock);
    }
    // Goal ids are how a claim is remembered: never two the same.
    const ids = goals(newCampaign()).map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
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
      const venue = round === 0 ? backroom : garage;
      const table = campaignTable({ kind: 'sng', venue, prize: venue.buyIn * 4 }, false);
      let game = createTable({ hostDeviceId: deviceId, name: 'Me', emoji: '🙂', settings: table.settings, bots: table.campaign.seats - 1, botStyles: venue.styles, code: null, now: 0 });
      game.campaign = table.campaign;
      const total = game.players.reduce((a, p) => a + p.stack, 0);
      const r = applyAction(game, { type: 'start' }, { deviceId, now: 0, rng: cryptoRng });
      if (!r.ok) throw new Error(r.error);
      game = r.game;
      const me = game.players.find((p) => p.deviceId === deviceId)!;
      game = playOut(game, deviceId, (g) => sngPlace(g, me.id) !== undefined);
      const place = sngPlace(game, me.id);
      expect(place).toBeGreaterThanOrEqual(1);
      expect(place).toBeLessThanOrEqual(table.campaign.seats);
      // Bots only ever come from the venue's styles.
      expect(game.players.every((p) => !p.bot || venue.styles.includes(p.style!))).toBe(true);
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
    game.campaign = { kind: 'cash', venue: '5-10', seats: 6 };
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

  it('fills an online tournament with bots when it deals, then keeps late arrivals and stake changes out', () => {
    const table = campaignTable({ kind: 'sng', venue: garage, prize: 600 }, true);
    let game = createTable({ hostDeviceId: deviceId, name: 'Me', emoji: '🙂', settings: table.settings, bots: 0, code: 'BCDFG', now: 0 });
    game.campaign = table.campaign;
    const friend = 'd0000000000000000000b';
    const joined = applyAction(game, { type: 'join', name: 'Pal', emoji: '🙂' }, { deviceId: friend, now: 0, rng: cryptoRng });
    if (!joined.ok) throw new Error(joined.error);
    game = joined.game;
    expect(applyAction(game, { type: 'settings', settings: { startingStack: 9000 } }, { deviceId, now: 0, rng: cryptoRng }).ok).toBe(false);
    const r = applyAction(game, { type: 'start' }, { deviceId, now: 0, rng: cryptoRng });
    if (!r.ok) throw new Error(r.error);
    game = r.game;
    expect(game.players).toHaveLength(FORMATS.sng.seats);
    expect(game.campaign?.seats).toBe(FORMATS.sng.seats);
    expect(game.players.filter((p) => !p.bot)).toHaveLength(2);
    expect(applyAction(game, { type: 'join', name: 'Late', emoji: '🙂' }, { deviceId: 'd0000000000000000000c', now: 0, rng: cryptoRng }).ok).toBe(false);
  });
});

describe('campaign extras', () => {
  const fresh = () => collectSalary(newCampaign(), '2026-10-05');
  const riverboat = venueById('riverboat')!;

  it('raises the salary by 100 for each day in a row, up to 2,000, and starts again after a missed day', () => {
    let c = newCampaign();
    let day = '2026-10-01';
    for (let i = 0; i < 14; i++) {
      c = collectSalary({ ...c, chips: 0 }, day);
      const d = new Date(`${day}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      day = d.toISOString().slice(0, 10);
    }
    expect(c.streak).toBe(14);
    expect(c.chips).toBe(salaryFor(14));
    expect(salaryFor(14)).toBe(2000);
    expect(salaryFor(3)).toBe(1200);
    expect(collectSalary({ ...c, chips: 0 }, '2026-12-01').streak).toBe(1);
    expect(c.stats.bestStreak).toBe(14);
  });

  it('picks three different missions a day, the same on every phone, and pays a bonus for all three', () => {
    expect(new Set(missionsFor('2026-10-05')).size).toBe(3);
    expect(missionsFor('2026-10-05')).toEqual(missionsFor('2026-10-05'));
    let c = fresh();
    const day = '2026-10-05';
    const picks = missionsFor(day);
    const before = c.chips;
    for (const id of picks) c = noteMission(c, day, id, 100);
    // Something that isn't one of today's missions doesn't count.
    const other = MISSIONS.find((m) => !picks.includes(m.id))!.id;
    expect(noteMission(c, day, other).daily?.progress[other]).toBeUndefined();
    for (const id of picks) c = claimMission(c, day, id);
    expect(claimMission(c, day, picks[0])).toBe(c);
    expect(c.chips - before).toBe(missionReward(c) * 3 + missionBonus(c));
    expect(c.daily?.bonus).toBe(true);
    // A new day, new missions.
    expect(dailyFor(c, '2026-10-06').claimed).toEqual([]);
  });

  it('pays a bounty, and a boss the first time only', () => {
    const start = { ...fresh(), chips: 10000, peak: 10000 };
    const sat = ok(sitDown(start, { kind: 'sng', venue: riverboat, prize: 3000 }, 'g', 0));
    const won = finishSng(sat, 'g', 3, 0, { bounty: 1000, boss: 'brunson' });
    expect(won.chips).toBe(10000 - 1000 + 1000 + bossReward(riverboat));
    expect(won.stats.bosses).toEqual(['brunson']);
    expect(won.last).toMatchObject({ bounty: 1000, boss: 'brunson' });
    expect(won.brag).toMatchObject({ kind: 'boss', where: 'brunson' });
    const again = finishSng(ok(sitDown(won, { kind: 'sng', venue: riverboat, prize: 3000 }, 'h', 0)), 'h', 3, 0, { boss: 'brunson' });
    expect(again.chips).toBe(won.chips - 1000);
    // Only the venue's own boss counts.
    const wrong = finishSng(ok(sitDown(start, { kind: 'sng', venue: riverboat, prize: 3000 }, 'i', 0)), 'i', 3, 0, { boss: 'rampage' });
    expect(wrong.stats.bosses).toEqual([]);
  });

  it('keeps this week’s winnings, and moves them to last week when a new week starts', () => {
    const monday = Date.parse('2026-10-05T12:00:00Z');
    const c = ok(spinBets(fresh(), { red: 100 }, 1));
    expect(weekOf('2026-10-07')).toBe('2026-10-05');
    const sat = ok(sitDown({ ...c, week: { key: '2026-10-05', won: 300 } }, { kind: 'sng', venue: garage, prize: 400 }, 'g', monday));
    const later = finishSng(sat, 'g', 1, monday + 8 * 86_400_000);
    expect(later.week).toEqual({ key: '2026-10-12', won: 280 - 100 });
    expect(later.lastWeek).toEqual({ key: '2026-10-05', won: 300 });
    const card = parseCampaignCard(JSON.parse(JSON.stringify(campaignCard(later, 1))));
    expect(card).toMatchObject({ week: '2026-10-12', weekWon: 180, lastWeek: '2026-10-05', lastWeekWon: 300 });
  });

  it('limits roulette to twice the biggest open buy-in', () => {
    const c = { ...fresh(), chips: 5000 };
    expect(rouletteLimit(c)).toBe(500);
    expect(spinBets(c, { red: 600 }, 1)).toMatch(/table limit/);
    expect(rouletteLimit({ ...c, peak: 20000 })).toBe(2 * 5000);
  });

  it('dulls bots in the easy rooms, and seats each venue’s boss', () => {
    const pro = STYLES.pro;
    const dull = dulled(pro, 0.8);
    expect(dull.post.wobble).toBeGreaterThan(pro.post.wobble);
    expect(dull.post.sense).toBeLessThan(pro.post.sense);
    expect(dull.adapt).toBeLessThan(pro.adapt);
    expect(dulled(pro, 0.8)).toBe(dull);
    expect(dulled(pro, 0)).toBe(pro);
    const table = campaignTable({ kind: 'sng', venue: riverboat, prize: 3000 }, false);
    const game = createTable({ hostDeviceId: 'd0000000000000000000a', name: 'Me', emoji: '🙂', settings: table.settings, bots: table.campaign.seats - 1, campaign: table.campaign, code: null, now: 0 });
    expect(game.players).toHaveLength(6);
    const boss = game.players.find((p) => p.id === game.campaign?.boss?.playerId)!;
    expect(boss.legend).toBe('brunson');
    expect(boss.dull).toBeCloseTo(riverboat.dull * BOSS_DULL);
    expect(game.players.filter((p) => p.bot && !p.legend).every((p) => p.dull === riverboat.dull)).toBe(true);
    // Phones never see how dull a bot plays.
    expect(redactForDevice(game, 'd0000000000000000000a').players.every((p) => p.dull === undefined)).toBe(true);
    // No boss in the warm-up rooms.
    const g2 = campaignTable({ kind: 'sng', venue: garage, prize: 300 }, false);
    expect(createTable({ hostDeviceId: 'x', name: 'Me', emoji: '🙂', settings: g2.settings, bots: 5, campaign: g2.campaign, code: null, now: 0 }).campaign?.boss).toBeUndefined();
  });
});
