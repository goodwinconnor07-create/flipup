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

/**
 * Table codes: a short poker word and two numbers (ACES42, FLOP07), six characters a friend can say across the
 * room. A host can also pick their own six letters or numbers. Tables opened before this (and parties) still use
 * the five consonants above, so `isTableCode` takes those too.
 */
export const TABLE_CODE_LENGTH = 6;
export const TABLE_CODE_WORDS = [
  'ACES', 'KING', 'JACK', 'FLOP', 'TURN', 'DEAL', 'FOLD', 'CALL', 'BETS', 'POTS', 'CHIP', 'NUTS', 'SUIT', 'CLUB',
  'HAND', 'RAKE', 'ANTE', 'DRAW', 'PAIR', 'SHOW', 'BUST', 'DECK', 'CARD', 'WILD', 'HIGH', 'TELL', 'FISH', 'RAIL',
  'FELT', 'LUCK', 'HERO', 'SPOT', 'SHIP', 'TILT', 'QUAD', 'TRIP', 'FOUR', 'FIVE', 'NINE',
] as const;

export function newTableCode(): string {
  const [w, a, b] = randomIndexes(3, 1 << 16);
  return `${TABLE_CODE_WORDS[w % TABLE_CODE_WORDS.length]}${a % 10}${b % 10}`;
}

/** Uppercases and keeps only letters and numbers, at most six. */
export function normalizeTableCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, TABLE_CODE_LENGTH);
}

/** A table's join code: six letters or numbers, or one of the older five-consonant codes. */
export function isTableCode(value: unknown): value is string {
  return typeof value === 'string' && (/^[A-Z0-9]{6}$/.test(value) || isCode(value));
}

/** Why a code the host typed can't be used, or null when it can. Rude words are checked by the caller (names.ts). */
export function tableCodeProblem(code: string): string | null {
  if (code.length < TABLE_CODE_LENGTH) {
    const left = TABLE_CODE_LENGTH - code.length;
    return `Codes are ${TABLE_CODE_LENGTH} characters. Add ${left} more.`;
  }
  return isTableCode(code) ? null : 'Use only letters and numbers.';
}

/** Friend codes are numbers, so they never look like a table or party code. */
export const FRIEND_CODE_LENGTH = 6;

export function newFriendCode(): string {
  return randomIndexes(FRIEND_CODE_LENGTH, 10).join('');
}

/** Keeps only digits, at most six. */
export function normalizeFriendCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, FRIEND_CODE_LENGTH);
}

/** A friend code: six digits, or one of the five-letter codes made before friend codes were numbers. */
export function isFriendCode(value: unknown): value is string {
  return (typeof value === 'string' && value.length === FRIEND_CODE_LENGTH && normalizeFriendCode(value) === value) || isCode(value);
}

/** Usernames: 3 to 20 lowercase letters, digits, dots or underscores, starting with a letter. How friends find you. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
/** A username can change once in this long. */
export const USERNAME_CHANGE_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase();
}

export function isUsername(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^[a-z][a-z0-9._]{${USERNAME_MIN - 1},${USERNAME_MAX - 1}}$`).test(value) && !/[._]{2}/.test(value) && !/[._]$/.test(value);
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
