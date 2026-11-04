import { describe, expect, it } from 'vitest';

import { BUBBLE_STYLES } from './bubbles';
import { CARD_PACKS } from './cardPacks';
import { gamesNeedPremium, premiumBubble, premiumPack, withoutPremiumLook } from './premiumGate';
import { VARIANTS } from './variants';

describe('Premium gate', () => {
  it('knows which looks cost', () => {
    expect(premiumBubble('green')).toBe(false);
    expect(premiumBubble(undefined)).toBe(false);
    expect(premiumBubble('galaxy')).toBe(true);
    expect(CARD_PACKS.filter((p) => !p.venue).every((p) => premiumPack(p.id))).toBe(true);
    expect(CARD_PACKS.filter((p) => p.venue).some((p) => premiumPack(p.id))).toBe(false);
    expect(BUBBLE_STYLES.filter((b) => !b.free).every((b) => premiumBubble(b.id))).toBe(true);
  });

  it('takes only the Premium parts out of a look', () => {
    const base = { type: 'setLook', name: 'Ann', emoji: '🙂' } as const;
    expect(withoutPremiumLook({ ...base, bubble: 'galaxy', cardPack: 'gold' })).toEqual(base);
    expect(withoutPremiumLook({ ...base, bubble: 'green' })).toEqual({ ...base, bubble: 'green' });
    expect(withoutPremiumLook({ type: 'next', hand: 1 })).toEqual({ type: 'next', hand: 1 });
  });

  it('asks for Premium only past the first five games', () => {
    expect(gamesNeedPremium([VARIANTS[0].id])).toBe(false);
    expect(gamesNeedPremium(VARIANTS.slice(0, 5).map((v) => v.id))).toBe(false);
    expect(gamesNeedPremium([VARIANTS[0].id, VARIANTS[5].id])).toBe(true);
  });
});
