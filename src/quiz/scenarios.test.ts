import { describe, expect, it } from 'vitest';
import { formatFrequency, scenarioGrade, feedback, type ScrollScenario } from './scenarios';
const scenario = { schema: 2, id: 's-test', players: 2, cards: ['As', 'Kd'], board: ['Ks', '9d', '5c', '2h', '3s'], pot: 20, toCall: 5, options: [
  { label: 'Call', kind: 'call', to: 5, added: 5, freq: .999, ev: 3, foldEquity: null },
  { label: 'Raise', kind: 'raise', to: 20, added: 20, freq: .001, ev: 3, foldEquity: .3 },
  { label: 'Fold', kind: 'fold', to: 0, added: 0, freq: 0, ev: 0, foldEquity: null },
] } as ScrollScenario;
describe('honest solved feedback', () => {
  it('does not round a near-pure mix to 100 percent', () => {
    expect(formatFrequency(.999)).toBe('>99%');
    expect(formatFrequency(.0001)).toBe('<1%');
    expect(formatFrequency(0)).toBe('0%');
    expect(formatFrequency(1)).toBe('100%');
  });
  it('grades equivalent-EV rare actions as good, and costly actions by loss', () => {
    expect(scenarioGrade(scenario, scenario.options[1]).colour).toBe('green');
    expect(scenarioGrade(scenario, scenario.options[2]).colour).toBe('red');
  });
  it('explains the price including the call, and conditional fold equity', () => {
    expect(feedback(scenario, scenario.options[1]).join(' ')).toContain('20.0% equity');
    expect(feedback(scenario, scenario.options[1]).join(' ')).toContain('30.0%');
  });
});
