import { describe, expect, it } from 'vitest';
import parity from './botPlay.parity.json';
import { boardTexture, category, decide, handBucket } from './botPlay';
import { score, toInt } from './botEval';
import { simulate, simulateTable } from './botSim';
import { cardsShown, inTheMoment } from './botMind';
import { STYLES as ALL_STYLES } from './botStyles';
import { scoreHand } from './evaluate';
import { fullDeck } from './cards';
import { BOTS, STYLES } from './botStyles';
import { botLineText } from './botTalk';
import { reactionText } from './reactions';
import { redactForDevice } from './redact';
import { options } from './selectors';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { seededRng } from './cards';
import { parseAction } from './validate';

describe('bots', () => {
  it('sorts hands and boards exactly like the trainer that built their tables', () => {
    for (const s of parity as { hole: string[]; board: string[]; bucket: string; texture: string; category: number }[]) {
      expect(category([...s.hole, ...s.board]), `${s.hole} ${s.board}`).toBe(s.category);
      expect(handBucket(s.hole, s.board), `${s.hole} ${s.board}`).toBe(s.bucket);
      expect(boardTexture(s.board), `${s.board}`).toBe(s.texture);
    }
  });

  it('has forty bots, four of each of the ten styles, all different', () => {
    expect(BOTS).toHaveLength(40);
    expect(new Set(BOTS.map((b) => b.name)).size).toBe(40);
    expect(new Set(BOTS.map((b) => b.emoji)).size).toBe(40);
    for (const style of Object.keys(STYLES)) expect(BOTS.filter((b) => b.style === style)).toHaveLength(4);
  });

  it('seats bots in a random order, not top to bottom', () => {
    const firsts = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 1, code: null, now: 0 });
      firsts.add(g.players[1].name);
    }
    expect(firsts.size).toBeGreaterThan(5);
  });

  it("keeps each bot's style and the bots' notes off every phone", () => {
    const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 3, code: null, now: 0 });
    g.reads = { x: { hands: 1, vpip: 1, pfr: 0, betsFaced: 0, foldsToBet: 0, aggr: 0, calls: 0 } };
    // A bot that has said what it's thinking knows its next move: that stays on the server too.
    g.botPlan = { playerId: 'x', seq: 3, move: 'raise', to: 60 };
    g.pendingTalk = { at: 5, playerId: 'x' };
    g.minds = { x: { tilt: 0.6, confidence: -0.2, grudges: { h: 0.5 } } };
    expect(g.players.some((p) => p.style)).toBe(true);
    const seen = redactForDevice(g, 'h');
    expect(seen.players.every((p) => p.style === undefined)).toBe(true);
    expect(seen.reads).toBeUndefined();
    expect(seen.botPlan).toBeUndefined();
    expect(seen.pendingTalk).toBeUndefined();
    expect(seen.minds).toBeUndefined();
  });

  it("decides from its own cards and public moves only: hiding everyone else's cards and the deck changes nothing", () => {
    const rng = seededRng(21);
    let now = 1000;
    let g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 4, code: null, now });
    g.players.filter((p) => p.bot).forEach((p, i) => (p.style = ['pro', 'shark', 'station', 'maniac'][i]));
    const step = (action: Parameters<typeof applyAction>[1], deviceId: string) => {
      const r = applyAction(g, action, { deviceId, now, rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    };
    step({ type: 'start' }, 'h');
    let checked = 0;
    for (let i = 0; i < 6000 && checked < 60; i++) {
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
    expect(checked).toBeGreaterThanOrEqual(60);
  }, 60_000);

  it('scores hands with its fast evaluator exactly like the table does', () => {
    const rng = seededRng(4);
    for (let i = 0; i < 3000; i++) {
      const deck = fullDeck();
      const n = 5 + (i % 3);
      const cards = Array.from({ length: n }, () => deck.splice(Math.floor(rng() * deck.length), 1)[0]);
      expect(score(cards.map(toInt)), cards.join(' ')).toBe(scoreHand(cards));
    }
  });

  it("speaks only from its own fixed lines, which phones can't send", () => {
    expect(botLineText('b:trash:allin:0')).toBeTruthy();
    expect(reactionText('b:friendly:bigWin:1')).toBeTruthy();
    expect(parseAction({ type: 'react', id: 'b:trash:allin:0' })).toBeNull();
  });

  it('gives each style its own voice, and old line ids still read', () => {
    expect(botLineText('b:shark:bigWin:0')).toBeTruthy();
    expect(botLineText('b:shark:tiltJab:8')).toBeTruthy();
    expect(botLineText('b:maniac:idle:0')).toBeTruthy();
    expect(botLineText('b:trash:bigWin:0')).toBe('Ship it!');
    expect(botLineText('b:nope:bigWin:0')).toBe('');
    expect(parseAction({ type: 'react', id: 'b:shark:bigWin:0' })).toBeNull();
  });

  it('pokes a person who sits on their turn, and counts real losses (not folded blinds) as a streak', () => {
    const rng = seededRng(5);
    let now = 1000;
    let g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 2, code: null, now });
    const step = (action: Parameters<typeof applyAction>[1], deviceId: string) => {
      const r = applyAction(g, action, { deviceId, now, rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    };
    step({ type: 'start' }, 'h');
    let jabQueued = false;
    let streak = 0;
    let folded = 0;
    for (let i = 0; i < 4000 && streak < 2; i++) {
      const me = g.players.find((p) => p.deviceId === 'h')!;
      const myTurn = g.hand && !g.hand.result && g.hand.toAct === me.id;
      if (myTurn && g.pendingTalk?.event === 'tank' && !jabQueued) {
        expect(g.pendingTalk.forId).toBe(me.id);
        now = g.pendingTalk.at + 1;
        step({ type: 'tick' }, 'server');
        expect(g.pendingTalk).toBeUndefined();
        jabQueued = true;
      } else if (myTurn) {
        // Fold the first few hands: giving up a blind must not start a streak. Then call everything.
        const o = options(g, g.hand!, g.hand!.seats.find((x) => x.playerId === me.id)!);
        // Small bets only, so a bad run can't empty the stack and end the table.
        const move = folded < 12 ? 'fold' : o.canCheck ? 'check' : o.toCall <= 40 ? 'call' : 'fold';
        if (move === 'fold' && !streak) expect(g.streaks?.[me.id] ?? 0).toBe(0);
        if (move === 'fold') folded++;
        step({ type: 'act', hand: g.hand!.number, seq: g.hand!.seq, move }, 'h');
      } else {
        now = Math.max(now + 1, g.wakeAt ?? now + 1);
        step({ type: 'tick' }, 'server');
      }
      streak = g.streaks?.[me.id] ?? 0;
    }
    expect(jabQueued).toBe(true);
    expect(streak).toBeGreaterThanOrEqual(2);
    expect(redactForDevice(g, 'h').streaks).toBeUndefined();
  });

  it('talks like a real table: most hands get a word, the chatty styles more than the quiet ones', () => {
    const report = simulate(['pro', 'maniac', 'rock', 'gambler'], 150, 9);
    const said = (style: string) => report.find((r) => r.style === style)!.comments;
    expect(report.reduce((a, r) => a + r.comments, 0)).toBeGreaterThan(75);
    expect(said('maniac')).toBeGreaterThan(said('rock'));
  }, 60_000);

  it('a bot that sweated or shoved out loud reacts when the hand ends, even if it just spoke', () => {
    const rng = seededRng(77);
    let now = 1000;
    let g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 3, code: null, now });
    g.players.filter((p) => p.bot).forEach((p, i) => (p.style = ['nervous', 'maniac', 'gambler'][i]));
    const step = (action: Parameters<typeof applyAction>[1], deviceId: string) => {
      const r = applyAction(g, action, { deviceId, now, rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    };
    step({ type: 'start' }, 'h');
    const eventOf = (id: string) => id.split(':')[2];
    // Who spoke before the outcome this hand, and what their line count was then.
    let pre: Record<string, number> = {};
    let handNo = 0;
    let owed = 0;
    let kept = 0;
    const before = new Map<string, number>();
    for (let i = 0; i < 9000 && owed < 12; i++) {
      const h = g.hand;
      if (h && h.number !== handNo) {
        handNo = h.number;
        pre = {};
      }
      const me = g.players[0];
      if (h && !h.result && h.toAct === me.id) step({ type: 'act', hand: h.number, seq: h.seq, move: 'allin' }, 'h');
      else {
        now = Math.max(now + 1, g.wakeAt ?? now + 1);
        step({ type: 'tick' }, 'server');
      }
      for (const [id, r] of Object.entries(g.reactions ?? {})) {
        if (before.get(id) === r.n) continue;
        before.set(id, r.n);
        if (g.hand && !g.hand.result && ['sweat', 'sweatWatch', 'allin'].includes(eventOf(r.id))) pre[id] = r.n;
      }
      if (g.hand?.result && Object.keys(pre).length) {
        // The step that ended the hand also had the bots react: every one that spoke before has spoken since.
        for (const [id, n] of Object.entries(pre)) {
          const line = g.reactions![id];
          expect(line.n, `${id} went quiet after "${line.id}"`).toBeGreaterThan(n);
          expect(['sweat', 'sweatWatch', 'allin']).not.toContain(eventOf(line.id));
          kept++;
        }
        owed++;
        pre = {};
      }
      for (const p of g.players) if (p.stack === 0 && (!g.hand || g.hand.result)) p.stack = 1000;
    }
    expect(owed).toBeGreaterThanOrEqual(5);
    expect(kept).toBeGreaterThanOrEqual(5);
  }, 60_000);

  it('plays each style the way it should', () => {
    const report = [
      ...simulate(['pro', 'rock', 'maniac', 'station', 'tag', 'lag'], 250, 3),
      ...simulate(['shark', 'gambler', 'trapper', 'nervous', 'rock', 'maniac'], 250, 4),
    ];
    const avg = (style: string, k: 'vpip' | 'pfr' | 'aggression' | 'foldToBet') => {
      const rs = report.filter((r) => r.style === style);
      return rs.reduce((a, r) => a + r[k], 0) / rs.length;
    };
    // How many hands they play, tightest to loosest.
    // (Over a few hundred hands the tight styles can land close together, so compare across the range.)
    expect(avg('rock', 'vpip')).toBeLessThan(avg('pro', 'vpip'));
    expect(avg('tag', 'vpip')).toBeLessThan(avg('lag', 'vpip'));
    expect(avg('lag', 'vpip')).toBeLessThan(avg('maniac', 'vpip'));
    expect(avg('gambler', 'vpip')).toBeGreaterThan(avg('pro', 'vpip'));
    // The station calls and doesn't raise; the maniac raises everything.
    expect(avg('station', 'pfr')).toBeLessThan(avg('station', 'vpip') / 2);
    expect(avg('station', 'foldToBet')).toBeLessThan(avg('nervous', 'foldToBet'));
    expect(avg('maniac', 'aggression')).toBeGreaterThan(avg('station', 'aggression') * 4);
  }, 120_000);

  it('notices a bluff shown after the hand: the read counts it, and the bots that folded tilt and hold a grudge', () => {
    const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 2, code: null, now: 0 });
    const [me, b1, b2] = g.players;
    b1.style = 'pro';
    b2.style = 'gambler';
    const seat = (id: string, cards: string[], folded: boolean) => ({ playerId: id, cards, bet: 0, total: 20, folded, allIn: false, acted: true, shown: false, last: null });
    const hand = {
      number: 1, seq: 9, buttonId: me.id, sbId: b1.id, bbId: b2.id,
      seats: [seat(me.id, ['7c', '2d'], false), seat(b1.id, ['Ah', 'Qh'], true), seat(b2.id, ['9s', '9d'], true)],
      deck: [], board: ['Ks', 'Jh', '4c', '3d', '8s'], street: 'river' as const, toAct: null, currentBet: 0, minRaise: 10, aggressorId: me.id,
      runout: false, actAt: null, deadline: null, log: [],
      actions: [
        { street: 'turn' as const, playerId: me.id, move: 'bet' as const, to: 40 },
        { street: 'turn' as const, playerId: b1.id, move: 'fold' as const, to: 0 },
        { street: 'turn' as const, playerId: b2.id, move: 'fold' as const, to: 0 },
      ],
      result: { pots: [{ amount: 100, eligible: [me.id], winners: [me.id] }], won: { [me.id]: 100 }, names: {}, showdown: false },
    };
    g.reads = { [me.id]: { hands: 10, vpip: 3, pfr: 2, betsFaced: 0, foldsToBet: 0, aggr: 2, calls: 0 } };
    const fooled = cardsShown(g, hand, me.id);
    expect(fooled.sort()).toEqual([b1.id, b2.id].sort());
    expect(g.reads[me.id].shownBluffs).toBe(1);
    expect(g.minds?.[b2.id].tilt).toBeGreaterThan(g.minds?.[b1.id].tilt ?? 1);
    expect(g.minds?.[b1.id].grudges?.[me.id]).toBeGreaterThan(0);
    // Tilt loosens a gambler up; the nervous kind tighten up instead.
    const tilted = { tilt: 0.8, confidence: 0 };
    expect(inTheMoment(ALL_STYLES.gambler, tilted, 0).pre.loose).toBeGreaterThan(ALL_STYLES.gambler.pre.loose);
    expect(inTheMoment(ALL_STYLES.nervous, tilted, 0).post.scared).toBeGreaterThan(ALL_STYLES.nervous.post.scared);
  });

  it('acts like people: thinking time varies with the decision, and now and then a bot shows its cards', () => {
    const r = simulateTable(['pro', 'maniac', 'lag', 'gambler', 'rock', 'shark'], 400, 6);
    const bots = r.seats.filter((s) => s.thinkMs > 0);
    expect(bots.length).toBeGreaterThan(3);
    for (const s of bots) {
      expect(s.thinkMs, s.style).toBeGreaterThan(900);
      expect(s.thinkMs, s.style).toBeLessThan(4500);
      expect(s.thinkSpread, s.style).toBeGreaterThan(0.25);
    }
    expect(r.seats.reduce((a, s) => a + s.shows, 0)).toBeGreaterThan(0);
  }, 60_000);
});

