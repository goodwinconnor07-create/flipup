import { describe, expect, it } from 'vitest';
import { isNameBlocked } from './names';

describe('player name filter', () => {
  it('lets ordinary names through, including ones with rude words inside them', () => {
    for (const name of [
      'Sam',
      'Maya',
      'Dickson',
      'Cassidy',
      'Scunthorpe',
      'Kikelomo',
      'Niger',
      'Pedro',
      'Speedo',
      'Therapist Tom',
      'Anazia',
      'Mr Shitake',
      'Big Dick Energy Dan'.replace('Dick', 'Swing'),
      'Jo 🐐',
      'Zoë',
      'Ali G',
    ]) {
      expect(isNameBlocked(name), name).toBe(false);
    }
  });

  it('catches abusive and sexual names, including disguised spellings', () => {
    for (const name of [
      'fuck',
      'FUUUCK off',
      'f.u.c.k',
      'Big Dick',
      'sh1t',
      's h i t',
      'B1tch',
      'p0rn star',
      'cunt',
      'dicks',
      'Hitler',
      'r@pist',
    ]) {
      expect(isNameBlocked(name), name).toBe(true);
    }
  });
});
