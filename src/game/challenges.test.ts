import { describe, expect, it } from 'vitest';

import {
  applyAction,
  beforeDeal,
  challengeRng,
  CHALLENGES,
  checkDue,
  dealDue,
  decisionPoint,
  DETECTIVE,
  detectiveScore,
  heroOf,
  isNewBest,
  LABELS,
  openChallenge,
  options,
  pickSuspects,
  publicStats,
  redactForDevice,
  replayFrom,
  rewindChoices,
  rightCount,
  runOver,
  scoreRun,
  seededRng,
  shortStackBlind,
  shortStackScore,
  shortStackStats,
  STYLE_LABEL,
  truthOf,
  usuallyGoes,
  type ChallengeId,
  type DecisionPoint,
  type Game,
  type HandRecord,
  type Label,
  type Move,
  type StyleId,
} from './index';

const ME = 'me-device';
const ALL_STYLES: StyleId[] = ['pro', 'shark', 'tag', 'lag', 'maniac', 'rock', 'station', 'gambler', 'trapper', 'nervous'];

function chipsInPlay(game: Game): number {
  return game.players.reduce((sum, p) => sum + p.stack, 0) + (game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0);
}

const records = (game: Game): HandRecord[] => game.logs.flatMap((l) => (l.record ? [l.record] : []));

type Brain = (game: Game) => { move: Move; to?: number };
const checkFold: Brain = (game) => {
  const hand = game.hand!;
  const seat = hand.seats.find((s) => s.playerId === heroOf(game)!.id)!;
  return { move: options(game, hand, seat).canCheck ? 'check' : 'fold' };
};
const callDown: Brain = (game) => {
  const hand = game.hand!;
  const seat = hand.seats.find((s) => s.playerId === heroOf(game)!.id)!;
  const o = options(game, hand, seat);
  return { move: o.canCheck ? 'check' : 'call' };
};

/**
 * Plays a challenge the way the phone does: the table's own seeded random numbers, beforeDeal() just before every
 * deal, and the end once the run is over. `watch` sees every step, with the chips added between hands.
 */
function play(id: ChallengeId, seed: number, brain: Brain, opts: { maxSteps?: number; stopAt?: (game: Game) => boolean; watch?: (game: Game, added: number) => void } = {}) {
  let clock = 1_000_000;
  const { game: opened, run } = openChallenge(id, { deviceId: ME, name: 'Me', emoji: '🙂', now: clock, seed });
  let game = opened;
  const step = (deviceId: string, action: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(game, action, { deviceId, now: clock, rng: challengeRng(game, run.seed) });
    if (!r.ok) throw new Error(r.error);
    game = r.game;
  };
  step(ME, { type: 'start' });
  for (let i = 0; i < (opts.maxSteps ?? 200_000) && game.status === 'playing'; i++) {
    if (opts.stopAt?.(game)) break;
    const hand = game.hand;
    const me = heroOf(game)!;
    if (hand && !hand.result && !hand.runout && hand.toAct === me.id) {
      const m = brain(game);
      step(ME, { type: 'act', hand: hand.number, seq: hand.seq, move: m.move, ...(m.to !== undefined ? { to: m.to } : {}) });
      opts.watch?.(game, 0);
      continue;
    }
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    if (dealDue(game, clock)) {
      if (id === 'detective' && checkDue(game, run) >= 0) run.checks!.push(Object.fromEntries(Object.keys(truthOf(game)).map((k) => [k, 'rock' as Label])));
      if (runOver(game, run)) {
        step(ME, { type: 'end' });
        break;
      }
      const before = chipsInPlay(game);
      game = beforeDeal(game, run, challengeRng(game, run.seed));
      opts.watch?.(game, chipsInPlay(game) - before);
    }
    step('clock', { type: 'tick' });
    opts.watch?.(game, 0);
  }
  return { game, run, clock };
}

describe('challenge definitions', () => {
  it('has the three challenges, each with rules and a top score', () => {
    expect(CHALLENGES.map((c) => c.id)).toEqual(['shortStack', 'detective', 'rewind']);
    for (const c of CHALLENGES) {
      expect(c.rules.length).toBeGreaterThan(2);
      expect(c.max).toBeGreaterThan(0);
    }
  });

  it('maps every one of the ten styles to exactly one label, and every label is used', () => {
    expect(Object.keys(STYLE_LABEL).sort()).toEqual([...ALL_STYLES].sort());
    for (const s of ALL_STYLES) expect(LABELS.filter((l) => l.id === STYLE_LABEL[s])).toHaveLength(1);
    for (const l of LABELS) expect(ALL_STYLES.some((s) => STYLE_LABEL[s] === l.id)).toBe(true);
  });

  it('seats five suspects with at least four different labels', () => {
    for (let seed = 1; seed < 200; seed++) {
      const five = pickSuspects(seededRng(seed));
      expect(five).toHaveLength(5);
      expect(new Set(five.map((s) => STYLE_LABEL[s])).size).toBeGreaterThanOrEqual(4);
    }
  });

  it('raises Short Stack blinds about 1.5 times every six hands, in round numbers', () => {
    expect([1, 6, 7, 12, 13, 19, 25].map(shortStackBlind)).toEqual([100, 100, 150, 150, 250, 300, 500]);
    for (let h = 7; h < 100; h += 6) {
      const r = shortStackBlind(h) / shortStackBlind(h - 6);
      expect(r).toBeGreaterThanOrEqual(1.2);
      expect(r).toBeLessThan(1.7);
    }
  });

  it('counts a new best only when it beats the old one', () => {
    expect(isNewBest(12, undefined)).toBe(true);
    expect(isNewBest(0, undefined)).toBe(false);
    expect(isNewBest(12, { best: 12, plays: 3 })).toBe(false);
    expect(isNewBest(13, { best: 12, plays: 3 })).toBe(true);
  });
});

describe('Style Detective scoring', () => {
  const truth: Record<string, Label> = { a: 'rock', b: 'shark', c: 'maniac', d: 'station', e: 'trapper' };
  it('scores 30, 20 or 10 for a bot by the first check it stayed right from', () => {
    const all = (l: Partial<Record<string, Label>>) => ({ ...truth, ...l }) as Record<string, Label>;
    // a right throughout (30), b right from the second (20), c only at the last (10), d right then wrong (0), e never (0).
    const checks = [all({ b: 'rock', c: 'rock', e: 'rock' }), all({ c: 'rock', e: 'rock' }), all({ d: 'rock', e: 'rock' })];
    expect(detectiveScore(checks, truth)).toBe(30 + 20 + 10 + 0 + 0);
    expect(detectiveScore([truth, truth, truth], truth)).toBe(150);
    expect(detectiveScore([], truth)).toBe(0);
  });

  it('says only how many are right', () => {
    expect(rightCount({ a: 'rock', b: 'rock', c: 'maniac' }, truth)).toBe(2);
  });

  it('keeps the answer key off the screen until the reveal: no styles or profiles in the view, and the bots stay quiet', () => {
    const { game } = play('detective', 7, checkFold, { stopAt: (g) => (g.hand?.number ?? 0) >= 3 });
    const view = redactForDevice(game, ME);
    for (const p of view.players) {
      expect(p.style).toBeUndefined();
      expect(p.botProfile).toBeUndefined();
    }
    expect(Object.values(view.reactions ?? {}).filter((r) => r.id.startsWith('b:'))).toHaveLength(0);
    expect(game.challenge).toEqual({ id: 'detective', quiet: true });
    expect(game.fast).toBe(true);
  });

  it('plays 60 hands with all five bots still there, and asks at 20, 40 and 60', () => {
    const { game, run } = play('detective', 11, callDown);
    expect(game.status).toBe('ended');
    expect(game.hand?.number).toBe(DETECTIVE.hands);
    expect(Object.keys(truthOf(game))).toHaveLength(5);
    expect(run.checks).toHaveLength(3);
    expect(scoreRun(game, run, records(game))).toBe(detectiveScore(run.checks!, truthOf(game)));
  });

  it('works out a stat line from public moves', () => {
    const rec = (moves: Move[]): HandRecord => ({ tableId: 't', number: 1, at: 0, smallBlind: 5, bigBlind: 10, buttonId: 'x', players: [{ id: 'p', name: 'P', emoji: '🙂', seat: 0, stack: 1000 }], actions: moves.map((move) => ({ street: 'preflop' as const, playerId: 'p', move, to: move === 'raise' ? 30 : move === 'call' ? 10 : 0 })), board: [], holes: {}, won: {}, showdown: false });
    const s = publicStats([rec(['raise']), rec(['call']), rec(['fold']), rec(['fold'])], 'p');
    expect(s).toEqual({ hands: 4, played: 0.5, raised: 0.25 });
  });
});

describe('Short Stack', () => {
  it('ends when you bust, scores the hands you survived and keeps six seats', () => {
    let seats = true;
    const { game, run } = play('shortStack', 3, checkFold, { watch: (g) => (seats &&= g.status !== 'playing' || !!g.hand?.result || g.players.length === 6) });
    expect(game.status).toBe('ended');
    expect(heroOf(game)!.stack).toBe(0);
    const recs = records(game);
    const score = shortStackScore(recs, heroOf(game)!.id);
    expect(score).toBe(recs.length - 1);
    expect(scoreRun(game, run, recs)).toBe(score);
    expect(seats).toBe(true);
  });

  it('keeps every chip accounted for: the table never makes or loses chips, and refills add exactly the new stacks', () => {
    let total = -1;
    play('shortStack', 5, callDown, {
      watch: (g, added) => {
        if (total < 0) total = chipsInPlay(g);
        total += added;
        expect(chipsInPlay(g)).toBe(total);
        for (const p of g.players) expect(p.stack).toBeGreaterThanOrEqual(0);
      },
    });
  });

  it('counts shoves, shoves that won, and shoves everyone folded to', () => {
    const base = { tableId: 't', at: 0, smallBlind: 50, bigBlind: 100, buttonId: 'b', board: [], holes: {} };
    const players = [
      { id: 'b', name: 'B', emoji: '🦝', seat: 0, stack: 1000 },
      { id: 's', name: 'S', emoji: '🦬', seat: 1, stack: 1000 },
      { id: 'me', name: 'Me', emoji: '🙂', seat: 2, stack: 1000 },
    ];
    const recs: HandRecord[] = [
      // A shove from the big blind over a raise, everyone folds.
      { ...base, number: 1, players, actions: [{ street: 'preflop', playerId: 'b', move: 'raise', to: 250 }, { street: 'preflop', playerId: 's', move: 'fold', to: 0 }, { street: 'preflop', playerId: 'me', move: 'allin', to: 1000 }, { street: 'preflop', playerId: 'b', move: 'fold', to: 0 }], won: { me: 550 }, showdown: false },
      // Calling someone else's all-in isn't a shove.
      { ...base, number: 2, players: players.map((p) => (p.id === 'me' ? { ...p, stack: 1300 } : p)), actions: [{ street: 'preflop', playerId: 'b', move: 'allin', to: 1000 }, { street: 'preflop', playerId: 's', move: 'fold', to: 0 }, { street: 'preflop', playerId: 'me', move: 'call', to: 1000 }], won: { b: 2050 }, showdown: true },
    ];
    const s = shortStackStats(recs, 'me');
    expect(s.shoves).toBe(1);
    expect(s.shovesWon).toBe(1);
    expect(s.foldedTo).toBe(1);
    expect(s.peakBb).toBe(13);
    expect(s.survived).toBe(2);
  });
});

describe('Rewind', () => {
  /** Plays a Rewind table to your first decision after the flop, or the first one there is. */
  function firstSpot(seed: number): { point: DecisionPoint; game: Game; clock: number } {
    let point: DecisionPoint | null = null;
    const { game, clock } = play('rewind', seed, callDown, {
      stopAt: (g) => {
        const me = heroOf(g)!;
        if (!g.hand || g.hand.result || g.hand.toAct !== me.id || g.hand.runout) return false;
        point = decisionPoint(g, me.id, { move: 'call' });
        return true;
      },
    });
    return { point: point!, game, clock };
  }

  /** From a replayed table, plays the rest of the hand out with a fixed clock and the table's own random numbers. */
  function finish(start: Game, seed: number, clock: number): Game {
    let game = start;
    const n = game.hand!.number;
    for (let i = 0; i < 2000 && game.hand?.number === n && !game.hand.result; i++) {
      const me = heroOf(game)!;
      const hand = game.hand;
      let r;
      if (hand.toAct === me.id && !hand.runout) r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: callDown(game).move }, { deviceId: ME, now: clock, rng: challengeRng(game, seed) });
      else {
        clock = Math.max(clock + 1, game.wakeAt ?? clock + 1);
        r = applyAction(game, { type: 'tick' }, { deviceId: 'clock', now: clock, rng: challengeRng(game, seed) });
      }
      if (r.ok) game = r.game;
    }
    return game;
  }

  it('offers the other moves from the engine options, never the one you made', () => {
    const { point, game } = firstSpot(21);
    const me = heroOf(game)!;
    const choices = rewindChoices(point, me.id);
    expect(choices.length).toBeGreaterThan(0);
    expect(choices.some((c) => c.key === 'call')).toBe(false);
    expect(choices.some((c) => c.key === 'fold' || c.key === 'check')).toBe(true);
  });

  it('replays the same way every time, with the same cards and deck order', () => {
    const { point, game, clock } = firstSpot(21);
    const me = heroOf(game)!;
    const pick = rewindChoices(point, me.id).find((c) => c.key === 'allin') ?? rewindChoices(point, me.id)[0];
    const once = () => {
      const r = replayFrom(point, game.logs, pick, { deviceId: ME, now: clock, rng: challengeRng(point.snapshot, 99) });
      if (typeof r === 'string') throw new Error(r);
      return finish(r, 99, clock);
    };
    const a = once();
    const b = once();
    expect(a.hand!.result).toEqual(b.hand!.result);
    expect(a.hand!.board).toEqual(b.hand!.board);
    expect(a.players.map((p) => p.stack)).toEqual(b.players.map((p) => p.stack));
    // The board that came was the snapshot's own deck.
    const deck = point.snapshot.hand!.deck;
    const dealt = a.hand!.board.slice(point.snapshot.hand!.board.length);
    for (const c of dealt) expect(deck).toContain(c);
  });

  it('keeps every chip accounted for after a rewind', () => {
    const { point, game, clock } = firstSpot(33);
    const me = heroOf(game)!;
    const total = chipsInPlay(point.snapshot);
    for (const choice of rewindChoices(point, me.id)) {
      const r = replayFrom(point, game.logs, choice, { deviceId: ME, now: clock, rng: challengeRng(point.snapshot, 5) });
      if (typeof r === 'string') throw new Error(r);
      expect(chipsInPlay(r)).toBe(total);
      expect(chipsInPlay(finish(r, 5, clock))).toBe(total);
    }
  });

  it('works out how it usually goes the same way for the same spot, and fast enough to run on a phone', () => {
    const { point, game } = firstSpot(21);
    const me = heroOf(game)!;
    const lines = [point.did, ...rewindChoices(point, me.id).slice(0, 1)];
    const a = usuallyGoes(point, me.id, ME, lines, 8, 3).step(8);
    const b = usuallyGoes(point, me.id, ME, lines, 8, 3).step(8);
    expect(a).toEqual(b);
    expect(a.done).toBe(8);
    for (const v of a.avg) expect(Number.isFinite(v)).toBe(true);
    // Folding preflop loses at most the blind you posted.
    const fold = rewindChoices(point, me.id).find((c) => c.key === 'fold');
    if (fold) expect(usuallyGoes(point, me.id, ME, [fold], 4, 1).step(4).avg[0]).toBeGreaterThanOrEqual(-1);
  });

  it('starts with three rewinds and scores your stack in big blinds', () => {
    const { game, run } = play('rewind', 8, checkFold, { stopAt: (g) => (g.hand?.number ?? 0) >= 2 && !!g.hand?.result });
    expect(run.rewindsLeft).toBe(3);
    expect(scoreRun(game, run, records(game))).toBe(Math.round(heroOf(game)!.stack / game.settings.bigBlind));
  });
});
