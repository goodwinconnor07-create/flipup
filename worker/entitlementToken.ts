// The short-lived pass a phone shows a table to prove it has FlipUp Premium. The Worker mints it after checking
// Apple's signed purchase; a table checks it with the same secret and no network call. Pure Web Crypto.

/** A pass lasts this long. Phones refresh it at launch, so a refund takes effect within a week. */
export const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

const b64url = (b: ArrayBuffer | Uint8Array): string => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let bin = '';
  for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const unb64url = (s: string): Uint8Array => {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  t += '='.repeat((4 - (t.length % 4)) % 4);
  return Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
};

const hmacKey = (secret: string, usage: 'sign' | 'verify') =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);

/** A pass for this device, good until `now + TOKEN_LIFETIME_MS`. */
export async function mintToken(secret: string, deviceId: string, now: number): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = now + TOKEN_LIFETIME_MS;
  const body = b64url(enc.encode(JSON.stringify({ d: deviceId, exp: expiresAt })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), enc.encode(body));
  return { token: `${body}.${b64url(sig)}`, expiresAt };
}

/** True when the pass is genuine, hasn't run out, and was made for this device. */
export async function tokenValid(secret: string | undefined, token: unknown, deviceId: string, now: number): Promise<boolean> {
  if (!secret || typeof token !== 'string' || token.length > 400) return false;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return false;
  try {
    if (!(await crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), unb64url(sig), enc.encode(body)))) return false;
    const { d, exp } = JSON.parse(new TextDecoder().decode(unb64url(body))) as { d?: unknown; exp?: unknown };
    return d === deviceId && typeof exp === 'number' && exp > now;
  } catch {
    return false;
  }
}
