import { describe, expect, it } from 'vitest';
import { quizWhy } from '../train/coach';
import type { QuizHand } from './hands';
import { readSpot } from './read';

// Every shipped hand file, as text (like preflop.test.ts reads its data).
const files = import.meta.glob('../../public/gto/quiz/hands-*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const hands: QuizHand[] = Object.values(files).flatMap((raw) => JSON.parse(raw) as QuizHand[]);

describe('the coach explains every decision', () => {
  it('has a reason for GTO’s play and for every other pick, at every decision of every shipped hand', () => {
    expect(hands.length).toBeGreaterThan(0);
    for (const h of hands) expect(h.villains.length, h.id).toBeGreaterThanOrEqual(2);
    for (const h of hands) {
      for (const d of h.decisions) {
        const spot = readSpot(h, d);
        expect(spot.best).toBeTruthy();
        for (const o of d.options) {
          const why = quizWhy(spot, o);
          expect(why.length, `${h.id} ${d.at} ${o.label}`).toBeGreaterThan(0);
          for (const line of why) expect(line).not.toMatch(/undefined|NaN|null/);
        }
      }
    }
  });

  it('reads hands and boards', () => {
    const fake = (cards: string[], board: string[]) =>
      readSpot(
        { id: 't', hero: 3, villains: [5], cards, villainCards: [['2c', '3d']], board, showdown: false, decisions: [], steps: [['p', 3, 'raise', 2.5], ['p', 5, 'call', 2.5], ['f', 5, 'check', 0], ['f', 3, 'bet', 1.8]] },
        { at: 3, pot: 5.5, toCall: 0, options: [{ label: 'Check', kind: 'check', to: 0, freq: 1, ev: 1 }], line: 0 },
      );
    expect(fake(['Ah', 'Kd'], ['Ks', '7c', '2d']).made).toBe('top-pair-good');
    expect(fake(['Qh', 'Qd'], ['9s', '7c', '2d']).made).toBe('overpair');
    expect(fake(['9h', '8h'], ['7h', '6c', '2h']).draw).toBe('combo');
    expect(fake(['Jh', 'Td'], ['9s', '8c', '2d']).draw).toBe('open-ended');
    const s = fake(['Ah', 'Kd'], ['Ks', '7c', '2d']);
    expect(s.inPosition).toBe(true);
    expect(s.raiser).toBe(true);
    expect(s.texture?.high).toBe(true);
  });

  it('reads a three-way pot', () => {
    const h: QuizHand = {
      id: 'm', hero: 5, villains: [2, 3], cards: ['Kh', 'Jh'], villainCards: [['2c', '3d'], ['4c', '5d']], board: ['Ks', '7c', '2d'], showdown: false, decisions: [],
      steps: [['p', 0, 'fold', 0], ['p', 1, 'fold', 0], ['p', 2, 'raise', 2.3], ['p', 3, 'call', 2.3], ['p', 4, 'fold', 0], ['p', 5, 'call', 2.3], ['f', 5, 'check', 0], ['f', 2, 'bet', 2.4], ['f', 3, 'call', 2.4], ['f', 5, 'fold', 0]],
    };
    const s = readSpot(h, { at: 9, pot: 12, toCall: 2.4, players: 3, options: [{ label: 'Fold', kind: 'fold', to: 0, freq: 1, ev: 0 }], line: 0 });
    expect(s.players).toBe(3);
    expect(s.callers).toBe(1);
    expect(s.inPosition).toBe(false);
    // CO bet and the button called: nobody is left to act after you, so you answer the bet alone.
    expect(s.behind).toBe(0);
    expect(s.defenders).toBe(1);
    expect(s.mdfEach).toBeCloseTo(s.mdf, 5);
    // On the button facing the bet, the big blind still has to answer it too: the two of you share the job.
    const btn = readSpot(
      { ...h, hero: 3, villains: [2, 5], steps: [...h.steps.slice(0, 8), ['f', 3, 'call', 2.4]] },
      { at: 8, pot: 9.6, toCall: 2.4, players: 3, options: [{ label: 'Fold', kind: 'fold', to: 0, freq: 1, ev: 0 }], line: 0 },
    );
    expect(btn.behind).toBe(1);
    expect(btn.defenders).toBe(2);
    expect(btn.mdf).toBeCloseTo(0.75, 5);
    expect(btn.mdfEach).toBeCloseTo(0.5, 5);
    expect(btn.inPosition).toBe(true);
  });
});
