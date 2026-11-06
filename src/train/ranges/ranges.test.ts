import { describe, expect, it } from 'vitest';
import { isCard } from '../../game/cards';
import { CHARTS, inChart } from './charts';
import { narrate } from './narrate';
import { analyse, combosOf, comboKey, expandHand, expandRange, optionsFor, replay, spotOf, streetOfBoard, type OptionId, type Scenario } from './model';
import { readFileSync } from 'node:fs';
import { SCENARIOS as WRITTEN, unpack } from './scenarios';

/** Every hand: the hand-written ones and the generated ones. */
const SCENARIOS: Scenario[] = [...WRITTEN, ...unpack(JSON.parse(readFileSync(new URL('./generated.json', import.meta.url), 'utf8')))];

describe('hands', () => {
  it('reads pairs, suited, offsuit, exact combos and one-suit hands', () => {
    expect(expandHand('QQ')).toHaveLength(6);
    expect(expandHand('AKs')).toHaveLength(4);
    expect(expandHand('AKo')).toHaveLength(12);
    expect(expandHand('AK')).toHaveLength(16);
    expect(expandHand('AhKh')).toEqual([['Ah', 'Kh']]);
    expect(expandHand('AKs@d')).toEqual([['Ad', 'Kd']]);
  });

  it('reads chart shorthand: 22+, ATs+, A2s-A5s, 66-99', () => {
    expect(expandRange('22+')).toHaveLength(13 * 6);
    expect(expandRange('ATs+')).toHaveLength(4 * 4);
    expect(expandRange('A2s-A5s')).toHaveLength(4 * 4);
    expect(expandRange('66-99')).toHaveLength(4 * 6);
    expect(expandRange('KTo+')).toHaveLength(3 * 12);
    expect(expandRange('Any two cards' in CHARTS ? CHARTS['Any two cards'] : '')).toHaveLength(1326);
  });

  it('leaves out combos that use a card you can see', () => {
    expect(combosOf({ label: '', hands: 'AK', role: 'value' }, ['Ah', 'Kd'])).toHaveLength(9);
  });

  it('has charts that get wider from early to late position', () => {
    const size = (k: string) => expandRange(CHARTS[k]).length;
    expect(size('EP open (9-handed)')).toBeLessThan(size('UTG open'));
    expect(size('UTG open')).toBeLessThan(size('HJ open'));
    expect(size('HJ open')).toBeLessThan(size('CO open'));
    expect(size('CO open')).toBeLessThan(size('BTN open'));
    expect(size('BB vs early open')).toBeLessThan(size('BB vs late open'));
  });
});

/** The best play has to beat the alternative by at least this much: 3% of the pot, or 3 points of equity. */
const MARGIN = 0.03;

/** The numbers each answer has to agree with. */
function check(s: Scenario) {
  const r = replay(s);
  const spot = spotOf(s, r);
  if (r.toCall > 0) {
    const gap = spot.equity - spot.price!;
    const msg = `${s.id}: equity ${spot.equity.toFixed(3)} vs price ${spot.price!.toFixed(3)}`;
    if (s.best === 'call') expect(gap, msg).toBeGreaterThanOrEqual(MARGIN);
    if (s.best === 'fold') expect(-gap, msg).toBeGreaterThanOrEqual(MARGIN);
    if (s.best === 'raise') {
      // A value raise: calling is already profitable, and the hand beats most of what they bet for value.
      expect(gap, msg).toBeGreaterThanOrEqual(MARGIN);
      const value = analyse(s, r).flatMap((o) => o.groups.filter((g) => g.group.role === 'value'));
      const w = value.reduce((n, g) => n + g.weight, 0);
      expect(value.reduce((n, g) => n + g.weight * g.equity, 0) / w, s.id).toBeGreaterThan(0.5);
    }
    return;
  }
  // Check, and every bet size with each hand's response to that size: the best play has the highest EV, and every
  // play that isn't marked as also fine is clearly worse.
  const ev: Partial<Record<OptionId, number>> = { check: spot.evCheck! };
  for (const id of ['bet33', 'bet75', 'bet125'] as const) ev[id] = spotOf(s, r, id).bet!.ev;
  const text = Object.entries(ev).map(([k, v]) => `${k} ${v!.toFixed(2)}`).join(', ');
  for (const [id, v] of Object.entries(ev) as [OptionId, number][]) {
    if (id === s.best) continue;
    if (s.alsoOk?.includes(id)) expect(v, `${s.id}: ${id} beats the best play (${text})`).toBeLessThanOrEqual(ev[s.best]! + 1e-9);
    else expect((ev[s.best]! - v) / r.pot, `${s.id}: ${s.best} isn't clearly better than ${id} (${text}; pot ${r.pot})`).toBeGreaterThanOrEqual(MARGIN);
  }
}

describe('every scenario', () => {
  for (const s of SCENARIOS) {
    describe(s.title, () => {
      it('uses real cards, each once', () => {
        const cards = [...s.hero.cards, ...s.board];
        for (const c of cards) expect(isCard(c), c).toBe(true);
        expect(new Set(cards).size).toBe(cards.length);
        expect([4, 5]).toContain(s.board.length);
      });

      it('plays out in turn order to your decision', () => {
        const r = replay(s);
        expect(r.next, `${s.id}: it should be your turn`).toBe(s.hero.pos);
        expect(r.stacks[s.hero.pos]).toBeGreaterThan(0);
        // Facing a bet, nobody acts after you: calling closes the action, so the numbers are exact.
        if (r.toCall > 0) expect(r.behind, `${s.id}: players still to act behind you`).toEqual([]);
        expect(r.live.length).toBeGreaterThan(0);
        for (const o of s.opponents) {
          if (r.live.includes(o.pos)) expect(o.range.length, `${s.id}: ${o.pos} is in the hand with no range`).toBeGreaterThan(0);
          else expect(o.range, `${s.id}: ${o.pos} folded but has a range`).toEqual([]);
        }
      });

      it('only gives each player hands they’d have played that way before the flop', () => {
        expect(CHARTS[s.hero.pre], s.hero.pre).toBeDefined();
        expect(inChart(s.hero.pre, s.hero.cards), `${s.id}: your hand isn't in "${s.hero.pre}"`).toBe(true);
        const dead = [...s.hero.cards, ...s.board];
        for (const o of s.opponents) {
          expect(CHARTS[o.pre], `${s.id}: chart ${o.pre}`).toBeDefined();
          const share = new Map<string, number>();
          for (const g of o.range) {
            const combos = combosOf(g, dead);
            expect(combos.length, `${s.id}: ${g.label}`).toBeGreaterThan(0);
            for (const c of combos) {
              expect(inChart(o.pre, c), `${s.id}: ${o.pos} wouldn't have ${c.join('')} ("${g.label}", chart "${o.pre}")`).toBe(true);
              share.set(comboKey(c), (share.get(comboKey(c)) ?? 0) + (g.weight ?? 1));
            }
          }
          for (const [combo, w] of share) expect(w, `${s.id}: ${o.pos} has ${combo} more than once`).toBeLessThanOrEqual(1.0001);
        }
      });

      it('offers the answers it grades', () => {
        const ids = optionsFor(s).map((o) => o.id);
        expect(ids).toContain(s.best);
        for (const ok of s.alsoOk ?? []) expect(ids).toContain(ok);
        if (s.compare) expect(ids).toContain(s.compare);
      });

      it('explains every street up to the decision', () => {
        const streets = ['preflop', 'flop', 'turn', 'river'].slice(0, s.board.length - 1);
        for (const st of streets) expect(s.clues.some((c) => c.street === st), `${s.id}: no clue for the ${st}`).toBe(true);
        expect(s.why.length).toBeGreaterThan(80);
        expect(streetOfBoard(s.board)).not.toBe('flop');
      });

      it('gives the answer the numbers back up, by a clear margin', () => {
        check(s);
      });
    });
  }

  it('has unique ids', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });

  it('mixes positions and multiway pots', () => {
    const seats = new Set(SCENARIOS.flatMap((s) => [s.hero.pos, ...s.opponents.map((o) => o.pos)]));
    expect(seats.size).toBeGreaterThanOrEqual(7);
    expect(SCENARIOS.filter((s) => s.opponents.length >= 2).length).toBeGreaterThanOrEqual(6);
  });
});

describe('the hand log', () => {
  it('reads like a hand history, with the pot right on every street', () => {
    const r = replay(SCENARIOS.find((s) => s.id === 'ace-overbet')!);
    expect(r.lines.map((l) => l.text).slice(0, 7)).toEqual(['UTG folds', 'HJ folds', 'CO raises to 2.5bb', 'BTN folds', 'SB folds', 'You call 2.5bb', 'You check']);
    expect(r.potAt).toEqual({ flop: 5.5, turn: 9.1, river: 22.7 });
    expect(r.pot).toBeCloseTo(50.7);
    expect(r.toCall).toBe(28);
  });

  it('refuses a move out of turn', () => {
    const s = SCENARIOS.find((x) => x.id === 'ace-overbet')!;
    const bad: Scenario = { ...s, actions: [s.actions[1], s.actions[0], ...s.actions.slice(2)] };
    expect(() => replay(bad)).toThrow(/turn/);
  });
});

describe('facing an all-in', () => {
  it('offers only fold or call when nobody behind the bet has chips left', () => {
    const s: Scenario = {
      id: 'shove-test',
      title: '',
      concept: '',
      hero: { pos: 'BB', cards: ['Kc', 'Qd'], pre: 'BB vs late open' },
      opponents: [{ pos: 'BTN', type: 'Solid regular', pre: 'BTN open', range: [{ label: 'Kings', hands: 'KK', role: 'value' }] }],
      stack: 100,
      stacks: { BTN: 20 },
      board: ['Kh', '8d', '4c', '2s'],
      actions: [
        { street: 'preflop', who: 'BTN', move: 'raise', to: 2.5 },
        { street: 'preflop', who: 'BB', move: 'call' },
        { street: 'flop', who: 'BB', move: 'check' },
        { street: 'flop', who: 'BTN', move: 'bet', to: 3 },
        { street: 'flop', who: 'BB', move: 'call' },
        { street: 'turn', who: 'BB', move: 'check' },
        { street: 'turn', who: 'BTN', move: 'bet', to: 14.5 },
      ],
      best: 'call',
      clues: [],
      why: '',
    };
    const r = replay(s);
    expect(r.stacks.BTN).toBe(0);
    expect(optionsFor(s, r).map((o) => o.id)).toEqual(['fold', 'call']);
  });
});

describe('street by street', () => {
  // Every hand-written hand and a spread of generated ones (the narration replays the whole hand, so not all 1,600).
  const sample = [...WRITTEN, ...SCENARIOS.slice(WRITTEN.length).filter((_, i) => i % 15 === 0)];
  it('says what their range is and what you want on every street', () => {
    for (const s of sample) {
      const reads = narrate(s);
      const streets = ['preflop', 'flop', 'turn', 'river'].slice(0, s.board.length - 1);
      expect(reads.map((x) => x.street), s.id).toEqual(streets);
      for (const x of reads) {
        expect(x.theirs.length, `${s.id} ${x.street}`).toBeGreaterThan(20);
        expect(x.ours.length, `${s.id} ${x.street}`).toBeGreaterThan(20);
      }
    }
  }, 120_000);
});
