import { describe, expect, it } from 'vitest';

import { safeDecode } from './safeDecode';

describe('safeDecode', () => {
  it('decodes good escapes', () => expect(safeDecode('a%3Ab')).toBe('a:b'));
  it('gives an empty string for a broken escape instead of throwing', () => {
    expect(safeDecode('%E0%A4%A')).toBe('');
    expect(safeDecode('%zz')).toBe('');
  });
});
