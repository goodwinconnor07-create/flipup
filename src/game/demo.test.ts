// The Demo's hands (demo.ts): each one is played through the engine with the moves the coach asks for, and must
// come out as its script says: the twist happens, the cards are the ones written down, and you win.

import { describe, expect, it } from 'vitest';
import {
  applyAction,
  bestHand,
  count21,
  createDemoTable,
  DEMO_BOTS,
  DEMO_SPECS,
  DEMO_SETTINGS,
  fullDeck,
  isRed,
  redactForDevice,
  stackDeck,
  VARIANTS,
  type Action,
  type DemoPlay,
  type Game,
  type Variant,
} from './index';

const ME = 'device-me';

/** Plays a demo to the end the way the coach asks, and returns the table after every step. */
export function playDemo(variant: Variant): { game: Game; frames: Game[]; total: number } {
  let clock = 1_000_000;
  let game = createDemoTable({ variant, deviceId: ME, name: 'You', emoji: '😎', now: clock });
  const total = game.players.reduce((s, p) => s + p.stack, 0) + (game.ghostPot ?? 0);
  const plays: DemoPlay[] = [...DEMO_SPECS[variant].plays];
  const frames: Game[] = [];
  const apply = (action: Action, device = ME) => {
    const r = applyAction(game, action, { deviceId: device, now: clock, rng: () => 0.5 });
    if (!r.ok) throw new Error(`${variant}: ${action.type} refused: ${r.error}`);
    game = r.game;
    frames.push(game);
  };
  apply({ type: 'start' });
  for (let i = 0; i < 400 && !game.hand?.result; i++) {
    const hand = game.hand;
    const me = game.players.find((p) => p.deviceId === ME)!;
    const mine = hand?.seats.find((s) => s.playerId === me.id);
    const waiting = hand && !hand.result && (hand.toAct === me.id || (hand.discarding && (mine?.cards.length ?? 0) > 2));
    const gated = hand?.moment?.gate && clock < hand.moment.until;
    if (hand && mine && waiting && !gated && hand.bettingAt == null) {
      const play = plays.shift();
      if (!play) throw new Error(`${variant}: the script ran out of moves`);
      if (typeof play === 'string') apply({ type: 'act', hand: hand.number, seq: hand.seq, move: play });
      else if ('bet' in play) apply({ type: 'act', hand: hand.number, seq: hand.seq, move: hand.currentBet > 0 ? 'raise' : 'bet', to: play.bet });
      else if ('hit' in play) apply({ type: 'hit', hand: hand.number, seq: hand.seq });
      else if ('discard' in play) apply({ type: 'discard', hand: hand.number, card: play.discard });
      else apply({ type: 'power', hand: hand.number, seq: hand.seq });
      continue;
    }
    // A power on show holds your move for a moment without the clock: wait it out, as a person does.
    if (gated && hand?.moment) {
      clock = hand.moment.until + 1;
      continue;
    }
    if (game.wakeAt == null) throw new Error(`${variant}: the table stopped with nothing due`);
    clock = Math.max(clock, game.wakeAt) + 1;
    apply({ type: 'tick' }, 'clock');
  }
  expect(plays, `${variant}: moves the coach asks for that never came up`).toEqual([]);
  return { game, frames, total };
}

describe('demo hands', () => {
  it('covers every game in the app', () => {
    expect(Object.keys(DEMO_SPECS).sort()).toEqual(VARIANTS.map((v) => v.id).sort());
  });

  for (const { id: variant } of VARIANTS) {
    describe(variant, () => {
      const spec = DEMO_SPECS[variant];
      const { game, frames, total } = playDemo(variant);
      const hand = game.hand!;
      const me = game.players.find((p) => p.deviceId === ME)!;
      const mine = hand.seats.find((s) => s.playerId === me.id)!;

      it('stacks a whole deck, each card once', () => {
        const deck = stackDeck(spec);
        expect(deck.length + (spec.memory?.length ?? 0)).toBe(52);
        expect(new Set([...deck, ...(spec.memory ?? [])])).toEqual(new Set(fullDeck()));
      });

      it('deals the cards it says', () => {
        expect(game.players.map((p) => p.name)).toEqual(['You', ...DEMO_BOTS]);
        expect(hand.buttonId).toBe(me.id);
        const start = frames.find((g) => g.hand)!.hand!;
        expect(start.seats.map((s) => s.cards)).toEqual(spec.holes);
        if (spec.ghost) expect(hand.ghost).toEqual(spec.ghost);
        const board = spec.dice?.fresh ? spec.board.map((c, i) => (i === spec.dice!.roll - 1 ? spec.dice!.fresh! : c)) : spec.board;
        expect(hand.board).toEqual(board);
      });

      it('goes to a showdown and you win', () => {
        expect(hand.result?.showdown).toBe(true);
        expect(mine.folded).toBe(false);
        expect(hand.result!.won[me.id] ?? 0).toBeGreaterThan(mine.total);
      });

      it('never makes or loses a chip', () => {
        const after = game.players.reduce((s, p) => s + p.stack, 0) + (game.ghostPot ?? 0);
        expect(after).toBe(total);
      });

      it('keeps the bots quiet and the demo off the phone', () => {
        for (const g of frames) {
          expect(Object.values(g.reactions ?? {}).filter((r) => r.n > 0)).toEqual([]);
          expect(redactForDevice(g, ME).demo).toBeUndefined();
        }
      });

      it('plays at the demo settings with no clock', () => {
        expect(game.settings.turnSeconds).toBe(0);
        expect(game.settings.startingStack).toBe(DEMO_SETTINGS.startingStack);
        expect(frames.every((g) => !g.hand || g.hand.deadline == null)).toBe(true);
      });
    });
  }
});

describe('each twist shows up', () => {
  const won = (v: Variant) => {
    const { game } = playDemo(v);
    const me = game.players.find((p) => p.deviceId === ME)!;
    const seat = game.hand!.seats.find((s) => s.playerId === me.id)!;
    return { game, hand: game.hand!, me, name: bestHand(v, seat.cards, game.hand!.board).name };
  };

  it("Texas Hold'em: the river makes your flush", () => expect(won('holdem').name).toMatch(/flush/i));

  it('Crazy Pineapple: you throw the seven away and win with a set', () => {
    const { hand, me, name } = won('pineapple');
    expect(hand.discards?.[me.id]).toBe('7c');
    expect(name).toMatch(/three of a kind/i);
  });

  it('Crazy Deuces: five kings beat four nines', () => {
    const { game, name } = won('deuces');
    expect(name).toMatch(/five of a kind/i);
    const max = game.players.find((p) => p.name === 'Max')!;
    const seat = game.hand!.seats.find((s) => s.playerId === max.id)!;
    expect(bestHand('deuces', seat.cards, game.hand!.board).name).toMatch(/four of a kind/i);
  });

  it('Haunted Pot: you beat the ghost and take its bounty', () => {
    const { hand, me } = won('ghost');
    expect(hand.result?.ghost).toBeTruthy();
    expect(hand.result!.ghost!.kept).toBe(0);
    expect(hand.result!.won[me.id]).toBeGreaterThanOrEqual(DEMO_SPECS.ghost.bounty!);
  });

  it('Pittsburgh: three rivers, and the last one makes your straight', () => {
    const { hand, name } = won('pittsburgh');
    expect(hand.board).toHaveLength(7);
    expect(name).toMatch(/straight/i);
  });

  it('Die on the River: a 4 swaps the turn card and makes your straight', () => {
    const { hand, name } = won('dice');
    expect(hand.dice).toMatchObject({ roll: 4, out: '2s', in: '5c' });
    expect(name).toMatch(/straight/i);
  });

  it('Red River: red, red, then black', () => {
    const { hand, name } = won('redriver');
    expect(hand.board).toHaveLength(7);
    expect(hand.board.slice(4, 6).every(isRed)).toBe(true);
    expect(isRed(hand.board[6])).toBe(false);
    expect(name).toMatch(/straight/i);
  });

  it('Crucifix: a straight down the cross', () => expect(won('crucifix').name).toMatch(/straight/i));

  it('Round the Clock: a straight round the top of the clock', () => expect(won('circle').name).toMatch(/straight/i));

  it('Memory Poker: all four aces leave the deck', () => {
    const { hand } = won('memory');
    expect(hand.removed?.filter((c) => c[0] === 'A')).toHaveLength(4);
    expect(hand.seats.flatMap((s) => s.cards).some((c) => c[0] === 'A')).toBe(false);
  });

  it('Bean Stalk: five cards each, and a flush', () => {
    const { hand, name } = won('beanstalk');
    expect(hand.seats.every((s) => s.cards.length === 5)).toBe(true);
    expect(name).toMatch(/flush/i);
  });

  it('Hit Me: you win the poker half, Luna the 21 half', () => {
    const { game, hand, me, name } = won('bjholdem');
    const luna = game.players.find((p) => p.name === 'Luna')!;
    expect(count21(hand.seats.find((s) => s.playerId === me.id)!.cards)).toBe(20);
    expect(count21(hand.seats.find((s) => s.playerId === luna.id)!.cards)).toBe(21);
    expect(name).toMatch(/straight/i);
    expect(hand.result!.blackjack!.poker[0]).toEqual([me.id]);
    expect(hand.result!.blackjack!.winners[0]).toEqual([luna.id]);
  });

  it('Power Cards: your Peek shows the king coming', () => {
    const { hand, me, name } = won('power');
    const peek = hand.powerUses?.find((u) => u.by === me.id);
    expect(peek?.power).toBe('peek');
    expect(peek?.seen).toEqual(['Kd']);
    expect(name).toMatch(/straight/i);
  });
});
