import { describe, expect, it } from 'vitest';

import { isCode, isFriendCode, isTableCode, newTableCode, normalizeTableCode, parseReport, TABLE_CODE_WORDS, tableCodeProblem } from '.';

describe('table codes', () => {
  it('are a poker word and two numbers', () => {
    for (let i = 0; i < 200; i++) {
      const code = newTableCode();
      expect(code).toMatch(/^[A-Z]{4}[0-9]{2}$/);
      expect(TABLE_CODE_WORDS).toContain(code.slice(0, 4));
      expect(isTableCode(code)).toBe(true);
    }
  });

  it('take six letters or numbers in any mix, and the older five-consonant codes', () => {
    expect(isTableCode('TACO42')).toBe(true);
    expect(isTableCode('123456')).toBe(true);
    expect(isTableCode('BCDFG')).toBe(true);
    expect(isTableCode('ABCDE')).toBe(false);
    expect(isTableCode('TACO4')).toBe(false);
    expect(isTableCode('taco42')).toBe(false);
    expect(isTableCode('TACO-42')).toBe(false);
  });

  it('normalise what a person types', () => {
    expect(normalizeTableCode(' taco-42 ')).toBe('TACO42');
    expect(normalizeTableCode('flop0789')).toBe('FLOP07');
  });

  it('say what is wrong with a typed code', () => {
    expect(tableCodeProblem('TAC')).toBe('Codes are 6 characters. Add 3 more.');
    expect(tableCodeProblem('TACO42')).toBeNull();
  });

  it('leave party and friend codes as they were', () => {
    expect(isCode('TACO42')).toBe(false);
    expect(isFriendCode('BCDFG')).toBe(true);
  });

  it('are accepted in reports about a table', () => {
    const base = { deviceId: 'd'.repeat(24), reason: 'cheat', name: 'Sam', emoji: '🙂', playerId: 'p1' };
    expect(parseReport({ ...base, where: 'table', code: 'aces42' })?.code).toBe('ACES42');
    expect(parseReport({ ...base, where: 'table', code: 'BCDFG' })?.code).toBe('BCDFG');
    expect(parseReport({ ...base, where: 'party', code: 'ACES42' })).toBeNull();
  });
});
