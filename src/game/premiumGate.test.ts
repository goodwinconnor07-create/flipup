import { describe, expect, it } from 'vitest';

import { BOTS } from './botStyles';
import { BUBBLE_STYLES } from './bubbles';
import { CARD_PACKS } from './cardPacks';
import { botsNeedPremium, FREE_BOT_NAMES, gamesNeedPremium, isFreeBot, premiumBubble, premiumPack, rangeSetNeedsPremium, withoutPremiumLook } from './premiumGate';
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

  it("asks for Premium for every game but Texas Hold'em", () => {
    expect(gamesNeedPremium([VARIANTS[0].id])).toBe(false);
    expect(gamesNeedPremium([VARIANTS[1].id])).toBe(true);
    expect(gamesNeedPremium([VARIANTS[0].id, VARIANTS[5].id])).toBe(true);
  });

  it('keeps free tables to the free bots', () => {
    expect(FREE_BOT_NAMES).toHaveLength(10);
    expect(new Set(FREE_BOT_NAMES.map((n) => BOTS.find((b) => b.name === n)?.style)).size).toBe(10);
    expect(isFreeBot('Kai')).toBe(true);
    expect(isFreeBot('Rex')).toBe(false);
    expect(botsNeedPremium(['Luna', 'Kai'])).toBe(false);
    expect(botsNeedPremium(['Luna', 'Rex'])).toBe(true);
  });

  it('gives a free player one daily range quiz and nothing else', () => {
    expect(rangeSetNeedsPremium(false, 0)).toBe(false);
    expect(rangeSetNeedsPremium(false, 1)).toBe(true);
    expect(rangeSetNeedsPremium(true, 0)).toBe(true);
  });
});
