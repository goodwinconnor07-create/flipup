import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Durable Object base class only stores ctx and env; the cards run here over an in-memory storage.
vi.mock('cloudflare:workers', () => ({
  DurableObject: class {
    ctx: unknown;
    env: unknown;
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx;
      this.env = env;
    }
  },
}));

const { FriendCard, askToBeFriends } = await import('./friendCard');
type Card = InstanceType<typeof FriendCard>;

function memoryCtx() {
  const store = new Map<string, unknown>();
  return {
    id: { name: undefined },
    storage: {
      get: async (k: string) => structuredClone(store.get(k)),
      put: async (k: string, v: unknown) => void store.set(k, structuredClone(v)),
      delete: async (k: string) => store.delete(k),
      deleteAll: async () => store.clear(),
      setAlarm: async () => undefined,
      deleteAlarm: async () => undefined,
    },
  };
}

let cards: Map<string, Card>;
const card = (code: string): Card => {
  let c = cards.get(code);
  if (!c) {
    c = new FriendCard(memoryCtx() as never, {} as never);
    cards.set(code, c);
  }
  return c;
};
const ask = (from: string, to: string) => askToBeFriends(card, `dev-${from}`, from, to);

async function person(code: string, name: string) {
  expect(await card(code).create(`dev-${code}`, name, '🙂', code)).toBe(true);
}

beforeEach(async () => {
  cards = new Map();
  await person('111111', 'Ann');
  await person('222222', 'Ben');
  await person('333333', 'Cat');
});

describe('friend requests', () => {
  it('send: the receiver gets a request and the sender a pending ask', async () => {
    expect(await ask('111111', '222222')).toEqual({ status: 'sent' });
    const ben = await card('222222').pending('dev-222222');
    expect(ben?.requests.map((r) => [r.from, r.name])).toEqual([['111111', 'Ann']]);
    const ann = await card('111111').pending('dev-111111');
    expect(ann).toEqual({ requests: [], sent: ['222222'], friends: [], invites: [] });
  });

  it('only the owner reads a card’s requests', async () => {
    await ask('111111', '222222');
    expect(await card('222222').pending('dev-111111')).toBeNull();
    expect(await card('222222').pending('dev-222222')).not.toBeNull();
  });

  it('accept: friends on both cards, the ask and the request are gone', async () => {
    await ask('111111', '222222');
    expect(await card('222222').answer('dev-222222', '111111', true)).toBe('ok');
    await card('111111').befriend('222222');
    expect(await card('222222').pending('dev-222222')).toEqual({ requests: [], sent: [], friends: ['111111'], invites: [] });
    expect(await card('111111').pending('dev-111111')).toEqual({ requests: [], sent: [], friends: ['222222'], invites: [] });
  });

  it('deny: the request goes quietly and the sender’s ask ends', async () => {
    await ask('111111', '222222');
    expect(await card('222222').answer('dev-222222', '111111', false)).toBe('ok');
    await card('111111').forget('222222');
    expect(await card('222222').pending('dev-222222')).toEqual({ requests: [], sent: [], friends: [], invites: [] });
    expect(await card('111111').pending('dev-111111')).toEqual({ requests: [], sent: [], friends: [], invites: [] });
  });

  it('a stranger can’t answer someone else’s request', async () => {
    await ask('111111', '222222');
    expect(await card('222222').answer('dev-333333', '111111', true)).toBe('forbidden');
  });

  it('duplicate: asking twice leaves one request', async () => {
    await ask('111111', '222222');
    await ask('111111', '222222');
    const ben = await card('222222').pending('dev-222222');
    expect(ben?.requests).toHaveLength(1);
    expect((await card('111111').pending('dev-111111'))?.sent).toEqual(['222222']);
  });

  it('mutual: asking someone who asked you makes you friends at once', async () => {
    await ask('111111', '222222');
    expect(await ask('222222', '111111')).toEqual({ status: 'friends' });
    for (const [code, other] of [['111111', '222222'], ['222222', '111111']]) {
      expect(await card(code).pending(`dev-${code}`)).toEqual({ requests: [], sent: [], friends: [other], invites: [] });
    }
  });

  it('mutual at the same moment: both asks in flight still meet', async () => {
    const [a, b] = await Promise.all([ask('111111', '222222'), ask('222222', '111111')]);
    expect([a, b].some((r) => 'status' in r && r.status === 'friends')).toBe(true);
    for (const [code, other] of [['111111', '222222'], ['222222', '111111']]) {
      expect(await card(code).pending(`dev-${code}`)).toEqual({ requests: [], sent: [], friends: [other], invites: [] });
    }
  });

  it('someone you already have: no new request', async () => {
    await ask('111111', '222222');
    await ask('222222', '111111');
    expect(await ask('111111', '222222')).toEqual({ status: 'friends' });
    expect((await card('222222').pending('dev-222222'))?.requests).toEqual([]);
  });

  it('an unknown code, your own code, or no card of your own is refused', async () => {
    expect(await ask('111111', '999999')).toMatchObject({ httpStatus: 404 });
    expect((await card('111111').pending('dev-111111'))?.sent).toEqual([]);
    expect(await ask('111111', '111111')).toMatchObject({ httpStatus: 400 });
    expect(await askToBeFriends(card, 'dev-888888', '888888', '111111')).toMatchObject({ httpStatus: 403 });
  });

  it('removing a friend or a pending ask clears it from both sides', async () => {
    await ask('111111', '222222');
    await card('111111').unfriend('dev-111111', '222222');
    await card('222222').drop('111111');
    expect((await card('111111').pending('dev-111111'))?.sent).toEqual([]);
    expect((await card('222222').pending('dev-222222'))?.requests).toEqual([]);
  });

  it('the cheap poll carries table invites that are still fresh', async () => {
    await card('222222').invite({ from: '111111', name: 'Ann', emoji: '🙂', table: 'BCDFG', kind: 'table', at: Date.now() });
    await card('222222').invite({ from: '333333', name: 'Cat', emoji: '🙂', table: 'HJKLM', kind: 'table', at: Date.now() - 60 * 60_000 });
    expect((await card('222222').pending('dev-222222'))?.invites.map((i) => i.from)).toEqual(['111111']);
    expect(await card('222222').pending('dev-111111')).toBeNull();
  });
});
