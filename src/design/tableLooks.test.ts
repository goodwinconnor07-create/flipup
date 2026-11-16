import { describe, expect, it } from 'vitest';
import { cleanLook } from './tableLooks';

describe('table looks', () => {
  it('falls back to the default for a broken look', () => {
    expect(cleanLook({ felt: 'red', rail: 'gold' as never })).toEqual({ felt: '#1f7a4d', rail: 'dark', logo: true });
  });

  it('keeps the FlipUp logo on unless it was turned off', () => {
    expect(cleanLook({ logo: false }).logo).toBe(false);
    expect(cleanLook(null).logo).toBe(true);
  });
});
