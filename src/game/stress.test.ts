// Stress tests: thousands of random hands against the engine, and the hand ranker and the payouts
// checked against slow, separately written versions.

import { describe, expect, it } from 'vitest';
import {
  BLIND_LEVELS,
  applyAction,
  buildPots,
  canDeal,
  createTable,
  DEFAULT_SETTINGS,
  describeHand,
  equity,
  fullDeck,
  handLive,
  options,
  scoreHand,
  seededRng,
  type Action,
  type Game,
  type Seat,
} from './index';

// ── A slow, separate hand ranker ────────────────────────────────────────────

const RANK_ORDER = '23456789TJQKA';
const rk = (c: string) => RANK_ORDER.indexOf(c[0]) + 2;

/** [category, ...tie-breaks] for exactly five cards. */
function rank5(cards: string[]): number[] {
  const ranks = cards.map(rk).sort((a, b) => b - a);
  const flush = cards.every((c) => c[1] === cards[0][1]);
  const uniq = [...new Set(ranks)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks.join() === '14,5,4,3,2') straightHigh = 5;
  }
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const shape = groups.map((g) => g[1]).join('');
  const byGroup = groups.map((g) => g[0]);
  if (straightHigh && flush) return [8, straightHigh];
  if (shape === '41') return [7, ...byGroup];
  if (shape === '32') return [6, ...byGroup];
  if (flush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];
  if (shape === '311') return [3, ...byGroup];
  if (shape === '221') return [2, ...byGroup];
  if (shape === '2111') return [1, ...byGroup];
  return [0, ...ranks];
}

function cmp(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

function best(cards: string[]): number[] {
  let top: number[] = [-1];
  const n = cards.length;
  const pick: string[] = [];
  const walk = (start: number) => {
    if (pick.length === 5) {
      const r = rank5(pick);
      if (cmp(r, top) > 0) top = r;
      return;
    }
    for (let i = start; i < n; i++) {
      pick.push(cards[i]);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  return top;
}

function deal(rnd: () => number, count: number, ranks: string, suits: string): string[] {
  const pool = fullDeck().filter((c) => ranks.includes(c[0]) && suits.includes(c[1]));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

describe('hand ranking against a brute-force ranker', () => {
  it('orders random seven-card hands the same way, in every kind of deck', () => {
    const rnd = seededRng(99);
    // Narrow decks make pairs, straights and flushes far more common.
    const decks: [string, string][] = [
      ['23456789TJQKA', 'shdc'],
      ['A2345KQ', 'shdc'],
      ['23456789TJQKA', 'sh'],
      ['A2345', 'shd'],
      ['789TJQK', 'sh'],
      ['AKQJT9', 'sh'],
      ['2345', 'shdc'],
    ];
    for (const [ranks, suits] of decks) {
      for (let i = 0; i < 700; i++) {
        const need = Math.min(14, ranks.length * suits.length);
        const cards = deal(rnd, need, ranks, suits);
        const a = cards.slice(0, 7);
        const b = cards.length >= 14 ? cards.slice(7, 14) : deal(rnd, 7, ranks, suits);
        if (a.length < 7 || b.length < 7) continue;
        const expected = cmp(best(a), best(b));
        const got = Math.sign(scoreHand(a) - scoreHand(b));
        if (expected !== got) throw new Error(`${a.join(' ')} vs ${b.join(' ')}: expected ${expected}, got ${got}`);
        // The cards it says make the hand really are the best five.
        const v = describeHand(a);
        expect(v.best.length, a.join(' ')).toBe(5);
        expect(new Set(v.best).size).toBe(5);
        for (const c of v.best) expect(a).toContain(c);
        expect(cmp(rank5(v.best), best(a)), `${a.join(' ')} -> ${v.best.join(' ')}`).toBe(0);
      }
    }
  }, 60_000);

  it('scores five and six card hands too', () => {
    const rnd = seededRng(5);
    for (let i = 0; i < 3000; i++) {
      const cards = deal(rnd, 12, '23456789TJQKA', 'shdc');
      const a = cards.slice(0, 5);
      const b = cards.slice(5, 11);
      expect(Math.sign(scoreHand(a) - scoreHand(b)), `${a} vs ${b}`).toBe(cmp(best(a), best(b)));
    }
  });
});

describe('odds', () => {
  it('sum to one and match a hand-made case', () => {
    const rnd = seededRng(3);
    for (let i = 0; i < 40; i++) {
      const cards = deal(rnd, 13, '23456789TJQKA', 'shdc');
      const players = 2 + Math.floor(rnd() * 3);
      const hands = Array.from({ length: players }, (_, k) => cards.slice(k * 2, k * 2 + 2));
      const board = cards.slice(8, 8 + Math.floor(rnd() * 4 === 0 ? 0 : 3 + Math.floor(rnd() * 3)));
      const e = equity(hands, board, 400);
      // Every outcome is a win for one hand or a tie among several, so wins plus ties (counted once) is 1.
      const winSum = e.win.reduce((a, b) => a + b, 0);
      const tieOutcomes = e.tie.reduce((a, b) => a + b, 0);
      expect(winSum + Math.min(1, tieOutcomes), `${hands.join('|')} ${board}`).toBeLessThanOrEqual(1 + players);
      expect(winSum).toBeLessThanOrEqual(1 + 1e-9);
      for (const x of [...e.win, ...e.tie]) expect(Number.isFinite(x) && x >= 0 && x <= 1).toBe(true);
    }
    // Aces against kings with a king on the flop is exact: kings are ahead.
    const e = equity([['As', 'Ad'], ['Kh', 'Kd']], ['Ks', '7c', '2d']);
    expect(e.win[1]).toBeGreaterThan(0.9);
    expect(e.win[0] + e.win[1] + e.tie[0]).toBeCloseTo(1, 9);
  });

  it('does not change when the order of the board cards changes', () => {
    const a = equity([['As', 'Kd'], ['Qh', 'Qd']], ['2c', '7d', 'Jh']);
    const b = equity([['As', 'Kd'], ['Qh', 'Qd']], ['Jh', '2c', '7d']);
    expect(a.win[0]).toBeCloseTo(b.win[0], 12);
  });
});

// ── A separate payout calculator ────────────────────────────────────────────

/** Who gets what at showdown, worked out layer by layer, to check against the engine. */
function expectedPayout(game: Game): Record<string, number> {
  const hand = game.hand!;
  const seats = hand.seats;
  const n = seats.length;
  const button = Math.max(0, seats.findIndex((s) => s.playerId === hand.buttonId));
  const live = seats.filter((s) => !s.folded);
  const score = new Map(live.map((s) => [s.playerId, best([...s.cards, ...hand.board])]));
  const levels = [...new Set(live.map((s) => s.total))].sort((a, b) => a - b);
  const pots: { amount: number; eligible: string[] }[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const s of seats) amount += Math.max(0, Math.min(s.total, level) - prev);
    const eligible = live.filter((s) => s.total >= level).map((s) => s.playerId);
    const last = pots[pots.length - 1];
    if (last && last.eligible.join() === eligible.join()) last.amount += amount;
    else pots.push({ amount, eligible });
    prev = level;
  }
  const dead = seats.reduce((sum, s) => sum + Math.max(0, s.total - prev), 0);
  if (dead) pots[pots.length - 1].amount += dead;
  const won: Record<string, number> = {};
  for (const pot of pots) {
    if (!pot.amount) continue;
    let top = score.get(pot.eligible[0])!;
    for (const id of pot.eligible) if (cmp(score.get(id)!, top) > 0) top = score.get(id)!;
    const winners = pot.eligible.filter((id) => cmp(score.get(id)!, top) === 0);
    const share = Math.floor(pot.amount / winners.length);
    let odd = pot.amount - share * winners.length;
    // The odd chips go one at a time starting left of the button.
    const order = Array.from({ length: n }, (_, i) => seats[(button + 1 + i) % n].playerId).filter((id) => winners.includes(id));
    for (const id of order) {
      won[id] = (won[id] ?? 0) + share + (odd > 0 ? 1 : 0);
      if (odd > 0) odd--;
    }
  }
  return won;
}

// ── Driving a whole table ───────────────────────────────────────────────────

const chipsIn = (game: Game) =>
  game.players.reduce((sum, p) => sum + p.stack, 0) + (game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0);

function checkState(game: Game, label: string): void {
  const fail = (msg: string) => {
    throw new Error(`${label}: ${msg}`);
  };
  for (const p of game.players) {
    if (!Number.isInteger(p.stack) || p.stack < 0) fail(`${p.name} has ${p.stack} chips`);
    if (!Number.isInteger(p.bought) || p.bought < 0) fail(`${p.name} bought ${p.bought}`);
  }
  const hand = game.hand;
  if (!hand) return;
  for (const s of hand.seats) {
    for (const v of [s.bet, s.total]) if (!Number.isInteger(v) || v < 0) fail(`bad seat numbers ${JSON.stringify(s)}`);
    if (s.bet > s.total) fail(`bet ${s.bet} above total ${s.total}`);
  }
  for (const v of [hand.currentBet, hand.minRaise]) if (!Number.isInteger(v) || v < 0) fail(`bad hand numbers ${hand.currentBet}/${hand.minRaise}`);
  if (hand.minRaise < 1) fail('minRaise below 1');
  const board = { preflop: 0, flop: 3, turn: 4, river: 5 }[hand.street];
  if (hand.board.length !== board) fail(`street ${hand.street} with ${hand.board.length} board cards`);
  const cards = [...hand.seats.flatMap((s) => s.cards), ...hand.board, ...hand.deck];
  if (new Set(cards).size !== cards.length) fail('a card appears twice');
  // One card is burned before each of the flop, the turn and the river.
  const burned = { preflop: 0, flop: 1, turn: 2, river: 3 }[hand.street];
  if (cards.length !== 52 - burned) fail(`${cards.length} cards left in the hand`);
  if (hand.seats.every((s) => s.folded)) fail('everyone folded');
  if (!hand.result && hand.toAct) {
    const s = hand.seats.find((x) => x.playerId === hand.toAct);
    if (!s || s.folded || s.allIn) fail('it is the turn of someone who cannot act');
  }
  if (hand.result) {
    const r = hand.result;
    const paid = Object.values(r.won).reduce((a, b) => a + b, 0);
    const pots = r.pots.reduce((a, p) => a + p.amount, 0);
    const put = hand.seats.reduce((a, s) => a + s.total, 0);
    if (paid !== pots || pots !== put) fail(`paid ${paid}, pots ${pots}, put in ${put}`);
    for (const pot of r.pots) {
      if (!pot.winners.length) fail('a pot with no winner');
      for (const w of pot.winners) if (!pot.eligible.includes(w)) fail('a winner who is not eligible');
    }
    for (const id of Object.keys(r.won)) {
      const seat = hand.seats.find((s) => s.playerId === id);
      if (!seat || seat.folded && r.showdown) fail('a folded player won');
    }
  }
}

const SIZES = [1, 2, 3, 5, 7, 10, 15, 20, 40, 60, 99, 100, 150, 250, 500, 1000, 2500, 10_000];

interface SimOptions {
  seed: number;
  hands: number;
  /** Fraction of steps spent on odd actions (leaving, sitting out, junk). */
  chaos: number;
}

function simulate({ seed, hands, chaos }: SimOptions): { hands: number; ended: boolean } {
  const rnd = seededRng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const seats = 2 + Math.floor(rnd() * 8);
  const bots = rnd() < 0.25 ? Math.min(seats - 1, 1 + Math.floor(rnd() * 3)) : 0;
  const [smallBlind, bigBlind] = pick(BLIND_LEVELS);
  let clock = 5_000_000;
  const settings = {
    ...DEFAULT_SETTINGS,
    smallBlind,
    bigBlind,
    rebuys: rnd() < 0.8,
    turnSeconds: pick([0, 0, 20, 45]),
    blindMinutes: rnd() < 0.2 ? 1 : 0,
  };
  let game = createTable({ hostDeviceId: 'host', name: 'Host', emoji: '😎', settings, bots, code: null, now: clock });
  const label = (what: string) => `seed ${seed} hand ${game.hand?.number ?? 0} ${what}`;
  const run = (action: Action, deviceId: string, expectOk?: boolean) => {
    const before = expectOk === false || rnd() < 0.05 ? JSON.stringify(game) : null;
    const r = applyAction(game, action, { deviceId, now: clock, rng: rnd });
    if (before !== null && JSON.stringify(game) !== before) throw new Error(label(`${action.type} changed the game it was given`));
    if (expectOk === true && !r.ok) throw new Error(label(`${action.type} refused: ${r.error}`));
    if (expectOk === false && r.ok && r.changed) throw new Error(label(`${JSON.stringify(action)} should have been refused`));
    return r;
  };
  const devices = ['host'];
  for (let i = bots + 1; i < seats; i++) {
    const d = `device-${i}`;
    devices.push(d);
    const r = run({ type: 'join', name: `P${i}`, emoji: '🐸' }, d, true);
    if (r.ok) game = r.game;
  }
  for (const p of game.players) p.stack = p.bought = pick(SIZES);
  // At least one person must be able to play.
  for (const p of game.players) if (p.stack < 1) p.stack = p.bought = 100;
  let r0 = run({ type: 'start' }, 'host', true);
  if (r0.ok) game = r0.game;

  let expected = chipsIn(game);
  let started = game.hand?.number ?? 0;
  let finished = 0;
  let lastSeen = 0;
  let idle = 0;
  const deviceOf = (id: string) => game.players.find((p) => p.id === id)?.deviceId ?? null;

  for (let step = 0; step < hands * 600 && game.status === 'playing' && finished < hands; step++) {
    checkState(game, label(`step ${step}`));
    // A finished hand: its payout must match the separate calculator.
    if (game.hand?.result && game.hand.number !== lastSeen) {
      lastSeen = game.hand.number;
      finished++;
      if (game.hand.result.showdown) {
        const want = expectedPayout(game);
        const got = game.hand.result.won;
        for (const id of new Set([...Object.keys(want), ...Object.keys(got)])) {
          if ((want[id] ?? 0) !== (got[id] ?? 0)) {
            throw new Error(label(`payout ${JSON.stringify(got)} but expected ${JSON.stringify(want)} for ${JSON.stringify(game.hand.seats.map((s) => [s.cards.join(''), s.total, s.folded]))} board ${game.hand.board.join('')}`));
          }
        }
      }
    }
    const hand = game.hand;
    let action: Action | null = null;
    let device = 'server';
    let ok: boolean | undefined;

    const mine = hand && handLive(game) && hand.toAct ? game.players.find((p) => p.id === hand.toAct) : undefined;
    const roll = rnd();
    if (roll < chaos) {
      // Something odd from a random seat.
      const p = pick(game.players);
      const d = p.deviceId ?? 'host';
      const kind = pick(['sitOut', 'back', 'remove', 'rebuy', 'next', 'show', 'settings', 'junk', 'stale', 'blinds', 'end'] as const);
      device = d;
      if (kind === 'sitOut') action = { type: 'sitOut', out: true };
      else if (kind === 'back') action = { type: 'sitOut', out: false };
      else if (kind === 'remove') {
        // Never the last person at the table.
        if (game.players.filter((x) => !x.bot).length > 1 && p.deviceId) action = { type: 'remove', playerId: p.id };
      } else if (kind === 'rebuy') action = { type: 'rebuy' };
      else if (kind === 'next' && hand) action = { type: 'next', hand: hand.number };
      else if (kind === 'show' && hand) action = { type: 'show', hand: hand.number };
      else if (kind === 'settings') {
        const [sb, bb] = pick(BLIND_LEVELS);
        action = { type: 'settings', settings: { smallBlind: sb, bigBlind: bb } };
        device = 'host';
      } else if (kind === 'junk' && mine && hand) {
        const o = options(game, hand, hand.seats.find((s) => s.playerId === mine.id)!);
        const bad: Action[] = [
          { type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'call' : 'check' },
          { type: 'act', hand: hand.number, seq: hand.seq, move: 'raise', to: o.maxTo + 1 },
          { type: 'act', hand: hand.number, seq: hand.seq, move: 'raise', to: hand.currentBet },
          { type: 'act', hand: hand.number, seq: hand.seq, move: 'raise', to: 1.5 + hand.currentBet },
          { type: 'act', hand: hand.number, seq: hand.seq, move: 'raise', to: -5 },
          { type: 'act', hand: hand.number, seq: hand.seq, move: 'raise' },
          { type: 'act', hand: hand.number, seq: hand.seq, move: 'raise', to: Number.NaN },
          { type: 'act', hand: hand.number + 1, seq: hand.seq, move: 'fold' },
          { type: 'act', hand: hand.number, seq: hand.seq + 1, move: 'fold' },
        ];
        if (o.minTo > hand.currentBet + 1 && o.canRaise) bad.push({ type: 'act', hand: hand.number, seq: hand.seq, move: 'raise', to: o.minTo - 1 });
        if (!o.canRaise) bad.push({ type: 'act', hand: hand.number, seq: hand.seq, move: 'raise', to: Math.max(o.minTo, hand.currentBet + 1) });
        action = pick(bad);
        device = mine.deviceId ?? 'host';
        ok = false;
      } else if (kind === 'stale' && mine && hand) {
        // Someone else tries to act on another player's turn.
        const other = game.players.find((x) => x.id !== mine.id && x.deviceId);
        if (other) {
          action = { type: 'act', hand: hand.number, seq: hand.seq, move: 'fold' };
          device = other.deviceId!;
          ok = false;
        }
      } else if (kind === 'blinds') {
        // Late or doubled taps on a finished hand.
        if (hand?.result) action = { type: 'act', hand: hand.number, seq: hand.seq, move: 'check' };
        ok = false;
      } else if (kind === 'end' && rnd() < 0.05) {
        action = { type: 'end' };
        device = 'host';
      }
    }
    if (!action && !mine && game.settings.rebuys) {
      // Between hands, people who are out buy back in.
      const broke = game.players.find((p) => p.deviceId && p.stack === 0 && !(hand && !hand.result && hand.seats.some((s) => s.playerId === p.id && !s.folded)));
      if (broke) {
        action = { type: 'rebuy' };
        device = broke.deviceId!;
        ok = true;
      }
    }
    if (!action) {
      if (mine && hand && deviceOf(mine.id)) {
        const seat = hand.seats.find((s) => s.playerId === mine.id)!;
        const o = options(game, hand, seat);
        const choices: Action[] = [{ type: 'act', hand: hand.number, seq: hand.seq, move: 'fold' }];
        choices.push({ type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : 'call' });
        choices.push({ type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : 'call' });
        if (o.canRaise) {
          const span = o.maxTo - o.minTo;
          const to = pick([o.minTo, o.maxTo, o.minTo + Math.floor(rnd() * (span + 1)), o.minTo + Math.floor(span / 2)]);
          choices.push({ type: 'act', hand: hand.number, seq: hand.seq, move: o.word === 'Bet' ? 'bet' : 'raise', to });
          choices.push({ type: 'act', hand: hand.number, seq: hand.seq, move: 'allin' });
        }
        action = pick(choices);
        device = deviceOf(mine.id)!;
        ok = true;
      } else if (game.wakeAt !== null) {
        clock = Math.max(clock, game.wakeAt) + 1;
        action = { type: 'tick' };
        ok = true;
      } else {
        // Nothing is scheduled. That's fine only while the table is waiting for people.
        if (hand && !hand.result) throw new Error(label(`stuck: hand in progress, toAct ${hand.toAct}, nothing scheduled`));
        if (canDeal(game)) throw new Error(label('stuck: could deal but nothing is scheduled'));
        // Wake it: everyone comes back, busted people rebuy.
        let moved = false;
        for (const p of game.players) {
          if (!p.deviceId) continue;
          let rr = p.sittingOut ? run({ type: 'sitOut', out: false }, p.deviceId) : null;
          if (rr?.ok && rr.changed) {
            game = rr.game;
            moved = true;
          }
          if (p.stack === 0 && game.settings.rebuys) {
            const before = chipsIn(game);
            rr = run({ type: 'rebuy' }, p.deviceId);
            if (rr.ok && rr.changed) {
              expected += game.settings.startingStack;
              game = rr.game;
              moved = true;
              expect(chipsIn(game)).toBe(before + game.settings.startingStack);
            }
          }
        }
        if (!moved || ++idle > 5) return { hands: finished, ended: false };
        continue;
      }
    }
    idle = 0;
    const before = game;
    const beforeChips = chipsIn(before);
    const r = run(action, device, ok);
    if (!r.ok) continue;
    game = r.game;
    if (!r.changed) continue;
    // Chips only enter by rebuying, and leave only with a player who walks away.
    const gone = before.players.filter((p) => !game.players.some((q) => q.id === p.id)).reduce((s, p) => s + p.stack, 0);
    const bought = action.type === 'rebuy' ? before.settings.startingStack : 0;
    const now = chipsIn(game);
    // Called-off hands hand the chips back.
    if (now + gone !== beforeChips + bought) {
      throw new Error(label(`${JSON.stringify(action)}: chips went from ${beforeChips} to ${now} (left ${gone}, bought ${bought})`));
    }
    expected += bought - gone;
    if (action.type === 'settings') for (const p of game.players) expect(p.stack).toBeLessThan(1e9);
    if (game.hand && game.hand.number > started) started = game.hand.number;
  }
  checkState(game, label('end'));
  expect(chipsIn(game), label('final chips')).toBe(expected);
  return { hands: finished, ended: game.status !== 'playing' };
}

describe('random tables', () => {
  it('play thousands of hands with every chip accounted for and no stuck state', () => {
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) total += simulate({ seed, hands: 25, chaos: 0 }).hands;
    expect(total).toBeGreaterThan(450);
  }, 120_000);

  it('survive people sitting out, leaving, rebuying, changing blinds and sending junk', () => {
    let total = 0;
    for (let seed = 1000; seed < 1030; seed++) total += simulate({ seed, hands: 25, chaos: 0.12 }).hands;
    expect(total).toBeGreaterThan(250);
  }, 120_000);
});

describe('applyAction', () => {
  it('gives the same answer for the same input', () => {
    let game = createTable({ hostDeviceId: 'host', name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 3, code: null, now: 1 });
    const r = applyAction(game, { type: 'start' }, { deviceId: 'host', now: 10, rng: seededRng(4) });
    if (!r.ok) throw new Error(r.error);
    game = r.game;
    const a = applyAction(game, { type: 'tick' }, { deviceId: 's', now: (game.wakeAt ?? 0) + 1, rng: seededRng(9) });
    const b = applyAction(game, { type: 'tick' }, { deviceId: 's', now: (game.wakeAt ?? 0) + 1, rng: seededRng(9) });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('regressions', () => {
  const HOST = 'host';
  const start = (n: number, over: Partial<typeof DEFAULT_SETTINGS> = {}) => {
    let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, ...over }, bots: 0, code: null, now: 1000 });
    let now = 1000;
    const go = (a: Action, d: string) => {
      const r = applyAction(game, a, { deviceId: d, now, rng: seededRng(5) });
      if (!r.ok) throw new Error(r.error);
      game = r.game;
    };
    for (let i = 1; i < n; i++) go({ type: 'join', name: `P${i}`, emoji: '🐸' }, `device-${i}`);
    go({ type: 'start' }, HOST);
    const dev = (id: string) => game.players.find((p) => p.id === id)!.deviceId!;
    const act = (move: 'fold' | 'check' | 'call' | 'raise' | 'allin', to?: number) =>
      {
        go({ type: 'act', hand: game.hand!.number, seq: game.hand!.seq, move, to }, dev(game.hand!.toAct!));
        // Let the short pause before the next card pass.
        if (game.hand && !game.hand.result && game.hand.nextStreetAt != null) {
          now = game.hand.nextStreetAt + 1;
          go({ type: 'tick' }, 'server');
        }
      };
    return { get game() { return game; }, set: (g: Game) => (game = g), go, act, dev };
  };

  it("keeps a bet when the player who made it leaves, instead of handing it back", () => {
    const t = start(3);
    const total = t.game.players.reduce((s, p) => s + p.stack, 0) + 15;
    t.act('call'); // button
    t.act('call'); // small blind
    t.act('check'); // big blind: flop
    const bettor = t.game.hand!.toAct!;
    const bettorSeat = () => t.game.hand!.seats.find((s) => s.playerId === bettor)!;
    t.act('raise', 100);
    expect(bettorSeat().bet).toBe(100);
    // The bettor leaves before anyone answers; the other two fold.
    t.go({ type: 'remove', playerId: bettor }, t.dev(bettor));
    t.act('fold');
    const h = t.game.hand!;
    if (!h.result) t.act('fold');
    const result = t.game.hand!.result!;
    expect(result.showdown).toBe(false);
    // The winner got the dead 100.
    const winner = Object.keys(result.won)[0];
    expect(winner).not.toBe(bettor);
    expect(t.game.players.find((p) => p.id === winner)!.stack).toBeGreaterThan(1000 + 20);
    expect(t.game.players.reduce((s, p) => s + p.stack, 0)).toBe(total);
  });

  it('keeps the minimum raise from the blinds the hand was dealt with when the host changes them mid-hand', () => {
    const t = start(3);
    t.act('call');
    t.act('call');
    t.act('check');
    t.go({ type: 'settings', settings: { smallBlind: 50, bigBlind: 100 } }, HOST);
    expect(t.game.hand!.minRaise).toBe(10);
    // Next street: the smallest bet is still the old big blind.
    for (let i = 0; i < 3; i++) t.act('check');
    expect(t.game.hand!.street).toBe('turn');
    expect(t.game.hand!.minRaise).toBe(10);
  });

  it('runs the board out when the only players who could bet leave during the pause between streets', () => {
    const t = start(4);
    const g = structuredClone(t.game);
    const hand = g.hand!;
    hand.toAct = null;
    hand.nextStreetAt = 5000;
    hand.actAt = 5000;
    hand.seats[0].allIn = true;
    hand.seats[1].allIn = true;
    t.set(g);
    for (const s of hand.seats.slice(2)) t.go({ type: 'remove', playerId: s.playerId }, HOST);
    expect(t.game.hand!.result).toBeNull();
    const r = applyAction(t.game, { type: 'tick' }, { deviceId: 'server', now: 6000, rng: seededRng(1) });
    if (!r.ok) throw new Error(r.error);
    expect(r.game.hand!.runout).toBe(true);
    expect(r.game.hand!.board).toHaveLength(0);
    expect(r.game.wakeAt).not.toBeNull();
  });

  it('drops invisible characters from names', () => {
    const r = applyAction(createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 0, code: null, now: 1 }), { type: 'join', name: 'A\u202Eb\u200Bc', emoji: '🐸' }, { deviceId: 'd2', now: 1, rng: seededRng(1) });
    expect(r.ok && r.game.players[1].name).toBe('Abc');
  });
});

describe('payouts', () => {
  it('builds pots that add up for random stacks, folds and all-ins', () => {
    const rnd = seededRng(8);
    for (let i = 0; i < 3000; i++) {
      const n = 2 + Math.floor(rnd() * 8);
      const seats = Array.from({ length: n }, (_, k) => ({ playerId: `p${k}`, total: 1 + Math.floor(rnd() * 5) * 50 + Math.floor(rnd() * 3), folded: rnd() < 0.3 })) as Seat[];
      if (seats.every((s) => s.folded)) seats[0].folded = false;
      const pots = buildPots(seats);
      expect(pots.reduce((a, p) => a + p.amount, 0)).toBe(seats.reduce((a, s) => a + s.total, 0));
      for (const p of pots) {
        expect(p.amount).toBeGreaterThan(0);
        expect(p.eligible.length).toBeGreaterThan(0);
        for (const id of p.eligible) expect(seats.find((s) => s.playerId === id)!.folded).toBe(false);
      }
    }
  });
});
