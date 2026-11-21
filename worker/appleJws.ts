// Checks a signed App Store message (a StoreKit 2 transaction, or a Server Notification V2): an ES256 JWS whose header
// carries the certificate chain. We trust it only if the chain ends in Apple's root and every link is signed by the
// next. Pure Web Crypto, no Cloudflare imports, so Vitest can run it.

/** SHA-256 of "Apple Root CA - G3" (DER). Check it against https://www.apple.com/certificateauthority/ if Apple ever rotates. */
export const APPLE_ROOT_G3_SHA256 = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';

/** Apple marks a leaf cert and its intermediate with these extension OIDs (1.2.840.113635.100.6.11.1 and .6.2.1). */
const LEAF_OID = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x06, 0x0b, 0x01];
const INTERMEDIATE_OID = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x06, 0x02, 0x01];

export interface VerifyOptions {
  /** Accepted root fingerprints (hex SHA-256). Tests pass their own. */
  roots?: string[];
  /** Check the chain's dates at this time (ms). A transaction's own `signedDate` is the right one: certs expire, receipts don't. */
  at?: number;
  /** Require Apple's marker OIDs on the leaf and the intermediate. Tests that build their own chain turn this off. */
  requireAppleOids?: boolean;
}

// ---- A very small DER reader: just enough to take a certificate apart. ----

interface Tlv {
  tag: number;
  start: number; // where the whole element begins (the tag byte)
  body: number; // where its content begins
  end: number; // one past its last byte
}

function readTlv(b: Uint8Array, at: number): Tlv {
  if (at + 2 > b.length) throw new Error('short DER');
  const tag = b[at];
  let len = b[at + 1];
  let body = at + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 4 || body + n > b.length) throw new Error('bad DER length');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[body + i];
    body += n;
  }
  if (body + len > b.length) throw new Error('DER overruns');
  return { tag, start: at, body, end: body + len };
}

function children(b: Uint8Array, parent: Tlv): Tlv[] {
  const out: Tlv[] = [];
  for (let at = parent.body; at < parent.end; ) {
    const t = readTlv(b, at);
    out.push(t);
    at = t.end;
  }
  return out;
}

interface Cert {
  der: Uint8Array;
  tbs: Uint8Array;
  sigOid: string;
  /** The signature as raw r||s, ready for Web Crypto. */
  sig: Uint8Array;
  spki: Uint8Array;
  curve: 'P-256' | 'P-384';
  notBefore: number;
  notAfter: number;
  subject: string;
  issuer: string;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

function oidString(b: Uint8Array, t: Tlv): string {
  return hex(b.subarray(t.body, t.end));
}

function readTime(b: Uint8Array, t: Tlv): number {
  const s = new TextDecoder().decode(b.subarray(t.body, t.end));
  const m = t.tag === 0x17 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s) : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s);
  if (!m) throw new Error('bad certificate date');
  const year = t.tag === 0x17 ? (Number(m[1]) >= 50 ? 1900 : 2000) + Number(m[1]) : Number(m[1]);
  return Date.UTC(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
}

/** An ECDSA signature in DER (SEQUENCE of two INTEGERs) to the fixed-width r||s that Web Crypto wants. */
function derSigToRaw(sig: Uint8Array, size: number): Uint8Array {
  const seq = readTlv(sig, 0);
  const [r, s] = children(sig, seq);
  const out = new Uint8Array(size * 2);
  for (const [i, part] of [r, s].entries()) {
    let v = sig.subarray(part.body, part.end);
    while (v.length > size && v[0] === 0) v = v.subarray(1);
    if (v.length > size) throw new Error('signature too long');
    out.set(v, i * size + (size - v.length));
  }
  return out;
}

const CURVE_OIDS: Record<string, 'P-256' | 'P-384'> = { '2a8648ce3d030107': 'P-256', '2b81040022': 'P-384' };
const SIG_HASH: Record<string, 'SHA-256' | 'SHA-384'> = { '2a8648ce3d040302': 'SHA-256', '2a8648ce3d040303': 'SHA-384' };

function parseCert(der: Uint8Array): Cert {
  const cert = readTlv(der, 0);
  const [tbsT, algT, sigT] = children(der, cert);
  const tbsKids = children(der, tbsT);
  // [0] version is optional, so the serial is the first INTEGER.
  const first = tbsKids[0].tag === 0xa0 ? 1 : 0;
  const issuerT = tbsKids[first + 2];
  const validityT = tbsKids[first + 3];
  const subjectT = tbsKids[first + 4];
  const spkiT = tbsKids[first + 5];
  const [nb, na] = children(der, validityT);
  const [keyAlg] = children(der, spkiT);
  const curveOid = children(der, keyAlg)[1];
  const curve = curveOid && CURVE_OIDS[oidString(der, curveOid)];
  if (!curve) throw new Error('unsupported certificate key');
  const sigOid = oidString(der, children(der, algT)[0]);
  if (!SIG_HASH[sigOid]) throw new Error('unsupported certificate signature');
  // The signature is a BIT STRING: one byte of unused-bit count, then the DER signature.
  const sigDer = der.subarray(sigT.body + 1, sigT.end);
  return {
    der,
    tbs: der.subarray(tbsT.start, tbsT.end),
    sigOid,
    sig: sigDer,
    spki: der.subarray(spkiT.start, spkiT.end),
    curve,
    notBefore: readTime(der, nb),
    notAfter: readTime(der, na),
    subject: hex(der.subarray(subjectT.start, subjectT.end)),
    issuer: hex(der.subarray(issuerT.start, issuerT.end)),
  };
}

function containsBytes(hay: Uint8Array, needle: number[]): boolean {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

async function importKey(spki: Uint8Array, curve: 'P-256' | 'P-384'): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: curve }, false, ['verify']);
}

/** True when `child` was signed by `issuer`'s key. */
async function signedBy(child: Cert, issuer: Cert): Promise<boolean> {
  if (child.issuer !== issuer.subject) return false;
  const size = issuer.curve === 'P-256' ? 32 : 48;
  const key = await importKey(issuer.spki, issuer.curve);
  return crypto.subtle.verify({ name: 'ECDSA', hash: SIG_HASH[child.sigOid] }, key, derSigToRaw(child.sig, size), child.tbs);
}

// ---- base64 ----

function b64decode(s: string, url: boolean): Uint8Array {
  let t = url ? s.replace(/-/g, '+').replace(/_/g, '/') : s;
  t += '='.repeat((4 - (t.length % 4)) % 4);
  const bin = atob(t);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function sha256Hex(b: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', b)));
}

/**
 * Verifies an Apple-signed JWS and returns its payload, or null if anything is off: shape, chain, root, dates, signature.
 */
export async function verifyAppleJws<T = Record<string, unknown>>(jws: unknown, options: VerifyOptions = {}): Promise<T | null> {
  try {
    if (typeof jws !== 'string' || jws.length > 20_000) return null;
    const parts = jws.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(new TextDecoder().decode(b64decode(parts[0], true))) as { alg?: unknown; x5c?: unknown };
    if (header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length !== 3 || !header.x5c.every((c) => typeof c === 'string')) return null;
    const certs = (header.x5c as string[]).map((c) => parseCert(b64decode(c, false)));
    const [leaf, mid, root] = certs;

    if (!(options.roots ?? [APPLE_ROOT_G3_SHA256]).includes(await sha256Hex(root.der))) return null;
    if (!(await signedBy(leaf, mid)) || !(await signedBy(mid, root)) || !(await signedBy(root, root))) return null;
    if (options.requireAppleOids !== false && !(containsBytes(leaf.der, LEAF_OID) && containsBytes(mid.der, INTERMEDIATE_OID))) return null;

    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const key = await importKey(leaf.spki, leaf.curve);
    if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64decode(parts[2], true), data))) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64decode(parts[1], true))) as T;
    const signedDate = (payload as { signedDate?: unknown }).signedDate;
    const at = options.at ?? (typeof signedDate === 'number' ? signedDate : Date.now());
    if (certs.some((c) => at < c.notBefore || at > c.notAfter)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- What a good Premium transaction looks like ----

export interface TransactionPayload {
  bundleId?: string;
  productId?: string;
  originalTransactionId?: string;
  transactionId?: string;
  type?: string;
  environment?: string;
  ownershipType?: string;
  revocationDate?: number;
  signedDate?: number;
  /** An auto-renewing subscription's end of the paid period (ms). Missing on a one-time purchase. */
  expiresDate?: number;
}

/**
 * The Apple account's original transaction id if this is a live purchase of one of our Premium products (the old
 * one-time purchase or a subscription), or null. A subscription's expiry is read with `premiumExpiry()`.
 */
export function premiumTransactionId(payload: TransactionPayload | null, bundleId: string, productId: string | readonly string[]): string | null {
  const products = typeof productId === 'string' ? [productId] : productId;
  if (!payload || payload.bundleId !== bundleId || !payload.productId || !products.includes(payload.productId)) return null;
  if (payload.revocationDate !== undefined) return null;
  // Family Sharing is off, so only the buyer's own purchase counts.
  if (payload.ownershipType !== undefined && payload.ownershipType !== 'PURCHASED') return null;
  if (payload.environment !== 'Production' && payload.environment !== 'Sandbox') return null;
  const id = payload.originalTransactionId;
  return typeof id === 'string' && /^\d{1,24}$/.test(id) ? id : null;
}

/** When a subscription's paid period ends (ms), or null for a one-time purchase that never does. */
export function premiumExpiry(payload: TransactionPayload | null): number | null {
  const at = payload?.expiresDate;
  return typeof at === 'number' && Number.isFinite(at) && at > 0 ? at : null;
}
