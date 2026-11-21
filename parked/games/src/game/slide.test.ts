import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createTable,
  DEFAULT_SETTINGS,
  options,
  pendingSlides,
  redactForDevice,
  seededRng,
  slideChoice,
  slideTargets,
  type Action,
  type Game,
  type Settings,
} from './index';

const HOST = 'device-host';
let clock = 5_000_000;

function run(game: Game, action: Action, deviceId: string, rng = seededRng(11)) {
  return applyAction(game, action, { deviceId, now: clock, rng });
}

function must(game: Game, action: Action, deviceId: string, rng = seededRng(11)): Game {
  const r = run(game, action, deviceId, rng);
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.game;
}

function table(people: number, settings: Partial<Settings> = {}, bots = 0): Game {
  let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, variant: 'slide', ...settings }, bots, code: 'BCDFG', now: clock });
  for (let i = 1; i < people; i++) game = must(game, { type: 'join', name: `P${i}`, emoji: '🐸' }, `device-${i}`);
  let g = must(game, { type: 'start' }, HOST);
  for (let i = 0; i < 5 && !g.hand; i++) {
    clock = g.wakeAt ?? clock + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

const deviceOf = (game: Game, id: string) => game.players.find((p) => p.id === id)!.deviceId!;
const total = (g: Game) => g.players.reduce((s, p) => s + p.stack, 0) + (g.hand && !g.hand.result ? g.hand.seats.reduce((s, x) => s + x.total, 0) : 0);

/** Ticks the clock until someone has to do something (a move or a slide) or the hand is over. */
function settle(game: Game): Game {
  let g = game;
  for (let i = 0; i < 20; i++) {
    const hand = g.hand!;
    if (hand.result || hand.sliding) return g;
    if (hand.toAct && hand.nextStreetAt == null && hand.bettingAt == null && hand.showdownAt == null && !hand.runout) return g;
    clock = (g.wakeAt ?? clock) + 1;
    g = must(g, { type: 'tick' }, 'server');
  }
  return g;
}

/** Everyone checks or calls until the flop's slides are asked for. */
function toFlopSlides(game: Game): Game {
  let g = settle(game);
  for (let i = 0; i < 20 && !g.hand!.sliding; i++) {
    const hand = g.hand!;
    const seat = hand.seats.find((s) => s.playerId === hand.toAct)!;
    const o = options(g, hand, seat);
    g = settle(must(g, { type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : 'call' }, deviceOf(g, hand.toAct!)));
  }
  return g;
}

describe('Slide Switch', () => {
  it('asks everyone still in for a card when the flop lands, before any betting', () => {
    const g = toFlopSlides(table(3));
    const hand = g.hand!;
    expect(hand.street).toBe('flop');
    expect(hand.board.length).toBe(3);
    expect(hand.sliding).toBe(true);
    expect(hand.toAct).toBeNull();
    expect(pendingSlides(g).length).toBe(3);
  });

  it('moves every picked card to the next player on the left, all at once, then the betting starts', () => {
    let g = toFlopSlides(table(3));
    const seats = g.hand!.seats.map((s) => ({ id: s.playerId, cards: [...s.cards] }));
    const picks = seats.map((s, i) => s.cards[i % 2]);
    seats.forEach((s, i) => (g = must(g, { type: 'slide', hand: g.hand!.number, card: picks[i] }, deviceOf(g, s.id))));
    const hand = g.hand!;
    expect(hand.sliding).toBe(false);
    expect(hand.moment?.kind).toBe('slides');
    seats.forEach((s, i) => {
      const fromRight = (i - 1 + seats.length) % seats.length;
      const now = hand.seats.find((x) => x.playerId === s.id)!.cards;
      expect(now).toHaveLength(2);
      expect(now).not.toContain(picks[i]);
      expect(now).toContain(picks[fromRight]);
      // The new card takes the place of the one that left.
      expect(now[s.cards.indexOf(picks[i])]).toBe(picks[fromRight]);
    });
    expect(hand.slid?.map((x) => [x.from, x.to])).toEqual(seats.map((s, i) => [s.id, seats[(i + 1) % 3].id]));
    // The betting waits for the slide to be seen.
    g = settle(g);
    expect(g.hand!.toAct).not.toBeNull();
    expect(g.hand!.street).toBe('flop');
  });

  it('slides again on the turn and on the river', () => {
    let g = toFlopSlides(table(2));
    let slides = 0;
    for (let i = 0; i < 40 && !g.hand!.result; i++) {
      const hand = g.hand!;
      if (hand.sliding) {
        slides++;
        for (const s of pendingSlides(g)) g = must(g, { type: 'slide', hand: hand.number, card: s.cards[0] }, deviceOf(g, s.playerId));
        g = settle(g);
        continue;
      }
      if (hand.toAct) {
        const o = options(g, hand, hand.seats.find((s) => s.playerId === hand.toAct)!);
        g = settle(must(g, { type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : 'call' }, deviceOf(g, hand.toAct)));
      } else g = settle(g);
    }
    expect(slides).toBe(3);
    expect(g.hand!.slid).toHaveLength(6);
    expect(new Set(g.hand!.slid!.map((x) => x.street))).toEqual(new Set(['flop', 'turn', 'river']));
  });

  it("refuses a second pick, someone else's card, or a slide before the flop", () => {
    const start = table(3);
    const first = start.hand!.seats[0];
    expect(run(start, { type: 'slide', hand: start.hand!.number, card: first.cards[0] }, deviceOf(start, first.playerId)).ok).toBe(false);
    let g = toFlopSlides(start);
    const [a, b] = g.hand!.seats;
    expect(run(g, { type: 'slide', hand: g.hand!.number, card: b.cards[0] }, deviceOf(g, a.playerId)).ok).toBe(false);
    g = must(g, { type: 'slide', hand: g.hand!.number, card: a.cards[0] }, deviceOf(g, a.playerId));
    expect(run(g, { type: 'slide', hand: g.hand!.number, card: a.cards[1] }, deviceOf(g, a.playerId)).ok).toBe(false);
  });

  it('keeps picks secret and tells only the two players a slid card passed between', () => {
    let g = toFlopSlides(table(3));
    const [a, b, c] = g.hand!.seats.map((s) => s.playerId);
    g = must(g, { type: 'slide', hand: g.hand!.number, card: g.hand!.seats[0].cards[0] }, deviceOf(g, a));
    expect(redactForDevice(g, deviceOf(g, b)).hand!.slides).toEqual({});
    expect(Object.keys(redactForDevice(g, deviceOf(g, a)).hand!.slides!)).toEqual([a]);
    for (const id of [b, c]) g = must(g, { type: 'slide', hand: g.hand!.number, card: g.hand!.seats.find((s) => s.playerId === id)!.cards[0] }, deviceOf(g, id));
    const bView = redactForDevice(g, deviceOf(g, b)).hand!.slid!;
    // b got a's card and gave its own to c; the card c slid on to a is none of b's business.
    expect(bView.find((x) => x.from === a)!.card).not.toBe('');
    expect(bView.find((x) => x.from === b)!.card).not.toBe('');
    expect(bView.find((x) => x.from === c)!.card).toBe('');
  });

  it("works out who you slide to and who's still picking from a phone's own view", () => {
    let g = toFlopSlides(table(3));
    const [a, b] = g.hand!.seats.map((s) => s.playerId);
    g = must(g, { type: 'slide', hand: g.hand!.number, card: g.hand!.seats[0].cards[0] }, deviceOf(g, a));
    const view = redactForDevice(g, deviceOf(g, a));
    expect(view.hand!.seats[1].cards).toEqual([]);
    expect(slideTargets(view.hand!)[a]).toBe(b);
    expect(pendingSlides(view).map((s) => s.playerId)).toEqual(g.hand!.seats.slice(1).map((s) => s.playerId));
  });

  it('slides the card that helps least for anyone whose time runs out', () => {
    let g = toFlopSlides(table(2, { turnSeconds: 10 }));
    const before = g.hand!.seats.map((s) => [...s.cards]);
    const board = g.hand!.board;
    expect(g.hand!.deadline).not.toBeNull();
    clock = g.hand!.deadline! + 1;
    g = must(g, { type: 'tick' }, 'server');
    expect(g.hand!.sliding).toBe(false);
    const gave = g.hand!.slid!.map((x) => x.card);
    expect(gave).toEqual(before.map((cards) => slideChoice(cards, board)));
  });

  it('keeps the card that pairs the board, and on the turn the one that makes the better hand', () => {
    expect(slideChoice(['Kh', '4c'], ['Ks', '7d', '2c'])).toBe('4c');
    expect(slideChoice(['3h', 'Ah'], ['9h', 'Th', '2c'])).toBe('3h');
    // Queen-high beats jack-high with this board, so the queen stays.
    expect(slideChoice(['8c', 'Qd'], ['9s', 'Td', 'Jh', '2c'])).toBe('8c');
  });

  it('never makes or loses a chip, or a card, over many bot hands', () => {
    let g = table(1, {}, 4);
    const start = total(g);
    let slid = 0;
    for (let step = 0; step < 4000 && (g.hand?.number ?? 0) < 40 && g.status !== 'ended'; step++) {
      const hand = g.hand;
      if (hand && !hand.result) {
        const cards = [...hand.board, ...hand.deck, ...hand.seats.flatMap((s) => s.cards)];
        expect(new Set(cards).size).toBe(cards.length);
        for (const s of hand.seats) if (!s.folded && s.cards.length) expect(s.cards).toHaveLength(2);
      }
      if (hand?.sliding) {
        const me = pendingSlides(g).find((s) => g.players.find((p) => p.id === s.playerId)?.deviceId === HOST);
        if (me) {
          g = must(g, { type: 'slide', hand: hand.number, card: me.cards[1] }, HOST);
          slid++;
          continue;
        }
      }
      if (hand && !hand.result && hand.toAct && g.players.find((p) => p.id === hand.toAct)?.deviceId === HOST && hand.bettingAt == null && hand.nextStreetAt == null) {
        const o = options(g, hand, hand.seats.find((s) => s.playerId === hand.toAct)!);
        g = must(g, { type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : 'call' }, HOST);
      } else {
        clock = (g.wakeAt ?? clock) + 1;
        g = must(g, { type: 'tick' }, 'server', seededRng(clock));
      }
      expect(total(g)).toBe(start);
    }
    expect(slid).toBeGreaterThan(5);
  });
});
