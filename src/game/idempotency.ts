// Idempotency keys. A phone makes one for each thing it asks the server to create (a table, a shared twin) and
// sends it as the `Idempotency-Key` header on every try of that same request. If the first try got through but the
// answer was lost, the retry gets the same answer back instead of making a second table or share.
//
// The server needs somewhere to remember "this key made that code". It has no key-value store, so the code is
// worked out from the key instead: the same device and key always try the same codes in the same order, and the
// table or share keeps the key it was made with to tell a retry from a clash. Uses Web Crypto, like ids.ts.

import { CODE_ALPHABET, CODE_LENGTH } from './ids';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

/** A fresh key for a new request (a random UUID). */
export const newIdempotencyKey = (): string => crypto.randomUUID();

/** What the server accepts as a key: 16 to 64 letters, digits, dashes and underscores. */
export const isIdempotencyKey = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(value);

async function digest(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/** The join code (or twin code) for the n-th try at a keyed request: the same every time for the same device and key. */
export async function codeFromKey(scope: 'table' | 'twin', deviceId: string, key: string, attempt: number): Promise<string> {
  const bytes = await digest(`${scope}:${deviceId}:${key}:${attempt}`);
  return Array.from(bytes.slice(0, CODE_LENGTH), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
