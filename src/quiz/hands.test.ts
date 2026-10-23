import { describe, expect, it } from 'vitest';
import { buildFrames } from '../train/replay';
import { gradeChoice, gtoMix, QUIZ_BB, seatId, toRecord, type QuizHand } from './hands';

// A solved multiway hand from gto/scripts/quiz_multiway.py: CO A♥K♠ opens, the button and big blind call,
// it's checked to the river, the button bets and wins with a pair of jacks.
const HAND = {"id": "m7-28", "hero": 2, "villains": [3, 5], "cards": ["Ks", "Ah"], "villainCards": [["Ac", "Jd"], ["Th", "Kd"]], "board": ["8c", "3h", "5s", "5d", "Jc"], "steps": [["p", 0, "fold", 0.0], ["p", 1, "fold", 0.0], ["p", 2, "raise", 2.3], ["p", 3, "call", 2.3], ["p", 4, "fold", 0.5], ["p", 5, "call", 2.3], ["f", 5, "check", 0.0], ["f", 2, "check", 0.0], ["f", 3, "check", 0.0], ["t", 5, "check", 0.0], ["t", 2, "check", 0.0], ["t", 3, "check", 0.0], ["r", 5, "check", 0.0], ["r", 2, "check", 0.0], ["r", 3, "bet", 5.55], ["r", 5, "fold", 0.0], ["r", 2, "call", 5.55]], "decisions": [{"at": 2, "pot": 1.5, "toCall": 1.0, "options": [{"label": "Fold", "kind": "fold", "to": 0.0, "freq": 0.0, "ev": 0.0}, {"label": "Raise to 2.3bb", "kind": "raise", "to": 2.3, "freq": 1.0, "ev": 1.57}, {"label": "Limp 1bb", "kind": "call", "to": 1.0, "freq": 0.0, "ev": null}, {"label": "All-in 100bb", "kind": "allin", "to": 100.0, "freq": 0.0, "ev": null}], "line": 1, "eq": null}, {"at": 7, "pot": 7.4, "toCall": 0.0, "options": [{"label": "Check", "kind": "check", "to": 0.0, "freq": 0.479, "ev": 1.61}, {"label": "Bet 33% (2.4bb)", "kind": "bet", "to": 2.44, "freq": 0.52, "ev": 1.63}, {"label": "Bet 75% (5.5bb)", "kind": "bet", "to": 5.55, "freq": 0.0, "ev": 1.25}], "line": 0, "eq": 0.335, "players": 3}, {"at": 10, "pot": 7.4, "toCall": 0.0, "options": [{"label": "Check", "kind": "check", "to": 0.0, "freq": 0.493, "ev": 4.17}, {"label": "Bet 66% (4.9bb)", "kind": "bet", "to": 4.88, "freq": 0.507, "ev": 4.17}], "line": 0, "eq": 0.549, "players": 3}, {"at": 13, "pot": 7.4, "toCall": 0.0, "options": [{"label": "Check", "kind": "check", "to": 0.0, "freq": 1.0, "ev": 2.57}, {"label": "Bet 75% (5.5bb)", "kind": "bet", "to": 5.55, "freq": 0.0, "ev": 0.33}], "line": 0, "eq": 0.402, "players": 3}, {"at": 16, "pot": 12.95, "toCall": 5.55, "options": [{"label": "Fold", "kind": "fold", "to": 0.0, "freq": 0.0, "ev": 0.0}, {"label": "Call 5.5bb", "kind": "call", "to": 5.55, "freq": 1.0, "ev": 0.28}, {"label": "Raise to 18.5bb", "kind": "raise", "to": 18.5, "freq": 0.0, "ev": -1.22}], "line": 1, "eq": 0.315, "players": 2}], "showdown": true} as QuizHand;

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
    // Three players saw the flop; the button's jacks beat your ace high.
    expect(HAND.villains).toHaveLength(2);
    expect(r.won[seatId(3)]).toBeGreaterThan(0);
    expect(r.won[seatId(HAND.hero)] ?? 0).toBe(0);
    // At a showdown you see the cards of everyone still in, not the big blind who folded.
    expect(r.holes[seatId(3)]).toEqual(['Ac', 'Jd']);
    expect(r.holes[seatId(5)]).toBeUndefined();
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
    const river = HAND.decisions[3]; // GTO always checks; betting gives up over 2bb
    const check = river.options.findIndex((o) => o.kind === 'check');
    const bet = river.options.findIndex((o) => o.kind === 'bet');
    expect(gradeChoice(river, check).colour).toBe('green');
    expect(gradeChoice(river, bet).colour).toBe('red');
    // On the flop GTO mixes check and a small bet; the big bet is a close call.
    const flop = HAND.decisions[1];
    expect(gradeChoice(flop, flop.options.findIndex((o) => o.kind === 'check')).colour).toBe('green');
    expect(gradeChoice(flop, flop.options.findIndex((o) => o.label.startsWith('Bet 75%'))).colour).toBe('yellow');
    expect(gtoMix(flop).length).toBe(2);
  });
});
