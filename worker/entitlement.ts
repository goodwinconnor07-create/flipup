import { DurableObject } from 'cloudflare:workers';

/** One Apple account's Premium can sit on this many phones (a new phone, a reinstall, a second device). */
const MAX_DEVICES = 6;

/**
 * Who has bought FlipUp Premium. One instance, named "premium", keeps two small SQLite tables: purchases (keyed by
 * Apple's original transaction id, so a Restore on a new phone finds the same one) and the device ids bound to them.
 * It holds no names, no emails and no card details: Apple keeps those.
 */
export class Entitlements extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS purchases (original_id TEXT PRIMARY KEY, revoked INTEGER NOT NULL DEFAULT 0, first_seen INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS devices (device TEXT PRIMARY KEY, original_id TEXT NOT NULL, at INTEGER NOT NULL)');
    sql.exec('CREATE INDEX IF NOT EXISTS devices_by_purchase ON devices (original_id)');
  }

  /** RPC: this phone showed a good purchase. Binds it. Returns false if the purchase was refunded or has too many phones. */
  async bind(originalId: string, deviceId: string, now: number): Promise<boolean> {
    const sql = this.ctx.storage.sql;
    sql.exec('INSERT OR IGNORE INTO purchases (original_id, first_seen) VALUES (?, ?)', originalId, now);
    const row = sql.exec<{ revoked: number }>('SELECT revoked FROM purchases WHERE original_id = ?', originalId).one();
    if (row.revoked) return false;
    const mine = sql.exec<{ original_id: string }>('SELECT original_id FROM devices WHERE device = ?', deviceId).toArray()[0];
    if (!mine) {
      const count = sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM devices WHERE original_id = ?', originalId).one().n;
      if (count >= MAX_DEVICES) return false;
    }
    sql.exec('INSERT OR REPLACE INTO devices (device, original_id, at) VALUES (?, ?, ?)', deviceId, originalId, now);
    return true;
  }

  /** RPC: 'ok' when this phone is bound to a live purchase, 'revoked' when its purchase was refunded, 'unknown' otherwise. */
  async status(deviceId: string): Promise<'ok' | 'revoked' | 'unknown'> {
    const sql = this.ctx.storage.sql;
    const row = sql
      .exec<{ revoked: number }>('SELECT p.revoked AS revoked FROM devices d JOIN purchases p ON p.original_id = d.original_id WHERE d.device = ?', deviceId)
      .toArray()[0];
    return !row ? 'unknown' : row.revoked ? 'revoked' : 'ok';
  }

  /** RPC: Apple says this purchase was refunded or revoked (`on`), or that the refund was reversed (`off`). */
  async setRevoked(originalId: string, on: boolean, now: number): Promise<void> {
    const sql = this.ctx.storage.sql;
    sql.exec('INSERT OR IGNORE INTO purchases (original_id, first_seen) VALUES (?, ?)', originalId, now);
    sql.exec('UPDATE purchases SET revoked = ? WHERE original_id = ?', on ? 1 : 0, originalId);
  }

  /** RPC: Delete my data. Forgets this phone. The purchase stays with Apple, so Restore brings it back. */
  async forget(deviceId: string): Promise<void> {
    this.ctx.storage.sql.exec('DELETE FROM devices WHERE device = ?', deviceId);
  }
}
