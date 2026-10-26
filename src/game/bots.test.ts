import { describe, expect, it } from 'vitest';
import parity from './botPlay.parity.json';
import { boardTexture, category, decide, handBucket, tightLine, updateReads } from './botPlay';
import { readOf } from './botRange';
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
import type { Game } from './types';
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

  it('has 640 bots, 64 of each foundation, with distinct stable identities', () => {
    expect(BOTS).toHaveLength(640);
    expect(new Set(BOTS.map((b) => b.name)).size).toBe(640);
    expect(new Set(BOTS.map((b) => b.profile.id)).size).toBe(640);
    for (const style of Object.keys(STYLES)) expect(BOTS.filter((b) => b.style === style)).toHaveLength(64);
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

  it('a new game waits three seconds, and a bot greets first: by name heads-up, the table otherwise', () => {
    for (const bots of [1, 3]) {
      let now = 5000;
      const rng = seededRng(5);
      let g = createTable({ hostDeviceId: 'h', name: 'Sam', emoji: '🙂', settings: DEFAULT_SETTINGS, bots, code: null, now });
      const r = applyAction(g, { type: 'start' }, { deviceId: 'h', now, rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
      // No cards yet; they come three seconds later.
      expect(g.hand).toBeNull();
      expect(g.nextHandAt).toBe(now + 3000);
      const me = g.players[0];
      expect(g.pendingTalk?.event).toBe(bots === 1 ? 'hello' : 'welcome');
      expect(g.pendingTalk?.forId).toBe(bots === 1 ? me.id : undefined);
      // The greeting comes first, well inside the wait.
      now = g.wakeAt!;
      expect(now).toBeLessThan(5000 + 3000);
      const t = applyAction(g, { type: 'tick' }, { deviceId: 'server', now, rng });
      if (!t.ok) throw new Error(t.error);
      g = t.game;
      const said = Object.entries(g.reactions ?? {});
      expect(said).toHaveLength(1);
      const [speaker, line] = said[0];
      expect(g.players.find((p) => p.id === speaker)?.bot).toBe(true);
      expect(line.to).toBe(bots === 1 ? me.id : undefined);
      const text = reactionText(line.id, 'Sam');
      expect(text).toBeTruthy();
      expect(text.includes('{you}')).toBe(false);
      if (bots === 1) expect(text).toContain('Sam');
      expect(g.hand).toBeNull();
      // Then the cards, after another bot may have said hi back (never heads-up: there's only one bot).
      let greeted = false;
      for (let i = 0; i < 3 && !g.hand; i++) {
        now = g.wakeAt!;
        // Anything said back lands well before the cards, never after.
        expect(now).toBeLessThanOrEqual(5000 + 3000);
        const d = applyAction(g, { type: 'tick' }, { deviceId: 'server', now, rng });
        if (!d.ok) throw new Error(d.error);
        greeted ||= Object.values(d.game.reactions ?? {}).some((r) => r.id.split(':')[2] === 'greetBack');
        g = d.game;
      }
      expect(g.hand).not.toBeNull();
      if (bots === 1) expect(greeted).toBe(false);
    }
  });

  it('answers a person\'s quick message now and then, in kind, naming them', () => {
    const answered: Record<string, number> = {};
    let named = 0;
    let said = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = seededRng(seed);
      let now = 5000;
      let g = createTable({ hostDeviceId: 'h', name: 'Sam', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 3, code: null, now });
      const go = (action: Parameters<typeof applyAction>[1], deviceId: string) => {
        const r = applyAction(g, action, { deviceId, now, rng });
        if (!r.ok) throw new Error(r.error);
        g = r.game;
      };
      go({ type: 'start' }, 'h');
      // Let the greetings and the first cards go by.
      for (let i = 0; i < 6 && !g.hand; i++) {
        now = g.wakeAt!;
        go({ type: 'tick' }, 'server');
      }
      const me = g.players[0];
      for (const [msg, kind] of [['nice', 'thanks'], ['lucky', 'ribbed'], ['gl', 'goodLuck'], ['gg', 'gg'], ['wow', null]] as const) {
        // Quiet table first, so a bot is free to answer.
        now += 10_000;
        g.pendingTalk = undefined;
        go({ type: 'react', id: msg }, 'h');
        const planned = (): Game['pendingTalk'] => g.pendingTalk;
        if (!planned()) {
          // No answer is planned: nothing is said for it (and 'wow' never gets one).
          continue;
        }
        expect(kind, `${msg} should have no answer`).not.toBeNull();
        expect(planned()!.event).toBe(kind);
        expect(planned()!.forId).toBe(me.id);
        const before = JSON.stringify(g.reactions);
        now = planned()!.at;
        go({ type: 'tick' }, 'server');
        const speaker = Object.entries(g.reactions ?? {}).find(([id, r]) => id !== me.id && r.id.split(':')[2] === kind);
        expect(speaker, `${msg} → ${kind}: nobody answered (was ${before})`).toBeDefined();
        said++;
        answered[kind!] = (answered[kind!] ?? 0) + 1;
        if (speaker![1].to === me.id) named++;
      }
    }
    // Over sixty tables each kind gets answered often, and the answer knows who it's for.
    for (const kind of ['thanks', 'ribbed', 'goodLuck', 'gg']) expect(answered[kind] ?? 0, kind).toBeGreaterThan(10);
    expect(named).toBe(said);
  });

  it('lines that name a person never say "you" when they have no one in mind', () => {
    for (const id of ['b:trash:yourBigBet:20', 'b:friendly:yourBigBet:8', 'b:friendly:tiltJab:9']) {
      const text = reactionText(id);
      expect(text, id).toBeTruthy();
      expect(text, id).not.toContain('{you}');
      expect(text, id).not.toMatch(/\byou\b[.!?]*$/i);
    }
  });

  it('stands up to a constant bluffer: folds to its bets less than it folds to an honest player', () => {
    const fold = (other: 'bluffBot' | 'abc') => {
      const rs = [3, 4, 5].map((seed) => simulate(['pro', other], 700, seed * 11)[0].foldToBet);
      return rs.reduce((a, b) => a + b, 0) / rs.length;
    };
    const vsBluffer = fold('bluffBot');
    const vsHonest = fold('abc');
    // Seeing someone bet nearly every street makes it call lighter, though it's not a switch (a constant
    // bluffer still has a real hand part of the time, and calling much more costs chips against it).
    expect(vsBluffer).toBeLessThan(vsHonest - 0.06);
    expect(vsBluffer).toBeGreaterThan(0.1);
  }, 120_000);

  it('learns situational habits: answers to 3-bets and c-bets, bets by street, check-raises, size tells', () => {
    const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 2, code: null, now: 0 });
    const [a, b, c] = g.players;
    const seat = (id: string) => ({ playerId: id, cards: [], bet: 0, total: 20, folded: false, allIn: false, acted: true, shown: false, last: null });
    const act = (street: 'preflop' | 'flop' | 'turn' | 'river', playerId: string, move: 'fold' | 'check' | 'call' | 'bet' | 'raise', to = 0) => ({ street, playerId, move, to });
    const hand = {
      number: 1, seq: 9, buttonId: a.id, sbId: b.id, bbId: c.id, seats: [seat(a.id), seat(b.id), seat(c.id)], deck: [], board: [], street: 'flop' as const,
      toAct: null, currentBet: 0, minRaise: 10, aggressorId: null, runout: false, actAt: null, deadline: null, log: [],
      actions: [
        // A opens, B 3-bets, C folds, A folds to the 3-bet.
        act('preflop', a.id, 'raise', 30), act('preflop', b.id, 'raise', 100), act('preflop', c.id, 'fold'), act('preflop', a.id, 'fold'),
        // (Another round: only B and C see a flop. B raised last before it, so B's flop bet is a c-bet.)
        act('flop', c.id, 'check'), act('flop', b.id, 'bet', 60), act('flop', c.id, 'raise', 200), act('flop', b.id, 'fold'),
      ],
      result: { pots: [{ amount: 40, eligible: [c.id], winners: [c.id] }], won: { [c.id]: 40 }, names: {}, showdown: false },
    };
    updateReads(g, hand);
    const reads = g.reads!;
    // A opened and folded to the 3-bet; B faced the open and 3-bet it; C only ever faced the 3-bet.
    expect(reads[a.id].threeBetFaced).toBe(1);
    expect(reads[a.id].threeBetFolds).toBe(1);
    expect(reads[b.id].openFaced).toBe(1);
    expect(reads[b.id].threeBets).toBe(1);
    expect(reads[c.id].openFaced ?? 0).toBe(0);
    // C checked, B bet (the c-bet), C raised it (a check-raise), B folded on the flop.
    expect(reads[c.id].crOpps).toBe(1);
    expect(reads[c.id].crs).toBe(1);
    expect(reads[b.id].flopFaced).toBe(1);
    expect(reads[b.id].flopFolds).toBe(1);
    expect(reads[c.id].cbetFaced).toBe(1);
    expect(reads[c.id].cbetFolds ?? 0).toBe(0);
    // And a player who folds to a flop bet and a 3-bet reads as one who gives up.
    const read = readOf(reads[b.id]);
    expect(read.foldStreet.flop).toBeGreaterThan(readOf(undefined).foldStreet.flop);
    expect(readOf(reads[a.id]).foldThreeBet).toBeGreaterThan(readOf(undefined).foldThreeBet);
    expect(readOf(reads[c.id]).checkRaise).toBeGreaterThan(readOf(undefined).checkRaise);
  });

  it('learns how often a player bets, with no showdowns needed', () => {
    const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: DEFAULT_SETTINGS, bots: 1, code: null, now: 0 });
    const [me, bot] = g.players;
    const seat = (id: string) => ({ playerId: id, cards: [], bet: 0, total: 20, folded: false, allIn: false, acted: true, shown: false, last: null });
    // Three flops in a row: I bet each time it's checked to, the bot checks and folds.
    for (let n = 1; n <= 3; n++) {
      const hand = {
        number: n, seq: 9, buttonId: me.id, sbId: bot.id, bbId: me.id, seats: [seat(me.id), seat(bot.id)], deck: [], board: [], street: 'flop' as const,
        toAct: null, currentBet: 0, minRaise: 10, aggressorId: me.id, runout: false, actAt: null, deadline: null, log: [],
        actions: [
          { street: 'flop' as const, playerId: bot.id, move: 'check' as const, to: 0 },
          { street: 'flop' as const, playerId: me.id, move: 'bet' as const, to: 20 },
          { street: 'flop' as const, playerId: bot.id, move: 'fold' as const, to: 0 },
        ],
        result: { pots: [{ amount: 40, eligible: [me.id], winners: [me.id] }], won: { [me.id]: 40 }, names: {}, showdown: false },
      };
      updateReads(g, hand);
    }
    expect(g.reads![me.id].bets).toBe(3);
    expect(g.reads![me.id].betOpps).toBe(3);
    expect(g.reads![bot.id].bets ?? 0).toBe(0);
    expect(g.reads![bot.id].betOpps).toBe(3);
    // Eased towards the usual rate, so three bets in three chances is a lean, not a verdict.
    const read = readOf(g.reads![me.id]);
    expect(read.betFreq).toBeGreaterThan(0.6);
    expect(read.betFreq).toBeLessThan(0.8);
    expect(readOf(g.reads![bot.id]).betFreq).toBeLessThan(0.3);
  });

  it('punishes a player who folds to every bet, and the nervous bot folds to pressure', () => {
    const folder = [21, 22].map((seed) => simulate(['pro', 'foldBot'], 1500, seed)[0].bbPer100);
    expect(folder.reduce((a, b) => a + b, 0) / folder.length).toBeGreaterThan(15);
    // The nervous one folds to pressure more than the solid regulars do. (Whether it's winning is a
    // question for many tables at once: the bot lab measures that, one table is too noisy.)
    const mixed = simulate(['nervous', 'pro', 'rock', 'maniac', 'station', 'tag'], 1500, 31);
    const nervous = mixed.find((r) => r.style === 'nervous')!;
    const pro = mixed.find((r) => r.style === 'pro')!;
    expect(nervous.foldToBet).toBeGreaterThan(pro.foldToBet + 0.04);
    expect(nervous.foldToBet).toBeGreaterThan(0.5);
  }, 120_000);

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


describe('bot blunders and table size', () => {
  /** A river spot built on a real hand: the bot holds a full house and has been raised all in for 30 more into a pot of about 1,500. */
  function riverSpot(botName: string) {
    let g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 1, botNames: [botName], code: null, now: 0 });
    const rng = seededRng(3);
    let now = 0;
    const go = (action: Parameters<typeof applyAction>[1], deviceId: string) => {
      const r = applyAction(g, action, { deviceId, now, rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    };
    go({ type: 'start' }, 'h');
    for (let i = 0; i < 20 && !g.hand; i++) {
      now = Math.max(now + 1, g.wakeAt ?? now + 1000);
      go({ type: 'tick' }, 'server');
    }
    const hand = g.hand!;
    const me = g.players[0];
    const bot = g.players[1];
    const mine = hand.seats.find((s) => s.playerId === bot.id)!;
    const theirs = hand.seats.find((s) => s.playerId === me.id)!;
    hand.street = 'river';
    hand.board = ['9s', '7s', '7d', '5d', 'Td'];
    hand.deck = [];
    mine.cards = ['9h', '9c'];
    theirs.cards = ['Ad', 'Qd'];
    mine.bet = 650;
    mine.total = 725;
    theirs.bet = 680;
    theirs.total = 755;
    theirs.allIn = true;
    me.stack = 0;
    bot.stack = 275;
    hand.currentBet = 680;
    hand.minRaise = 650;
    hand.toAct = bot.id;
    hand.aggressorId = me.id;
    hand.actions = [
      { street: 'preflop', playerId: bot.id, move: 'raise', to: 30 },
      { street: 'preflop', playerId: me.id, move: 'call', to: 30 },
      { street: 'flop', playerId: me.id, move: 'check', to: 0 },
      { street: 'flop', playerId: bot.id, move: 'bet', to: 100 },
      { street: 'flop', playerId: me.id, move: 'call', to: 100 },
      { street: 'turn', playerId: me.id, move: 'check', to: 0 },
      { street: 'turn', playerId: bot.id, move: 'bet', to: 125 },
      { street: 'turn', playerId: me.id, move: 'call', to: 125 },
      { street: 'river', playerId: bot.id, move: 'bet', to: 650 },
      { street: 'river', playerId: me.id, move: 'allin', to: 680 },
    ];
    return { g, hand, mine };
  }

  it('never folds a full house for 30 chips into a pot of 1,500, whoever is holding it', () => {
    // 'Ivy' is a nervous bot: its choice noise used to throw hands like this away in about one spot in seven.
    for (const name of ['Ivy', 'Max', 'Luna', 'Kai']) {
      const { g, hand, mine } = riverSpot(name);
      for (let i = 0; i < 150; i++) expect(decide(g, hand, mine, seededRng(i)).move.move, `${name} seed ${i}`).not.toBe('fold');
    }
  });

  it('still lets a nervous bot fold a so-so hand to a big bet (the floor is for clear blunders only)', () => {
    const { g, hand, mine } = riverSpot('Ivy');
    mine.cards = ['Kd', '2c'];
    hand.board = ['9s', '7s', '3d', '5d', 'Td'];
    let folds = 0;
    for (let i = 0; i < 150; i++) if (decide(g, hand, mine, seededRng(i)).move.move === 'fold') folds++;
    expect(folds).toBeGreaterThan(60);
  });

  it('brings a tight style\'s cutoff down as the table shrinks, the same amount for each, so their order stays', () => {
    const tight = ['rock', 'tag', 'trapper', 'nervous'].map((s) => STYLES[s as keyof typeof STYLES].pre.tight);
    expect(tight.every((t, i) => i === 0 || t < tight[i - 1])).toBe(true);
    for (const players of [6, 7, 9]) for (const t of tight) expect(tightLine(t, players)).toBe(t);
    for (const players of [2, 3, 4, 5]) {
      const lines = tight.map((t) => tightLine(t, players));
      lines.forEach((l, i) => expect(l).toBeLessThan(tight[i]));
      expect(lines.every((l, i) => i === 0 || l < lines[i - 1])).toBe(true);
    }
    expect(tightLine(0, 2)).toBe(0);
    expect(tightLine(STYLES.rock.pre.tight, 2)).toBeGreaterThan(STYLES.tag.pre.tight - 0.14);
  });
});
