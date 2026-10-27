import { DurableObject } from 'cloudflare:workers';
import { sanitizeTwin, type SharedTwin, type TwinProfile } from '../src/game';

/** A shared twin is deleted this long after its owner last sent it. */
const KEEP_FOR_MS = 30 * 24 * 60 * 60 * 1000;

interface Stored {
  name: string;
  emoji: string;
  profile: TwinProfile;
  updatedAt: number;
  /** Who made it, and a hash of the secret only that phone has. */
  deviceId: string;
  secretHash: string;
}

/** SHA-256 of a secret, as hex. */
export async function hashSecret(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * One shared AI twin, addressed by its five letter code: a person's habit counters (see src/game/twin.ts),
 * which friends fetch to play against and scout. Only the phone that made it, holding its secret, can change
 * or delete it. Unused for a month and it goes.
 */
export class TwinShare extends DurableObject<Env> {
  private data: Stored | null | undefined;

  /** RPC: store a new share. Returns false if this code is already in use. */
  async create(deviceId: string, secretHash: string, name: string, emoji: string, profile: TwinProfile): Promise<boolean> {
    if (await this.load()) return false;
    await this.save({ name, emoji, profile: sanitizeTwin(profile), updatedAt: Date.now(), deviceId, secretHash });
    return true;
  }

  /** RPC: new numbers from the owner. */
  async update(secretHash: string, name: string, emoji: string, profile: TwinProfile): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.secretHash !== secretHash) return 'forbidden';
    await this.save({ ...data, name, emoji, profile: sanitizeTwin(profile), updatedAt: Date.now() });
    return 'ok';
  }

  /** RPC: the owner stops sharing. */
  async remove(secretHash: string): Promise<'ok' | 'missing' | 'forbidden'> {
    const data = await this.load();
    if (!data) return 'missing';
    if (data.secretHash !== secretHash) return 'forbidden';
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    this.data = null;
    return 'ok';
  }

  /** RPC: what friends see, or null when nothing's shared here. */
  async get(code: string): Promise<SharedTwin | null> {
    const data = await this.load();
    return data ? { code, name: data.name, emoji: data.emoji, profile: data.profile, updatedAt: data.updatedAt } : null;
  }

  /** RPC: the phone that shares this twin, so a table can check someone really holds the code they show. */
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
    if (this.data === undefined) this.data = (await this.ctx.storage.get<Stored>('twin')) ?? null;
    return this.data;
  }

  private async save(data: Stored): Promise<void> {
    this.data = data;
    await this.ctx.storage.put('twin', data);
    await this.ctx.storage.setAlarm(data.updatedAt + KEEP_FOR_MS);
  }
}
