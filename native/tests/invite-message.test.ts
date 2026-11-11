import { describe, expect, it } from 'vitest';

import { inviteLink, inviteMessage, tableShareMessage } from '../src/state/invite-message';

describe('invite message', () => {
  it('names the friend and carries the table code and link', () => {
    const m = inviteMessage({ first: 'Sam', code: 'WYKSX' });
    expect(m.startsWith('Hey Sam!')).toBe(true);
    expect(m).toContain('code WYKSX');
    expect(m).toContain(inviteLink('WYKSX'));
  });

  it('invites to the app when there is no table', () => {
    const m = inviteMessage({ first: '  ' });
    expect(m.startsWith('Hey!')).toBe(true);
    expect(m).toContain(inviteLink());
    expect(m).not.toContain('@');
  });

  it('says who is hosting and what is being played when a table is shared', () => {
    const m = tableShareMessage({ host: ' Connor ', game: 'Crazy Pineapple', code: 'ACES42' });
    expect(m.split('\n')[0]).toBe("Connor's table · Crazy Pineapple");
    expect(m).toContain('code ACES42');
    expect(m).toContain(inviteLink('ACES42'));
  });

  it('still reads well with no host name or game', () => {
    const m = tableShareMessage({ host: '', code: 'ACES42' });
    expect(m.split('\n')[0]).toBe('A poker table');
  });
});
