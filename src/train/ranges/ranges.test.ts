import { describe, expect, it } from 'vitest';
import { isCard } from '../../game/cards';
import { analyse, breakEven, combosOf, equityAgainst, expandHand, optionsFor, priceToCall, replay, shareOf, streetOfBoard, type Scenario } from './model';
import { SCENARIOS } from './scenarios';

describe('hands', () => {
  it('reads pairs, suited, offsuit, exact combos and one-suit hands', () => {
    expect(expandHand('QQ')).toHaveLength(6);
    expect(expandHand('AKs')).toHaveLength(4);
    expect(expandHand('AKo')).toHaveLength(12);
    expect(expandHand('AK')).toHaveLength(16);
    expect(expandHand('AhKh')).toEqual([['Ah', 'Kh']]);
    expect(expandHand('AKs@d')).toEqual([['Ad', 'Kd']]);
  });

  it('leaves out combos that use a card you can see', () => {
    expect(combosOf({ label: '', hands: 'AK', role: 'value' }, ['Ah', 'Kd'])).toHaveLength(9);
  });
});

/** Who acts first after the flop: the blinds, then round to the button. */
const POSTFLOP = ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];

/** The numbers each answer has to agree with. */
function check(s: Scenario) {
  const r = replay(s);
  const views = analyse(s);
  const opts = optionsFor(s, r);
  const pick = opts.find((o) => o.id === s.best)!;
  if (r.toCall > 0) {
    const eq = equityAgainst(views, ['value', 'bluff']);
    if (s.best === 'call') expect(eq, `${s.id}: equity ${eq.toFixed(3)} vs price ${priceToCall(r).toFixed(3)}`).toBeGreaterThanOrEqual(priceToCall(r));
    if (s.best === 'fold') expect(eq, `${s.id}: equity ${eq.toFixed(3)} vs price ${priceToCall(r).toFixed(3)}`).toBeLessThan(priceToCall(r));
    // A value raise has to beat most of what they bet for value.
    if (s.best === 'raise') expect(equityAgainst(views, ['value']), s.id).toBeGreaterThan(0.5);
    return;
  }
  const vsCallers = equityAgainst(views, ['calls', 'raises']);
  if (s.best === 'check') expect(vsCallers, `${s.id}: a bet would get called by better (${vsCallers.toFixed(3)})`).toBeLessThan(0.5);
  else if (s.bluff) expect(shareOf(views, ['folds']), `${s.id}: folds vs break-even ${breakEven(r, pick.amount).toFixed(3)}`).toBeGreaterThan(breakEven(r, pick.amount));
  else expect(vsCallers, `${s.id}: a value bet has to beat most of the hands that continue`).toBeGreaterThan(0.5);
}

describe('every scenario', () => {
  for (const s of SCENARIOS) {
    describe(s.title, () => {
      it('uses real cards, each once', () => {
        const cards = [...s.hero.cards, ...s.board];
        for (const c of cards) expect(isCard(c), c).toBe(true);
        expect(new Set(cards).size).toBe(cards.length);
        expect([3, 4, 5]).toContain(s.board.length);
      });

      it('plays out legally to the decision', () => {
        const r = replay(s);
        const street = streetOfBoard(s.board);
        const last = s.actions[s.actions.length - 1];
        // The hero acts next: facing their bet, after their check, or first on a new street.
        if (r.toCall > 0) expect(last.who).toBe('villain');
        else if (last.street === street) expect(last).toMatchObject({ who: 'villain', move: 'check' });
        // First to act on a new street: only out of position.
        else expect(POSTFLOP.indexOf(s.hero.pos)).toBeLessThan(POSTFLOP.indexOf(s.villain.pos));
        expect(r.stacks.hero).toBeGreaterThan(0);
        expect(r.stacks.villain).toBeGreaterThanOrEqual(0);
      });

      it('has a sensible range: every group live, no combo counted more than once', () => {
        const dead = [...s.hero.cards, ...s.board];
        const share = new Map<string, number>();
        for (const g of s.range) {
          const combos = combosOf(g, dead);
          expect(combos.length, g.label).toBeGreaterThan(0);
          for (const c of combos) {
            const key = [...c].sort().join();
            share.set(key, (share.get(key) ?? 0) + (g.weight ?? 1));
          }
        }
        for (const [combo, w] of share) expect(w, `${s.id}: ${combo} is in the range more than once`).toBeLessThanOrEqual(1.0001);
      });

      it('offers the answers it grades', () => {
        const ids = optionsFor(s).map((o) => o.id);
        expect(ids).toContain(s.best);
        for (const ok of s.alsoOk ?? []) expect(ids).toContain(ok);
      });

      it('explains every street up to the decision', () => {
        const streets = ['preflop', 'flop', 'turn', 'river'].slice(0, s.board.length - 1);
        for (const st of streets) expect(s.clues.some((c) => c.street === st), `${s.id}: no clue for the ${st}`).toBe(true);
        expect(s.why.length).toBeGreaterThan(80);
      });

      it('gives the answer the numbers back up', () => {
        check(s);
      });
    });
  }

  it('has unique ids', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });
});

describe('the hand log', () => {
  it('reads like a hand history, with the pot right on every street', () => {
    const r = replay(SCENARIOS.find((s) => s.id === 'ace-overbet')!);
    expect(r.lines.map((l) => l.text).slice(0, 5)).toEqual(['CO raises to 2.5bb', 'You call 2.5bb', 'You check', 'CO bets 1.8bb', 'You call 1.8bb']);
    expect(r.potAt).toEqual({ flop: 5.5, turn: 9.1, river: 22.7 });
    expect(r.pot).toBeCloseTo(50.7);
    expect(r.toCall).toBe(28);
  });
});
