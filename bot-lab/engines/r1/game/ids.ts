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
