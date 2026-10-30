import { describe, expect, it } from 'vitest';
import { applyBj, basicMove, BJ, createBlackjack, handValue, isBlackjack, parseBjAction, redactBj, totalLabel, type BjAction, type Blackjack } from './blackjack';
import { bjSettle, newCampaign } from './campaign';
import { seededRng } from './cards';

const ME = 'device-me-1234';
const FRIEND = 'device-friend-99';

function table(seed = 1, online = false, bots?: number): Blackjack {
  const rng = seededRng(seed);
  const g = createBlackjack({ online, host: { deviceId: ME, name: 'Sam', emoji: '🦊' }, now: 0, rng });
  return bots === undefined ? g : { ...g, seats: g.seats.slice(0, 1 + bots) };
}

function act(g: Blackjack, a: BjAction, deviceId = ME, now = 0, rng = seededRng(7)): Blackjack {
  const r = applyBj(g, a, { deviceId, now, rng });
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

/** Runs the clock and plays every one of your hands with `play` until the round is back to betting. */
function playRound(g: Blackjack, bet: number, play: (g: Blackjack) => BjAction = () => ({ type: 'stand' }), rng = seededRng(3)): Blackjack {
  let t = g.updatedAt + 1;
  g = act(g, { type: 'bet', amount: bet }, ME, t, rng);
  for (let i = 0; i < 400; i++) {
    const me = g.seats.find((s) => s.deviceId === ME);
    if (g.phase === 'playing' && g.turn?.seat === me?.id) g = act(g, play(g), ME, t, rng);
    else if (g.wakeAt !== null) {
      t = Math.max(t, g.wakeAt);
      g = act(g, { type: 'tick' }, 'server', t, rng);
    }
    if (g.phase === 'betting' && i > 0) return g;
  }
  throw new Error('Round never ended');
}

describe('blackjack totals', () => {
  it('counts aces as 11 when they fit', () => {
    expect(handValue(['As', '6d'])).toEqual({ total: 17, soft: true });
    expect(handValue(['As', '6d', 'Tc'])).toEqual({ total: 17, soft: false });
    expect(handValue(['As', 'Ad', '9c'])).toEqual({ total: 21, soft: true });
    expect(handValue(['Kh', 'Qd', '2c']).total).toBe(22);
  });

  it('only counts a natural as blackjack', () => {
    expect(isBlackjack({ cards: ['As', 'Kd'] })).toBe(true);
    expect(isBlackjack({ cards: ['As', 'Kd'], split: true })).toBe(false);
    expect(isBlackjack({ cards: ['7s', '7d', '7c'] })).toBe(false);
    expect(totalLabel({ cards: ['As', '6d'] })).toBe('7/17');
    expect(totalLabel({ cards: ['As', 'Kd'] })).toBe('Blackjack');
  });

  it('plays the book', () => {
    expect(basicMove({ cards: ['8s', '8d'], bet: 5 }, 'Th', { double: true, split: true })).toBe('split');
    expect(basicMove({ cards: ['6s', '5d'], bet: 5 }, '6h', { double: true, split: true })).toBe('double');
    expect(basicMove({ cards: ['Ts', '6d'], bet: 5 }, 'Th', { double: true, split: true })).toBe('hit');
    expect(basicMove({ cards: ['Ts', '6d'], bet: 5 }, '5h', { double: true, split: true })).toBe('stand');
    expect(basicMove({ cards: ['As', '7d'], bet: 5 }, '9h', { double: true, split: true })).toBe('hit');
    expect(basicMove({ cards: ['Ts', 'Td'], bet: 5 }, '6h', { double: true, split: true })).toBe('stand');
  });
});

describe('blackjack table', () => {
  it('seats you with one or two bots and keeps the shoe and hole card off the phone', () => {
    for (let seed = 1; seed < 20; seed++) {
      const g = table(seed);
      const bots = g.seats.filter((s) => s.bot).length;
      expect(bots).toBeGreaterThanOrEqual(1);
      expect(bots).toBeLessThanOrEqual(2);
    }
    let g = table(4);
    g = act(g, { type: 'bet', amount: 25 }, ME, 1);
    g = act(g, { type: 'tick' }, 'server', 1);
    expect(g.phase === 'playing' || g.phase === 'done' || g.phase === 'dealer').toBe(true);
    const seen = redactBj(g);
    expect(seen.shoe).toEqual([]);
    if (g.dealer.hole) expect(seen.dealer.cards).toHaveLength(1);
  });

  it('never takes a tick or presence from a phone', () => {
    expect(parseBjAction({ type: 'tick' })).toBeNull();
    expect(parseBjAction({ type: 'presence', online: [] })).toBeNull();
    expect(parseBjAction({ type: 'bet', amount: 2.5 })).toBeNull();
    expect(parseBjAction({ type: 'bet', amount: 25 })).toEqual({ type: 'bet', amount: 25 });
    const r = applyBj(table(), { type: 'tick' }, { deviceId: ME, now: 0, rng: seededRng(1) });
    expect(r.ok).toBe(false);
  });

  it('pays every hand by the rules and never loses a card', () => {
    let g = table(9);
    for (let round = 0; round < 60; round++) {
      g = playRound(g, 50, (x) => {
        const hand = x.seats.find((s) => s.id === x.turn!.seat)!.hands[x.turn!.hand];
        return { type: basicMove(hand, x.dealer.cards[0], { double: hand.cards.length === 2, split: false }) === 'double' && hand.cards.length === 2 ? 'double' : handValue(hand.cards).total < 17 ? 'hit' : 'stand' };
      });
      const row = g.history[0];
      for (const [id, r] of Object.entries(row.seats)) {
        expect(r.back === 0 || r.back >= r.staked || r.back === r.staked).toBe(true);
        expect(id).toBeTruthy();
      }
      // Every card is either in the shoe or was dealt this shoe.
      expect(g.shoe.length).toBe(g.shoeLeft);
      expect(g.shoe.length).toBeLessThanOrEqual(BJ.decks * 52);
    }
    expect(g.round).toBe(60);
  });

  it('pays a natural 3 to 2 and a win 1 to 1', () => {
    let g = table(2, false, 0);
    g = act(g, { type: 'bet', amount: 100 }, ME, 1);
    // Stack the shoe: cards come off the end. You: A, K. Dealer: 9, 7.
    g = { ...g, shoe: [...g.shoe.slice(0, 200), '7c', 'Kd', '9h', 'As'] };
    g = act(g, { type: 'tick' }, 'server', 1);
    while (g.phase !== 'done') g = act(g, { type: 'tick' }, 'server', g.wakeAt!);
    expect(g.history[0].seats[g.seats[0].id]).toEqual({ staked: 100, back: 250, results: ['blackjack'] });

    let h = table(2, false, 0);
    h = act(h, { type: 'bet', amount: 100 }, ME, 1);
    h = { ...h, shoe: [...h.shoe.slice(0, 200), 'Kc', '7c', 'Td', '9h', 'Ts'] };
    h = act(h, { type: 'tick' }, 'server', 1);
    h = act(h, { type: 'stand' }, ME, 2);
    while (h.phase !== 'done') h = act(h, { type: 'tick' }, 'server', h.wakeAt!);
    expect(h.history[0].seats[h.seats[0].id].back).toBe(200);
  });

  it('splits a pair into two hands, and split aces take one card each', () => {
    let g = table(2, false, 0);
    g = act(g, { type: 'bet', amount: 10 }, ME, 1);
    // You: A, A. Dealer: 6, 9. Then a K and a 5 for the split hands.
    g = { ...g, shoe: [...g.shoe.slice(0, 200), '5c', 'Kd', '9c', 'Ad', '6h', 'As'] };
    g = act(g, { type: 'tick' }, 'server', 1);
    g = act(g, { type: 'split' }, ME, 2);
    const me = g.seats[0];
    expect(me.hands).toHaveLength(2);
    expect(me.hands.every((h) => h.done && h.cards.length === 2 && h.split)).toBe(true);
    while (g.phase !== 'done') g = act(g, { type: 'tick' }, 'server', g.wakeAt!);
    // A+K is 21, not a blackjack: it pays even money.
    expect(g.history[0].seats[me.id].results).not.toContain('blackjack');
    expect(g.history[0].seats[me.id].staked).toBe(20);
  });

  it('lets a friend sit down online and deals once everyone has bet', () => {
    let g = table(5, true);
    g = act(g, { type: 'presence', online: [ME, FRIEND] }, 'server', 1);
    g = act(g, { type: 'sit', name: 'Alex', emoji: '🐼' }, FRIEND, 1);
    expect(g.seats.filter((s) => !s.bot)).toHaveLength(2);
    g = act(g, { type: 'bet', amount: 25 }, ME, 2);
    expect(g.wakeAt).toBe(2 + BJ.betSeconds * 1000);
    g = act(g, { type: 'bet', amount: 25 }, FRIEND, 3);
    expect(g.wakeAt).toBe(403);
    g = act(g, { type: 'tick' }, 'server', 403);
    expect(g.round).toBe(1);
  });
});

describe('blackjack bankroll', () => {
  it('pays the stake once and settles once', () => {
    let c = { ...newCampaign(), chips: 1000 };
    let g = table(2, false, 0);
    const me = g.seats[0].id;
    g = act(g, { type: 'bet', amount: 100 }, ME, 1);
    g = { ...g, shoe: [...g.shoe.slice(0, 200), 'Kc', '7c', 'Td', '9h', 'Ts'] };
    g = act(g, { type: 'tick' }, 'server', 1);
    c = bjSettle(c, g, me, 1);
    c = bjSettle(c, g, me, 1);
    expect(c.chips).toBe(900);
    g = act(g, { type: 'stand' }, ME, 2);
    while (g.phase !== 'done') {
      g = act(g, { type: 'tick' }, 'server', g.wakeAt!);
      c = bjSettle(c, g, me, 2);
    }
    expect(c.chips).toBe(1100);
    g = act(g, { type: 'tick' }, 'server', g.wakeAt!);
    c = bjSettle(c, g, me, 3);
    c = bjSettle(c, g, me, 3);
    expect(c.chips).toBe(1100);
    expect(c.stats.bjRounds).toBe(1);
  });

  it('keeps every chip accounted for over many rounds', () => {
    let c = { ...newCampaign(), chips: 100000 };
    let g = table(11);
    const me = g.seats[0].id;
    let staked = 0;
    let back = 0;
    for (let round = 0; round < 80; round++) {
      g = playRound(g, 100, (x) => {
        const hand = x.seats.find((s) => s.id === x.turn!.seat)!.hands[x.turn!.hand];
        const seat = x.seats.find((s) => s.id === x.turn!.seat)!;
        const can = { double: hand.cards.length === 2, split: hand.cards.length === 2 && seat.hands.length < 2 && hand.cards[0][0] === hand.cards[1][0] };
        c = bjSettle(c, x, me, x.updatedAt);
        return { type: basicMove(hand, x.dealer.cards[0], can) };
      });
      c = bjSettle(c, g, me, g.updatedAt);
      staked += g.history[0].seats[me].staked;
      back += g.history[0].seats[me].back;
    }
    expect(c.chips).toBe(100000 - staked + back);
  });
});
