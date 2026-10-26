import { describe, expect, it } from 'vitest';
import { codeFromKey, isCode, isIdempotencyKey, newIdempotencyKey } from './index';

const device = 'd' + 'a'.repeat(19);

describe('idempotency keys', () => {
  it('makes keys the server accepts, and turns away the rest', () => {
    expect(isIdempotencyKey(newIdempotencyKey())).toBe(true);
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
    for (const bad of ['', 'short', 'x'.repeat(65), 'has spaces in it, too long', 'semi;colon-semi;colon', 42, null]) expect(isIdempotencyKey(bad)).toBe(false);
  });

  it('gives the same code for a retry, a different one for a new attempt, key or device', async () => {
    const key = newIdempotencyKey();
    const first = await codeFromKey('table', device, key, 0);
    expect(isCode(first)).toBe(true);
    expect(await codeFromKey('table', device, key, 0)).toBe(first);
    expect(await codeFromKey('table', device, key, 1)).not.toBe(first);
    expect(await codeFromKey('table', device, newIdempotencyKey(), 0)).not.toBe(first);
    expect(await codeFromKey('table', 'd' + 'b'.repeat(19), key, 0)).not.toBe(first);
    expect(await codeFromKey('twin', device, key, 0)).not.toBe(first);
  });
});
