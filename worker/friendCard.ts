import { DurableObject } from 'cloudflare:workers';
import { INVITE_MS, type BjInvite, type CampaignCard, type FriendCardInfo, type FriendRequest, type InviteDeclined } from '../src/game';

/** A friend code is forgotten this long after its owner last opened the app. */
const KEEP_FOR_MS = 120 * 24 * 60 * 60 * 1000;

interface Stored {
  name: string;
  emoji: string;
  /** The phone that owns this code. Never sent out. */
  deviceId: string;
  updatedAt: number;
  /** How their campaign is going, for friends to compare. */
  campaign?: CampaignCard;
  /** Friends asking this person to their table, newest last. Only the owner reads them. */
  invites?: BjInvite[];
  /** Friends who said no to this person's poker-table invites, newest last. Only the owner reads them. */
  declined?: InviteDeclined[];
  /** People asking to be friends, waiting for an answer. Only the owner reads them. */
  requests?: FriendRequest[];
  /** Friend codes this person has accepted, or who accepted them. Kept on both cards. */
  friends?: string[];
  /** Friend codes this person has asked and is still waiting on. Cleared when the other side answers. */
  sent?: string[];
  /** Their username (lowercase), and when they last set it: it can change once a month. */
  username?: string;
  usernameAt?: number;
  /** This card's own friend code, so it can free its username when it goes. */
  code?: string;
}

/** The card's requests and asks with `code` taken out of both. */
function without(data: Stored, code: string): Pick<Stored, 'requests' | 'sent'> {
  return { requests: (data.requests ?? []).filter((r) => r.from !== code), sent: (data.sent ?? []).filter((c) => c !== code) };
}

/** What `askToBeFriends()` needs from a card: the RPC methods, as a Durable Object stub or the object itself in tests. */
export interface FriendCardApi {
  get(code: string): Promise<FriendCardInfo | null>;
  request(from: FriendRequest): Promise<'sent' | 'friends' | 'missing'>;
  asked(code: string): Promise<boolean>;
  answer(deviceId: string, from: string, accept: boolean): Promise<'ok' | 'missing' | 'forbidden'>;
  befriend(code: string): Promise<void>;
  noteSent(deviceId: string, code: string): Promise<'ok' | 'missing' | 'forbidden'>;
  forget(code: string): Promise<void>;
}

export type AskResult = { status: 'sent' | 'friends' } | { error: string; httpStatus: 400 | 403 | 404 };

/**
 * `from` (owned by `deviceId`, already checked) asks `to` to be friends. The sender has agreed by asking, so their
 * card notes the ask first; then the receiver's card either queues the request or, if the receiver had asked the
 * sender too, makes them friends at once. Because each side writes its own ask before reading the other's, two
 * people adding each other at the same moment always meet in the middle.
 */
export async function askToBeFriends(card: (code: string) => FriendCardApi, deviceId: string, from: string, to: string): Promise<AskResult> {
  if (from === to) return { error: "That's your own code.", httpStatus: 400 };
  const mine = card(from);
  const theirs = card(to);
  const me = await mine.get(from);
  if (!me) return { error: 'Get your own friend code first.', httpStatus: 403 };
  if (!(await theirs.get(to))) return { error: 'No one has that friend code. Check it with them.', httpStatus: 404 };
  // They'd already asked you (from before asks were kept on both sides): that's a yes from both of you.
  if (await mine.asked(to)) {
    await mine.answer(deviceId, to, true);
    await theirs.befriend(from);
    return { status: 'friends' };
  }
  if ((await mine.noteSent(deviceId, to)) !== 'ok') return { error: 'Get your own friend code first.', httpStatus: 403 };
  const result = await theirs.request({ from, name: me.name, emoji: me.emoji, ...(me.username ? { username: me.username } : {}), at: Date.now() });
  if (result === 'missing') {
    await mine.forget(to);
    return { error: 'No one has that friend code. Check it with them.', httpStatus: 404 };
  }
  if (result === 'friends') await mine.befriend(to);
  return { status: result };
}

/** At most this many friends, and this many requests waiting. */
const MAX_FRIENDS = 200;
const MAX_REQUESTS = 50;

/**
 * One person's friend code: a name and a picture that friends can look up by a five letter code.
 * Only the phone that made it can change it. There are no accounts; the code is all a friend needs.
 */
export class FriendCard extends DurableObject<Env> {
  private data: Stored | null | undefined;

  /** RPC: claim this code. Returns false if it's taken. */
  async create(deviceId: string, name: string, emoji: string, code?: string): Promise<boolean> {
    if (await this.load()) return false;
    await this.save({ name, emoji, deviceId, updatedAt: Date.now(), ...(code ? { code } : {}) });
    return true;
  }

  /** RPC: the owner's latest name and picture, and their campaign if they send it. */
  async update(deviceId: string, name: string, emoji: string, campaign?: CampaignCard): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.deviceId !== deviceId) return 'forbidden';
    await this.save({ ...data, name, emoji, ...(campaign ? { campaign } : {}), updatedAt: Date.now() });
    return 'ok';
  }

  /** RPC: what a friend sees. */
  async get(code: string): Promise<FriendCardInfo | null> {
    const data = await this.load();
    return data ? { code, name: data.name, emoji: data.emoji, ...(data.username ? { username: data.username } : {}), ...(data.campaign ? { campaign: data.campaign } : {}) } : null;
  }

  /** RPC: a friend asks this person to their blackjack table. One invite per friend; a new one replaces the old. */
  async invite(invite: BjInvite): Promise<boolean> {
    const data = await this.load();
    if (!data) return false;
    const kept = (data.invites ?? []).filter((i) => i.from !== invite.from && Date.now() - i.at < INVITE_MS);
    await this.save({ ...data, invites: [...kept, invite].slice(-8) }, false);
    return true;
  }

  /** RPC: a friend takes back their invite to `table` (they left the setup page without opening it). */
  async uninvite(from: string, table: string): Promise<void> {
    const data = await this.load();
    if (!data?.invites?.some((i) => i.from === from && i.table === table)) return;
    await this.save({ ...data, invites: data.invites.filter((i) => !(i.from === from && i.table === table)) }, false);
  }

  /** RPC: the owner says no to `from`'s invite to `table`. True when there was one to turn down. */
  async decline(deviceId: string, from: string, table: string): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.deviceId !== deviceId) return 'forbidden';
    if (!data.invites?.some((i) => i.from === from && i.table === table)) return 'missing';
    await this.save({ ...data, invites: data.invites.filter((i) => !(i.from === from && i.table === table)) }, false);
    return 'ok';
  }

  /** RPC: `by` turned down this person's invite to `table`; their next check hears about it. */
  async noteDeclined(by: string, table: string): Promise<void> {
    const data = await this.load();
    if (!data) return;
    const kept = (data.declined ?? []).filter((d) => !(d.by === by && d.table === table) && Date.now() - d.at < INVITE_MS);
    await this.save({ ...data, declined: [...kept, { by, table, at: Date.now() }].slice(-12) }, false);
  }

  /** RPC: the invites waiting for this phone, if it owns the code. */
  async invites(deviceId: string): Promise<BjInvite[] | null> {
    const data = await this.load();
    if (!data || data.deviceId !== deviceId) return null;
    return (data.invites ?? []).filter((i) => Date.now() - i.at < INVITE_MS);
  }

  /**
   * RPC: someone asks to be friends. Already friends changes nothing. If this person had asked them too (even at
   * the same moment), that's a yes from both: they're friends at once. A repeat ask keeps its place in the queue.
   */
  async request(from: FriendRequest): Promise<'sent' | 'friends' | 'missing'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.friends?.includes(from.from)) return 'friends';
    if (data.sent?.includes(from.from)) {
      await this.save({ ...data, ...without(data, from.from), friends: [...(data.friends ?? []), from.from].slice(-MAX_FRIENDS) }, false);
      return 'friends';
    }
    const have = data.requests ?? [];
    if (have.some((r) => r.from === from.from && r.name === from.name && r.emoji === from.emoji)) return 'sent';
    const requests = have.some((r) => r.from === from.from) ? have.map((r) => (r.from === from.from ? { ...from, at: r.at } : r)) : [...have, from];
    await this.save({ ...data, requests: requests.slice(-MAX_REQUESTS) }, false);
    return 'sent';
  }

  /** RPC: the owner has asked `code` to be friends, so a matching ask back is a yes. */
  async noteSent(deviceId: string, code: string): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.deviceId !== deviceId) return 'forbidden';
    if (data.sent?.includes(code) || data.friends?.includes(code)) return 'ok';
    await this.save({ ...data, sent: [...(data.sent ?? []), code].slice(-MAX_REQUESTS) }, false);
    return 'ok';
  }

  /** RPC (server only): `code` said no to this person's request, or it went away. Nothing tells them; the ask just ends. */
  async forget(code: string): Promise<void> {
    const data = await this.load();
    if (!data?.sent?.includes(code)) return;
    await this.save({ ...data, sent: data.sent.filter((c) => c !== code) }, false);
  }

  /**
   * RPC: the owner's waiting requests, who they've asked, their friends' codes and the table invites waiting. One
   * cheap read of one card, for polling every few seconds.
   */
  async pending(deviceId: string): Promise<{ requests: FriendRequest[]; sent: string[]; friends: string[]; invites: BjInvite[]; declined: InviteDeclined[] } | null> {
    const data = await this.load();
    if (!data || data.deviceId !== deviceId) return null;
    return {
      requests: data.requests ?? [],
      sent: data.sent ?? [],
      friends: data.friends ?? [],
      invites: (data.invites ?? []).filter((i) => Date.now() - i.at < INVITE_MS),
      declined: (data.declined ?? []).filter((d) => Date.now() - d.at < INVITE_MS),
    };
  }

  /** RPC: whether `code` has asked this person and is still waiting. */
  async asked(code: string): Promise<boolean> {
    return !!(await this.load())?.requests?.some((r) => r.from === code);
  }

  /** RPC: the owner says yes or no to a request. */
  async answer(deviceId: string, from: string, accept: boolean): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.deviceId !== deviceId) return 'forbidden';
    if (!data.requests?.some((r) => r.from === from)) return 'missing';
    const requests = data.requests.filter((r) => r.from !== from);
    const friends = accept ? [...(data.friends ?? []).filter((f) => f !== from), from].slice(-MAX_FRIENDS) : data.friends;
    await this.save({ ...data, requests, ...(friends ? { friends } : {}) }, false);
    return 'ok';
  }

  /** RPC (server only): the other side of a friendship that was just accepted. */
  async befriend(code: string): Promise<void> {
    const data = await this.load();
    if (!data) return;
    if (data.friends?.includes(code) && !data.sent?.includes(code) && !data.requests?.some((r) => r.from === code)) return;
    await this.save({ ...data, ...without(data, code), friends: [...(data.friends ?? []).filter((f) => f !== code), code].slice(-MAX_FRIENDS) }, false);
  }

  /** RPC: the owner removes a friend. */
  async unfriend(deviceId: string, code: string): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.deviceId !== deviceId) return 'forbidden';
    await this.drop(code);
    return 'ok';
  }

  /** RPC (server only): forgets a friendship, or a request either way, from this side. */
  async drop(code: string): Promise<void> {
    const data = await this.load();
    if (!data || (!data.friends?.includes(code) && !data.sent?.includes(code) && !data.requests?.some((r) => r.from === code))) return;
    await this.save({ ...data, ...without(data, code), friends: (data.friends ?? []).filter((f) => f !== code) }, false);
  }

  /** RPC: whether `code` is a friend. Only friends can invite each other to a table. */
  async isFriend(code: string): Promise<boolean> {
    return !!(await this.load())?.friends?.includes(code);
  }

  /** RPC: everything waiting for the owner: friend requests, table invites, the friend codes on the list and who they've asked. */
  async inbox(deviceId: string): Promise<{ requests: FriendRequest[]; invites: BjInvite[]; friends: string[]; sent: string[] } | null> {
    const data = await this.load();
    if (!data || data.deviceId !== deviceId) return null;
    return { requests: data.requests ?? [], invites: (data.invites ?? []).filter((i) => Date.now() - i.at < INVITE_MS), friends: data.friends ?? [], sent: data.sent ?? [] };
  }

  /**
   * RPC: the owner sets their username, after the route has reserved it (`claimAlias`). Returns the username it
   * replaced (to free it), 'wait' with the time a change is allowed again, or 'forbidden'.
   */
  async setUsername(deviceId: string, username: string, gap: number): Promise<{ ok: true; old?: string } | { ok: false; wait?: number; forbidden?: boolean }> {
    const data = await this.load();
    if (!data || data.deviceId !== deviceId) return { ok: false, forbidden: true };
    if (data.username === username) return { ok: true };
    if (data.username && data.usernameAt && Date.now() < data.usernameAt + gap) return { ok: false, wait: data.usernameAt + gap };
    await this.save({ ...data, username, usernameAt: Date.now() }, false);
    return { ok: true, ...(data.username ? { old: data.username } : {}) };
  }

  /** RPC: when the owner may change their username next (0 once they may). */
  async usernameFree(gap: number): Promise<number> {
    const data = await this.load();
    return data?.username && data.usernameAt ? Math.max(0, data.usernameAt + gap - Date.now()) : 0;
  }

  // A username's own record: one of these objects, named "@<username>", says which friend code holds it. It never
  // stores a card, so it can't be looked up as one.

  /** RPC: reserve this username for `code`. False if someone else holds it. */
  async claimAlias(code: string): Promise<boolean> {
    const have = await this.ctx.storage.get<string>('alias');
    if (have && have !== code) return false;
    await this.ctx.storage.put('alias', code);
    return true;
  }

  /** RPC: let the username go, if `code` holds it. */
  async releaseAlias(code: string): Promise<void> {
    if ((await this.ctx.storage.get<string>('alias')) === code) await this.ctx.storage.delete('alias');
  }

  /** RPC: the friend code that holds this username. */
  async aliasOf(): Promise<string | null> {
    return (await this.ctx.storage.get<string>('alias')) ?? null;
  }

  /** RPC: the owner deletes their code and everything on it ("Delete my data"). */
  async remove(deviceId: string): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.deviceId !== deviceId) return 'forbidden';
    await this.freeUsername(data);
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    this.data = null;
    return 'ok';
  }

  /** RPC: whose code this is, so a party can check someone really holds the code they show. */
  async owner(): Promise<string | null> {
    return (await this.load())?.deviceId ?? null;
  }

  async alarm(): Promise<void> {
    const data = await this.load();
    if (data && Date.now() < data.updatedAt + KEEP_FOR_MS) return this.ctx.storage.setAlarm(data.updatedAt + KEEP_FOR_MS);
    if (data) await this.freeUsername(data);
    await this.ctx.storage.deleteAll();
    this.data = null;
  }

  /** A card that goes lets its username go too, so someone else can have it. */
  private async freeUsername(data: Stored): Promise<void> {
    const code = data.code ?? this.ctx.id.name;
    if (data.username && code) await this.env.FRIEND_CARD.getByName(`@${data.username}`).releaseAlias(code);
  }

  private async load(): Promise<Stored | null> {
    if (this.data === undefined) this.data = (await this.ctx.storage.get<Stored>('card')) ?? null;
    return this.data;
  }

  private async save(data: Stored, alarm = true): Promise<void> {
    this.data = data;
    await this.ctx.storage.put('card', data);
    if (alarm) await this.ctx.storage.setAlarm(data.updatedAt + KEEP_FOR_MS);
  }
}
