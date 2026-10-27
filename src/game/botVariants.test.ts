import { describe, expect, it } from 'vitest';
import { variantDecide, variantEquity } from './botVariants';
import { applyAction, createTable, DEFAULT_SETTINGS, makeMove, seededRng, type Game, type Variant } from './index';

const HOST = 'host-device';
const VARIANTS: Variant[] = ['pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'imposter'];

/** A bots-only table (the host sits out of the way by calling) with the first hand dealt. */
function dealt(variant: Variant, bots = 4, seed = 1): Game {
  let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, startingStack: 5000, variant }, bots, code: null, now: 0 });
  const r = applyAction(game, { type: 'start' }, { deviceId: HOST, now: 0, rng: seededRng(seed) });
  if (!r.ok) throw new Error(r.error);
  game = r.game;
  for (let i = 0; i < 5 && !game.hand; i++) {
    const t = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: (game.wakeAt ?? 0) + 1, rng: seededRng(seed) });
    if (t.ok) game = t.game;
  }
  return game;
}

describe('variant bots', () => {
  it('leave plain Hold\'em to the usual bot brain', () => {
    const g = dealt('holdem');
    const seat = g.hand!.seats[0];
    expect(variantDecide(g, g.hand!, seat, seededRng(1))).toBeNull();
  });

  it('rate hands by the table\'s rules', () => {
    const g = dealt('deuces');
    const seat = { ...g.hand!.seats[0], cards: ['2c', '2d'] };
    const trash = { ...g.hand!.seats[0], cards: ['7c', '3d'] };
    const rng = seededRng(5);
    // Two wild deuces beat almost anything; 7-3 off is near the bottom.
    expect(variantEquity(g, { ...g.hand!, board: [] }, seat, rng, 300)).toBeGreaterThan(0.5);
    expect(variantEquity(g, { ...g.hand!, board: [] }, trash, rng, 300)).toBeLessThan(0.2);
  });

  it('bet strong hands and fold weak ones to a big bet', () => {
    const g = dealt('pittsburgh', 1);
    const hand = g.hand!;
    const seat = hand.seats.find((s) => s.playerId === hand.toAct)!;
    const board = ['Ah', 'Ad', 'Ks', '4c'];
    const strong = { ...seat, cards: ['Ac', 'As'] };
    const weak = { ...seat, cards: ['7h', '2d'] };
    const quiet = { ...hand, board, currentBet: seat.bet };
    const facing = { ...hand, board, currentBet: seat.bet + 2000 };
    const decide = (h: typeof hand, s: typeof seat) =>
      variantDecide(g, { ...h, seats: h.seats.map((x) => (x.playerId === s.playerId ? s : x)) }, s, seededRng(2))!.move.move;
    // Quads on the board's aces: it puts chips in. Seven-deuce against a bet bigger than the pot: it lets go.
    expect(['bet', 'raise', 'allin']).toContain(decide(quiet, strong));
    expect(decide(facing, weak)).toBe('fold');
  });

  it('never fold in Imposter', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = dealt('imposter', 4, seed);
      const hand = g.hand!;
      const seat = hand.seats.find((s) => s.playerId === hand.toAct)!;
      const facing = { ...hand, currentBet: seat.bet + 3000 };
      expect(variantDecide(g, facing, seat, seededRng(seed))!.move.move).not.toBe('fold');
    }
  });

  it('make only moves the table accepts, quickly', () => {
    for (const v of VARIANTS) {
      let game = dealt(v);
      const rng = seededRng(9);
      let clock = 0;
      let checked = 0;
      for (let i = 0; i < 600 && checked < 30; i++) {
        const hand = game.hand;
        if (hand && !hand.result && hand.toAct && !hand.discarding && !hand.voting) {
          const seat = hand.seats.find((s) => s.playerId === hand.toAct)!;
          const t0 = performance.now();
          const { move } = variantDecide(game, hand, seat, rng)!;
          expect(performance.now() - t0).toBeLessThan(250);
          // The same check the table makes; a move it turned down would leave the bot stuck until its clock ran out.
          const err = makeMove(structuredClone(game), move.move, move.to, { deviceId: 'server', now: clock, rng });
          expect(err, `${v}: ${JSON.stringify(move)}`).toBeNull();
          checked++;
        }
        clock = (game.wakeAt ?? clock) + 1;
        const r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
        if (!r.ok) throw new Error(r.error);
        game = r.game;
      }
      expect(checked, v).toBeGreaterThan(10);
    }
  });
});
