import { isDeviceId } from '../src/game';
import { premiumTransactionId, verifyAppleJws, type TransactionPayload } from './appleJws';

const vars = (env: Env) => env as unknown as { PREMIUM_ENFORCED?: string; APPLE_BUNDLE_ID: string; APPLE_PREMIUM_PRODUCT_ID: string };

/** Whether this server refuses Premium games and looks to phones that haven't shown a purchase. Off until the owner turns it on. */
export const premiumEnforced = (env: Env): boolean => vars(env).PREMIUM_ENFORCED === '1';

/** True when this phone is tied to a Premium purchase that Apple hasn't refunded. There's no expiry: a refund is what ends it. */
export const hasPremium = async (env: Env, deviceId: string): Promise<boolean> => (await env.ENTITLEMENTS.getByName('premium').status(deviceId)) === 'ok';

/** What a host needs to open a table or party with Premium games: true if enforcement is off or the phone owns Premium. */
export async function mayHostPremium(env: Env, deviceId: string): Promise<boolean> {
  return !premiumEnforced(env) || (await hasPremium(env, deviceId));
}

export type VerifyResult = { ok: true } | { ok: false; status: number; error: string; revoked?: boolean };

/** POST /api/premium/verify: a phone shows Apple's signed transaction once, and the server ties the phone to that purchase. */
export async function verifyPurchase(env: Env, body: Record<string, unknown>): Promise<VerifyResult> {
  const v = vars(env);
  if (!isDeviceId(body.deviceId)) return { ok: false, status: 400, error: 'Missing device id.' };
  const payload = await verifyAppleJws<TransactionPayload>(body.signedTransaction);
  const originalId = premiumTransactionId(payload, v.APPLE_BUNDLE_ID, v.APPLE_PREMIUM_PRODUCT_ID);
  if (!originalId) return { ok: false, status: 403, error: 'That purchase didn’t check out.' };
  if (!(await env.ENTITLEMENTS.getByName('premium').bind(originalId, body.deviceId, Date.now()))) {
    return { ok: false, status: 403, error: 'That purchase can’t be used on this phone.', revoked: true };
  }
  return { ok: true };
}

interface NotificationPayload {
  notificationType?: string;
  bundleId?: string;
  data?: { bundleId?: string; signedTransactionInfo?: string };
}

/**
 * POST /api/apple/notifications: App Store Server Notifications V2. Only a refund, a revoke or a reversed refund
 * matters to us. Returns false for a message that isn't genuinely from Apple.
 */
export async function handleNotification(env: Env, body: Record<string, unknown>): Promise<boolean> {
  const v = vars(env);
  const note = await verifyAppleJws<NotificationPayload>(body.signedPayload);
  if (!note || note.data?.bundleId !== v.APPLE_BUNDLE_ID) return false;
  const kind = note.notificationType;
  if (kind !== 'REFUND' && kind !== 'REVOKE' && kind !== 'REFUND_REVERSED') return true;
  const tx = await verifyAppleJws<TransactionPayload>(note.data.signedTransactionInfo);
  // A refund's own transaction carries a revocation date, so look at the ids and product, not at that date.
  if (!tx || tx.bundleId !== v.APPLE_BUNDLE_ID || tx.productId !== v.APPLE_PREMIUM_PRODUCT_ID || !tx.originalTransactionId || !/^\d{1,24}$/.test(tx.originalTransactionId)) return true;
  await env.ENTITLEMENTS.getByName('premium').setRevoked(tx.originalTransactionId, kind !== 'REFUND_REVERSED', Date.now());
  return true;
}

/** Delete my data: forget this phone's binding. */
export const forgetDevice = (env: Env, deviceId: string): Promise<void> => env.ENTITLEMENTS.getByName('premium').forget(deviceId);
