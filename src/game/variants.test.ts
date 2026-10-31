import { describe, expect, it } from 'vitest';
import {
  applyAction,
  bestHand,
  createTable,
  DEFAULT_SETTINGS,
  holeCountAt,
  keepTwo,
  options,
  parseAction,
  redactForDevice,
  seededRng,
  wildHand,
  type Game,
  type Variant,
} from './index';

const h = (s: string) => s.split(' ');
const HOST = 'host-device';
/** Whole tables play dozens of hands, each bot move a small simulation: more than the usual five seconds on a slow runner. */
const TABLE_MS = 20_000;

describe('wild deuces', () => {
  it('makes five of a kind, the best hand there is', () => {
    const five = wildHand(h('2s 2h Ah Ad Ac 7d 9c'));
    expect(five.detail).toBe('Five of a kind, aces');
    expect(five.score).toBeGreaterThan(wildHand(h('2c Ah Kh Qh Jh 3d 4s')).score);
  });

  it('turns a deuce into the card the hand needs, and points back at the real cards', () => {
    const royal = wildHand(h('2c Ah Kh Qh Jh 3d 4s'));
    expect(royal.name).toBe('Royal flush');
    expect(royal.best).toContain('2c');
    expect(wildHand(h('2c Kd Ks 7h 7c 3d 9s')).name).toBe('Full house');
    expect(wildHand(h('2c 2d 9s 8h 4c Kd Jc')).name).toBe('Straight');
    expect(wildHand(h('2c 9d 9s 5h 4c Kd Jc')).name).toBe('Three of a kind');
  });

  it('plays a hand without deuces normally', () => {
    expect(wildHand(h('Ac Jd 9h 7s 4d 3c 5h')).name).toBe('High card');
  });
});

describe('Pittsburgh', () => {
  it('uses the flop, the turn and the best of the three rivers', () => {
    const board = h('Kh 9h 4c 2d 3s Ah Qd');
    // With hearts in hand, the Ah river makes a flush; the other rivers don't.
    expect(bestHand('pittsburgh', h('7h 6h'), board).name).toBe('Flush');
    // Never two rivers at once: a pair of queens from the Qd, not two pair with Ah too.
    expect(bestHand('pittsburgh', h('Qc 8s'), board).name).toBe('Pair');
  });
});

describe('Crazy Pineapple', () => {
  it('keeps the two cards that make the best hand', () => {
    expect(keepTwo(h('Ah Kd 7c'), h('7d 7s 2h')).sort()).toEqual(['7c', 'Ah']);
    expect(keepTwo(h('Qs Qd 3c'), [])).toEqual(['Qs', 'Qd']);
  });
});

// ── Whole tables ────────────────────────────────────────────────────────────

function table(variant: Variant, bots = 3, stack = 1000): Game {
  const game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, startingStack: stack, turnSeconds: 5, variant }, bots, code: null, now: 0 });
  const r = applyAction(game, { type: 'start' }, { deviceId: HOST, now: 0, rng: seededRng(1) });
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

/** Every chip: stacks, the pot (with what the ghost carried into it) and what the ghost is holding. */
const chipsInPlay = (g: Game) =>
  g.players.reduce((n, p) => n + p.stack, 0) +
  (g.hand && !g.hand.result ? g.hand.seats.reduce((n, s) => n + s.total, 0) + (g.hand.carry ?? 0) : 0) +
  (g.ghostPot ?? 0);

/** Plays bot hands with the host calling small bets and throwing a random card away, checking chips after every step. */
function play(variant: Variant, hands: number, check: (g: Game) => void = () => {}) {
  let game = table(variant, 3, variant === 'ghost' ? 5000 : 1000);
  const rng = seededRng(7);
  const total = chipsInPlay(game);
  let clock = 0;
  let seen = 0;
  for (let i = 0; i < 6000 && game.status === 'playing' && seen < hands; i++) {
    const before = game.hand?.number;
    const hand = game.hand;
    const host = game.players.find((p) => p.deviceId === HOST)!;
    const mine = hand?.seats.find((s) => s.playerId === host.id);
    let r;
    if (hand && !hand.result && hand.voting && mine && !hand.votes?.[host.id]) {
      const others = hand.seats.filter((x) => x.playerId !== host.id);
      r = applyAction(game, { type: 'vote', hand: hand.number, playerId: others[Math.floor(rng() * others.length)].playerId }, { deviceId: HOST, now: clock, rng });
    } else if (hand && !hand.result && hand.discarding && mine && !mine.folded && mine.cards.length === 3) {
      r = applyAction(game, { type: 'discard', hand: hand.number, card: mine.cards[Math.floor(rng() * 3)] }, { deviceId: HOST, now: clock, rng });
    } else if (hand && !hand.result && hand.toAct === host.id && mine) {
      const o = options(game, hand, mine);
      const move = o.canCheck ? 'check' : o.toCall <= game.settings.bigBlind * 3 || !o.canFold ? 'call' : 'fold';
      r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move }, { deviceId: HOST, now: clock, rng });
    } else {
      clock = (game.wakeAt ?? clock) + 1;
      r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
    }
    if (!r.ok) throw new Error(r.error);
    game = r.game;
    if (game.hand?.number !== before) seen++;
    expect(chipsInPlay(game)).toBe(total);
    for (const p of game.players) expect(p.stack).toBeGreaterThanOrEqual(0);
    check(game);
  }
  expect(seen).toBeGreaterThan(5);
  return game;
}

describe('variant tables', { timeout: TABLE_MS }, () => {
  for (const v of ['pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'imposter', 'crucifix', 'circle', 'memory', 'beanstalk'] as Variant[]) {
    it(`plays ${v} hands with bots and keeps every chip`, () => {
      play(v, 40);
    });
  }

  it('deals three cards in Crazy Pineapple and two from the turn on', () => {
    play('pineapple', 25, (g) => {
      const hand = g.hand;
      if (!hand || hand.result) return;
      for (const s of hand.seats) {
        if (s.folded) continue;
        if (hand.board.length >= 4) expect(s.cards.length).toBe(2);
        else if (hand.board.length === 0) expect(s.cards.length).toBe(3);
      }
    });
  });

  it('deals three rivers in Pittsburgh', () => {
    let rivers = 0;
    play('pittsburgh', 30, (g) => {
      if (g.hand && g.hand.board.length > 5) {
        expect(g.hand.board.length).toBe(7);
        rivers++;
      }
    });
    expect(rivers).toBeGreaterThan(0);
  });

  it('caps Ghost bets at the pot and hides the ghost until the showdown', () => {
    let shown = 0;
    play('ghost', 40, (g) => {
      const hand = g.hand;
      if (!hand) return;
      const seen = redactForDevice(g, HOST).hand!;
      if (hand.result?.showdown) {
        expect(seen.ghost).toEqual(hand.ghost);
        expect(hand.result.ghost?.cards).toEqual(hand.ghost);
        shown++;
      } else expect(seen.ghost).toBeUndefined();
      if (!hand.result && hand.toAct) {
        const seat = hand.seats.find((s) => s.playerId === hand.toAct)!;
        const toCall = Math.max(0, hand.currentBet - seat.bet);
        const pot = hand.seats.reduce((n, s) => n + s.total, 0) + (hand.carry ?? 0);
        expect(options(g, hand, seat).maxTo).toBeLessThanOrEqual(hand.currentBet + pot + toCall);
      }
    });
    expect(shown).toBeGreaterThan(0);
  });
});

describe('the second batch', { timeout: TABLE_MS }, () => {
  it('Die on the River swaps the board card the die names', () => {
    let rolled = 0;
    play('dice', 40, (g) => {
      const hand = g.hand;
      if (!hand?.dice) return;
      rolled++;
      expect(hand.board.length).toBe(5);
      expect(hand.dice.roll).toBeGreaterThanOrEqual(1);
      expect(hand.dice.roll).toBeLessThanOrEqual(6);
      if (hand.dice.roll <= 5) {
        expect(hand.board[hand.dice.roll - 1]).toBe(hand.dice.in);
        expect(hand.board).not.toContain(hand.dice.out);
      }
    });
    expect(rolled).toBeGreaterThan(0);
  });

  it('Red River keeps dealing until a black card', () => {
    let rivers = 0;
    play('redriver', 60, (g) => {
      const b = g.hand?.board ?? [];
      if (b.length < 5) return;
      rivers++;
      const extra = b.slice(4);
      expect(['s', 'c']).toContain(extra[extra.length - 1][1]);
      for (const c of extra.slice(0, -1)) expect(['h', 'd']).toContain(c[1]);
    });
    expect(rivers).toBeGreaterThan(0);
  });

  it('Imposter deals one odd hand out, antes up, keeps the secret and settles by vote', () => {
    let settled = 0;
    play('imposter', 40, (g) => {
      const hand = g.hand;
      if (!hand?.imposter) return;
      const same = hand.seats.filter((s) => s.playerId !== hand.imposter).map((s) => s.cards.join());
      expect(new Set(same).size).toBe(1);
      expect(hand.seats.find((s) => s.playerId === hand.imposter)!.cards.join()).not.toBe(same[0]);
      const host = g.players.find((p) => p.deviceId === HOST)!;
      const seen = redactForDevice(g, HOST).hand!;
      if (!hand.result) {
        expect(seen.imposter).toBe(hand.imposter === host.id ? host.id : undefined);
        for (const [voter, suspect] of Object.entries(seen.votes ?? {})) if (voter !== host.id) expect(suspect).toBe('');
      } else if (hand.result.imposter) {
        settled++;
        expect(seen.imposter).toBe(hand.imposter);
        const { caught, id } = hand.result.imposter;
        const winners = Object.keys(hand.result.won);
        const impFolded = hand.seats.find((s) => s.playerId === id)!.folded;
        if (caught || impFolded) expect(winners).not.toContain(id);
        // Got away with it: every pot the imposter is in is theirs alone; a side pot they're not in goes to the others.
        else for (const pot of hand.result.pots) expect(pot.winners).toEqual(pot.eligible.includes(id) ? [id] : pot.eligible);
      }
    });
    expect(settled).toBeGreaterThan(0);
  });

  it('plays Imposter heads-up as plain Hold\'em', () => {
    let g = table('imposter', 1);
    for (let i = 0; i < 5 && !g.hand; i++) {
      const r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (g.wakeAt ?? 0) + 1, rng: seededRng(3) });
      if (r.ok) g = r.game;
    }
    expect(g.hand).toBeTruthy();
    expect(g.hand!.imposter).toBeUndefined();
    expect(g.hand!.variant).toBeUndefined();
  });
});

describe('Crucifix and Circle', { timeout: TABLE_MS }, () => {
  // Crucifix board in dealing order: middle, top, right, bottom, left, outer top, outer right, outer bottom, outer left.
  const cross = h('Ah 9c Kd 3s 8h Qs 7d 4c Jh');
  it('Crucifix plays one line, across or down, never both', () => {
    // Down is Qs 9c Ah 3s 4c; across is Jh 8h Ah Kd 7d. With two hearts in hand, across makes a flush.
    expect(bestHand('crucifix', h('2h 5h'), cross).name).toBe('Flush');
    // Q-J in hand: K from across and Q from down would be a pair of each, but only one line counts.
    expect(bestHand('crucifix', h('Qc 6d'), cross).name).toBe('Pair');
    expect(bestHand('crucifix', h('Tc 5d'), cross).name).toBe('High card');
  });

  it('Circle uses both hole cards and three in a row round the clock', () => {
    // Dealt at 12, 6, 8, 2, 10, 4: so round the clock it's 12 Ah, 2 Kd, 4 Jh, 6 2c, 8 7s, 10 Qs.
    const circle = h('Ah 2c 7s Kd Qs Jh');
    // 10-12-2 (Qs Ah Kd) with JT makes a straight, wrapping past 12.
    expect(bestHand('circle', h('Jc Tc'), circle).name).toBe('Straight');
    // Ace and king aren't next to the jack... Ah Kd Jh is 12-2-4: three in a row, so the jack plays with them.
    expect(bestHand('circle', h('Jd Js'), circle).name).toBe('Three of a kind');
    // Both hole cards must play: a pair in hand plus the board can't be just the board.
    expect(bestHand('circle', h('3c 3d'), circle).best).toEqual(expect.arrayContaining(['3c', '3d']));
    // Jh and Qs sit opposite (4 and 10 o'clock), never in a run together, so no two pair with Q-J.
    expect(bestHand('circle', h('Qc Jc'), circle).name).toBe('Pair');
  });

  it('deals the cross as 5, 2, 2 and the circle as 2, 2, 2', () => {
    for (const [v, sizes] of [
      ['crucifix', [0, 5, 7, 9]],
      ['circle', [0, 2, 4, 6]],
    ] as const) {
      const seen = new Set<number>();
      play(v, 25, (g) => {
        if (g.hand) {
          expect(sizes).toContain(g.hand.board.length);
          seen.add(g.hand.board.length);
        }
      });
      expect(seen.has(sizes[3])).toBe(true);
    }
  });
});

describe('Memory Poker and Bean Stalk', { timeout: TABLE_MS }, () => {
  it('Memory Poker shows 20 cards before every hand, then deals without them and hides them until the end', () => {
    const sets: string[] = [];
    let peeks = 0;
    let lastPeek = -1;
    play('memory', 12, (g) => {
      if (g.memory) {
        expect(g.memory.cards).toHaveLength(20);
        expect(new Set(g.memory.cards).size).toBe(20);
        // Everyone sees them during the look.
        expect(redactForDevice(g, HOST).memory?.cards).toEqual(g.memory.cards);
        if (g.memory.until !== lastPeek) [lastPeek, peeks] = [g.memory.until, peeks + 1];
      }
      const hand = g.hand;
      if (!hand?.removed) return;
      expect(hand.removed).toHaveLength(20);
      const used = [...hand.board, ...hand.seats.flatMap((s) => s.cards), ...hand.deck];
      for (const c of used) expect(hand.removed).not.toContain(c);
      // 32 cards in play, less one burned before each street.
      const burned = hand.board.length === 0 ? 0 : hand.board.length - 2;
      expect(used.length + burned).toBe(32);
      expect(redactForDevice(g, HOST).hand!.removed).toEqual(hand.result ? hand.removed : undefined);
      if (!sets.includes(hand.removed.join())) sets.push(hand.removed.join());
    });
    expect(peeks).toBeGreaterThan(5);
    // A new 20 every hand.
    expect(sets.length).toBeGreaterThan(5);
  });

  it('Bean Stalk deals everyone still in a card of their own on every street', () => {
    let rivers = 0;
    play('beanstalk', 30, (g) => {
      const hand = g.hand;
      if (!hand) return;
      for (const s of hand.seats) if (!s.folded) expect(s.cards).toHaveLength(holeCountAt('beanstalk', hand.board.length));
      if (hand.board.length === 5) rivers++;
    });
    expect(rivers).toBeGreaterThan(0);
    // The best five of all ten: a flush from five hole cards alone.
    expect(bestHand('beanstalk', h('2h 5h 9h Jh Kh'), h('Ac Ad 3s 4c 7d')).name).toBe('Flush');
  });

  it('Bean Stalk has cards for nine players right through the river', () => {
    let g = table('beanstalk', 8);
    const rng = seededRng(5);
    let clock = 0;
    let rivers = 0;
    for (let i = 0; i < 4000 && (g.hands ?? 0) < 6 && g.status === 'playing'; i++) {
      const hand = g.hand;
      const host = g.players.find((p) => p.deviceId === HOST)!;
      const mine = hand?.seats.find((s) => s.playerId === host.id);
      const r =
        hand && !hand.result && hand.toAct === host.id && mine
          ? applyAction(g, { type: 'act', hand: hand.number, seq: hand.seq, move: options(g, hand, mine).canCheck ? 'check' : 'call' }, { deviceId: HOST, now: clock, rng })
          : applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
      if (g.hand && g.hand.board.length === 5) {
        for (const s of g.hand.seats) if (!s.folded) expect(s.cards).toHaveLength(5);
        if (g.hand.seats.filter((s) => !s.folded).length >= 5) rivers++;
      }
    }
    expect(rivers).toBeGreaterThan(0);
  });
});

describe('network input', () => {
  it('accepts a discard and a variant, and nothing else', () => {
    expect(parseAction({ type: 'discard', hand: 3, card: 'Ah' })).toEqual({ type: 'discard', hand: 3, card: 'Ah' });
    expect(parseAction({ type: 'discard', hand: 3, card: 'Zz' })).toBeNull();
    expect(parseAction({ type: 'settings', settings: { variant: 'ghost' } })).toEqual({ type: 'settings', settings: { variant: 'ghost' } });
    expect(parseAction({ type: 'settings', settings: { variant: 'omaha' } })).toBeNull();
    expect(parseAction({ type: 'vote', hand: 2, playerId: 'abc123' })).toEqual({ type: 'vote', hand: 2, playerId: 'abc123' });
    expect(parseAction({ type: 'vote', hand: 2, playerId: '../x' })).toBeNull();
  });
});
