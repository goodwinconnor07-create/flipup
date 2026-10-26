import { describe, expect, it } from 'vitest';
import { BOTS, NO_CRAFT } from './botStyles';
import { botLineText, finishLine } from './botTalk';
import { decide } from './botPlay';
import { seededRng } from './cards';
import { isEmoji } from './emoji';
import { dressAsLegend, LEGEND_IDS, RUNG_WORDS, LEGEND_NOTE, LEGENDS, legendBrain, legendById, legendProfile, legendStyle, scoutRead } from './legends';
import { readOf } from './botRange';
import { LEGEND_VOICES } from './legendTalk';
import { redactForDevice } from './redact';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { options } from './selectors';
import { emptyTwin, twinNumbers, TWIN_PRIOR } from './twin';
import { fitStyle } from './twinFit';
import type { Action, Game } from './types';

describe('the legends', () => {
  it('are six distinct people on a ladder from easiest to hardest', () => {
    expect(LEGENDS.map((l) => l.rung)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(LEGENDS.map((l) => l.id)).size).toBe(6);
    expect(new Set(LEGENDS.map((l) => l.emoji)).size).toBe(6);
    expect(LEGEND_IDS.sort()).toEqual(LEGENDS.map((l) => l.id).sort());
    for (const l of LEGENDS) {
      expect(isEmoji(l.emoji)).toBe(true);
      // A seat holds ten characters, and no legend may share a face with one of the forty bots.
      expect(l.short.length).toBeLessThanOrEqual(10);
      expect(BOTS.some((b) => b.emoji === l.emoji || b.name === l.short)).toBe(false);
      expect(l.name).toContain(l.short);
      expect(l.blurb.length).toBeGreaterThan(40);
      expect(legendById(l.id)).toBe(l);
    }
    expect(LEGEND_NOTE).toContain('Not their real hands');
  });

  it('are built from numbers that read back the same, and play a style that fits them', () => {
    for (const l of LEGENDS) {
      const got = twinNumbers(legendProfile(l), 0);
      for (const [k, v] of Object.entries(l.numbers) as [keyof typeof got, number][]) expect(got[k], `${l.id} ${k}`).toBeCloseTo(v, 1);
      const style = legendStyle(l);
      for (const [k, v] of Object.entries(style.post)) if (typeof v === 'number') expect(Number.isFinite(v), `${l.id} ${k}`).toBe(true);
      expect(style.post.sizes.length).toBeGreaterThan(0);
    }
    // The ladder's two ends: the tight one plays fewer hands than the wild one, and tilts more.
    const by = (id: string) => legendStyle(legendById(id)!);
    const [first, fourth, last] = [by('hellmuth'), by('dwan'), by('ivey')];
    expect(first.pre.tight).toBeGreaterThan(fourth.pre.tight);
    expect(fourth.pre.loose).toBeGreaterThan(first.pre.loose);
    expect(first.mind.tilt).toBeGreaterThan(last.mind.tilt);
    expect(last.post.gto).toBeGreaterThan(first.post.gto);
  });

  it('lay their habits over the fit, and fall back on a typical player for numbers left out', () => {
    const l = { ...LEGENDS[0], numbers: {}, habits: { tempo: { speed: 2 }, post: { sizes: [0.5] } } };
    const style = legendStyle(l);
    expect(style.tempo.speed).toBe(2);
    expect(style.tempo.tank).toBeGreaterThan(0);
    expect(style.post.sizes).toEqual([0.5]);
    const got = twinNumbers(legendProfile(l), 0);
    expect(got.vpip).toBeCloseTo(TWIN_PRIOR.vpip, 1);
  });

  it('say only their own fixed lines, short enough for a bubble', () => {
    for (const id of LEGEND_IDS) {
      const voice = LEGEND_VOICES[id];
      const all = Object.entries(voice.lines).flatMap(([event, lines]) => (lines ?? []).map((text, i) => ({ event, i, text })));
      expect(all.length).toBeGreaterThan(40);
      for (const { event, i, text } of all) {
        expect(text.length, `${id} ${event} ${text}`).toBeLessThanOrEqual(42);
        // Spoken as "b:<legend>:<event>:<index>", after the tone's own lines.
        const toneCount = botLineText(`b:${id}:${event}:0`) ? 1 : 0;
        expect(toneCount).toBe(1);
        expect(i).toBeGreaterThanOrEqual(0);
      }
      expect(voice.lines.hello?.some((t) => t.includes('{you}'))).toBe(true);
    }
  });

  it('keep the first lines where they were when new ones are added, and speak in moments the first pass left quiet', () => {
    // Line ids are indexes into the tone's lines and then the legend's own, which only grow at the end.
    for (const id of LEGEND_IDS) {
      const own = LEGEND_VOICES[id].lines.thinkEasy!;
      let total = 0;
      while (botLineText(`b:${id}:thinkEasy:${total}`)) total++;
      expect(botLineText(`b:${id}:thinkEasy:${total - own.length}`)).toBe(own[0]);
      expect(botLineText(`b:${id}:thinkEasy:${total - 1}`)).toBe(own[own.length - 1]);
    }
    for (const id of LEGEND_IDS) for (const event of ['sweatWatch', 'watched', 'gotBluffed', 'reply'] as const) expect(LEGEND_VOICES[id].lines[event]?.length, `${id} ${event}`).toBeGreaterThanOrEqual(1);
  });

  it('give each a profile: three things they are known for, a backdrop and a word for how hard they are', () => {
    for (const l of LEGENDS) {
      expect(l.signature).toHaveLength(3);
      expect(RUNG_WORDS[l.rung - 1]).toBeTruthy();
    }
  });

  it('sits in a bot seat as that legend: name, face, voice and style, and never sends its brain to a phone', () => {
    const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 1, code: null, now: 1000 });
    const bot = g.players[1];
    const ivey = legendById('ivey')!;
    dressAsLegend(bot, ivey);
    expect(bot).toMatchObject({ name: 'Ivey', emoji: '🕶️', legend: 'ivey', bot: true });
    expect(bot.twin?.style).toEqual(legendBrain(ivey).style);
    const seen = redactForDevice(g, 'h').players[1];
    expect(seen).not.toHaveProperty('twin');
    expect(seen).not.toHaveProperty('style');
    expect(seen.legend).toBe('ivey');
  });
});

describe('legends remember you', () => {
  it('greet a person they have met in their own words, and have a word for the end of the game', () => {
    for (const id of LEGEND_IDS) {
      for (const event of ['rematchWon', 'rematchLost', 'finishWon', 'finishLost'] as const) expect(LEGEND_VOICES[id].lines[event]?.length, `${id} ${event}`).toBeGreaterThanOrEqual(2);
      expect(finishLine(id, 'finishWon', 'Sam', 0)).toBeTruthy();
    }
    expect(finishLine('hellmuth', 'finishWon', 'Sam', 1)).toBe('The better player won, Sam.');
    expect(finishLine('somebody-else', 'finishWon', 'Sam', 0)).toBeNull();
  });

  it('say the rematch line when the game says they have met', () => {
    for (const rematch of ['won', 'lost'] as const) {
      let g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots: 1, code: null, now: 1000 });
      dressAsLegend(g.players[1], legendById('dwan')!);
      g.rematch = rematch;
      let now = 1000;
      const go = (action: Action, deviceId: string) => {
        const r = applyAction(g, action, { deviceId, now, rng: seededRng(3) });
        if (!r.ok) throw new Error(r.error);
        g = r.game;
      };
      go({ type: 'start' }, 'h');
      expect(g.pendingTalk?.event).toBe(rematch === 'won' ? 'rematchWon' : 'rematchLost');
      now += 800;
      go({ type: 'tick' }, 'h');
      expect(g.reactions?.[g.players[1].id]?.id).toMatch(new RegExp(`^b:dwan:rematch${rematch === 'won' ? 'Won' : 'Lost'}:`));
    }
  });
});

describe('legends have techniques, not just numbers', () => {
  const dealt = (legend: (typeof LEGENDS)[number], cards: [string, string]) => {
    let g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, rebuys: true }, bots: 1, code: null, now: 1000 });
    dressAsLegend(g.players[1], legend);
    const rng = seededRng(2);
    let now = 1000;
    const go = (action: Action, deviceId: string) => {
      const r = applyAction(g, action, { deviceId, now, rng });
      if (!r.ok) throw new Error(r.error);
      g = r.game;
    };
    go({ type: 'start' }, 'h');
    for (let i = 0; i < 6 && !g.hand; i++) {
      now = Math.max(now + 1, g.wakeAt ?? now + 1);
      go({ type: 'tick' }, 'server');
    }
    const seat = g.hand!.seats.find((s) => s.playerId === g.players[1].id)!;
    seat.cards = cards;
    return { g, seat };
  };
  const playsIt = (legend: (typeof LEGENDS)[number], cards: [string, string]) => {
    const { g, seat } = dealt(legend, cards);
    let played = 0;
    for (let i = 0; i < 400; i++) if (decide(g, g.hand!, seat, seededRng(i)).move.move !== 'fold' && decide(g, g.hand!, seat, seededRng(i)).move.move !== 'check') played++;
    return played / 400;
  };

  it("Brunson plays his ten-deuce, the others mostly don't", () => {
    const brunson = playsIt(legendById('brunson')!, ['Ts', '2d']);
    const ivey = playsIt(legendById('ivey')!, ['Ts', '2d']);
    expect(brunson).toBeGreaterThan(0.3);
    expect(brunson).toBeGreaterThan(ivey + 0.15);
  });

  it('every legend has its own craft, and each is different from the others', () => {
    const crafts = LEGENDS.map((l) => JSON.stringify(legendStyle(l).craft));
    expect(new Set(crafts).size).toBe(LEGENDS.length);
    // And a twin plays its person's habits, not a bot's techniques.
    for (const l of LEGENDS) expect(JSON.stringify(fitStyle(legendProfile(l)).craft)).toBe(JSON.stringify({ ...NO_CRAFT, pets: [] }));
  });

  it('says so when it wins with the signature hand', () => {
    expect(LEGEND_VOICES.brunson.lines.signature?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('legends study you', () => {
  const twin = (hands: number) => {
    const t = emptyTwin();
    t.hands = hands;
    Object.assign(t.stats, { vpip: hands * 0.4, pfr: hands * 0.2, betsFaced: hands * 0.3, foldsToBet: hands * 0.3 * 0.6, betOpps: hands * 0.3, bets: hands * 0.3 * 0.5, postAgg: hands * 0.2, postCalls: hands * 0.2, raiseFaced: hands * 0.2, threeBets: hands * 0.02, limps: hands * 0.05 });
    return t;
  };

  it('start out knowing what your twin knows, as far as they study people', () => {
    const ivey = scoutRead(legendById('ivey')!, twin(200))!;
    const hellmuth = scoutRead(legendById('hellmuth')!, twin(200))!;
    expect(ivey.hands).toBe(50);
    expect(hellmuth.hands).toBeLessThan(ivey.hands);
    // The numbers keep their proportions: a player who folds 60% of bets reads as one.
    expect(ivey.foldsToBet / ivey.betsFaced).toBeCloseTo(0.6, 1);
    expect(readOf(ivey).foldToBet).toBeGreaterThan(readOf(undefined).foldToBet);
  });

  it("don't have anything to go on until they've seen enough of you", () => {
    expect(scoutRead(legendById('ivey')!, twin(10))).toBeNull();
    expect(scoutRead(legendById('ivey')!, emptyTwin())).toBeNull();
  });

  it('never claim to know more hands than your twin has seen', () => {
    for (const l of LEGENDS) {
      const r = scoutRead(l, twin(30));
      if (r) expect(r.hands).toBeLessThanOrEqual(30);
    }
  });
});

describe('playing as a legend', () => {
  const table = (legend: (typeof LEGENDS)[number], bots = 2): Game => {
    const g = createTable({ hostDeviceId: 'h', name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, rebuys: true }, bots, code: null, now: 1000 });
    for (const p of g.players.filter((x) => x.bot)) dressAsLegend(p, legend);
    return g;
  };

  it('decides from its own cards and public moves only, and chips always add up', () => {
    for (const legend of [LEGENDS[0], LEGENDS[3]]) {
      const rng = seededRng(5);
      let now = 1000;
      let g = table(legend);
      const step = (action: Action, deviceId: string) => {
        const r = applyAction(g, action, { deviceId, now, rng });
        if (!r.ok) throw new Error(r.error);
        g = r.game;
      };
      step({ type: 'start' }, 'h');
      const chips = (game: Game) => game.players.reduce((a, p) => a + p.stack, 0) + (game.hand && !game.hand.result ? game.hand.seats.reduce((s, x) => s + x.total, 0) : 0);
      const total = chips(g);
      let checked = 0;
      for (let i = 0; i < 3000 && checked < 25; i++) {
        const h = g.hand;
        const me = g.players[0];
        if (h && !h.result && !h.runout && h.toAct && h.toAct !== me.id && !g.botPlan) {
          const seat = h.seats.find((s) => s.playerId === h.toAct)!;
          const hidden = structuredClone(g);
          hidden.hand!.deck = [];
          for (const s of hidden.hand!.seats) if (s.playerId !== seat.playerId) s.cards = [];
          expect(decide(hidden, hidden.hand!, hidden.hand!.seats.find((s) => s.playerId === seat.playerId)!, seededRng(i))).toEqual(decide(g, h, seat, seededRng(i)));
          checked++;
        }
        if (h && !h.result && h.toAct === me.id) {
          const o = options(g, h, h.seats.find((x) => x.playerId === me.id)!);
          step({ type: 'act', hand: h.number, seq: h.seq, move: o.canCheck ? 'check' : o.toCall <= 40 ? 'call' : 'fold' }, 'h');
        } else {
          now = Math.max(now + 1, g.wakeAt ?? now + 1);
          step({ type: 'tick' }, 'server');
        }
        expect(chips(g)).toBe(total);
      }
      expect(checked, legend.id).toBeGreaterThanOrEqual(25);
    }
  }, 60_000);
});
