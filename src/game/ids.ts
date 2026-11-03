// Random ids and join codes. Uses Web Crypto, which phones, Workers and Node all have.

// Consonants only, so a random code can never spell a word.
export const CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ';
export const CODE_LENGTH = 5;

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomIndexes(count: number, size: number): number[] {
  const out: number[] = [];
  const buf = new Uint32Array(count);
  crypto.getRandomValues(buf);
  for (const n of buf) out.push(n % size);
  return out;
}

/** Random number in [0, 1) from Web Crypto. */
export function cryptoRng(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000;
}

export function newId(length = 12): string {
  return randomIndexes(length, ID_ALPHABET.length)
    .map((i) => ID_ALPHABET[i])
    .join('');
}

export function newCode(): string {
  return randomIndexes(CODE_LENGTH, CODE_ALPHABET.length)
    .map((i) => CODE_ALPHABET[i])
    .join('');
}

/** Uppercases and drops anything that can't be in a code (spaces, dashes, vowels). */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, CODE_LENGTH);
}

export function isCode(value: unknown): value is string {
  return typeof value === 'string' && value.length === CODE_LENGTH && normalizeCode(value) === value;
}

export function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value);
}

/**
 * The id other phones see for a device. A device id is a secret: it's what proves a phone owns its seat, its
 * friend code and its party place, so it never leaves the server except to its own phone. Everyone else gets this
 * one-way hash of it instead (about 106 bits, two 53-bit hashes), which stays the same across tables, so a block
 * still sticks to the person. It starts with `u:` so it can never pass `isDeviceId()`.
 */
export function publicId(deviceId: string): string {
  const h = (seed: number) => {
    let a = 0xdeadbeef ^ seed;
    let b = 0x41c6ce57 ^ seed;
    for (let i = 0; i < deviceId.length; i++) {
      const c = deviceId.charCodeAt(i);
      a = Math.imul(a ^ c, 2654435761);
      b = Math.imul(b ^ c, 1597334677);
    }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
  };
  return `u:${h(1)}${h(7919)}`;
}
