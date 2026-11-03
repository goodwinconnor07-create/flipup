import { describe, expect, it } from 'vitest';
import { parseReport } from './reports';

const good = { deviceId: 'abcdefghijklmnopqrstuv', where: 'table', code: 'bcdfg', reason: 'name', name: 'Sam', emoji: '😀', playerId: 'p1' };

describe('parseReport', () => {
  it('takes a complete report and upper-cases the code', () => {
    expect(parseReport(good)?.code).toBe('BCDFG');
  });
  it('refuses a reason that is not on the list, or anything typed', () => {
    expect(parseReport({ ...good, reason: 'free text here' })).toBeNull();
    expect(parseReport({ ...good, where: 'chat' })).toBeNull();
    expect(parseReport({ ...good, name: 'x'.repeat(41) })).toBeNull();
    expect(parseReport(null)).toBeNull();
  });
});
