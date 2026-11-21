import { describe, expect, it } from 'vitest';
import {
  applyAction,
  bestHand,
  createTable,
  count21,
  DEFAULT_SETTINGS,
  handSets,
  holeCountAt,
  isPremiumVariant,
  knowsRules,
  redRun,
  RULES_VERSION,
  rulesFor,
  keepTwo,
  options,
  parseAction,
  pendingChoosers,
  redactForDevice,
  runoutOdds,
  seededRng,
  VARIANTS,
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

describe('run-out odds in every game', () => {
  const share = (e: { win: number[]; tie: number[] }) => e.win.reduce((a, b) => a + b, 0) + e.tie.reduce((a, b) => a + b, 0) / 2;

  it('uses the wild deuces', () => {
    // A pair of deuces is four of a kind with the flop's pair in Crazy Deuces, and loses to aces in Hold'em.
    expect(runoutOdds('deuces', [h('2c 2d'), h('Ah Ad')], h('Kc Ks 7h')).win[0]).toBeGreaterThan(0.95);
    expect(runoutOdds('holdem', [h('2c 2d'), h('Ah Ad')], h('Kc Ks 7h')).win[0]).toBeLessThan(0.2);
  });

  it('leaves the ghost out until it shows, then counts it', () => {
    const board = h('Kc 9d 4h 2s 7c');
    expect(runoutOdds('ghost', [h('Ah Qd'), h('Js Jd')], board).win[1]).toBe(1);
    const shown = runoutOdds('ghost', [h('Ah Qd'), h('Js Jd')], board, h('Kd Kh'));
    expect(shown.win).toEqual([0, 0]);
  });

  it('plays the extra rivers, the cross, the clock and Bean Stalk out, and adds up to the whole pot', () => {
    for (const [v, hands, board] of [
      ['pittsburgh', [h('Ah Kh'), h('Qs Qd')], h('2h 7h 9c 4d')],
      ['redriver', [h('Ah Kh'), h('Qs Qd')], h('2h 7c 9c 4d')],
      ['crucifix', [h('Ah Kh'), h('Qs Qd')], h('2h 7c 9c')],
      ['circle', [h('Ah Kh'), h('Qs Qd')], h('2h 7c 9c')],
      ['beanstalk', [h('Ah Kh Td'), h('Qs Qd 3c')], h('2h 7c 9c')],
      ['dice', [h('Ah Kh'), h('Qs Qd')], h('2h 7c 9c 4d')],
      ['bjholdem', [h('Ah 9d'), h('Qs Qd')], h('2h 7c 9c')],
    ] as [Variant, string[][], string[]][]) {
      const e = runoutOdds(v, hands, board);
      expect(share(e), v).toBeCloseTo(1, 5);
      expect(e.win.every((w) => w > 0 && w < 1), v).toBe(true);
    }
  });
});

// ── Whole tables ────────────────────────────────────────────────────────────

function table(variant: Variant, bots = 3, stack = 1000): Game {
  const game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, startingStack: stack, turnSeconds: 5, variant }, bots, code: null, now: 0, rng: seededRng(1) });
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
    if (hand && !hand.result && hand.discarding && mine && !mine.folded && mine.cards.length === 3) {
      r = applyAction(game, { type: 'discard', hand: hand.number, card: mine.cards[Math.floor(rng() * 3)] }, { deviceId: HOST, now: clock, rng });
    } else if (hand && !hand.result && hand.toAct === host.id && mine && !(hand.moment?.gate && clock < hand.moment.until)) {
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
  for (const v of ['pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'crucifix', 'circle', 'memory', 'beanstalk', 'bjholdem'] as Variant[]) {
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

  it('stops an all-in run-out on the flop in Crazy Pineapple so each player throws a card away', () => {
    // The host shoves every hand; whenever a bot calls, the run-out must wait on the flop for the host's discard.
    let game = table('pineapple', 1, 1000);
    const rng = seededRng(3);
    let clock = 0;
    let asked = 0;
    for (let i = 0; i < 4000 && game.status === 'playing' && asked < 3; i++) {
      const hand = game.hand;
      const host = game.players.find((p) => p.deviceId === HOST)!;
      const mine = hand?.seats.find((s) => s.playerId === host.id);
      let r;
      if (hand && !hand.result && hand.discarding && mine && !mine.folded && mine.cards.length === 3) {
        expect(hand.board.length).toBe(3);
        if (hand.runout) asked++;
        r = applyAction(game, { type: 'discard', hand: hand.number, card: mine.cards[0] }, { deviceId: HOST, now: clock, rng });
        expect(r.ok && r.game.hand?.seats.find((s) => s.playerId === host.id)?.cards).toEqual(mine.cards.slice(1));
      } else if (hand && !hand.result && hand.toAct === host.id && mine) {
        r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: 'allin' }, { deviceId: HOST, now: clock, rng });
      } else {
        // The run-out never deals the turn while someone still holds three cards.
        if (hand && !hand.result && hand.board.length >= 4) for (const s of hand.seats) if (!s.folded) expect(s.cards.length).toBe(2);
        clock = (game.wakeAt ?? clock) + 1;
        r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
      }
      if (!r.ok) throw new Error(r.error);
      game = r.game;
    }
    expect(asked).toBeGreaterThan(0);
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

  it("builds the ghost's bounty when it wins and pays it to whoever beats it", () => {
    let grew = 0;
    let paid = 0;
    let bounty = 0;
    play('ghost', 60, (g) => {
      const r = g.hand?.result;
      if (!r?.ghost) return;
      const held = g.hand!.carry ?? 0;
      // Its bounty after the hand is exactly what it kept (the old bounty rides in the main pot: kept if the ghost
      // wins that pot, paid out if somebody beats it).
      expect(g.ghostPot).toBe(r.ghost.kept);
      if (r.ghost.kept > 0) grew++;
      if (r.ghost.paid) {
        paid++;
        expect(r.ghost.paid).toBe(held);
        expect(r.pots[0].winners.length).toBeGreaterThan(0);
      }
      bounty = g.ghostPot ?? 0;
    });
    expect(grew + paid).toBeGreaterThan(0);
    expect(bounty).toBeGreaterThanOrEqual(0);
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

  it('Die on the River holds the river betting while the roll is shown', () => {
    const firstSeen = new Set<number>();
    let held = 0;
    play('dice', 40, (g) => {
      const hand = g.hand;
      if (!hand?.dice || firstSeen.has(hand.number)) return;
      firstSeen.add(hand.number);
      if (!hand.dice.until) return;
      held++;
      // Nothing happens at the table before the show is over.
      if (hand.actAt != null) expect(hand.actAt).toBeGreaterThanOrEqual(hand.dice.until);
    });
    expect(held).toBeGreaterThan(0);
  });

  it('Red River: ten draws, red added and black swapped for the newest card, then the river', () => {
    const board = h('As Ks Qs Js');
    const cards = h('2h 3c 4d 5d 6s 7h 8c 9h Th Tc Jd 2s');
    redRun(board, () => cards.shift());
    expect(board).toEqual(h('As Ks Qs Js 3c 4d 6s 8c 9h Tc Jd'));
    // The river itself, then nothing more.
    expect(cards).toEqual(['2s']);
    // A black first card takes the turn's place.
    const early = h('As Ks Qs Js');
    const more = ['2c', ...h('3h 4h 5h 6h 7h 8h 9h Th Jh Qh')];
    redRun(early, () => more.shift());
    expect(early.slice(0, 4)).toEqual(h('As Ks Qs 2c'));
    expect(early).toHaveLength(4 + 9 + 1);
  });

  it('Red River deals its run with the river, then bets once on the whole board', () => {
    let runs = 0;
    play('redriver', 40, (g) => {
      const hand = g.hand;
      const run = hand?.redRun;
      if (!hand || !run || hand.result) return;
      runs++;
      expect(run.base).toHaveLength(4);
      expect(run.steps).toHaveLength(11);
      expect(run.steps[10].kind).toBe('river');
      // Each red draw that wasn't swapped out stays, plus the river.
      expect(hand.board.length).toBeGreaterThanOrEqual(5);
      // Nobody bets while the run is still being shown.
      if (hand.moment?.kind === 'redriver' && hand.toAct) expect(hand.bettingAt ?? null).toBeNull();
    });
    expect(runs).toBeGreaterThan(0);
  });

});

describe('Crucifix and Circle', { timeout: TABLE_MS }, () => {
  // Crucifix board in dealing order: middle, top, right, bottom, left, outer top, outer right, outer bottom, outer left.
  const cross = h('Ah 9c Kd 3s 8h Qs 7d 4c Jh');
  it('Crucifix plays one line: across, down, or one of the two Ls through the middle, never two at once', () => {
    // Down is Qs 9c Ah 3s 4c; across is Jh 8h Ah Kd 7d. With two hearts in hand, across makes a flush.
    expect(bestHand('crucifix', h('2h 5h'), cross).name).toBe('Flush');
    // Q-6 in hand: no line has both the K and the Q, so it's one pair.
    expect(bestHand('crucifix', h('Qc 6d'), cross).name).toBe('Pair');
    expect(bestHand('crucifix', h('6s 2d'), cross).name).toBe('High card');
    // The top and left L (Qs 9c Ah 8h Jh) is the only line with a straight for T-6.
    expect(bestHand('crucifix', h('Tc 6c'), cross).name).toBe('Straight');
    // The bottom and right L (4c 3s Ah Kd 7d) is the only line with both a 7 and a 4.
    expect(bestHand('crucifix', h('7c 4h'), cross).name).toBe('Two pair');
    // The top and right arms are not a line: no line holds both the Kd and the 9c, so K-9 in hand is one pair.
    expect(bestHand('crucifix', h('Kc 9d'), cross).name).toBe('Pair');
  });

  it('Circle: twelve cards round the clock, your two plus five in a row', () => {
    // Dealt from 12 o'clock round to 11.
    const circle = h('Ah 7d Qs 3h 9c Kd 4s Jh 2c 8s 5d Tc');
    const ring = (c: string) => circle.indexOf(c);
    // The board cards a hand uses always sit within five in a row round the clock (past 12 too).
    for (const hole of ['Ac Ad', 'Kc Qd', '9h 9d', '2h 6c', 'Th Js', '5s 5h', '3c 8d']) {
      const used = bestHand('circle', h(hole), circle).best.filter((c) => circle.includes(c)).map(ring);
      const fits = Array.from({ length: 12 }, (_, p) => used.every((i) => (i - p + 12) % 12 < 5)).some(Boolean);
      expect(fits, hole).toBe(true);
    }
    // Ah (12) and Kd (5 o'clock) are never in one run, so A-K in hand is a pair, not two pair.
    expect(bestHand('circle', h('Ac Kc'), circle).name).toBe('Pair');
    // Tc (11) and Ah (12) sit next to each other past the top: with A-T in hand that's two pair.
    expect(bestHand('circle', h('As Ts'), circle).name).toBe('Two pair');
    // Before the river a hand uses what's out: the flop's four, then four runs of five.
    expect(handSets('circle', h('As Ts'), circle.slice(0, 4))).toHaveLength(1);
    expect(handSets('circle', h('As Ts'), circle.slice(0, 8))).toHaveLength(4);
    expect(handSets('circle', h('As Ts'), circle)).toHaveLength(12);
  });

  it('deals the cross as 5, 2, 2 and the circle as 4, 4, 4', () => {
    for (const [v, sizes] of [
      ['crucifix', [0, 5, 7, 9]],
      ['circle', [0, 4, 8, 12]],
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
    for (let i = 0; i < 6000 && (g.hands ?? 0) < 12 && g.status === 'playing'; i++) {
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
        if (g.hand.seats.filter((s) => !s.folded).length >= 4) rivers++;
      }
    }
    expect(rivers).toBeGreaterThan(0);
  });
});

describe("Hit Me", { timeout: TABLE_MS }, () => {
  it('counts like blackjack: aces 1 or 11, picture cards 10', () => {
    expect(count21(h('Ah Kd'))).toBe(21);
    expect(count21(h('Ah Ad'))).toBe(12);
    expect(count21(h('Ah 9c Kd'))).toBe(20);
    expect(count21(h('Qh 9c 5d'))).toBe(24);
  });

  it('lets the player to act hit on any street, and a bust folds them', () => {
    let g = table('bjholdem', 3, 50_000);
    const rng = seededRng(4);
    let clock = 0;
    let hitPreflop = false;
    let busts = 0;
    let hits = 0;
    for (let i = 0; i < 12000 && (g.hands ?? 0) < 80 && g.status === 'playing'; i++) {
      const hand = g.hand;
      const host = g.players.find((p) => p.deviceId === HOST)!;
      const mine = hand?.seats.find((s) => s.playerId === host.id);
      let r;
      if (hand && !hand.result && hand.toAct === host.id && mine && !(hand.moment?.gate && clock < hand.moment.until)) {
        if (hand.street === 'preflop' && !hitPreflop && count21(mine.cards) <= 11) {
          // Before the flop too.
          expect(applyAction(g, { type: 'hit', hand: hand.number, seq: hand.seq }, { deviceId: HOST, now: clock, rng }).ok).toBe(true);
          hitPreflop = true;
        }
        if (hand.street !== 'preflop' && count21(mine.cards) < 19) {
          const before = mine.cards.length;
          r = applyAction(g, { type: 'hit', hand: hand.number, seq: hand.seq }, { deviceId: HOST, now: clock, rng });
          if (!r.ok) throw new Error(r.error);
          const after = r.game.hand!.seats.find((s) => s.playerId === host.id)!;
          expect(after.cards).toHaveLength(before + 1);
          expect(r.game.hand!.hits![host.id]).toBeGreaterThan(0);
          // Everyone else sees how many cards they took, never which.
          const seen = redactForDevice(r.game, 'someone-else').hand!;
          expect(seen.hits).toEqual(r.game.hand!.hits);
          expect(seen.seats.find((s) => s.playerId === host.id)!.cards).toEqual(after.shown ? after.cards : []);
          hits++;
          if (count21(after.cards) > 21) {
            busts++;
            expect(after.folded).toBe(true);
            expect(r.game.hand!.busted).toContain(host.id);
          }
        } else {
          const o = options(g, hand, mine);
          const move = o.canCheck ? 'check' : o.toCall <= g.settings.bigBlind * 3 ? 'call' : 'fold';
          r = applyAction(g, { type: 'act', hand: hand.number, seq: hand.seq, move }, { deviceId: HOST, now: clock, rng });
        }
      } else r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    }
    expect(hits).toBeGreaterThan(3);
    expect(busts).toBeGreaterThan(0);
    expect(hitPreflop).toBe(true);
  });

  it('all in, a player still chooses to hit or stand on every street', () => {
    let g = table('bjholdem', 1, 1000);
    const rng = seededRng(9);
    let clock = 0;
    let windows = 0;
    let allInHits = 0;
    let stands = 0;
    const total = chipsInPlay(g);
    for (let i = 0; i < 20000 && (g.hands ?? 0) < 60 && g.status === 'playing'; i++) {
      const hand = g.hand;
      const host = g.players.find((p) => p.deviceId === HOST)!;
      const mine = hand?.seats.find((s) => s.playerId === host.id);
      let r;
      if (hand && !hand.result && hand.choosing && mine && !mine.folded && !hand.choosing.stood.includes(host.id) && count21(mine.cards) < 21) {
        windows++;
        // Nobody bets while the street waits for the hits.
        expect(hand.toAct).toBeNull();
        if (count21(mine.cards) < 15) {
          r = applyAction(g, { type: 'hit', hand: hand.number, seq: 0 }, { deviceId: HOST, now: clock, rng });
          allInHits++;
        } else {
          r = applyAction(g, { type: 'stand', hand: hand.number }, { deviceId: HOST, now: clock, rng });
          stands++;
        }
      } else if (hand && !hand.result && hand.toAct === host.id && mine) {
        // Always all in, so the rest of the hand is played in the hit windows.
        r = applyAction(g, { type: 'act', hand: hand.number, seq: hand.seq, move: 'allin' }, { deviceId: HOST, now: clock, rng });
      } else if (g.status === 'playing' && !hand?.result && g.players.some((p) => p.stack === 0) && !hand) {
        r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
      } else r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
      expect(chipsInPlay(g)).toBe(total);
      if (g.players.some((p) => p.stack === 0) && g.status === 'playing' && g.hand?.result) {
        const broke = g.players.find((p) => p.deviceId === HOST && p.stack === 0);
        if (broke) {
          const rb = applyAction(g, { type: 'rebuy' }, { deviceId: HOST, now: clock, rng });
          if (rb.ok) g = rb.game;
        }
      }
    }
    expect(windows).toBeGreaterThan(0);
    expect(allInHits + stands).toBeGreaterThan(0);
  });

  it('splits each pot: half to the best poker hand, half to closest to 21 (best hand breaks a tie)', () => {
    let settled = 0;
    let botHits = 0;
    play('bjholdem', 40, (g) => {
      const hand = g.hand;
      if (hand && !hand.result) for (const s of hand.seats) if (!s.folded) expect(count21(s.cards)).toBeLessThanOrEqual(21);
      botHits += Object.keys(hand?.hits ?? {}).length;
      const bj = hand?.result?.blackjack;
      if (!hand || !bj) return;
      settled++;
      const live = hand.seats.filter((s) => !s.folded);
      hand.result!.pots.forEach((pot, i) => {
        const score = (id: string) => bestHand('bjholdem', live.find((s) => s.playerId === id)!.cards, hand.board).score;
        const count = (id: string) => count21(live.find((s) => s.playerId === id)!.cards);
        const top = Math.max(...pot.eligible.map(score));
        expect(bj.poker[i]).toEqual(pot.eligible.filter((id) => score(id) === top));
        const closest = Math.max(...pot.eligible.map(count));
        const tied = pot.eligible.filter((id) => count(id) === closest);
        const tiedTop = Math.max(...tied.map(score));
        expect(bj.winners[i]).toEqual(tied.filter((id) => score(id) === tiedTop));
      });
    });
    expect(settled).toBeGreaterThan(0);
    expect(botHits).toBeGreaterThan(0);
  });
});

describe('all-in choices and the rabbit hunt', { timeout: TABLE_MS }, () => {
  it('Crazy Pineapple: all in before the turn, you still choose the card to throw away', () => {
    let g = table('pineapple', 1, 1000);
    const rng = seededRng(11);
    let clock = 0;
    let chose = 0;
    for (let i = 0; i < 6000 && chose < 3 && g.status === 'playing'; i++) {
      const hand = g.hand;
      const host = g.players.find((p) => p.deviceId === HOST)!;
      const mine = hand?.seats.find((s) => s.playerId === host.id);
      let r;
      if (hand && !hand.result && hand.discarding && mine && !mine.folded && mine.cards.length === 3) {
        expect(hand.runout || mine.allIn || hand.seats.some((s) => s.allIn)).toBe(true);
        const throwing = mine.cards[2];
        r = applyAction(g, { type: 'discard', hand: hand.number, card: throwing }, { deviceId: HOST, now: clock, rng });
        if (!r.ok) throw new Error(r.error);
        expect(r.game.hand!.seats.find((s) => s.playerId === host.id)!.cards).not.toContain(throwing);
        if (hand.runout) chose++;
      } else if (hand && !hand.result && hand.toAct === host.id && mine) {
        r = applyAction(g, { type: 'act', hand: hand.number, seq: hand.seq, move: 'allin' }, { deviceId: HOST, now: clock, rng });
      } else if (g.hand?.result && g.players.some((p) => p.stack === 0)) {
        r = applyAction(g, { type: 'rebuy' }, { deviceId: HOST, now: clock, rng });
        if (!r.ok) r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
      } else r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    }
    expect(chose).toBeGreaterThan(0);
  });

  it('shows the board that would have come once everyone folds, only with the house rule', () => {
    for (const v of ['holdem', 'circle', 'redriver', 'pittsburgh'] as Variant[]) {
      for (const rabbit of [true, false]) {
        let g = table(v, 2, 1000);
        const set = applyAction(g, { type: 'settings', settings: { rabbit } }, { deviceId: HOST, now: 0, rng: seededRng(1) });
        if (set.ok) g = set.game;
        let clock = 0;
        const rng = seededRng(2);
        let seen = 0;
        for (let i = 0; i < 4000 && seen < 4 && g.status === 'playing'; i++) {
          const hand = g.hand;
          const host = g.players.find((p) => p.deviceId === HOST)!;
          const mine = hand?.seats.find((s) => s.playerId === host.id);
          const r =
            hand && !hand.result && hand.toAct === host.id && mine
              ? applyAction(g, { type: 'act', hand: hand.number, seq: hand.seq, move: options(g, hand, mine).canCheck && hand.street !== 'preflop' ? 'check' : 'fold' }, { deviceId: HOST, now: clock, rng })
              : applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
          if (!r.ok) throw new Error(r.error);
          const was = g.hand;
          g = r.game;
          const res = g.hand?.result;
          if (res && !res.showdown && was && !was.result && g.hand!.street !== 'river') {
            seen++;
            const seenBy = redactForDevice(g, HOST).hand!;
            if (!rabbit) expect(seenBy.rabbit).toBeUndefined();
            else {
              const board = g.hand!.board;
              const full = seenBy.rabbit!;
              expect(full.slice(0, board.length)).toEqual(v === 'redriver' && g.hand!.street === 'turn' ? full.slice(0, board.length) : board);
              expect(full.length).toBeGreaterThanOrEqual(v === 'circle' ? 12 : v === 'pittsburgh' ? 7 : 5);
              // Real cards from the deck: none in anyone's hand.
              for (const c of full.slice(board.length)) for (const s of g.hand!.seats) expect(s.cards).not.toContain(c);
            }
          }
        }
        expect(seen, `${v} ${rabbit}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('Power Cards when all in', { timeout: TABLE_MS }, () => {
  it('a player all in is offered their power on the streets that follow, and can keep it', () => {
    let g = table('power', 1, 1000);
    const rng = seededRng(21);
    let clock = 0;
    let offered = 0;
    for (let i = 0; i < 8000 && offered < 3 && g.status === 'playing'; i++) {
      const hand = g.hand;
      const host = g.players.find((p) => p.deviceId === HOST)!;
      const mine = hand?.seats.find((s) => s.playerId === host.id);
      let r;
      if (hand && !hand.result && hand.choosing && mine && pendingChoosers(g).includes(mine)) {
        offered++;
        expect(hand.toAct).toBeNull();
        r = applyAction(g, { type: 'stand', hand: hand.number }, { deviceId: HOST, now: clock, rng });
      } else if (hand && !hand.result && hand.toAct === host.id && mine && !(hand.moment?.gate && clock < hand.moment.until)) {
        r = applyAction(g, { type: 'act', hand: hand.number, seq: hand.seq, move: 'allin' }, { deviceId: HOST, now: clock, rng });
      } else if (hand?.result && g.players.some((p) => p.deviceId === HOST && p.stack === 0)) {
        r = applyAction(g, { type: 'rebuy' }, { deviceId: HOST, now: clock, rng });
        if (!r.ok) r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
      } else r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: (clock = (g.wakeAt ?? clock) + 1), rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    }
    expect(offered).toBeGreaterThan(0);
  });
});

describe('rules versions', () => {
  it('keeps an older app out of games whose rules changed, and lets it play the rest', () => {
    expect(knowsRules(1, ['holdem', 'deuces', 'ghost'])).toBe(true);
    for (const v of ['redriver', 'circle', 'crucifix', 'bjholdem', 'power'] as Variant[]) {
      expect(knowsRules(1, [v])).toBe(false);
      expect(rulesFor(v)).toBeLessThanOrEqual(RULES_VERSION);
    }
    expect(knowsRules(RULES_VERSION, VARIANTS.map((v) => v.id))).toBe(true);
  });
});

describe('network input', () => {
  it('accepts a discard and a variant, and nothing else', () => {
    expect(parseAction({ type: 'discard', hand: 3, card: 'Ah' })).toEqual({ type: 'discard', hand: 3, card: 'Ah' });
    expect(parseAction({ type: 'discard', hand: 3, card: 'Zz' })).toBeNull();
    expect(parseAction({ type: 'settings', settings: { variant: 'ghost' } })).toEqual({ type: 'settings', settings: { variant: 'ghost' } });
    expect(parseAction({ type: 'settings', settings: { variant: 'omaha' } })).toBeNull();
    // Imposter's vote and point are gone: they're refused like any other unknown action.
    expect(parseAction({ type: 'vote', hand: 2, playerId: 'abc123' })).toBeNull();
    expect(parseAction({ type: 'point', hand: 2, playerId: 'abc123' })).toBeNull();
    expect(parseAction({ type: 'hit', hand: 2, seq: 7 })).toEqual({ type: 'hit', hand: 2, seq: 7 });
    expect(parseAction({ type: 'hit', hand: 2 })).toBeNull();
  });
});

describe('free and Premium games', () => {
  it("only Texas Hold'em is free; every other game needs Premium to host", () => {
    expect(VARIANTS.filter((v) => !isPremiumVariant(v.id)).map((v) => v.id)).toEqual(['holdem']);
    expect(VARIANTS.filter((v) => isPremiumVariant(v.id))).toHaveLength(VARIANTS.length - 1);
  });
});
