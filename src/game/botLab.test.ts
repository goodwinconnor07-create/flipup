import { describe, expect, it } from 'vitest';

import {
  applyAction,
  createTable,
  DEFAULT_DIALS,
  DEFAULT_SETTINGS,
  DIAL_IDS,
  LAB_DIALS,
  LAB_FACES,
  LAB_NAME_MAX,
  labStyle,
  LIMITS,
  parseAction,
  parseLabBot,
  redactForDevice,
  seededRng,
  type Game,
  type LabDials,
} from './index';
import { EMOJIS } from './emoji';
import { playerStyle } from './botStyles';

const HOST = 'host-device-0001';
const ctx = (now = 1000) => ({ deviceId: HOST, now, rng: seededRng(3) });
const spec = (dials: Partial<LabDials> = {}, name = 'Robo', emoji = '🦾') => ({ name, emoji, dials: { ...DEFAULT_DIALS, ...dials } });

function table(): Game {
  return createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: DEFAULT_SETTINGS, bots: 0, code: null, now: 1000 });
}

describe('Bot Lab', () => {
  it('names fit the table and faces are never a person', () => {
    expect(LAB_NAME_MAX).toBe(LIMITS.maxNameLength);
    for (const f of LAB_FACES) expect((EMOJIS as readonly string[]).includes(f)).toBe(false);
    expect(new Set(LAB_FACES).size).toBe(LAB_FACES.length);
  });

  it('checks a lab bot from the network', () => {
    expect(parseLabBot(spec())).toEqual(spec());
    expect(parseLabBot(spec({ hands: 11 }))).toBeNull();
    expect(parseLabBot(spec({ hands: 2.5 }))).toBeNull();
    expect(parseLabBot({ ...spec(), dials: { ...DEFAULT_DIALS, tone: 'rude' } })).toBeNull();
    // A picker face would let a bot pass for a friend.
    expect(parseLabBot(spec({}, 'Robo', '😎'))).toBeNull();
    expect(parseLabBot(spec({}, '   '))).toBeNull();
    expect(parseLabBot(spec({}, '  Long   name here '))?.name).toBe('Long name');
    expect(parseAction({ type: 'addBot', lab: spec() })).toEqual({ type: 'addBot', lab: spec() });
    expect(parseAction({ type: 'addBot', lab: spec(), name: 'Luna' })).toBeNull();
    expect(parseAction({ type: 'addBot', lab: { ...spec(), dials: null } })).toBeNull();
  });

  it('seats a lab bot with a unique name, and keeps its dials off every phone', () => {
    let game = table();
    for (let i = 0; i < 2; i++) {
      const r = applyAction(game, { type: 'addBot', lab: spec({ bluffing: 9 }) }, ctx());
      expect(r.ok).toBe(true);
      if (r.ok) game = r.game;
    }
    const bots = game.players.filter((p) => p.bot);
    expect(bots.map((p) => p.name)).toEqual(['Robo', 'Robo 2']);
    expect(bots[0].lab?.bluffing).toBe(9);
    expect(playerStyle(bots[0]).post.bluff).toBeGreaterThan(0.05);
    const seen = redactForDevice(game, HOST);
    for (const p of seen.players) {
      expect('lab' in p).toBe(false);
      expect('style' in p).toBe(false);
    }
  });

  it('turns every setting into a style the brain can use', () => {
    const corners: LabDials[] = [0, 10].flatMap((v) => (['friendly', 'trash'] as const).map((tone) => ({ ...Object.fromEntries(DIAL_IDS.map((id) => [id, v])), tone }) as LabDials));
    for (const d of [...corners, DEFAULT_DIALS]) {
      const s = labStyle(d);
      const nums = [...Object.values(s.pre), ...Object.values(s.post).flat(), s.adapt, ...Object.values(s.mind), ...Object.values(s.tempo), ...Object.values(s.show), s.talk.chatty];
      for (const n of nums) expect(Number.isFinite(n)).toBe(true);
      expect(s.post.sizes.length).toBeGreaterThan(0);
      expect(s.tempo.speed).toBeGreaterThan(0);
      expect(s.post.wobble).toBeGreaterThan(0);
      expect(s.talk.tone).toBe(d.tone);
    }
    // Each dial moves what it says.
    const at = (id: keyof LabDials, v: number) => labStyle({ ...DEFAULT_DIALS, [id]: v });
    expect(at('hands', 0).pre.tight).toBeGreaterThan(at('hands', 10).pre.tight);
    expect(at('hands', 10).pre.loose).toBeGreaterThan(at('hands', 0).pre.loose);
    expect(at('aggression', 10).pre.aggro).toBeGreaterThan(at('aggression', 0).pre.aggro);
    expect(at('bluffing', 10).post.bluff).toBeGreaterThan(at('bluffing', 0).post.bluff);
    expect(at('calling', 10).post.sticky).toBeGreaterThan(at('calling', 0).post.sticky);
    expect(at('skill', 10).post.sense).toBeGreaterThan(at('skill', 0).post.sense);
    expect(at('temper', 10).mind.tilt).toBeGreaterThan(at('temper', 0).mind.tilt);
    expect(at('speed', 10).tempo.speed).toBeLessThan(at('speed', 0).tempo.speed);
    expect(at('chat', 10).talk.chatty).toBeGreaterThan(at('chat', 0).talk.chatty);
    expect(LAB_DIALS.map((d) => d.id)).toEqual(DIAL_IDS);
  });

  it('plays hands at a table with lab bots and named bots, keeping every chip', () => {
    let game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, turnSeconds: 5 }, bots: 2, code: null, now: 1000 });
    for (const d of [{ hands: 10, aggression: 10, bluffing: 10 }, { hands: 0, calling: 0, skill: 0 }, { calling: 10, skill: 10, speed: 10 }]) {
      const r = applyAction(game, { type: 'addBot', lab: spec(d, 'Lab') }, ctx());
      if (!r.ok) throw new Error(r.error);
      game = r.game;
    }
    // The host sits out, so the bots play it out between them.
    const start = applyAction(game, { type: 'start' }, ctx());
    if (!start.ok) throw new Error(start.error);
    game = start.game;
    const chips = (g: Game) => g.players.reduce((n, p) => n + p.stack, 0) + (g.hand && !g.hand.result ? g.hand.seats.reduce((n, x) => n + x.total, 0) : 0);
    const total = chips(game);
    const rng = seededRng(7);
    let clock = 1000;
    let hands = 0;
    for (let i = 0; i < 3000 && game.status === 'playing' && hands < 12; i++) {
      const before = game.hand?.number;
      const host = game.players.find((p) => p.deviceId === HOST)!;
      const r =
        game.hand && !game.hand.result && game.hand.toAct === host.id
          ? applyAction(game, { type: 'act', hand: game.hand.number, seq: game.hand.seq, move: 'fold' }, { deviceId: HOST, now: clock, rng })
          : applyAction(game, { type: 'tick' }, { deviceId: 'server', now: (clock = (game.wakeAt ?? clock) + 1), rng });
      if (!r.ok) throw new Error(r.error);
      game = r.game;
      if (game.hand?.number !== before) hands++;
      expect(chips(game)).toBe(total);
    }
    expect(hands).toBeGreaterThan(3);
  });
});
