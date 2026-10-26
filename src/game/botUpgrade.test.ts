import { describe, expect, it } from 'vitest';
import { BOTS, STYLES, styleOf } from './botStyles';
import { VOICE_NAMES } from './botProfiles';
import { botLineText, botSays } from './botTalk';
import { composeDialogue, DIALOGUE, dialogueIntent, dialogueText } from './botDialogue';
import { betOutcome, classOfInts, equityOf, jamOutcome, readOf, riverRange, type Opponent } from './botRange';
import { contestablePot, inPosition, preflopGto, updateReads } from './botPlay';
import { cardsShown, updateMinds } from './botMind';
import { seededRng } from './cards';
import { toInt } from './botEval';
import { isEmoji } from './emoji';
import { isNameBlocked } from './names';
import { reactionText } from './reactions';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { redactForDevice } from './redact';
import { parseAction } from './validate';
import type { Game, Hand } from './types';

function table(): Game {
  return createTable({
    hostDeviceId: 'host',
    name: 'Guest',
    emoji: '🙂',
    settings: DEFAULT_SETTINGS,
    bots: 1,
    botNames: ['Dave B'],
    code: null,
    now: 0,
  });
}
function hand(game: Game): Hand {
  const ids = game.players.map((p) => p.id);
  return {
    number: 1,
    seq: 1,
    buttonId: ids[0],
    sbId: ids[0],
    bbId: ids[1],
    seats: ids.map((id, i) => ({
      playerId: id,
      cards: i ? ['As', 'Ad'] : ['Kc', 'Kd'],
      bet: 0,
      total: 100,
      folded: false,
      allIn: false,
      acted: false,
      shown: false,
      last: null,
    })),
    deck: ['Qs', 'Ts'],
    board: ['2c', '7d', '9h', 'Js', '3s'],
    street: 'river',
    toAct: ids[1],
    currentBet: 0,
    minRaise: 10,
    aggressorId: ids[0],
    runout: false,
    actAt: null,
    deadline: null,
    result: null,
    log: [],
    actions: [],
    startStacks: Object.fromEntries(ids.map((id) => [id, 1000])),
  };
}
const rng = () => 0;

describe('individual offline players', () => {
  it('has 600 new regulars and 40 compatible names, valid for existing tables', () => {
    expect(BOTS.length).toBe(640);
    expect(new Set(BOTS.map((b) => b.name.toLowerCase())).size).toBe(640);
    expect(new Set(BOTS.map((b) => b.profile.id)).size).toBe(640);
    expect(new Set(BOTS.map((b) => b.profile.voice)).size).toBe(VOICE_NAMES.length);
    for (const b of BOTS) {
      expect(b.name.length).toBeLessThanOrEqual(10);
      expect(isNameBlocked(b.name), b.name).toBe(false);
      expect(isEmoji(b.emoji), b.emoji).toBe(true);
    }
  });
  it('gives identities distinct bounded strategies without mutating foundation styles', () => {
    const before = JSON.stringify(STYLES);
    const fingerprints = new Set<string>();
    for (const b of BOTS) {
      const s = styleOf(b.style, b.profile.id);
      fingerprints.add(JSON.stringify([s.pre, s.post, s.adapt, s.tempo]));
      expect(s.post.sense).toBeGreaterThan(0);
      expect(s.post.sense).toBeLessThanOrEqual(1);
      expect(s.adapt).toBeGreaterThanOrEqual(0.12);
      expect(s.post.wobble).toBeGreaterThan(0);
      expect(styleOf(b.style, b.profile.id)).toBe(s);
    }
    expect(fingerprints.size).toBe(640);
    expect(JSON.stringify(STYLES)).toBe(before);
  });
  it('keeps identity, dialogue and learning state private and compatible with old games', () => {
    const g = table(),
      bot = g.players[1];
    expect(bot.botProfile).toBe(BOTS.find((b) => b.name === bot.name)!.profile.id);
    botSays(g, bot.id, 'welcome', rng, 1000, true);
    const copy = JSON.parse(JSON.stringify(g));
    expect(reactionText(copy.reactions[bot.id].id)).toBeTruthy();
    expect(redactForDevice(g, 'host').players[1].botProfile).toBeUndefined();
    expect(redactForDevice(g, 'host').dialogue).toBeUndefined();
    expect(styleOf('pro')).toBe(STYLES.pro);
    expect(styleOf('invalid', 'missing')).toBe(STYLES.pro);
  });
});

describe('local dialogue', () => {
  it('decodes every authored variant safely within the existing bubble size', () => {
    let variants = 0;
    for (const intent of Object.keys(DIALOGUE))
      for (let voice = 0; voice < 12; voice++) {
        for (let i = 0; i < 32; i++)
          for (let frame = 0; frame < 7; frame++) {
            const id = `b:local:${intent}:${i}:${voice}:${frame}`;
            const text = botLineText(id);
            if (!text) continue;
            expect(text.replaceAll('{you}', '1234567890').length).toBeLessThanOrEqual(52);
            expect(text).not.toMatch(/undefined|NaN/);
            expect(parseAction({ type: 'react', id })).toBeNull();
            variants++;
          }
      }
    expect(variants).toBeGreaterThan(20_000);
  });
  it('always addresses a heads-up greeting to the player, including every voice', () => {
    for (let voice = 0; voice < 12; voice++) for (let i = 0; i < 11; i++) {
      const text = reactionText(`b:local:hello:${i}:${voice}:0`, 'Sam');
      expect(text).toContain('Sam');
    }
  });

  it('rejects malformed IDs and preserves old saved reactions', () => {
    for (const id of [
      'b:local:__proto__:0:0:0',
      'b:local:hello:0:999:0',
      'b:local:hello:-1:0:0',
      'b:local:hello:0:0:999',
      'b:local:hello:1.5:0:0',
      'b:pro:missing:0',
      'b:__proto__:bigWin:0',
      'b:local:hello:0:0:0:extra',
    ])
      expect(botLineText(id)).toBe('');
    expect(botLineText('b:trash:bigWin:0')).toBe('Ship it!');
  });
  it('does not repeat a clause until an event bank is exhausted, including after storage reload', () => {
    let g = table();
    const id = g.players[1].id,
      random = seededRng(42);
    const lines: string[] = [];
    for (let i = 0; i < DIALOGUE.raise.length; i++) {
      const line = composeDialogue(g, id, 'raise', random);
      lines.push(dialogueText(line));
      g = JSON.parse(JSON.stringify(g));
    }
    // Frames may vary, but the stored base clauses must all be different.
    expect(new Set(g.dialogue![id].recent).size).toBe(DIALOGUE.raise.length);
    expect(lines.every(Boolean)).toBe(true);
    for (let i = 0; i < 200; i++) composeDialogue(g, id, 'raise', random);
    expect(g.dialogue![id].recent.length).toBeLessThanOrEqual(24);
  });
  it('drops departed seats from dialogue memory', () => {
    const g = table(), id = g.players[1].id;
    g.dialogue = { departed: { recent: ['Old line.'], lastIntent: 'win' } };
    composeDialogue(g, id, 'welcome', seededRng(1));
    expect(g.dialogue!.departed).toBeUndefined();
    expect(Object.keys(g.dialogue!)).toEqual([id]);
  });

  it('uses observed multi-street pressure, rivalries and real results', () => {
    const g = table(),
      id = g.players[1].id,
      opponent = g.players[0].id;
    g.hand = hand(g);
    g.hand.actions = [
      { playerId: opponent, street: 'flop', move: 'bet', to: 20 },
      { playerId: opponent, street: 'turn', move: 'bet', to: 60 },
    ];
    expect(dialogueIntent(g, id, 'yourBigBet', opponent, rng)).toBe('barrel');
    g.hand.actions = [];
    g.minds = { [id]: { tilt: 0.1, confidence: 0, grudges: { [opponent]: 0.6 } } };
    expect(dialogueIntent(g, id, 'thinkHard', opponent, rng)).toBe('rival');
    g.minds[id].previousLosses = 3;
    expect(dialogueIntent(g, id, 'bigWin', opponent, rng)).toBe('comeback');
  });
  it('answers the actual message rather than choosing an unrelated generic reply', () => {
    const g = table(),
      id = g.players[1].id,
      source = g.players[0].id;
    for (const [message, intent] of [
      ['gl', 'replyLuck'],
      ['laugh', 'replyLaugh'],
      ['b:trash:sweatLose:0', 'replyLoss'],
      ['b:local:bigWin:0:0:0', 'replyWin'],
      ['b:local:showBluff:0:0:0', 'replyBluff'],
    ]) {
      g.reactions = { [source]: { id: message, n: 1 } };
      expect(dialogueIntent(g, id, 'reply', source, rng)).toBe(intent);
    }
  });
  it('never announces an unexposed bluff and never reads opponents’ private cards', () => {
    const g = table(),
      id = g.players[1].id;
    g.hand = hand(g);
    expect(dialogueIntent(g, id, 'bluffWon', undefined, rng)).toBe('win');
    expect(dialogueIntent(g, id, 'bluffCaught', undefined, rng)).toBe('lostToYou');
    const hidden = structuredClone(g);
    hidden.hand!.deck = [];
    hidden.hand!.seats[0].cards = [];
    expect(composeDialogue(hidden, id, 'thinkHard', seededRng(17))).toBe(composeDialogue(g, id, 'thinkHard', seededRng(17)));
    g.hand.seats[1].shown = true;
    expect(dialogueIntent(g, id, 'bluffWon', undefined, rng)).toBe('bluffWon');
  });
  it('respects quiet lessons, cooldowns and table-wide pacing', () => {
    const g = table(),
      id = g.players[1].id;
    // It says how long the line takes to say and read (milliseconds), or 0 when the bot stays quiet.
    expect(botSays(g, id, 'welcome', rng, 0, true)).toBeGreaterThan(0);
    expect(botSays(g, id, 'raise', rng, 100)).toBe(0);
    g.card = { at: 0, hero: ['As', 'Ad'], board: [], script: [] };
    expect(botSays(g, id, 'sweatWin', rng, 5000, true)).toBe(0);
  });
  it('queues a fast reply to a quick message and discards it if the source changes', () => {
    const g = table();
    g.status = 'playing';
    g.hand = hand(g);
    const r = applyAction(g, { type: 'react', id: 'gl' }, { deviceId: 'host', now: 1000, rng });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.game.pendingTalk?.forId).toBe(g.players[0].id);
    expect(r.game.pendingTalk!.at).toBeLessThanOrEqual(2250);
    r.game.reactions![g.players[0].id].n++;
    const next = applyAction(r.game, { type: 'tick' }, { deviceId: 'server', now: 2000, rng });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.game.reactions?.[g.players[1].id]).toBeUndefined();
  });
});

describe('stronger fair inference', () => {
  const opponent: Opponent = { id: 'villain', read: readOf(undefined), story: { pre: 'call', openBb: 0, post: [] } };
  it('enumerates all 990 legal river combos and computes a known equity exactly', () => {
    const hole: [number, number] = [toInt('As'), toInt('Ad')],
      board = ['2c', '7d', '9h', 'Js', '3s'].map(toInt);
    const all = riverRange(hole, board, opponent, new Float64Array(169).fill(1));
    expect(all.n).toBe(990);
    const kings = new Float64Array(169);
    kings[classOfInts(toInt('Kc'), toInt('Kd'))] = 1;
    const vsKings = riverRange(hole, board, opponent, kings);
    expect(vsKings.n).toBe(6);
    expect(equityOf(vsKings)).toBe(1);
    const split = riverRange(
      [toInt('2c'), toInt('3d')],
      ['As', 'Ks', 'Qs', 'Js', 'Ts'].map(toInt),
      opponent,
      new Float64Array(169).fill(1),
    );
    expect(equityOf(split)).toBe(0.5);
  });
  it('never assumes an all-in player can fold to a bluff or raise again', () => {
    const im = riverRange([toInt('As'), toInt('Ad')], ['2c', '7d', '9h', 'Js', '3s'].map(toInt), opponent, new Float64Array(169).fill(1));
    const out = betOutcome(im, [{ ...opponent, allIn: true }], 1, true);
    expect(out.fold).toBe(0);
    expect(out.raised).toBe(0);
    expect(jamOutcome(im, [{ ...opponent, allIn: true }], [0.4]).fold).toBe(0);
  });
  it('prices only reachable pots and ignores all-in seats when determining position', () => {
    const g = table(),
      h = hand(g),
      me = h.seats[1];
    me.total = 50;
    h.seats[0].total = 1000;
    expect(contestablePot(h, me, 20)).toBe(120);
    h.seats[0].allIn = true;
    expect(inPosition(h, me.playerId)).toBe(true);
  });
  it('does not mistake an all-in call for another preflop raise', () => {
    const g = table(),
      h = hand(g);
    h.street = 'preflop';
    h.board = [];
    h.actions = [
      { playerId: h.seats[0].playerId, street: 'preflop', move: 'raise', to: 100 },
      { playerId: h.seats[1].playerId, street: 'preflop', move: 'allin', to: 80 },
    ];
    expect(preflopGto(g, h, h.seats[0]).spot).toBe('open');
  });
  it('learns a change of gears quickly without erasing lifetime evidence', () => {
    const g = table(),
      h = hand(g),
      id = h.seats[0].playerId;
    for (let i = 0; i < 25; i++) {
      h.actions = [{ playerId: id, street: 'preflop', move: 'fold', to: 0 }];
      updateReads(g, h);
    }
    const before = readOf(g.reads![id]);
    for (let i = 0; i < 5; i++) {
      h.actions = [{ playerId: id, street: 'preflop', move: 'raise', to: 30 }];
      updateReads(g, h);
    }
    expect(g.reads![id].hands).toBe(30);
    expect(g.reads![id].recent!.hands).toBeLessThanOrEqual(5.01);
    const learned = readOf(g.reads![id]);
    expect(learned.pfr - before.pfr).toBeGreaterThan(0.2);
    expect(learned.pfr).toBeGreaterThan((5 + 8 * 0.16) / 38);
    h.actions = [{ playerId: id, street: 'flop', move: 'fold', to: 0, outOfTurn: true }];
    updateReads(g, h);
    expect(g.reads![id].foldsToBet).toBe(0);
  });
  it('remembers recovery and preserves it when shown a bluff later', () => {
    const g = table(),
      h = hand(g),
      id = h.seats[1].playerId;
    h.result = { pots: [], won: { [id]: 200 }, names: {}, showdown: false };
    g.minds = { [id]: { tilt: 0.4, confidence: -0.2, lossStreak: 3 } };
    updateMinds(g, h);
    expect(g.minds[id].previousLosses).toBe(3);
    expect(g.minds[id].winStreak).toBe(1);
    cardsShown(g, h, g.players[0].id);
    expect(g.minds[id].previousLosses).toBe(3);
  });
});
