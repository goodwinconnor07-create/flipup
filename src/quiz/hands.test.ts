import { describe, expect, it } from 'vitest';
import { buildFrames } from '../train/replay';
import { gradeChoice, gtoMix, QUIZ_BB, seatId, toRecord, type QuizHand } from './hands';

// A solved hand from gto/scripts/quiz_hands.py (BTN Kc4c vs BB 7c6c, check-raised on 9c8c4d, to showdown).
const HAND = {"id": "q11-32", "hero": 3, "villain": 5, "cards": ["Kc", "4c"], "villainCards": ["6c", "7c"], "board": ["9c", "8c", "4d", "As", "6d"], "steps": [["p", 0, "fold", 0], ["p", 1, "fold", 0], ["p", 2, "fold", 0], ["p", 3, "raise", 2.5], ["p", 4, "fold", 0], ["p", 5, "call", 2.5], ["f", 5, "check", 0.0], ["f", 3, "bet", 4.12], ["f", 5, "raise", 12.38], ["f", 3, "call", 12.38], ["t", 5, "check", 0.0], ["t", 3, "bet", 9.98], ["t", 5, "call", 9.98], ["r", 5, "check", 0.0], ["r", 3, "check", 0.0]], "decisions": [{"at": 3, "pot": 1.5, "toCall": 1.0, "options": [{"label": "Fold", "kind": "fold", "to": 0.0, "freq": 0.0, "ev": 0.0}, {"label": "Raise to 2.5bb", "kind": "raise", "to": 2.5, "freq": 1.0, "ev": 0.22}], "line": 1}, {"at": 7, "pot": 5.5, "toCall": 0.0, "options": [{"label": "Check", "kind": "check", "to": 0.0, "freq": 0.0, "ev": 4.16}, {"label": "Bet 33% (1.8bb)", "kind": "bet", "to": 1.82, "freq": 0.001, "ev": 6.61}, {"label": "Bet 75% (4.1bb)", "kind": "bet", "to": 4.12, "freq": 0.075, "ev": 6.7}, {"label": "Bet 125% (6.9bb)", "kind": "bet", "to": 6.88, "freq": 0.924, "ev": 6.72}], "line": 2}, {"at": 9, "pot": 22.0, "toCall": 8.25, "options": [{"label": "Fold", "kind": "fold", "to": 0.0, "freq": 0.0, "ev": 0.0}, {"label": "Call 12.4bb", "kind": "call", "to": 12.38, "freq": 0.66, "ev": 18.72}, {"label": "Raise to 30.5bb", "kind": "raise", "to": 30.52, "freq": 0.34, "ev": 18.8}], "line": 1}, {"at": 11, "pot": 30.25, "toCall": 0.0, "options": [{"label": "Check", "kind": "check", "to": 0.0, "freq": 0.161, "ev": 23.49}, {"label": "Bet 33% (10bb)", "kind": "bet", "to": 9.98, "freq": 0.441, "ev": 23.29}, {"label": "Bet 75% (22.7bb)", "kind": "bet", "to": 22.69, "freq": 0.398, "ev": 23.46}, {"label": "Bet 125% (37.8bb)", "kind": "bet", "to": 37.81, "freq": 0.0, "ev": 20.5}], "line": 1}, {"at": 14, "pot": 50.22, "toCall": 0.0, "options": [{"label": "Check", "kind": "check", "to": 0.0, "freq": 1.0, "ev": 32.73}, {"label": "Bet 33% (16.6bb)", "kind": "bet", "to": 16.57, "freq": 0.0, "ev": 22.73}, {"label": "Bet 75% (37.7bb)", "kind": "bet", "to": 37.66, "freq": 0.0, "ev": 19.17}, {"label": "All-in 75.1bb", "kind": "allin", "to": 75.14, "freq": 0.0, "ev": 15.83}], "line": 0}], "showdown": true} as QuizHand;

describe('solved hands', () => {
  it('replays as a normal hand record', () => {
    const r = toRecord(HAND);
    expect(r.players).toHaveLength(6);
    expect(r.actions).toHaveLength(HAND.steps.length);
    // Every chip put in goes back out: the pot is exactly what the players put in.
    const frames = buildFrames(r, seatId(HAND.hero));
    const last = frames[frames.length - 1];
    expect(last.kind).toBe('result');
    const start = 6 * 100 * QUIZ_BB;
    const after = Object.values(last.stacks).reduce((a, b) => a + b, 0);
    expect(after).toBe(start);
    // BB made the straight on the river.
    expect(r.won[seatId(HAND.villain)]).toBeGreaterThan(0);
    expect(r.won[seatId(HAND.hero)] ?? 0).toBe(0);
  });

  it('points every decision at your move, on the line the hand carries on with', () => {
    const r = toRecord(HAND);
    for (const d of HAND.decisions) {
      const a = r.actions[d.at];
      expect(a.playerId).toBe(seatId(HAND.hero));
      const o = d.options[d.line];
      expect(a.move).toBe(o.kind);
      expect(a.to).toBe(Math.round(o.to * QUIZ_BB));
    }
  });

  it('grades against the solver', () => {
    const flop = HAND.decisions[1]; // GTO overbets 92%; checking gives up about 2.5bb
    const best = flop.options.findIndex((o) => o.freq > 0.9);
    const check = flop.options.findIndex((o) => o.kind === 'check');
    expect(gradeChoice(flop, best).colour).toBe('green');
    expect(gradeChoice(flop, check).colour).toBe('red');
    // A 75% bet: GTO uses it 7.5% of the time and it's within 0.02bb, so it's good.
    const mid = flop.options.findIndex((o) => o.label.startsWith('Bet 75%'));
    expect(gradeChoice(flop, mid).colour).toBe('green');
    expect(gtoMix(flop)[0].freq).toBeGreaterThan(0.9);
  });
});
