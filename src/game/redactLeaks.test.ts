import { describe, expect, it } from 'vitest';

import { applyAction, createTable, DEFAULT_SETTINGS, options, redactForDevice, redactLogs, seededRng, VARIANTS, type Game, type Variant } from './index';

const HOST = 'host-device-secret-0001';
/** Whole tables play dozens of hands, each bot move a small simulation. */
const TABLE_MS = 30_000;

function table(variant: Variant): Game {
  const game = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, startingStack: variant === 'ghost' ? 5000 : 1000, turnSeconds: 5, variant }, bots: 3, code: null, now: 0, rng: seededRng(11) });
  const r = applyAction(game, { type: 'start' }, { deviceId: HOST, now: 0, rng: seededRng(11) });
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

/** Cards in the redacted view that this phone must not be able to see. */
function leaks(game: Game): string[] {
  const hand = game.hand;
  if (!hand) return [];
  const host = game.players.find((p) => p.deviceId === HOST)!;
  const view = redactForDevice(game, HOST);
  const wire = JSON.stringify(view);
  const found: string[] = [];
  const secret = new Map<string, string>();
  // Other seats' hole cards, unless they turned them up (or this phone is allowed to peek, which the default settings don't allow).
  for (const s of hand.seats) if (s.playerId !== host.id && !s.shown) for (const c of s.cards) secret.set(c, `hole card of ${s.playerId}`);
  for (const c of hand.deck) secret.set(c, 'deck');
  if (!hand.result?.showdown) for (const c of hand.ghost ?? []) secret.set(c, 'ghost card before showdown');
  if (!hand.result) for (const c of hand.removed ?? []) if (!game.memory?.cards.includes(c)) secret.set(c, 'memory card taken out');
  // Folded or mucked cards a showdown never turned up stay private, but cards on the board are public: drop those.
  for (const c of hand.board) secret.delete(c);
  // Cards this phone legitimately holds (Imposter deals every non-imposter the same two) and the 20 Memory Poker shows everyone first.
  for (const c of hand.seats.find((s) => s.playerId === host.id)?.cards ?? []) secret.delete(c);
  for (const c of game.memory?.cards ?? []) secret.delete(c);
  for (const c of hand.dice?.out ? [hand.dice.out] : []) secret.delete(c);
  for (const c of hand.dice?.in ? [hand.dice.in] : []) secret.delete(c);
  // Slide Switch: a card this phone slid on, or was slid, it has held in its own hand (wherever it went next).
  for (const x of hand.slid ?? []) if (x.from === host.id || x.to === host.id) secret.delete(x.card);
  for (const [card, what] of secret) if (new RegExp(`"${card}"`).test(wire)) found.push(`${what}: ${card}`);
  // Raw device ids of other people, bot internals and the host's own secret on someone else's view.
  for (const p of game.players) if (p.deviceId && p.deviceId !== HOST && wire.includes(p.deviceId)) found.push(`raw device id of ${p.id}`);
  for (const key of ['"style"', '"botProfile"', '"botKind"', '"labStyle"', '"reads"', '"minds"', '"botPlan"', '"deck":["', '"dull"']) if (wire.includes(key)) found.push(`internal field ${key}`);
  if (!hand.result && hand.imposter && view.hand?.imposter && view.hand.imposter !== '?') found.push('imposter id');
  // The hand log: only its own cards and shown ones.
  for (const l of redactLogs(game, HOST)) for (const id of Object.keys(l.holes)) if (!l.shown.includes(id) && id !== host.id) found.push(`log hole cards of ${id}`);
  return found;
}

describe('what a phone is sent never holds what it must not see', { timeout: TABLE_MS }, () => {
  for (const v of VARIANTS.map((x) => x.id)) {
    it(`${v}: no other seat's hidden cards, no deck, no ghost or removed cards, no secrets`, () => {
      let game = table(v);
      const rng = seededRng(5);
      let clock = 0;
      let hands = 0;
      const problems = new Set<string>();
      for (let i = 0; i < 5000 && game.status === 'playing' && hands < 12; i++) {
        const before = game.hand?.number;
        const hand = game.hand;
        const host = game.players.find((p) => p.deviceId === HOST)!;
        const mine = hand?.seats.find((s) => s.playerId === host.id);
        let r;
        if (hand && !hand.result && hand.voting && mine && !hand.votes?.[host.id]) {
          const others = hand.seats.filter((x) => x.playerId !== host.id);
          r = applyAction(game, { type: 'vote', hand: hand.number, playerId: others[Math.floor(rng() * others.length)].playerId }, { deviceId: HOST, now: clock, rng });
        } else if (hand && !hand.result && hand.sliding && mine && !mine.folded && mine.cards.length && !hand.slides?.[host.id]) {
          r = applyAction(game, { type: 'slide', hand: hand.number, card: mine.cards[Math.floor(rng() * mine.cards.length)] }, { deviceId: HOST, now: clock, rng });
        } else if (hand && !hand.result && hand.discarding && mine && !mine.folded && mine.cards.length === 3) {
          r = applyAction(game, { type: 'discard', hand: hand.number, card: mine.cards[Math.floor(rng() * 3)] }, { deviceId: HOST, now: clock, rng });
        } else if (hand && !hand.result && hand.toAct === host.id && mine && !(hand.moment?.gate && clock < hand.moment.until)) {
          const o = options(game, hand, mine);
          const move = o.canCheck ? 'check' : o.toCall <= game.settings.bigBlind * 3 || !o.canFold ? 'call' : 'fold';
          r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move }, { deviceId: HOST, now: clock, rng });
        } else {
          clock = (game.wakeAt ?? clock) + 1;
          r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
        }
        if (!r.ok) throw new Error(r.error);
        game = r.game;
        if (game.hand?.number !== before) hands++;
        for (const f of leaks(game)) problems.add(f.replace(/[0-9a-z]{2}$/, 'XX'));
      }
      expect(hands).toBeGreaterThan(5);
      expect([...problems]).toEqual([]);
    });
  }
});
