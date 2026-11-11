import { describe, expect, it } from 'vitest';
import { botHits, draws, variantDecide, variantEquity, variantScore } from './botVariants';
import type { Hand } from './types';
import { botVote, keepTwo } from './variants';
import { applyAction, bestHand, createTable, DEFAULT_SETTINGS, fullDeck, makeMove, seededRng, type Game, type Variant } from './index';

const HOST = 'host-device';
const VARIANTS: Variant[] = ['pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'imposter', 'crucifix', 'circle', 'memory', 'beanstalk', 'bjholdem'];

/** A bots-only table (the host sits out of the way by calling) with the first hand dealt. */
function dealt(variant: Variant, bots = 4, seed = 1): Game {
  let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, startingStack: 5000, variant }, bots, code: null, now: 0, rng: seededRng(seed) });
  const r = applyAction(game, { type: 'start' }, { deviceId: HOST, now: 0, rng: seededRng(seed) });
  if (!r.ok) throw new Error(r.error);
  game = r.game;
  for (let i = 0; i < 5 && !game.hand; i++) {
    const t = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: (game.wakeAt ?? 0) + 1, rng: seededRng(seed) });
    if (t.ok) game = t.game;
  }
  return game;
}

describe('variant bots', { timeout: 20_000 }, () => {
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
      const took: number[] = [];
      for (let i = 0; i < 600 && checked < 30; i++) {
        const hand = game.hand;
        if (hand && !hand.result && hand.toAct && !hand.discarding && !hand.voting) {
          const seat = hand.seats.find((s) => s.playerId === hand.toAct)!;
          const t0 = performance.now();
          const { move } = variantDecide(game, hand, seat, rng)!;
          took.push(performance.now() - t0);
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
      // Quick in the usual case. The median, so one decision caught by a garbage-collection pause or a busy
      // runner doesn't fail the run; a real slowdown moves the median.
      took.sort((a, b) => a - b);
      expect(took[Math.floor(took.length / 2)], `${v}: median ms per decision`).toBeLessThan(250);
    }
  });
});

describe('the bots\' quick scoring', () => {
  it('scores every hand exactly as the table does, long red-river boards, three rivers, the cross and the circle included', () => {
    const rng = seededRng(11);
    const deck = fullDeck();
    for (let n = 0; n < 3000; n++) {
      const d = deck.slice().sort(() => rng() - 0.5);
      const v = (['deuces', 'pittsburgh', 'redriver', 'holdem', 'crucifix', 'circle'] as Variant[])[n % 6];
      const boardSize = v === 'pittsburgh' ? 7 : v === 'redriver' ? 5 + (n % 5) : v === 'crucifix' ? 9 : v === 'circle' ? 6 : 5;
      const [hole, board] = [d.slice(0, 2), d.slice(2, 2 + boardSize)];
      expect(variantScore(v, hole, board)).toBe(bestHand(v, hole, board).score);
    }
  });
});

describe('game-mode sense', () => {
  const cards = (s: string) => s.split(' ');

  it('keeps a flush draw over a weak pair in Crazy Pineapple', () => {
    // 3c pairs the board's three; Ah Kh are four hearts with the flop.
    expect([...keepTwo(cards('Ah Kh 3c'), cards('Qh 7h 3d'))].sort()).toEqual(['Ah', 'Kh']);
    // Trips still beat everything.
    expect([...keepTwo(cards('Ah Kd 7c'), cards('7d 7s 2h'))].sort()).toEqual(['7c', 'Ah']);
  });

  it('reads a bettor as stronger than random', () => {
    const hand = { actions: [{ street: 'flop', playerId: 'a', move: 'raise', to: 100 }, { street: 'turn', playerId: 'a', move: 'bet', to: 200 }] } as unknown as Hand;
    expect(draws(hand, 'a', () => 0.99)).toBe(3);
    expect(draws(hand, 'b', () => 0.99)).toBe(1);
  });

  it('votes in Imposter: innocents find the odd one out, the imposter backs the crowd', () => {
    const act = (playerId: string, move: string) => ({ street: 'flop', playerId, move, to: 0 });
    const hand = {
      imposter: 'd',
      seats: ['a', 'b', 'c', 'd'].map((playerId) => ({ playerId })),
      actions: [act('a', 'check'), act('b', 'check'), act('c', 'check'), act('d', 'bet'), act('a', 'call'), act('b', 'call'), act('c', 'call')],
      points: { a: 'b', c: 'b' },
    } as unknown as Hand;
    // a's own read and the crowd disagree here; d stands out by play most.
    expect(botVote({ ...hand, points: {} }, 'a')).toBe('d');
    // The imposter piles on the innocent the table is pointing at.
    expect(botVote(hand, 'd')).toBe('b');
  });

  it('risks less on a hit in Blackjack Hold\'em when its poker hand is good', () => {
    const g = dealt('bjholdem');
    const hand = { ...g.hand!, board: cards('Kd Kc 6h') };
    const game = { ...g, hand };
    const seat = { ...hand.seats[0], cards: cards('Ks 6c') }; // 16, and a full house
    const hits = Array.from({ length: 40 }, (_, i) => botHits(game, seat, seededRng(i))).filter(Boolean).length;
    expect(hits).toBe(0);
  });
});
