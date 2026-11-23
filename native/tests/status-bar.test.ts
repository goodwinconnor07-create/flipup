import { describe, expect, it } from 'vitest';

import { barStyleFor } from '../src/state/status-bar';

describe('barStyleFor', () => {
  it('keeps white text on the pages that are always dark, in light mode too', () => {
    for (const path of ['/', '/train', '/play-friends', '/play-bots', '/premium', '/replay/abc', '/replays', '/share']) {
      expect(barStyleFor(path, false)).toBe('light');
      expect(barStyleFor(path, true)).toBe('light');
    }
  });

  it('follows the phone on light pages', () => {
    for (const path of ['/profile', '/settings', '/stats', '/table']) {
      expect(barStyleFor(path, false)).toBe('dark');
      expect(barStyleFor(path, true)).toBe('light');
    }
  });

  it('leaves the bar alone while a sheet is up', () => {
    for (const path of ['/join', '/game/holdem', '/table-menu', '/emoji']) expect(barStyleFor(path, false)).toBeNull();
  });

  it('does not read /replays as a replay or /share-card as /share', () => {
    expect(barStyleFor('/share-card', false)).toBeNull();
    expect(barStyleFor('/replays/', false)).toBe('light');
  });
});
