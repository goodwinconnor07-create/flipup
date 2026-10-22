import { describe, expect, it } from 'vitest';
import { applyAction, positionOf, redactForDevice, seededRng, type Game } from '../game';
import { handBucket } from '../game/botPlay';
import { STRENGTH } from '../game/botRange';
import { judgeMove, readFromHabits } from '../game/judge';
import { handClass } from '../game/botPlay';
import { BB, cardTable, dealCard, fitBots } from './deal';
import { pickCard, weights } from './feed';
import { finish, goalText, passed, scoreOf, starsOf } from './play';
import { emptySave, KEEP, levelOf, withHand, type ScrollHand } from './save';
import { STYLE_NOTES } from './styleNotes';
import { storyLines } from './story';
import { TEMPLATES } from './templates';
import type { Decision, Outcome } from './types';

const who = { deviceId: 'dev', name: 'Me', emoji: '🙂' };
const ctx = (seed: number, now = 1000) => ({ deviceId: 'dev', now, rng: seededRng(seed) });

function deal(id: string, seed: number) {
  const { game, dealt } = cardTable({ id, seed }, who);
  const r = applyAction(game, { type: 'start' }, ctx(seed));
  if (!r.ok) throw new Error(r.error);
  return { game: fitBots(r.game, dealt, seededRng(seed + 1)), dealt };
}

const boardCount = { preflop: 0, flop: 3, turn: 4, river: 5 };

describe('the library', () => {
  it('has enough cards, in every theme and at every level', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const theme of ['open', 'exploit', 'defend', 'odds'])
      expect(TEMPLATES.filter((t) => t.theme === theme).length).toBeGreaterThanOrEqual(8);
    for (const level of [1, 2, 3, 4]) expect(TEMPLATES.some((t) => t.level === level)).toBe(true);
    // The first levels see every kind of card, so the feed is never one note.
    for (const theme of ['open', 'exploit', 'defend', 'odds']) expect(TEMPLATES.some((t) => t.theme === theme && t.level === 1)).toBe(true);
  });

  it('deals every card to the spot it describes', () => {
    for (const t of TEMPLATES) {
      for (let seed = 1; seed <= 8; seed++) {
        const { game, dealt } = deal(t.id, seed);
        const hand = game.hand!;
        const me = game.players.find((p) => !p.bot)!;
        const where = `${t.id} #${seed}`;
        // It's your move, nothing is over, and every scripted move was played.
        expect(hand.toAct, where).toBe(me.id);
        expect(hand.result, where).toBeNull();
        expect(hand.actions?.length, where).toBe(dealt.scene.script.length);
        expect(hand.street, where).toBe(t.want.street);
        expect(hand.board.length, where).toBe(boardCount[t.want.street]);
        // You hold what was asked for, in the seat that was asked for.
        const seat = hand.seats.find((s) => s.playerId === me.id)!;
        expect(seat.cards, where).toEqual(dealt.hero);
        const label = positionOf(hand, me.id)!.label;
        if (game.players.length === 2) expect(label, where).toBe(t.at === 0 ? 'B/SB' : 'BB');
        else if (t.at <= 2) expect(label, where).toBe(['BTN', 'SB', 'BB'][t.at]);
        else if (game.players.length === 6) expect(label, where).toBe(['UTG', 'HJ', 'CO'][t.at - 3]);
        const [lo, hi] = t.want.strength ?? [0, 1];
        const strength = STRENGTH.get(handClass(dealt.hero)) ?? 0;
        expect(strength, where).toBeGreaterThanOrEqual(lo);
        expect(strength, where).toBeLessThanOrEqual(hi);
        if (t.want.bucket && t.want.street !== 'preflop') expect(t.want.bucket, where).toContain(handBucket(dealt.hero, hand.board));
        // Stacks are what the card says.
        for (const p of game.players) expect(p.stack + (hand.seats.find((s) => s.playerId === p.id)?.total ?? 0), where).toBe(t.stack * BB);
      }
    }
  });

  it('never deals a card twice, bots included', () => {
    for (const t of TEMPLATES) {
      for (let seed = 1; seed <= 6; seed++) {
        const { game } = deal(t.id, seed);
        const hand = game.hand!;
        const all = [...hand.seats.flatMap((s) => s.cards), ...hand.board, ...hand.deck];
        expect(new Set(all).size, `${t.id} #${seed}`).toBe(all.length);
      }
    }
  });

  it('is the same deal for the same seed', () => {
    for (const t of TEMPLATES.slice(0, 12)) expect(dealCard({ id: t.id, seed: 7 }).hero).toEqual(dealCard({ id: t.id, seed: 7 }).hero);
  });

  it('every spot has a way for the story to read, and ends on your move', () => {
    for (const t of TEMPLATES) {
      const lines = storyLines(dealCard({ id: t.id, seed: 3 }));
      expect(lines.length, t.id).toBeGreaterThan(0);
      expect(lines.join(' '), t.id).toContain('Your move.');
      expect(goalText(t).length).toBeGreaterThan(5);
    }
  });
});

describe('a card at the table', () => {
  /** Plays a card out the simple way (check, otherwise call) until it ends. */
  function playOut(id: string, seed: number): Game {
    let { game } = deal(id, seed);
    let now = 1000;
    const me = game.players.find((p) => !p.bot)!;
    for (let i = 0; i < 200 && !game.hand!.result; i++) {
      const hand = game.hand!;
      if (hand.toAct === me.id) {
        const seat = hand.seats.find((s) => s.playerId === me.id)!;
        const r = applyAction(
          game,
          { type: 'act', hand: hand.number, seq: hand.seq, move: hand.currentBet > seat.bet ? 'call' : 'check' },
          { deviceId: 'dev', now, rng: seededRng(i) },
        );
        if (!r.ok) throw new Error(r.error);
        game = r.game;
      } else {
        now = Math.max(now + 50, game.wakeAt ?? now);
        const r = applyAction(game, { type: 'tick' }, { deviceId: 'clock', now, rng: seededRng(i + 500) });
        if (r.ok) game = r.game;
      }
    }
    return game;
  }

  it('is one hand, with every chip accounted for, and quiet bots', () => {
    for (const t of TEMPLATES.filter((x) => !x.quick).slice(0, 14)) {
      for (const seed of [1, 2, 3]) {
        const game = playOut(t.id, seed);
        const where = `${t.id} #${seed}`;
        expect(game.hand!.result, where).not.toBeNull();
        expect(
          game.players.reduce((n, p) => n + p.stack, 0),
          where,
        ).toBe(game.players.length * t.stack * BB);
        // It stays a single hand: nothing is due, and nobody has said anything.
        expect(game.nextHandAt, where).toBeNull();
        expect(game.wakeAt, where).toBeNull();
        expect(game.status, where).toBe('playing');
        expect(game.hands, where).toBe(1);
        expect(Object.keys(game.reactions ?? {}), where).toEqual([]);
      }
    }
  });

  it('keeps the set-up out of what a phone sees', () => {
    const { game } = deal('open-btn-100', 4);
    expect(game.card).toBeDefined();
    expect(redactForDevice(game, 'dev').card).toBeUndefined();
  });
});

describe('the grader', () => {
  /** What the grader thinks the best move is, across deals. */
  function bests(id: string, n = 20): string[] {
    const out: string[] = [];
    for (let seed = 1; seed <= n; seed++) {
      const { game, dealt } = deal(id, seed);
      const hand = game.hand!;
      const me = game.players.find((p) => !p.bot)!;
      const seat = hand.seats.find((s) => s.playerId === me.id)!;
      const bot = game.players.find((p) => p.bot)!;
      const jg: Game = { ...game, reads: { ...game.reads, [bot.id]: readFromHabits(STYLE_NOTES[dealt.bots[0].style].habits) } };
      const move = hand.currentBet > seat.bet ? 'call' : 'check';
      out.push(judgeMove(jg, hand, seat, move, undefined, seededRng(seed)).best);
    }
    return out;
  }
  const share = (xs: string[], ok: string[]) => xs.filter((x) => ok.includes(x)).length / xs.length;

  it('backs up what each card teaches', () => {
    // Bluff the folders, bet the callers, check against a player who never folds, fold to a Rock's big bet.
    expect(share(bests('bluff-rock'), ['bet', 'raise'])).toBeGreaterThanOrEqual(0.7);
    expect(share(bests('fire-nervous'), ['bet', 'raise'])).toBeGreaterThanOrEqual(0.7);
    expect(share(bests('value-station-flop'), ['bet', 'raise', 'allin'])).toBeGreaterThanOrEqual(0.8);
    expect(share(bests('value-gambler'), ['bet', 'raise', 'allin'])).toBeGreaterThanOrEqual(0.8);
    expect(share(bests('no-bluff-station'), ['check'])).toBeGreaterThanOrEqual(0.7);
    expect(share(bests('fold-rock'), ['fold'])).toBeGreaterThanOrEqual(0.8);
  });

  it('is quick enough to grade a move while you tap', () => {
    const t0 = performance.now();
    bests('face-barrel', 10);
    expect((performance.now() - t0) / 10).toBeLessThan(40);
  });

  it('calls a clear fold a fold and a clear raise a raise before the flop', () => {
    const { game } = deal('open-btn-100', 1);
    const hand = game.hand!;
    const seat = hand.seats.find((s) => s.playerId === game.players.find((p) => !p.bot)!.id)!;
    // Swap in the worst hand and the best: folding 72o is fine, folding aces isn't.
    seat.cards = ['7h', '2c'];
    expect(judgeMove(game, hand, seat, 'fold', undefined, seededRng(1)).grade).toBe('green');
    seat.cards = ['As', 'Ad'];
    expect(judgeMove(game, hand, seat, 'fold', undefined, seededRng(1)).grade).toBe('red');
    expect(judgeMove(game, hand, seat, 'raise', 25, seededRng(1)).grade).toBe('green');
  });
});

describe('stars and goals', () => {
  const move = (grade: Decision['grade'], easy = false): Decision => ({
    street: 'flop',
    grade,
    mine: 'call',
    best: 'call',
    loss: 0,
    easy,
    how: 'price',
    bucket: 'mid',
    hand: 'AsKd',
    board: '',
  });

  it('gives three stars for clean play, two for a close call and one for a costly move', () => {
    expect(starsOf([move('green'), move('green')])).toBe(3);
    expect(starsOf([move('green'), move('yellow')])).toBe(2);
    expect(starsOf([move('yellow')])).toBe(2);
    expect(starsOf([move('green'), move('green'), move('red')])).toBe(2);
    expect(starsOf([move('red')])).toBe(1);
    // Moves with nothing to choose between don't count either way.
    expect(starsOf([move('red', true), move('green')])).toBe(3);
    expect(scoreOf([])).toBe(1);
  });

  it('passes each kind of goal on its own terms', () => {
    const end = { net: 5, showdown: false, weak: true };
    expect(passed({ kind: 'win' }, [], end)).toBe(true);
    expect(passed({ kind: 'win' }, [], { ...end, net: 0 })).toBe(false);
    expect(passed({ kind: 'profit', bb: 8 }, [], end)).toBe(false);
    expect(passed({ kind: 'profit', bb: 4 }, [], end)).toBe(true);
    expect(passed({ kind: 'bluff' }, [], end)).toBe(true);
    expect(passed({ kind: 'bluff' }, [], { ...end, showdown: true })).toBe(false);
    expect(passed({ kind: 'bluff' }, [], { ...end, weak: false })).toBe(false);
    expect(passed({ kind: 'right' }, [move('green'), move('yellow')], end)).toBe(true);
    expect(passed({ kind: 'right' }, [move('red')], end)).toBe(false);
    expect(passed({ kind: 'save', bb: 3 }, [], { ...end, net: -2 })).toBe(true);
    expect(passed({ kind: 'save', bb: 3 }, [], { ...end, net: -4 })).toBe(false);
  });

  it('tells a pass from a miss, and bad luck from bad play', () => {
    const t = TEMPLATES.find((x) => x.id === 'bluff-rock')!;
    const bet: Decision = { ...move('green'), mine: 'bet' };
    const lost = finish(t, [bet], { net: -3, showdown: true, weak: true });
    expect(lost.passed).toBe(false);
    expect(lost.miss).toBe('goal');
    // A bluff that never got a bet isn't bad luck.
    expect(finish(t, [move('green')], { net: 0, showdown: true, weak: true }).miss).toBe('play');
    const sloppy = finish(t, [move('red'), move('red')], { net: -3, showdown: true, weak: true });
    expect(sloppy.miss).toBe('play');
    // A quick card is just its move.
    const quick = TEMPLATES.find((x) => x.quick)!;
    expect(finish(quick, [move('green')], { net: 0, showdown: false, weak: false })).toMatchObject({ passed: true, stars: 3, net: 0 });
    expect(finish(quick, [move('red')], { net: 0, showdown: false, weak: false }).passed).toBe(false);
  });
});

describe('the feed', () => {
  it('stays in your level, and a new player gets a mix', () => {
    const save = emptySave();
    const pool = weights(save);
    expect(pool.every((x) => x.t.level <= 1)).toBe(true);
    expect(new Set(pool.map((x) => x.t.theme)).size).toBe(4);
    const high = { ...emptySave(), stars: 300 };
    expect(weights(high).some((x) => x.t.level === 4)).toBe(true);
  });

  it("doesn't repeat a card for a while, and leans on what you miss", () => {
    const base = emptySave();
    const recent = TEMPLATES.filter((t) => t.theme === 'odds' && t.level === 1).map((t, i) => ({
      id: t.id,
      seed: i,
      theme: t.theme,
      passed: false,
      stars: 1,
      at: i,
    }));
    const save = { ...base, recent: [...recent, ...recent, ...recent].slice(-6) };
    const ids = new Set(save.recent.map((r) => r.id));
    expect(weights(save).some((x) => ids.has(x.t.id))).toBe(false);
    // Odds cards are being missed, so the other themes get a lower chance than an odds card would.
    const rng = seededRng(5);
    const picks = Array.from({ length: 200 }, () => pickCard({ ...save, recent: save.recent.map((r) => ({ ...r, id: 'x' })) }, rng));
    const odds = picks.filter((p) => TEMPLATES.find((t) => t.id === p.id)!.theme === 'odds').length;
    expect(odds / picks.length).toBeGreaterThan(0.25);
  });

  it('gives every card its own deal', () => {
    const save = emptySave();
    const rng = seededRng(2);
    const seeds = new Set(Array.from({ length: 50 }, () => pickCard(save, rng).seed));
    expect(seeds.size).toBeGreaterThan(40);
  });

  it('levels up on stars', () => {
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(8).level).toBe(2);
    expect(levelOf(19).level).toBe(2);
    expect(levelOf(20).cap).toBe(2);
    expect(levelOf(10_000).level).toBe(10);
  });
});

describe('Scroll hands', () => {
  const hand = (n: number, passedIt: boolean, stars: 1 | 2 | 3): ScrollHand => ({
    key: `k${n}`,
    ref: { id: 'open-btn-100', seed: n },
    theme: 'open',
    title: 'x',
    at: n,
    outcome: { passed: passedIt, stars, net: 0, showdown: false, score: 1 } as Outcome,
    decisions: [],
    heroId: 'p',
    record: null,
  });

  it('keeps a hundred, and holds on to missed and three-star cards longer', () => {
    let all: ScrollHand[] = [];
    // One missed card, then plenty of plain passes.
    all = withHand(all, hand(0, false, 1));
    for (let i = 1; i <= KEEP + 20; i++) all = withHand(all, hand(i, true, 2));
    expect(all.length).toBe(KEEP);
    expect(all.some((h) => h.key === 'k0')).toBe(true);
    expect(all.some((h) => h.key === 'k1')).toBe(false);
  });

  it('only goes past a hundred for cards worth keeping, and never past two hundred', () => {
    let all: ScrollHand[] = [];
    for (let i = 0; i < 230; i++) all = withHand(all, hand(i, false, 1));
    expect(all.length).toBe(200);
    expect(all[all.length - 1].key).toBe('k229');
  });
});
