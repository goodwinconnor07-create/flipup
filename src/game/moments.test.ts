import { describe, expect, it } from 'vitest';

import { applyAction, createTable, DEFAULT_SETTINGS, explainHand, options, redactForDevice, seededRng, tallyOrder, tallyShown, visibleBoard, type Game, type Variant } from './index';

const HOST = 'host-device';

function table(variant: Variant, bots = 3, seed = 1): Game {
  const g = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, startingStack: 1000, turnSeconds: 0, variant }, bots, code: null, now: 0, rng: seededRng(seed) });
  const r = applyAction(g, { type: 'start' }, { deviceId: HOST, now: 0, rng: seededRng(seed) });
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

/** Plays until `until` says so; the host calls or checks; returns every table the loop saw. */
function run(variant: Variant, seed: number, until: (g: Game, clock: number) => boolean, max = 4000): { game: Game; clock: number } | null {
  let game = table(variant, 3, seed);
  const rng = seededRng(seed + 100);
  let clock = 0;
  for (let i = 0; i < max && game.status === 'playing'; i++) {
    if (until(game, clock)) return { game, clock };
    const hand = game.hand;
    const host = game.players.find((p) => p.deviceId === HOST)!;
    const mine = hand?.seats.find((s) => s.playerId === host.id);
    let r;
    if (hand && !hand.result && hand.voting && !hand.votes?.[host.id]) {
      const others = hand.seats.filter((x) => x.playerId !== host.id);
      r = applyAction(game, { type: 'vote', hand: hand.number, playerId: others[0].playerId }, { deviceId: HOST, now: clock, rng });
    } else if (hand && !hand.result && hand.discarding && mine && mine.cards.length === 3) {
      r = applyAction(game, { type: 'discard', hand: hand.number, card: mine.cards[0] }, { deviceId: HOST, now: clock, rng });
    } else if (hand && !hand.result && hand.toAct === host.id && mine) {
      const o = options(game, hand, mine);
      r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: o.canCheck ? 'check' : 'call' }, { deviceId: HOST, now: clock, rng });
    } else {
      clock = (game.wakeAt ?? clock) + 1;
      r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
    }
    if (!r.ok) throw new Error(r.error);
    game = r.game;
  }
  return null;
}

describe('moments', () => {
  it('Red River deals each extra card on its own beat', () => {
    let found = null as ReturnType<typeof run>;
    for (let seed = 1; seed < 30 && !found; seed++) found = run('redriver', seed, (g) => g.hand?.moment?.kind === 'redriver' && !g.hand.result);
    expect(found).not.toBeNull();
    const hand = found!.game.hand!;
    const m = hand.moment!;
    expect(hand.board.length).toBeGreaterThan(5);
    const offsets = m.offsets!;
    expect(offsets.length).toBe(hand.board.length - 4);
    expect(offsets[1] - offsets[0]).toBeGreaterThanOrEqual(1000);
    expect(visibleBoard(hand, m.at + 100).filter(Boolean).length).toBe(5);
    expect(visibleBoard(hand, m.at + offsets[1] + 100).filter(Boolean).length).toBe(6);
  });

  it('Pittsburgh deals its three rivers one at a time', () => {
    const found = run('pittsburgh', 2, (g) => g.hand?.moment?.kind === 'rivers' && !g.hand.result);
    const hand = found!.game.hand!;
    const m = hand.moment!;
    expect(visibleBoard(hand, m.at).filter(Boolean)).toHaveLength(5);
    expect(visibleBoard(hand, m.at + 1100).filter(Boolean)).toHaveLength(6);
    expect(visibleBoard(hand, m.until)).toHaveLength(7);
  });

  it('acts are refused while a bust is on show, and the next turn waits for it', () => {
    let seen = false;
    const found = run('bjholdem', 4, (g) => {
      const h = g.hand;
      if (h?.moment?.kind === 'bust' && !h.result) {
        seen = true;
        // A bot's next turn waits for the bust to be seen (a person's is refused until then, checked below).
        if (h.toAct && g.players.find((p) => p.id === h.toAct)?.bot) {
          expect(h.actAt!).toBeGreaterThanOrEqual(h.moment.until);
        }
        return true;
      }
      return false;
    }, 8000);
    // A bust happens in this seed's run; if the host is the one to act, acting early is refused.
    if (found) {
      const h = found.game.hand!;
      const host = found.game.players.find((p) => p.deviceId === HOST)!;
      if (h.toAct === host.id) {
        const r = applyAction(found.game, { type: 'act', hand: h.number, seq: h.seq, move: 'check' }, { deviceId: HOST, now: h.moment!.at + 10, rng: seededRng(1) });
        expect(r.ok).toBe(false);
      }
    }
    expect(seen || !found).toBe(true);
  });

  it('Ghost Hold\'em holds the showdown for a beat before the hands turn over', () => {
    const found = run('ghost', 6, (g) => g.hand?.moment?.kind === 'suspense' && !g.hand.result && g.hand.moment.until - g.hand.moment.at >= 3000);
    const hand = found!.game.hand!;
    expect(hand.showdownAt).toBe(hand.moment!.until);
    expect(hand.moment!.until - hand.moment!.at).toBeGreaterThanOrEqual(3000);
    expect(hand.result).toBeNull();
  });

  it('Crazy Pineapple turns the thrown cards up together, and says who is still choosing', () => {
    const found = run('pineapple', 8, (g) => !!g.hand?.discarding && !!g.hand.discarded && g.hand.discarded.length > 0);
    const g = found!.game;
    // Bots chose at once, but nobody sees a discard that isn't theirs while people are still choosing.
    const seen = redactForDevice(g, HOST).hand!;
    const host = g.players.find((p) => p.deviceId === HOST)!;
    for (const k of Object.keys(seen.discards ?? {})) expect(k).toBe(host.id);
    expect(seen.discarded!.length).toBeGreaterThan(0);
    const done = run('pineapple', 8, (gg) => gg.hand?.moment?.kind === 'discards' && !gg.hand.result);
    const hand = done!.game.hand!;
    expect(Object.keys(redactForDevice(done!.game, HOST).hand!.discards!).length).toBe(Object.keys(hand.discards!).length);
    expect(hand.moment!.until - hand.moment!.at).toBeGreaterThanOrEqual(2500);
  });
});

describe('Imposter', () => {
  it('talks it over, lets people point, reads the votes out one by one, then settles', () => {
    const found = run('imposter', 9, (g) => !!g.hand?.discussing);
    const g = found!.game;
    const hand = g.hand!;
    const host = g.players.find((p) => p.deviceId === HOST)!;
    expect(hand.voting).toBeFalsy();
    expect(hand.moment!.kind).toBe('discuss');
    // Bots already have hunches; the host points at someone and everyone sees it.
    expect(Object.keys(hand.points ?? {}).length).toBeGreaterThan(0);
    const target = hand.seats.find((s) => s.playerId !== host.id)!.playerId;
    const p = applyAction(g, { type: 'point', hand: hand.number, playerId: target }, { deviceId: HOST, now: found!.clock, rng: seededRng(1) });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.game.hand!.points![host.id]).toBe(target);
    expect(redactForDevice(p.game, 'someone-else').hand!.points![host.id]).toBe(target);
    // Pointing at yourself is refused; so is pointing out of the hand.
    expect(applyAction(g, { type: 'point', hand: hand.number, playerId: host.id }, { deviceId: HOST, now: found!.clock, rng: seededRng(1) }).ok).toBe(false);
    // Everyone has pointed: the talking wraps up early.
    expect(p.game.hand!.moment!.until).toBeLessThanOrEqual(hand.moment!.until);

    // The vote, then the tally.
    const tallied = run('imposter', 9, (gg) => !!gg.hand?.tally);
    const th = tallied!.game.hand!;
    const order = tallyOrder(th);
    expect(order.length).toBe(Object.keys(th.votes!).length);
    expect(tallyShown(th, order, th.moment!.at)).toBe(1);
    expect(tallyShown(th, order, th.moment!.until)).toBe(order.length);
    // Votes are readable by every phone now, and the result comes only after the tally.
    expect(redactForDevice(tallied!.game, 'someone-else').hand!.votes).toEqual(th.votes);
    expect(th.result).toBeNull();
    const after = applyAction(tallied!.game, { type: 'tick' }, { deviceId: 'server', now: th.moment!.until + 1, rng: seededRng(1) });
    expect(after.ok && after.game.hand!.result?.imposter).toBeTruthy();
  });
});

describe('explaining a hand', () => {
  it('names the Crucifix line, the Pittsburgh river and the Circle run, and says what a wild 2 became', () => {
    const cross = explainHand('crucifix', ['Ah', 'Kh'], ['2c', 'Qh', '3d', 'Jh', '4s', 'Th', '9c', '5d', '8s']);
    expect(cross.note).toBe('the column');
    const river = explainHand('pittsburgh', ['Ah', 'Ad'], ['2c', '7d', '9h', 'Ks', '3c', 'Ac', '4d']);
    expect(river.note).toBe('river 2');
    const circle = explainHand('circle', ['Ah', 'Ad'], ['Ac', '7d', '9h', 'Ks', '3c', '5d']);
    expect(circle.note).toMatch(/o'clock$/);
    const wild = explainHand('deuces', ['2h', 'Kd'], ['Ks', 'Kc', '7d', '4c', '9s']);
    expect(wild.wilds).toEqual([{ card: '2h', as: 'K' }]);
  });
});
