import { describe, expect, it } from 'vitest';
import { quizWhy } from '../train/coach';
import type { QuizHand } from './hands';
import { readSpot } from './read';

// Every shipped hand file, as text (like preflop.test.ts reads its data).
const files = import.meta.glob('../../public/gto/quiz/hands-*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const hands: QuizHand[] = Object.values(files).flatMap((raw) => JSON.parse(raw) as QuizHand[]);

describe('the coach explains every decision', () => {
  it('has a reason for GTO’s play and for every other pick, at every decision of every shipped hand', () => {
    expect(hands.length).toBeGreaterThan(100);
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
        { id: 't', hero: 3, villain: 5, cards, villainCards: ['2c', '3d'], board, showdown: false, decisions: [], steps: [['p', 3, 'raise', 2.5], ['p', 5, 'call', 2.5], ['f', 5, 'check', 0], ['f', 3, 'bet', 1.8]] },
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
});
