import { DurableObject } from 'cloudflare:workers';
import type { BjInvite, CampaignCard, FriendCardInfo } from '../src/game';

/** A friend code is forgotten this long after its owner last opened the app. */
const KEEP_FOR_MS = 120 * 24 * 60 * 60 * 1000;
/** An invite to a table is only worth answering for this long. */
const INVITE_MS = 15 * 60 * 1000;

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
}

/**
 * One person's friend code: a name and a picture that friends can look up by a five letter code.
 * Only the phone that made it can change it. There are no accounts; the code is all a friend needs.
 */
export class FriendCard extends DurableObject<Env> {
  private data: Stored | null | undefined;

  /** RPC: claim this code. Returns false if it's taken. */
  async create(deviceId: string, name: string, emoji: string): Promise<boolean> {
    if (await this.load()) return false;
    await this.save({ name, emoji, deviceId, updatedAt: Date.now() });
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
    return data ? { code, name: data.name, emoji: data.emoji, ...(data.campaign ? { campaign: data.campaign } : {}) } : null;
  }

  /** RPC: a friend asks this person to their blackjack table. One invite per friend; a new one replaces the old. */
  async invite(invite: BjInvite): Promise<boolean> {
    const data = await this.load();
    if (!data) return false;
    const kept = (data.invites ?? []).filter((i) => i.from !== invite.from && Date.now() - i.at < INVITE_MS);
    await this.save({ ...data, invites: [...kept, invite].slice(-8) }, false);
    return true;
  }

  /** RPC: the invites waiting for this phone, if it owns the code. */
  async invites(deviceId: string): Promise<BjInvite[] | null> {
    const data = await this.load();
    if (!data || data.deviceId !== deviceId) return null;
    return (data.invites ?? []).filter((i) => Date.now() - i.at < INVITE_MS);
  }

  /** RPC: whose code this is, so a party can check someone really holds the code they show. */
  async owner(): Promise<string | null> {
    return (await this.load())?.deviceId ?? null;
  }

  async alarm(): Promise<void> {
    const data = await this.load();
    if (data && Date.now() < data.updatedAt + KEEP_FOR_MS) return this.ctx.storage.setAlarm(data.updatedAt + KEEP_FOR_MS);
    await this.ctx.storage.deleteAll();
    this.data = null;
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
