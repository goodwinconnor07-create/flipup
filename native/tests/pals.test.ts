import { beforeEach, expect, it, vi } from 'vitest';

// Friends on the phone: Pending shows at once, the 5-second check is one cheap read, and the full list is fetched
// only when something changed (or every 15s against a server from before the cheap check).
vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
const api = vi.hoisted(() => ({
  fetchInbox: vi.fn(),
  pollFriendCard: vi.fn(),
  requestFriend: vi.fn(),
  answerFriend: vi.fn(),
  unfriendOnServer: vi.fn(),
  updateFriendCard: vi.fn(async () => true),
  createFriendCard: vi.fn(),
  findUsername: vi.fn(),
  inviteToTable: vi.fn(),
  setUsernameOnServer: vi.fn(),
}));
vi.mock('../src/state/api', () => api);

const ann = { code: '222222', name: 'Ann', emoji: '🦊' };
const empty = { requests: [], invites: [], friends: [] as string[], sent: [] as string[] };

async function load() {
  vi.resetModules();
  const entries = new Map<string, string>([
    ['flipup.palcode', JSON.stringify('111111')],
    ['flipup.device', JSON.stringify('d0123456789abcdefghij')],
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => entries.set(k, v),
    removeItem: (k: string) => entries.delete(k),
  });
  return import('../src/state/pals');
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockClear();
});

it('a sent request shows as Pending at once, and becomes a friend when accepted', async () => {
  const pals = await load();
  api.requestFriend.mockResolvedValueOnce('sent');
  api.fetchInbox.mockResolvedValueOnce({ requests: [], invites: [], friends: [] }); // a server from before Pending
  await pals.sendFriendRequest(ann.code, ann);
  expect(pals.loadSent().map((p) => p.name)).toEqual(['Ann']);

  api.fetchInbox.mockResolvedValueOnce({ requests: [], invites: [], friends: [ann], sent: [] });
  await pals.syncFriends();
  expect(pals.loadPals().map((p) => p.name)).toEqual(['Ann']);
  expect(pals.loadSent()).toEqual([]);
});

it('a denied request quietly goes from the list', async () => {
  const pals = await load();
  api.requestFriend.mockResolvedValueOnce('sent');
  api.fetchInbox.mockResolvedValueOnce({ requests: [], invites: [], friends: [], sent: [ann] });
  await pals.sendFriendRequest(ann.code, ann);
  expect(pals.loadSent()).toHaveLength(1);
  // Ann said no: the cheap check no longer lists her, so the list is fetched again and she's gone.
  api.pollFriendCard.mockResolvedValueOnce(empty);
  api.fetchInbox.mockResolvedValueOnce({ requests: [], invites: [], friends: [], sent: [] });
  await pals.pollFriends();
  expect(api.fetchInbox).toHaveBeenCalledTimes(2);
  expect(pals.loadSent()).toEqual([]);
});

it('the 5-second check saves requests itself and skips the full list when nothing changed', async () => {
  const pals = await load();
  const request = { from: '333333', name: 'Ben', emoji: '🐻', at: 1 };
  api.pollFriendCard.mockResolvedValueOnce({ ...empty, requests: [request] });
  await pals.pollFriends();
  expect(api.fetchInbox).not.toHaveBeenCalled();
  const { read } = await import('../src/state/storage');
  expect(read<{ requests: unknown[] }>('flipup.friendbox', { requests: [] }).requests).toEqual([request]);

  // Someone accepted you elsewhere: the codes differ, so the full list is fetched.
  api.pollFriendCard.mockResolvedValueOnce({ ...empty, friends: [ann.code] });
  api.fetchInbox.mockResolvedValueOnce({ requests: [], invites: [], friends: [ann], sent: [] });
  await pals.pollFriends();
  expect(api.fetchInbox).toHaveBeenCalledTimes(1);
  expect(pals.loadPals().map((p) => p.code)).toEqual([ann.code]);
});

it('against an older server the check falls back to the full list at most every 15 seconds', async () => {
  const pals = await load();
  api.pollFriendCard.mockResolvedValue('old');
  api.fetchInbox.mockResolvedValue({ requests: [], invites: [], friends: [] });
  await pals.pollFriends();
  await pals.pollFriends();
  expect(api.fetchInbox).toHaveBeenCalledTimes(1);
  api.pollFriendCard.mockReset();
});

it('listChanged compares codes, not order', async () => {
  const pals = await load();
  const p = (code: string) => ({ code, name: code, emoji: '🙂', addedAt: 0 });
  expect(pals.listChanged({ friends: ['1', '2'], sent: [] }, [p('2'), p('1')], [])).toBe(false);
  expect(pals.listChanged({ friends: ['1'], sent: ['3'] }, [p('1')], [])).toBe(true);
  expect(pals.listChanged({ friends: ['1'], sent: [] }, [p('1')], [p('3')])).toBe(true);
});
