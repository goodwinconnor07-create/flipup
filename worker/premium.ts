import { isDeviceId } from '../src/game';
import { premiumTransactionId, verifyAppleJws, type TransactionPayload } from './appleJws';
import { mintToken, tokenValid } from './entitlementToken';

// The secret is set with `wrangler secret put ENTITLEMENT_SECRET`, so it isn't in the generated Env type.
const vars = (env: Env) => env as unknown as { ENTITLEMENT_SECRET?: string; PREMIUM_ENFORCED?: string; APPLE_BUNDLE_ID: string; APPLE_PREMIUM_PRODUCT_ID: string };

/** Whether this server refuses Premium games and looks to phones without a pass. Off until the owner turns it on. */
export const premiumEnforced = (env: Env): boolean => vars(env).PREMIUM_ENFORCED === '1';

/** True when this phone shows a genuine, current Premium pass. With no secret set nothing can be genuine. */
export const hasPass = (env: Env, token: unknown, deviceId: string): Promise<boolean> => tokenValid(vars(env).ENTITLEMENT_SECRET, token, deviceId, Date.now());

/** What a host needs to open a table or party with Premium games: true if enforcement is off or the pass is good. */
export async function mayHostPremium(env: Env, token: unknown, deviceId: string): Promise<boolean> {
  return !premiumEnforced(env) || (await hasPass(env, token, deviceId));
}

export type PassResult = { ok: true; token: string; expiresAt: number } | { ok: false; status: number; error: string; revoked?: boolean };

/** POST /api/premium/verify: a phone shows Apple's signed transaction and gets a pass. */
export async function verifyPurchase(env: Env, body: Record<string, unknown>): Promise<PassResult> {
  const v = vars(env);
  if (!v.ENTITLEMENT_SECRET) return { ok: false, status: 503, error: 'Premium checks aren’t set up on the server yet.' };
  if (!isDeviceId(body.deviceId)) return { ok: false, status: 400, error: 'Missing device id.' };
  const payload = await verifyAppleJws<TransactionPayload>(body.signedTransaction);
  const originalId = premiumTransactionId(payload, v.APPLE_BUNDLE_ID, v.APPLE_PREMIUM_PRODUCT_ID);
  if (!originalId) return { ok: false, status: 403, error: 'That purchase didn’t check out.' };
  if (!(await env.ENTITLEMENTS.getByName('premium').bind(originalId, body.deviceId, Date.now()))) {
    return { ok: false, status: 403, error: 'That purchase can’t be used on this phone.', revoked: true };
  }
  return { ok: true, ...(await mintToken(v.ENTITLEMENT_SECRET, body.deviceId, Date.now())) };
}

/** POST /api/premium/refresh: a phone that already proved its purchase gets a fresh pass, unless Apple refunded it. */
export async function refreshPass(env: Env, body: Record<string, unknown>): Promise<PassResult> {
  const v = vars(env);
  if (!v.ENTITLEMENT_SECRET) return { ok: false, status: 503, error: 'Premium checks aren’t set up on the server yet.' };
  if (!isDeviceId(body.deviceId)) return { ok: false, status: 400, error: 'Missing device id.' };
  const status = await env.ENTITLEMENTS.getByName('premium').status(body.deviceId);
  if (status === 'revoked') return { ok: false, status: 403, error: 'That purchase was refunded.', revoked: true };
  if (status === 'unknown') return { ok: false, status: 404, error: 'This phone hasn’t shown a purchase yet.' };
  return { ok: true, ...(await mintToken(v.ENTITLEMENT_SECRET, body.deviceId, Date.now())) };
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
