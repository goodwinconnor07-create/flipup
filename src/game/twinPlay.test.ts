import { describe, expect, it } from 'vitest';
import { simulateTable, type Agent } from './botSim';
import { decide } from './botPlay';
import type { StyleId } from './botStyles';
import { seededRng } from './cards';
import { redactForDevice } from './redact';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { options } from './selectors';
import { addHandToTwin, emptyTwin, heroDecisions, heroNow, TWIN_MOVES, type TwinProfile } from './twin';
import { buildBrain, fitStyle, type TwinBrain } from './twinFit';
import { blendKinds, liveRecord, postKinds, preKinds, TWIN_TUNING, twinMix, twinWeight } from './twinMix';
import type { Action, Game } from './types';

/** What a bot style does at a mixed six-handed table, as an AI twin would learn it. */
function learn(style: StyleId, hands: number, seed: number): TwinProfile {
  const twin = emptyTwin();
  let hero = '';
  simulateTable([style, 'rock', 'maniac', 'station', 'tag', 'lag'] as Agent[], hands, seed, 100, {}, {
    onHand: (rec) => {
      hero ||= rec.players.find((p) => p.name === 'Host')!.id;
      addHandToTwin(twin, rec, hero, `${seed}#${rec.number}`);
    },
  });
  return twin;
}

/** A heads-up-style table where every bot plays as this twin. */
function twinTable(brain: TwinBrain, bots = 4): Game {
  const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots, code: null, now: 1000 });
  for (const p of g.players.filter((x) => x.bot)) p.twin = structuredClone(brain);
  return g;
}

describe('the twin memory lookup', () => {
  const spots: TwinBrain['spots'] = {
    'flop|ip|4|none|2|a': [0, 1, 0, 0, 5, 0, 0],
    'flop|ip|3|none|2|a': [0, 4, 0, 0, 0, 0, 0],
    'flop|ip|0|none|2|a': [9, 0, 0, 0, 0, 0, 0],
    'turn|ip|4|none|2|a': [0, 0, 0, 0, 9, 0, 0],
    'flop|ip|4|none|2|d': [0, 6, 0, 0, 0, 0, 0],
  };
  const brain = { style: fitStyle(emptyTwin()), spots, hands: 10 };
  const spot = { street: 'flop', pos: 'ip', strength: 4, facing: 'none', players: 2, role: 'a' } as const;

  it('weighs spots by how alike they are: same hand first, a close one less, a far one and another street not at all', () => {
    const mix = twinMix(brain, spot)!;
    const bet = TWIN_MOVES.indexOf('betB');
    const check = TWIN_MOVES.indexOf('check');
    // 5 big bets and 1 check here, 4 checks next door counting for half, and 6 checks in the same spot
    // without the initiative counting for half: 5 bets of 11 weighted.
    expect(mix.p[bet]).toBeCloseTo(5 / 11);
    expect(mix.p[check]).toBeCloseTo(6 / 11);
    expect(mix.p[TWIN_MOVES.indexOf('fold')]).toBe(0);
    expect(mix.n).toBeCloseTo(11);
  });

  it('has nothing to say about a street it has never seen', () => {
    expect(twinMix(brain, { ...spot, street: 'river' })).toBeNull();
  });

  it('trusts the memory more the more it has seen', () => {
    expect(twinWeight(0)).toBe(0);
    // Equal weight to the memory and the style once it has seen `k` spots' worth.
    expect(twinWeight(TWIN_TUNING.k)).toBeCloseTo(0.5);
    expect(twinWeight(TWIN_TUNING.k * 10)).toBeGreaterThan(0.9);
  });
});

describe('blending with the bot', () => {
  it('leaves the bot alone with no weight and follows the twin with full weight', () => {
    const own = [0.5, 0.25, 0.25];
    expect(blendKinds(own, [0, 1, 2], [0.1, 0.2, 0.7], 0)).toEqual(own);
    const full = blendKinds(own, [0, 1, 2], [0.1, 0.2, 0.7], 1);
    expect(full[0]).toBeCloseTo(0.1);
    expect(full[1]).toBeCloseTo(0.2);
    expect(full[2]).toBeCloseTo(0.7);
  });

  it('splits a kind between its options the way the bot liked them, and gives a kind it has no option for to the nearest one', () => {
    // A check and two small bets (one liked more); the twin wants big bets, which the bot has no size for.
    const out = blendKinds([0.2, 0.5, 0.3], [0, 1, 1], [0.2, 0.2, 0.6], 1);
    expect(out[0]).toBeCloseTo(0.2);
    expect(out[1]).toBeCloseTo(0.8 * (0.5 / 0.8));
    expect(out[2]).toBeCloseTo(0.8 * (0.3 / 0.8));
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    // Facing a bet it can't raise: the twin's raise becomes a call.
    const call = blendKinds([0.5, 0.5], [0, 1], [0.3, 0.2, 0.5], 1);
    expect(call[0]).toBeCloseTo(0.3);
    expect(call[1]).toBeCloseTo(0.7);
  });

  it('groups moves the way the bot chooses them', () => {
    const p = TWIN_MOVES.map((m) => ({ fold: 0.1, check: 0.2, call: 0.3, betS: 0.1, betB: 0.1, raise: 0.1, allin: 0.1 })[m]);
    expect(preKinds(p).map((x) => Math.round(x * 10))).toEqual([3, 3, 4]);
    expect(postKinds(p, false).map((x) => Math.round(x * 10))).toEqual([3, 4, 3]);
    // When checking is free a call is a check.
    expect(postKinds(p, true).map((x) => Math.round(x * 10))).toEqual([6, 1, 3]);
  });
});

describe('fitting a style', () => {
  const stats = (o: Record<string, number>) => {
    const t = emptyTwin();
    t.hands = 300;
    Object.assign(t.stats, o);
    return t;
  };

  it('fits a loose, aggressive player looser than a tight one', () => {
    const loose = fitStyle(stats({ vpip: 135, pfr: 90, firstIn: 120, opens: 80, limps: 5, betsFaced: 100, foldsToBet: 30, betOpps: 120, bets: 80, postAgg: 90, postBluffs: 40 }));
    const tight = fitStyle(stats({ vpip: 45, pfr: 36, firstIn: 120, opens: 36, limps: 0, betsFaced: 100, foldsToBet: 55, betOpps: 120, bets: 40, postAgg: 40, postBluffs: 5 }));
    const looseness = (s: typeof loose) => s.pre.loose - s.pre.tight;
    expect(looseness(loose) - looseness(tight)).toBeGreaterThan(0.3);
    expect(loose.post.bluff).toBeGreaterThan(tight.post.bluff);
    expect(loose.post.sticky).toBeGreaterThan(tight.post.sticky);
  });

  it('copies their usual bet sizes and whether the size gives the hand away', () => {
    const t = stats({ smallN: 10, smallSum: 3.3, bigN: 10, bigSum: 8, opens: 20, openBb: 60 });
    t.stats.sizeN = [4, 4, 0, 0, 4, 4, 4];
    t.stats.sizeSum = [1.2, 1.2, 0, 0, 3.2, 3.2, 3.2];
    const s = fitStyle(t);
    expect(s.post.sizes).toEqual([0.33, 0.8]);
    expect(s.post.tell).toBeGreaterThan(0.3);
  });

  it('is fine with a player it has barely seen', () => {
    const s = fitStyle(emptyTwin());
    expect(Number.isFinite(s.pre.open)).toBe(true);
    for (const v of Object.values(s.post)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
  });
});

describe('playing as a twin', () => {
  it('plays tighter as a twin of a tight player than as a twin of a loose one', () => {
    const rock = buildBrain(learn('rock', 350, 3));
    const station = buildBrain(learn('station', 350, 4));
    const vpip = (brain: TwinBrain) => simulateTable(['pro', 'rock', 'maniac', 'station', 'tag', 'lag'], 250, 9, 100, {}, { twins: { 0: brain } }).seats[0].vpip;
    expect(vpip(station) - vpip(rock)).toBeGreaterThan(0.08);
  }, 90_000);

  it('reads the same spot live as the finished hand records it', () => {
    const brain = buildBrain(learn('pro', 150, 5));
    const rng = seededRng(33);
    let now = 1000;
    let g = twinTable(brain);
    const step = (action: Action, deviceId: string) => {
      const r = applyAction(g, action, { deviceId, now, rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    };
    step({ type: 'start' }, 'h');
    const live = new Map<string, { id: string; spot: unknown; toCall: number }>();
    for (let i = 0; i < 6000 && g.logs.length < 40; i++) {
      const h = g.hand;
      const me = g.players[0];
      if (h && !h.result && !h.runout && h.toAct && h.toAct !== me.id && !g.botPlan) {
        const seat = h.seats.find((s) => s.playerId === h.toAct)!;
        const here = heroNow(liveRecord(g, h, seat), seat.playerId, h.street);
        if (here) live.set(`${h.number}:${h.actions?.length ?? 0}`, { id: seat.playerId, spot: here.spot, toCall: here.toCall });
      }
      if (h && !h.result && h.toAct === me.id) {
        const o = options(g, h, h.seats.find((x) => x.playerId === me.id)!);
        step({ type: 'act', hand: h.number, seq: h.seq, move: o.canCheck ? 'check' : o.toCall <= 40 ? 'call' : 'fold' }, 'h');
      } else {
        now = Math.max(now + 1, g.wakeAt ?? now + 1);
        step({ type: 'tick' }, 'server');
      }
      for (const p of g.players) if (p.stack === 0 && (!g.hand || g.hand.result)) p.stack = 1000;
    }
    let compared = 0;
    for (const log of g.logs) {
      const rec = log.record;
      if (!rec) continue;
      for (const bot of g.players.filter((p) => p.bot)) {
        for (const d of heroDecisions(rec, bot.id)) {
          const seen = live.get(`${rec.number}:${rec.actions.indexOf(d.action)}`);
          if (!seen || seen.id !== bot.id) continue;
          expect(seen.spot).toEqual(d.spot);
          expect(seen.toCall).toBe(d.toCall);
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(40);
  }, 60_000);

  it("still decides from its own cards and public moves only: hiding everyone else's cards changes nothing", () => {
    const brain = buildBrain(learn('shark', 150, 6));
    const rng = seededRng(21);
    let now = 1000;
    let g = twinTable(brain);
    const step = (action: Action, deviceId: string) => {
      const r = applyAction(g, action, { deviceId, now, rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    };
    step({ type: 'start' }, 'h');
    let checked = 0;
    for (let i = 0; i < 6000 && checked < 50; i++) {
      const h = g.hand;
      const me = g.players[0];
      if (h && !h.result && !h.runout && h.toAct && h.toAct !== me.id && !g.botPlan) {
        const seat = h.seats.find((s) => s.playerId === h.toAct)!;
        const hidden = structuredClone(g);
        hidden.hand!.deck = [];
        for (const s of hidden.hand!.seats) if (s.playerId !== seat.playerId) s.cards = [];
        const a = decide(g, h, seat, seededRng(i));
        const b = decide(hidden, hidden.hand!, hidden.hand!.seats.find((s) => s.playerId === seat.playerId)!, seededRng(i));
        expect(b).toEqual(a);
        checked++;
      }
      if (h && !h.result && h.toAct === me.id) {
        const o = options(g, h, h.seats.find((x) => x.playerId === me.id)!);
        step({ type: 'act', hand: h.number, seq: h.seq, move: o.canCheck ? 'check' : o.toCall <= 40 ? 'call' : 'fold' }, 'h');
      } else {
        now = Math.max(now + 1, g.wakeAt ?? now + 1);
        step({ type: 'tick' }, 'server');
      }
      for (const p of g.players) if (p.stack === 0 && (!g.hand || g.hand.result)) p.stack = 1000;
    }
    expect(checked).toBeGreaterThanOrEqual(50);
  }, 60_000);

  it('keeps every chip accounted for with twins at the table', () => {
    const brain = buildBrain(learn('lag', 150, 7));
    const rng = seededRng(42);
    let now = 1000;
    let g = twinTable(brain, 3);
    const chips = (game: Game) => game.players.reduce((a, p) => a + p.stack, 0) + (game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0);
    const first = applyAction(g, { type: 'start' }, { deviceId: 'h', now, rng });
    if (!first.ok) throw new Error(first.error);
    g = first.game;
    const total = chips(g);
    let hands = 0;
    for (let i = 0; i < 4000 && g.status === 'playing' && hands < 40; i++) {
      const before = g.hand?.number;
      const me = g.players[0];
      let r;
      if (g.hand && !g.hand.result && g.hand.toAct === me.id) {
        const o = options(g, g.hand, g.hand.seats.find((x) => x.playerId === me.id)!);
        r = applyAction(g, { type: 'act', hand: g.hand.number, seq: g.hand.seq, move: o.canCheck ? 'check' : o.toCall <= 40 ? 'call' : 'fold' }, { deviceId: 'h', now, rng });
      } else {
        now = Math.max(now + 1, g.wakeAt ?? now + 1);
        r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now, rng });
      }
      if (!r.ok) throw new Error(r.error);
      g = r.game;
      if (g.hand?.number !== before) hands++;
      expect(chips(g)).toBe(total);
    }
    expect(hands).toBeGreaterThan(5);
  }, 60_000);

  it('never sends what a twin remembers to a phone', () => {
    const g = twinTable(buildBrain(learn('pro', 60, 8)));
    const seen = redactForDevice(g, 'h');
    for (const p of seen.players) expect(p).not.toHaveProperty('twin');
    expect(g.players.some((p) => p.twin)).toBe(true);
  }, 30_000);
});
