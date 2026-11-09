import { describe, expect, it } from 'vitest';

import { applyAction, createTable, DEFAULT_SETTINGS, parseAction, seededRng, VARIANTS, type Game, type Variant } from './index';

const HOST = 'host-device-secret-0001';
const GUEST = 'guest-device-secret-002';
const OUTSIDER = 'outsider-device-secret3';
/** Whole tables play thousands of steps, each bot move a small simulation. */
const TABLE_MS = 60_000;

const MOVES = ['fold', 'check', 'call', 'raise', 'allin', 'bet', 'nope', '', 7, null];
const JUNK_NUMBERS = [0, 1, -1, 5, 20, 100, 1e9, 1e308, NaN, Infinity, 0.5, '12', null];

const chips = (g: Game) => g.players.reduce((n, p) => n + p.stack, 0) + (g.hand && !g.hand.result ? g.hand.seats.reduce((n, s) => n + s.total, 0) + (g.hand.carry ?? 0) : 0) + (g.ghostPot ?? 0);

/** One random thing a phone could send: sometimes well formed, often not. */
function junk(g: Game, rnd: () => number): unknown {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const hand = g.hand;
  const ids = [...g.players.map((p) => p.id), 'nobody', '', '__proto__'];
  const cards = [...(hand?.seats.flatMap((s) => s.cards) ?? []), ...(hand?.board ?? []), 'As', 'Zz', '', '2'];
  const num = () => pick(JUNK_NUMBERS);
  const h = rnd() < 0.8 ? (hand?.number ?? 1) : num();
  switch (Math.floor(rnd() * 16)) {
    case 0: return { type: 'act', hand: h, seq: rnd() < 0.7 ? hand?.seq : num(), move: pick(MOVES), to: num() };
    case 1: return { type: 'next', hand: h };
    case 2: return { type: 'hit', hand: h, seq: hand?.seq ?? num() };
    case 3: return { type: 'discard', hand: h, card: pick(cards) };
    case 4: return { type: 'vote', hand: h, playerId: pick(ids) };
    case 5: return { type: 'point', hand: h, playerId: rnd() < 0.2 ? null : pick(ids) };
    case 6: return { type: 'show', hand: h };
    case 7: return { type: 'revealBots', hand: h, playerId: pick(ids) };
    case 8: return { type: 'react', id: pick(['gg', 'nice', 'b:1', '../x', '', 'thanks', 5]) };
    case 9: return { type: 'sitOut', out: rnd() < 0.5 };
    case 10: return { type: 'rebuy' };
    case 11: return { type: 'react', id: 'gg' };
    case 12: return { type: 'settings', settings: { bigBlind: num(), smallBlind: num(), startingStack: num(), turnSeconds: num(), variant: pick(['holdem', 'ghost', '__proto__', 5, null]) } };
    case 13: return { type: 'addBot', name: pick(['Ace', '', 5, '__proto__']) };
    case 14: return { type: 'playAgain', off: rnd() < 0.5 };
    default: return { type: pick(['tick', 'presence', 'end', 'start', 'join', 'setLook', 'x', 5]), name: 'Zed', emoji: '🙂', online: [HOST] };
  }
}

describe('the engine survives whatever a phone sends', { timeout: TABLE_MS }, () => {
  for (const v of VARIANTS.map((x) => x.id)) {
    it(`${v}: random and invalid actions never throw and never create or lose a chip`, () => {
      const rng = seededRng(21);
      let g = createTable({ hostDeviceId: HOST, name: 'Host', emoji: '😎', settings: { ...DEFAULT_SETTINGS, startingStack: 1000, turnSeconds: 5, variant: v as Variant }, bots: 3, code: null, now: 0, rng: seededRng(3) });
      const started = applyAction(g, { type: 'start' }, { deviceId: HOST, now: 0, rng: seededRng(3) });
      if (!started.ok) throw new Error(started.error);
      g = started.game;
      const joined = applyAction(g, { type: 'join', name: 'Guest', emoji: '🙂' }, { deviceId: GUEST, now: 0, rng });
      if (joined.ok) g = joined.game;
      let start = chips(g);
      let clock = 0;
      let accepted = 0;
      for (let i = 0; i < 700 && g.status !== 'ended'; i++) {
        let r;
        if (rng() < 0.5) {
          clock = (g.wakeAt ?? clock) + 1;
          r = applyAction(g, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
        } else {
          const raw = junk(g, rng);
          const action = parseAction(JSON.parse(JSON.stringify(raw ?? null)));
          if (!action) continue;
          const device = [HOST, GUEST, OUTSIDER][Math.floor(rng() * 3)];
          // `tick`, `presence` and friends are refused by parseAction for phones, but a bug there must not corrupt a table either.
          expect(() => (r = applyAction(g, action, { deviceId: device, now: clock, rng }))).not.toThrow();
          // These legitimately change who holds chips (a new seat, a rebuy, someone leaving), so the total is counted again after them.
          if (r?.ok && ['join', 'addBot', 'rebuy', 'settings', 'playAgain', 'start', 'end'].includes(action.type)) {
            g = r.game;
            start = chips(g);
            accepted++;
            continue;
          }
        }
        if (!r) continue;
        if (r.ok) {
          accepted++;
          g = r.game;
          expect(chips(g)).toBe(start);
        }
        for (const p of g.players) {
          expect(Number.isFinite(p.stack)).toBe(true);
          expect(p.stack).toBeGreaterThanOrEqual(0);
        }
      }
      expect(accepted).toBeGreaterThan(50);
    });
  }
});
