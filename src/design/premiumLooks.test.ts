import { describe, expect, it } from 'vitest';
import { BUBBLE_STYLES } from '../game/bubbles';
import { CARD_PACKS } from '../game/cardPacks';
import { BUBBLE_LOOKS, CARD_BACKS } from './premiumLooks';

// premiumLooks.ts is the one source of the card backs and bubble colours (the website's CSS that it was once
// checked against is gone).
describe('Premium looks', () => {
  it('has a back for every card pack and a look for every bubble colour', () => {
    for (const p of CARD_PACKS) expect(CARD_BACKS[p.id], p.id).toBeDefined();
    for (const b of BUBBLE_STYLES) expect(BUBBLE_LOOKS[b.id], b.id).toBeDefined();
  });
});
