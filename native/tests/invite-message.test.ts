import { describe, expect, it } from 'vitest';

import { inviteLink, inviteMessage } from '../src/state/invite-message';

describe('invite message', () => {
  it('names the friend and carries the table code and link', () => {
    const m = inviteMessage({ first: 'Sam', username: 'connor', code: 'WYKSX' });
    expect(m.startsWith('Hey Sam!')).toBe(true);
    expect(m).toContain('code WYKSX');
    expect(m).toContain(inviteLink('WYKSX'));
    expect(m).toContain('@connor');
  });

  it('invites to the app when there is no table', () => {
    const m = inviteMessage({ first: '  ', username: null });
    expect(m.startsWith('Hey!')).toBe(true);
    expect(m).toContain(inviteLink());
    expect(m).not.toContain('@');
  });
});
