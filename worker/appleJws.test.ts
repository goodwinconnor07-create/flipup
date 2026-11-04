import { execFileSync } from 'node:child_process';
import { createHash, createPrivateKey, createSign, X509Certificate } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { premiumTransactionId, verifyAppleJws } from './appleJws';

// Builds a throwaway root, intermediate and leaf with openssl (so no private keys are committed), signs messages
// the way Apple does, and checks the verifier accepts good ones and turns away every kind of bad one.
const hasOpenssl = (() => {
  try {
    execFileSync('openssl', ['version']);
    return true;
  } catch {
    return false;
  }
})();

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');
let dir = '';
let rootDer: Buffer;
let midDer: Buffer;
let leafDer: Buffer;
let plainLeafDer: Buffer;
let leafKeyPem: string;
let rogueKeyPem: string;
let rootFingerprint = '';

const ssl = (...args: string[]) => execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
const der = (pem: string) => new X509Certificate(readFileSync(join(dir, pem))).raw;

function sign(payload: object, opts: { key?: string; chain?: Buffer[]; alg?: string } = {}): string {
  const header = { alg: opts.alg ?? 'ES256', x5c: (opts.chain ?? [leafDer, midDer, rootDer]).map((d) => d.toString('base64')) };
  const body = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  const sig = createSign('SHA256').update(body).sign({ key: createPrivateKey(opts.key ?? leafKeyPem), dsaEncoding: 'ieee-p1363' });
  return `${body}.${b64u(sig)}`;
}

beforeAll(() => {
  if (!hasOpenssl) return;
  dir = mkdtempSync(join(tmpdir(), 'flipup-jws-'));
  writeFileSync(join(dir, 'mid.ext'), 'basicConstraints=critical,CA:TRUE\n1.2.840.113635.100.6.2.1=ASN1:NULL\n');
  writeFileSync(join(dir, 'leaf.ext'), '1.2.840.113635.100.6.11.1=ASN1:NULL\n');
  ssl('ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', 'root.key');
  ssl('req', '-new', '-x509', '-key', 'root.key', '-sha384', '-days', '36500', '-subj', '/CN=Test Root', '-out', 'root.pem');
  ssl('ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', 'mid.key');
  ssl('req', '-new', '-key', 'mid.key', '-subj', '/CN=Test Mid', '-out', 'mid.csr');
  ssl('x509', '-req', '-in', 'mid.csr', '-CA', 'root.pem', '-CAkey', 'root.key', '-CAcreateserial', '-sha384', '-days', '36500', '-extfile', 'mid.ext', '-out', 'mid.pem');
  ssl('ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', 'leaf.key');
  ssl('req', '-new', '-key', 'leaf.key', '-subj', '/CN=Test Leaf', '-out', 'leaf.csr');
  ssl('x509', '-req', '-in', 'leaf.csr', '-CA', 'mid.pem', '-CAkey', 'mid.key', '-CAcreateserial', '-sha384', '-days', '36500', '-extfile', 'leaf.ext', '-out', 'leaf.pem');
  // A leaf that is properly signed but lacks Apple's marker extension.
  ssl('req', '-new', '-key', 'leaf.key', '-subj', '/CN=Plain Leaf', '-out', 'plain.csr');
  ssl('x509', '-req', '-in', 'plain.csr', '-CA', 'mid.pem', '-CAkey', 'mid.key', '-CAcreateserial', '-sha384', '-days', '36500', '-out', 'plain.pem');
  ssl('ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', 'rogue.key');
  rootDer = der('root.pem');
  midDer = der('mid.pem');
  leafDer = der('leaf.pem');
  plainLeafDer = der('plain.pem');
  leafKeyPem = readFileSync(join(dir, 'leaf.key'), 'utf8');
  rogueKeyPem = readFileSync(join(dir, 'rogue.key'), 'utf8');
  rootFingerprint = createHash('sha256').update(rootDer).digest('hex');
});

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const tx = { bundleId: 'com.goodwin.flipup', productId: 'flipup.premium.unlock', originalTransactionId: '2000000123456789', environment: 'Production', signedDate: Date.now() + 10 * 60_000 }; // After the test certificates are made (in beforeAll, later than this line runs).

describe.skipIf(!hasOpenssl)('verifyAppleJws', () => {
  const opts = () => ({ roots: [rootFingerprint] });

  it('accepts a message signed through the chain', async () => {
    expect(await verifyAppleJws(sign(tx), opts())).toMatchObject({ productId: 'flipup.premium.unlock' });
  });

  it('refuses a chain that does not end in a trusted root', async () => {
    expect(await verifyAppleJws(sign(tx), { roots: ['00'.repeat(32)] })).toBeNull();
    // The real Apple root is the default, and our throwaway one is not it.
    expect(await verifyAppleJws(sign(tx))).toBeNull();
  });

  it('refuses a message signed by some other key', async () => {
    expect(await verifyAppleJws(sign(tx, { key: rogueKeyPem }), opts())).toBeNull();
  });

  it('refuses a tampered payload', async () => {
    const [h, , s] = sign(tx).split('.');
    expect(await verifyAppleJws(`${h}.${b64u(JSON.stringify({ ...tx, productId: 'something.else' }))}.${s}`, opts())).toBeNull();
  });

  it('refuses a chain with a link out of order or missing', async () => {
    expect(await verifyAppleJws(sign(tx, { chain: [leafDer, rootDer, midDer] }), opts())).toBeNull();
    expect(await verifyAppleJws(sign(tx, { chain: [leafDer, rootDer] }), opts())).toBeNull();
  });

  it('refuses another algorithm, and junk', async () => {
    expect(await verifyAppleJws(sign(tx, { alg: 'none' }), opts())).toBeNull();
    for (const bad of [undefined, null, 5, '', 'a.b', 'a.b.c', 'x'.repeat(30_000)]) expect(await verifyAppleJws(bad, opts())).toBeNull();
  });

  it('checks the certificates were valid when the message was signed', async () => {
    expect(await verifyAppleJws(sign({ ...tx, signedDate: Date.UTC(2000, 0, 1) }), opts())).toBeNull();
    expect(await verifyAppleJws(sign({ ...tx, signedDate: Date.now() + 200 * 365 * 24 * 3600 * 1000 }), opts())).toBeNull();
  });

  it("requires Apple's marker extensions unless told not to", async () => {
    const plain = sign(tx, { chain: [plainLeafDer, midDer, rootDer] });
    expect(await verifyAppleJws(plain, opts())).toBeNull();
    expect(await verifyAppleJws(plain, { ...opts(), requireAppleOids: false })).not.toBeNull();
    expect(await verifyAppleJws(sign(tx), opts())).not.toBeNull();
  });
});

describe('premiumTransactionId', () => {
  const ok = { ...tx, ownershipType: 'PURCHASED' };
  const id = (p: object | null) => premiumTransactionId(p, 'com.goodwin.flipup', 'flipup.premium.unlock');
  it('takes a live purchase of our product', () => {
    expect(id(ok)).toBe('2000000123456789');
    expect(id({ ...tx, environment: 'Sandbox' })).toBe('2000000123456789');
  });
  it('turns away everything else', () => {
    expect(id(null)).toBeNull();
    expect(id({ ...ok, bundleId: 'com.other.app' })).toBeNull();
    expect(id({ ...ok, productId: 'flipup.other' })).toBeNull();
    expect(id({ ...ok, revocationDate: 1 })).toBeNull();
    expect(id({ ...ok, ownershipType: 'FAMILY_SHARED' })).toBeNull();
    expect(id({ ...ok, environment: 'Xcode' })).toBeNull();
    expect(id({ ...ok, originalTransactionId: 'abc' })).toBeNull();
    expect(id({ ...ok, originalTransactionId: undefined })).toBeNull();
  });
});
