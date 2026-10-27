import { DurableObject } from 'cloudflare:workers';
import type { FriendCardInfo } from '../src/game';

/** A friend code is forgotten this long after its owner last opened the app. */
const KEEP_FOR_MS = 120 * 24 * 60 * 60 * 1000;

interface Stored {
  name: string;
  emoji: string;
  /** The phone that owns this code. Never sent out. */
  deviceId: string;
  updatedAt: number;
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

  /** RPC: the owner's latest name and picture. */
  async update(deviceId: string, name: string, emoji: string): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.deviceId !== deviceId) return 'forbidden';
    await this.save({ ...data, name, emoji, updatedAt: Date.now() });
    return 'ok';
  }

  /** RPC: what a friend sees. */
  async get(code: string): Promise<FriendCardInfo | null> {
    const data = await this.load();
    return data ? { code, name: data.name, emoji: data.emoji } : null;
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

  private async save(data: Stored): Promise<void> {
    this.data = data;
    await this.ctx.storage.put('card', data);
    await this.ctx.storage.setAlarm(data.updatedAt + KEEP_FOR_MS);
  }
}
