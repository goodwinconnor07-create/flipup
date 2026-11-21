import { describe, expect, it } from 'vitest';
import { botHits, variantDecide } from './botVariants';
import { seededRng } from './cards';
import { applyAction, createTable, DEFAULT_SETTINGS } from './reducer';
import { VariantFeel } from './variantFeel';
import type { Action, Game } from './types';
import type { Variant } from './variants';

// A short all-bot table of a game, measured the way `npm run bot:variants` does but with looser bands (a short sample is
// noisy). The script is where to tune; this holds the floor: bots bet what they have, don't fold favourites, don't shove junk.
function measure(variant: Variant, hands: number) {
  const rng = seededRng(77);
  let clock = 1_000_000;
  let game: Game = createTable({
    hostDeviceId: 'lab',
    name: 'Host',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, variant, startingStack: 1000, smallBlind: 5, bigBlind: 10, turnSeconds: 30, rebuys: true },
    bots: 5,
    code: null,
    now: clock,
    rng,
  });
  game.legacyBotSimulation = true;
  const host = game.players.find((p) => !p.bot)!;
  const feel = new VariantFeel(variant);
  feel.hostId = host.id;
  const step = (action: Action) => {
    feel.before(game, rng);
    const r = applyAction(game, action, { deviceId: 'lab', now: clock, rng });
    if (r.ok) game = r.game;
    feel.after(game);
    return r.ok;
  };
  step({ type: 'start' } as Action);
  let guard = 0;
  while ((game.hands ?? 0) < hands && guard++ < hands * 700) {
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    if (!game.hand || game.hand.result)
      for (const p of game.players)
        if (p.stack === 0) {
          p.stack = 1000;
          p.bought += 1000;
        }
    const hand = game.hand;
    const seat = hand && !hand.result ? hand.seats.find((x) => x.playerId === host.id) : undefined;
    if (hand && seat && !seat.folded && hand.toAct === host.id && !hand.runout) {
      if (hand.discarding) {
        const card = seat.cards[seat.cards.length - 1];
        if (step({ type: 'discard', hand: hand.number, card })) continue;
      }
      const t = variantDecide(game, hand, seat, rng);
      if (t && step({ type: 'act', hand: hand.number, seq: hand.seq, ...t.move } as Action)) continue;
    }
    feel.before(game, rng);
    const r = applyAction(game, { type: 'tick' } as Action, { deviceId: 'server', now: clock, rng });
    if (r.ok) game = r.game;
    feel.after(game);
  }
  return Object.fromEntries(feel.report().map((m) => [m.id, m]));
}

describe('game mode feel', () => {
  it.each(['pineapple', 'ghost', 'beanstalk'] as Variant[])('%s bots bet what they have and do not fold favourites or shove junk', (variant) => {
    const m = measure(variant, 50);
    const v = (id: string) => m[id].value ?? NaN;
    expect(m.openBetStrong.n).toBeGreaterThan(10);
    expect(v('openBetStrong')).toBeGreaterThan(55);
    // (Ghost bets least: a bluff can't win the pot there)
    expect(v('openBetAny')).toBeGreaterThan(8);
    expect(v('scaredFold')).toBeLessThan(28);
    expect(v('trashAllIn')).toBeLessThan(3);
  }, 300_000);
  it('keeps the exports the lab needs', () => expect(typeof botHits).toBe('function'));
});
