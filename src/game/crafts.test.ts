import { describe, expect, it } from 'vitest';
import { simulateTable, TECHNIQUES } from './botSim';
import { continueChance, exploitRead, PRIOR, readOf } from './botRange';
import { NO_CRAFT, STYLES } from './botStyles';
import { LEGENDS, legendStyle } from './legends';
import { fitStyle } from './twinFit';
import { emptyTwin } from './twin';

describe('exploiting what a bot has seen', () => {
  const seen = readOf({ hands: 60, vpip: 20, pfr: 10, betsFaced: 40, foldsToBet: 14, aggr: 20, calls: 20, flopFaced: 14, flopFolds: 2, turnFaced: 14, turnFolds: 10, riverFaced: 12, riverFolds: 2, cbetFaced: 12, cbetFolds: 9, threeBetFaced: 6, threeBetFolds: 5 });

  it('learns a player gives up on the turn but not the river', () => {
    expect(seen.foldStreet.turn).toBeGreaterThan(seen.foldStreet.flop + 0.2);
    expect(seen.foldStreet.turn).toBeGreaterThan(seen.foldStreet.river + 0.2);
    expect(seen.foldCbet).toBeGreaterThan(PRIOR.foldCbet);
    expect(seen.foldThreeBet).toBeGreaterThan(PRIOR.foldThreeBet);
  });

  it('acts on it as hard as the bot is built to: not at all at 0, fully at 1, harder above', () => {
    const none = exploitRead(seen, 0);
    expect(none.foldStreet.turn).toBeCloseTo(seen.foldToBet, 5);
    expect(none.foldCbet).toBeCloseTo(PRIOR.foldCbet, 5);
    expect(none.foldThreeBet).toBeCloseTo(PRIOR.foldThreeBet, 5);
    const full = exploitRead(seen, 1);
    expect(full.foldStreet.turn).toBeCloseTo(seen.foldStreet.turn, 5);
    const more = exploitRead(seen, 1.5);
    expect(more.foldStreet.turn).toBeGreaterThan(full.foldStreet.turn);
    expect(more.foldStreet.turn).toBeLessThanOrEqual(0.98);
  });

  it("a player who folds the turn is bet into more, one who never folds the river is paid off less", () => {
    const f = exploitRead(seen, 1);
    // A middle pair (tier 3) facing a half-pot bet: more likely to give up where they give up.
    const turn = continueChance(3, 0.5, false, f, 0, false, 'turn');
    const river = continueChance(3, 0.5, true, f, 0, false, 'river');
    const general = continueChance(3, 0.5, false, f, 0, false);
    expect(turn).toBeLessThan(general);
    expect(river).toBeGreaterThan(turn);
  });
});

describe('techniques', () => {
  it('belong to the styles and legends, and a twin has none of them', () => {
    for (const style of Object.values(STYLES)) expect(style.craft, style.id).toBeDefined();
    // Every style has a few techniques of its own, and no two are the same.
    const crafts = Object.values(STYLES).map((s) => JSON.stringify(s.craft));
    expect(new Set(crafts).size).toBe(Object.keys(STYLES).length);
    const twin = fitStyle(emptyTwin());
    expect(twin.craft).toEqual({ ...NO_CRAFT, pets: [] });
    for (const l of LEGENDS) expect(legendStyle(l).craft.exploit).toBeGreaterThan(0);
  });

  it('show up in play: a short table counts the chances to c-bet, barrel, float and so on', () => {
    const r = simulateTable(['pro', 'shark', 'lag', 'tag', 'station', 'rock'], 400, 7).seats;
    for (const seat of r) {
      for (const k of TECHNIQUES) {
        expect(seat.craft[k]).toBeGreaterThanOrEqual(0);
        expect(seat.craft[k]).toBeLessThanOrEqual(1);
      }
    }
    expect(r.some((s) => s.craftN.cbetDry > 5)).toBe(true);
    expect(r.some((s) => s.craftN.barrel2 > 5)).toBe(true);
    expect(r.some((s) => s.craftN.checkRaise > 0)).toBe(true);
  }, 60_000);

  it('are told apart by how often they use them: the aggressive styles c-bet and barrel more than the cautious ones', () => {
    // A big enough sample that the order of events (which the table talk can shift) doesn't swing it.
    const lag = simulateTable(['lag', 'pro', 'tag', 'station', 'rock', 'nervous'], 2400, 3).seats;
    const rock = lag.find((s) => s.style === 'rock')!;
    const nervous = lag.find((s) => s.style === 'nervous')!;
    const aggressive = lag.find((s) => s.style === 'lag')!;
    expect(aggressive.craft.barrel2).toBeGreaterThan(nervous.craft.barrel2 - 0.05);
    expect(aggressive.craft.cbetDry).toBeGreaterThan(rock.craft.cbetDry - 0.2);
  }, 180_000);
});
